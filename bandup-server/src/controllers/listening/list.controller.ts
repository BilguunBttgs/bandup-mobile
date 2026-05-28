import type { Context } from "hono";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { listenings, listeningQuestions } from "../../db/schema";

export const listQuerySchema = z.object({
  level: z.enum(["easy", "medium", "hard"]).optional(),
});

type ListQuery = z.infer<typeof listQuerySchema>;

type ListeningEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function listListeningsController(
  c: Context<ListeningEnv>,
): Promise<Response> {
  const level = c.req.query("level") as ListQuery["level"];
  const db = createDb(c.env.DB);

  const allListenings = await db
    .select({
      id: listenings.id,
      title: listenings.title,
      level: listenings.level,
      durationSeconds: listenings.durationSeconds,
    })
    .from(listenings)
    .where(level ? eq(listenings.level, level) : undefined);

  if (allListenings.length === 0) return c.json([]);

  // Count questions per listening in JS — avoids GROUP BY / subquery
  const listeningIds = allListenings.map((l) => l.id);
  const allQuestionRows = await db
    .select({ listeningId: listeningQuestions.listeningId })
    .from(listeningQuestions)
    .where(inArray(listeningQuestions.listeningId, listeningIds));

  const countMap = new Map<number, number>();
  for (const q of allQuestionRows) {
    countMap.set(q.listeningId, (countMap.get(q.listeningId) ?? 0) + 1);
  }

  return c.json(
    allListenings.map((l) => ({
      ...l,
      questionCount: countMap.get(l.id) ?? 0,
    })),
  );
}
