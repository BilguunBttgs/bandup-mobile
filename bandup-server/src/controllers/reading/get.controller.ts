import type { Context } from "hono";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { readings, questions, questionOptions } from "../../db/schema";

type ReadingEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function getReadingController(
  c: Context<ReadingEnv>,
): Promise<Response> {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid reading ID" }, 400);

  const db = createDb(c.env.DB);

  // Use "readingRow" to avoid shadowing outer names
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
}
