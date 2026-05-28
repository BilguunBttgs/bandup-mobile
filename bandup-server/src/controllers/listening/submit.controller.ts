import type { Context } from "hono";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import {
  listenings,
  listeningQuestions,
  listeningQuestionOptions,
  users,
  userListeningSubmissions,
} from "../../db/schema";
import { calculateBandScore } from "../../lib/band-score";
import { recordActivity } from "../../lib/streak-engine";
import { incrementQuestProgress } from "../../lib/quest-engine";
import { awardSkillXp, awardUserXp, awardCoins } from "../../lib/xp-engine";
import { mongoError } from "../../lib/errors";

export const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.number().int().positive(),
        option_id: z.number().int().positive(),
      }),
    )
    .min(1, "At least one answer is required"),
  time_taken_seconds: z.number().int().nonnegative(),
});

type SubmitInput = z.infer<typeof submitSchema>;

type ListeningEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

// XP / coin formula (scales with performance):
//   skillXp = correctCount * 5 + 10  (10 base + 5 per correct answer)
//   userXp  = same as skillXp
//   coins   = floor(bandScore) * 2
function computeRewards(correctCount: number, bandScore: number) {
  const skillXp = correctCount * 5 + 10;
  return { skillXp, userXp: skillXp, coins: Math.floor(bandScore) * 2 };
}

export async function submitListeningController(
  c: Context<ListeningEnv>,
): Promise<Response> {
  const listeningId = Number(c.req.param("id"));
  if (isNaN(listeningId)) return c.json(mongoError("INVALID_ID"), 400);

  const { answers, time_taken_seconds } = await c.req.json<SubmitInput>();
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  // 1. Confirm the listening exists
  const [listeningRow] = await db
    .select({ id: listenings.id, audioKey: listenings.audioKey })
    .from(listenings)
    .where(eq(listenings.id, listeningId))
    .limit(1);

  if (!listeningRow) return c.json(mongoError("NOT_FOUND"), 404);

  // 2. Fetch all questions — totalQuestions from DB, not client (anti-cheat)
  const listeningQs = await db
    .select({ id: listeningQuestions.id, explanation: listeningQuestions.explanation })
    .from(listeningQuestions)
    .where(eq(listeningQuestions.listeningId, listeningId));

  const totalQuestions = listeningQs.length;
  if (totalQuestions === 0) {
    return c.json(mongoError("NO_QUESTIONS"), 422);
  }

  // 3. Fetch correct options — Map: questionId → correctOptionId
  const qIds = listeningQs.map((q) => q.id);
  const correctOptions = await db
    .select({
      id: listeningQuestionOptions.id,
      questionId: listeningQuestionOptions.questionId,
    })
    .from(listeningQuestionOptions)
    .where(
      and(
        inArray(listeningQuestionOptions.questionId, qIds),
        eq(listeningQuestionOptions.isCorrect, true),
      ),
    );

  const correctMap = new Map<number, number>(); // questionId → correctOptionId
  for (const opt of correctOptions) {
    correctMap.set(opt.questionId, opt.id);
  }

  const explanationMap = new Map<number, string | null>();
  for (const q of listeningQs) {
    explanationMap.set(q.id, q.explanation ?? null);
  }

  // 4. Score each submitted answer
  let correctCount = 0;
  const answerDetails: Array<{
    question_id: number;
    option_id: number;
    is_correct: boolean;
    explanation: string | null;
  }> = [];

  for (const answer of answers) {
    const isCorrect = correctMap.get(answer.question_id) === answer.option_id;
    if (isCorrect) correctCount++;
    answerDetails.push({
      question_id: answer.question_id,
      option_id: answer.option_id,
      is_correct: isCorrect,
      explanation: explanationMap.get(answer.question_id) ?? null,
    });
  }

  const bandScore = calculateBandScore(correctCount, totalQuestions);

  // 5. Save the submission
  await db.insert(userListeningSubmissions).values({
    userId,
    listeningId,
    answers: JSON.stringify(answers),
    correctCount,
    totalQuestions,
    bandScore,
    timeTakenSeconds: time_taken_seconds,
  });

  // 6. Update users.listeningScore only if new band > current (best-score-only)
  const [currentUser] = await db
    .select({ listeningScore: users.listeningScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (
    currentUser &&
    (currentUser.listeningScore === null || bandScore > currentUser.listeningScore)
  ) {
    await db
      .update(users)
      .set({ listeningScore: bandScore })
      .where(eq(users.id, userId));
  }

  // 7. Gamification — streak, quests, XP, coins
  const dateIso = new Date().toISOString().slice(0, 10);

  await recordActivity(db, userId, dateIso);

  const completedQuests = await incrementQuestProgress(db, userId, "listening", dateIso);

  const { skillXp, userXp, coins } = computeRewards(correctCount, bandScore);
  const [skillXpResult, userXpResult, coinsResult] = await Promise.all([
    awardSkillXp(db, userId, "listening", skillXp),
    awardUserXp(db, userId, userXp),
    awardCoins(db, userId, coins),
  ]);

  // Award quest completion bonuses (sequential — D1 is serial)
  for (const quest of completedQuests) {
    await awardUserXp(db, userId, quest.xpReward);
    await awardCoins(db, userId, quest.coinReward);
  }

  return c.json({
    correct_count: correctCount,
    total_questions: totalQuestions,
    band_score: bandScore,
    time_taken_seconds,
    answers: answerDetails,
    rewards: {
      skill_xp: skillXpResult.newXp,
      skill_level: skillXpResult.newLevel,
      leveled_up: skillXpResult.leveledUp,
      total_xp: userXpResult.totalXp,
      coins: coinsResult.coins,
    },
    completed_quests: completedQuests.map((q) => ({
      title: q.titleMn,
      xp_reward: q.xpReward,
      coin_reward: q.coinReward,
    })),
  });
}
