import type { Context } from "hono";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { readings, questions, userReadingSubmissions } from "../../db/schema";

export const listQuerySchema = z.object({
  level: z.enum(["easy", "medium", "hard"]).optional(),
});

type ListQuery = z.infer<typeof listQuerySchema>;

type ReadingEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function listReadingsController(
  c: Context<ReadingEnv>,
): Promise<Response> {
  const level = c.req.query("level") as ListQuery["level"];
  const userId = c.get("userId");
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
  const readingIds = allReadings.map((r) => r.id);
  const allQuestionRows = await db
    .select({ readingId: questions.readingId })
    .from(questions)
    .where(inArray(questions.readingId, readingIds));

  const countMap = new Map<number, number>();
  for (const q of allQuestionRows) {
    countMap.set(q.readingId, (countMap.get(q.readingId) ?? 0) + 1);
  }

  // Which of these readings has this user already submitted, and their best
  // band score per reading. Reduced in JS to avoid a GROUP BY.
  const submissionRows = await db
    .select({
      readingId: userReadingSubmissions.readingId,
      bandScore: userReadingSubmissions.bandScore,
    })
    .from(userReadingSubmissions)
    .where(
      and(
        eq(userReadingSubmissions.userId, userId),
        inArray(userReadingSubmissions.readingId, readingIds),
      ),
    );

  const bestBandMap = new Map<number, number>();
  for (const s of submissionRows) {
    const prev = bestBandMap.get(s.readingId);
    if (prev === undefined || s.bandScore > prev) {
      bestBandMap.set(s.readingId, s.bandScore);
    }
  }

  return c.json(
    allReadings.map((r) => ({
      ...r,
      questionCount: countMap.get(r.id) ?? 0,
      completed: bestBandMap.has(r.id),
      bestBandScore: bestBandMap.get(r.id) ?? null,
    })),
  );
}
