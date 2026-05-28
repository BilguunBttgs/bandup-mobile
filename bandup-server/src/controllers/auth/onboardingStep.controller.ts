import type { Context } from "hono";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { users, questions, questionOptions, characters, userStats } from "../../db/schema";
import { calculateBandScore } from "../../lib/band-score";
import { generateDailyQuests } from "../../lib/quest-engine";
import { mongoError } from "../../lib/errors";

export const onboardingStepSchema = z.object({
  step: z.number().int().min(0).max(3),
  data: z.unknown().optional(),
});

// Per-step data validators
const step0DataSchema = z.object({
  target_band: z.number().min(0).max(9).multipleOf(0.5),
});

const step1DataSchema = z.object({
  daily_goal_minutes: z.number().int().min(5).max(480),
});

const step2DataSchema = z.object({
  reading_id: z.number().int().positive(),
  answers: z
    .array(
      z.object({
        question_id: z.number().int().positive(),
        option_id: z.number().int().positive(),
      }),
    )
    .min(1, "At least one answer is required"),
});

type OnboardingEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

const ALL_SKILLS = ["reading", "listening", "writing", "speaking"] as const;

export async function onboardingStepController(
  c: Context<OnboardingEnv>,
): Promise<Response> {
  const userId = c.get("userId");
  const { step, data } = await c.req.json<z.infer<typeof onboardingStepSchema>>();
  const db = createDb(c.env.DB);

  const [user] = await db
    .select({ onboardingStep: users.onboardingStep, isOnboarding: users.isOnboarding })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return c.json(mongoError("NOT_FOUND"), 404);
  if (!user.isOnboarding) return c.json(mongoError("ONBOARDING_DONE"), 409);
  if (step !== user.onboardingStep) {
    return c.json(mongoError("INVALID_STEP"), 400);
  }

  // ── Step 0: pick target band ──────────────────────────────────────────────
  if (step === 0) {
    const parsed = step0DataSchema.safeParse(data);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? mongoError("VALIDATION_ERROR").error }, 400);
    }

    await db
      .update(users)
      .set({ targetBand: parsed.data.target_band, onboardingStep: 1 })
      .where(eq(users.id, userId));

    return c.json({ step: 0, nextStep: 1, data: { target_band: parsed.data.target_band } });
  }

  // ── Step 1: pick daily study goal ─────────────────────────────────────────
  if (step === 1) {
    const parsed = step1DataSchema.safeParse(data);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? mongoError("VALIDATION_ERROR").error }, 400);
    }

    await db
      .update(users)
      .set({ dailyGoalMinutes: parsed.data.daily_goal_minutes, onboardingStep: 2 })
      .where(eq(users.id, userId));

    return c.json({
      step: 1,
      nextStep: 2,
      data: { daily_goal_minutes: parsed.data.daily_goal_minutes },
    });
  }

  // ── Step 2: short placement test ──────────────────────────────────────────
  if (step === 2) {
    const parsed = step2DataSchema.safeParse(data);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? mongoError("VALIDATION_ERROR").error }, 400);
    }

    const { reading_id, answers } = parsed.data;

    // Fetch all questions in this reading — totalQuestions comes from DB (anti-cheat)
    const readingQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.readingId, reading_id));

    const totalQuestions = readingQuestions.length;
    if (totalQuestions === 0) {
      return c.json(mongoError("NO_QUESTIONS"), 422);
    }

    const qIds = readingQuestions.map((q) => q.id);
    const correctOptions = await db
      .select({ id: questionOptions.id, questionId: questionOptions.questionId })
      .from(questionOptions)
      .where(
        and(
          inArray(questionOptions.questionId, qIds),
          eq(questionOptions.isCorrect, true),
        ),
      );

    const correctMap = new Map<number, number>(); // questionId → correct optionId
    for (const opt of correctOptions) {
      correctMap.set(opt.questionId, opt.id);
    }

    let correctCount = 0;
    for (const answer of answers) {
      if (correctMap.get(answer.question_id) === answer.option_id) correctCount++;
    }

    const bandScore = calculateBandScore(correctCount, totalQuestions);

    await db
      .update(users)
      .set({ readingScore: bandScore, onboardingStep: 3 })
      .where(eq(users.id, userId));

    return c.json({
      step: 2,
      nextStep: 3,
      data: { correct_count: correctCount, total_questions: totalQuestions, band_score: bandScore },
    });
  }

  // ── Step 3: complete onboarding ───────────────────────────────────────────
  if (step === 3) {
    const dateIso = new Date().toISOString().slice(0, 10);

    // Create user_stats (idempotent — may already exist from a prior attempt)
    await db.insert(userStats).values({ userId }).onConflictDoNothing();

    // Create missing character rows (D1 serial requirement)
    const existingChars = await db
      .select({ skill: characters.skill })
      .from(characters)
      .where(eq(characters.userId, userId));

    const existingSkills = new Set(existingChars.map((ch) => ch.skill));
    for (const skill of ALL_SKILLS) {
      if (!existingSkills.has(skill)) {
        await db.insert(characters).values({ userId, skill });
      }
    }

    // Assign today's first quests
    const assignedQuests = await generateDailyQuests(db, userId, dateIso);

    // Mark onboarding complete last (so retries are safe until this point)
    await db
      .update(users)
      .set({ isOnboarding: false, onboardingStep: 3 })
      .where(eq(users.id, userId));

    return c.json({
      step: 3,
      nextStep: null,
      data: { quests_assigned: assignedQuests.length },
    });
  }

  return c.json(mongoError("INVALID_STEP"), 400);
}
