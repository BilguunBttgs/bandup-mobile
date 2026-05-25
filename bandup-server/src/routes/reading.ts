import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../db";
import {
  readings,
  questions,
  questionOptions,
  users,
  userReadingSubmissions,
} from "../db/schema";
import { authMiddleware } from "../lib/auth-middleware";
import { calculateBandScore } from "../lib/band-score";

const reading = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// All routes in this file require a valid JWT
reading.use("*", authMiddleware);

// ─── GET /reading?level=easy|medium|hard ──────────────────────────────────────
// Lightweight list — no passage, no answers.
// Returns: [{ id, title, level, timerSeconds, questionCount }]

const listQuerySchema = z.object({
  level: z.enum(["easy", "medium", "hard"]).optional(),
});

reading.get("/", zValidator("query", listQuerySchema), async (c) => {
  const { level } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const allReadings = await db
    .select({
      id: readings.id,
      title: readings.title,
      level: readings.level,
      timerSeconds: readings.timerSeconds,
    })
    .from(readings)
    .where(level ? eq(readings.level, level) : undefined);

  if (allReadings.length === 0) return c.json([]);

  // Count questions per reading in JS — avoids a GROUP BY / subquery
  // Guard: inArray with empty array generates invalid SQL
  const readingIds = allReadings.map((r) => r.id);
  const allQuestionRows = await db
    .select({ readingId: questions.readingId })
    .from(questions)
    .where(inArray(questions.readingId, readingIds));

  const countMap = new Map<number, number>();
  for (const q of allQuestionRows) {
    countMap.set(q.readingId, (countMap.get(q.readingId) ?? 0) + 1);
  }

  return c.json(
    allReadings.map((r) => ({
      ...r,
      questionCount: countMap.get(r.id) ?? 0,
    }))
  );
});

// ─── GET /reading/:id ─────────────────────────────────────────────────────────
// Full reading: passage + questions + options.
// isCorrect is NEVER included in options — that's server-only data.

reading.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid reading ID" }, 400);

  const db = createDb(c.env.DB);

  // Use "readingRow" to avoid shadowing the Hono router constant "reading"
  const [readingRow] = await db
    .select()
    .from(readings)
    .where(eq(readings.id, id))
    .limit(1);

  if (!readingRow) return c.json({ error: "Reading not found" }, 404);

  // Questions ordered by display position; explanation withheld until submission
  const qs = await db
    .select({
      id: questions.id,
      order: questions.order,
      text: questions.text,
      type: questions.type,
    })
    .from(questions)
    .where(eq(questions.readingId, id));

  const questionIds = qs.map((q) => q.id);

  // Options — isCorrect deliberately NOT selected
  const opts =
    questionIds.length > 0
      ? await db
          .select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            label: questionOptions.label,
            text: questionOptions.text,
          })
          .from(questionOptions)
          .where(inArray(questionOptions.questionId, questionIds))
      : [];

  // Group options by questionId
  const optsByQuestion = new Map<number, typeof opts>();
  for (const opt of opts) {
    const arr = optsByQuestion.get(opt.questionId) ?? [];
    arr.push(opt);
    optsByQuestion.set(opt.questionId, arr);
  }

  return c.json({
    id: readingRow.id,
    title: readingRow.title,
    passage: readingRow.passage,
    level: readingRow.level,
    timerSeconds: readingRow.timerSeconds,
    questions: qs.map((q) => ({
      ...q,
      options: optsByQuestion.get(q.id) ?? [],
    })),
  });
});

// ─── POST /reading/:id/submit ─────────────────────────────────────────────────
// Body: { answers: [{question_id, option_id}], time_taken_seconds }
// Scores the submission, saves it, and updates the user's best reading score.

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.number().int().positive(),
        option_id: z.number().int().positive(),
      })
    )
    .min(1, "At least one answer is required"),
  time_taken_seconds: z.number().int().nonnegative(),
});

reading.post("/:id/submit", zValidator("json", submitSchema), async (c) => {
  const readingId = Number(c.req.param("id"));
  if (isNaN(readingId)) return c.json({ error: "Invalid reading ID" }, 400);

  const { answers, time_taken_seconds } = c.req.valid("json");
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  // 1. Confirm the reading exists
  const [readingRow] = await db
    .select({ id: readings.id })
    .from(readings)
    .where(eq(readings.id, readingId))
    .limit(1);

  if (!readingRow) return c.json({ error: "Reading not found" }, 404);

  // 2. Fetch all questions for this reading.
  //    totalQuestions comes from the DB — not the client's answer count (anti-cheat).
  const readingQuestions = await db
    .select({ id: questions.id, explanation: questions.explanation })
    .from(questions)
    .where(eq(questions.readingId, readingId));

  const totalQuestions = readingQuestions.length;
  if (totalQuestions === 0) {
    return c.json({ error: "This reading has no questions yet" }, 422);
  }

  // 3. Fetch the correct option for every question in this reading.
  //    Build a Map: questionId → correctOptionId
  const qIds = readingQuestions.map((q) => q.id);
  const correctOptions = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
    })
    .from(questionOptions)
    .where(
      and(
        inArray(questionOptions.questionId, qIds),
        eq(questionOptions.isCorrect, true)
      )
    );

  const correctMap = new Map<number, number>(); // questionId → correctOptionId
  for (const opt of correctOptions) {
    correctMap.set(opt.questionId, opt.id);
  }

  // Build a Map: questionId → explanation (for the response)
  const explanationMap = new Map<number, string | null>();
  for (const q of readingQuestions) {
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
  await db.insert(userReadingSubmissions).values({
    userId,
    readingId,
    answers: JSON.stringify(answers),
    correctCount,
    totalQuestions,
    bandScore,
    timeTakenSeconds: time_taken_seconds,
  });

  // 6. Update users.readingScore only if new band > current (best-score-only)
  const [currentUser] = await db
    .select({ readingScore: users.readingScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (
    currentUser &&
    (currentUser.readingScore === null || bandScore > currentUser.readingScore)
  ) {
    await db
      .update(users)
      .set({ readingScore: bandScore })
      .where(eq(users.id, userId));
  }

  return c.json({
    correct_count: correctCount,
    total_questions: totalQuestions,
    band_score: bandScore,
    time_taken_seconds,
    answers: answerDetails,
  });
});

export { reading };
