import type { Context } from "hono";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import {
  readings,
  questions,
  questionOptions,
  users,
  userReadingSubmissions,
} from "../../db/schema";
import { calculateBandScore } from "../../lib/band-score";

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

type ReadingEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function submitReadingController(
  c: Context<ReadingEnv>,
): Promise<Response> {
  const readingId = Number(c.req.param("id"));
  if (isNaN(readingId)) return c.json({ error: "Invalid reading ID" }, 400);

  const { answers, time_taken_seconds } = await c.req.json<SubmitInput>();
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
        eq(questionOptions.isCorrect, true),
      ),
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
}
