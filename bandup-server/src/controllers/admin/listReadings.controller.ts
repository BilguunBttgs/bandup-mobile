import type { Context } from "hono";
import { inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { readings, questions } from "../../db/schema";

export async function listReadingsAdminController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const db = createDb(c.env.DB);

  const allReadings = await db
    .select({
      id: readings.id,
      title: readings.title,
      level: readings.level,
      timerSeconds: readings.timerSeconds,
      createdAt: readings.createdAt,
    })
    .from(readings);

  if (allReadings.length === 0) return c.json([]);

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
    })),
  );
}
