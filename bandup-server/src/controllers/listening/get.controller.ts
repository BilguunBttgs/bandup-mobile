import type { Context } from "hono";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../../db";
import { listenings, listeningQuestions, listeningQuestionOptions } from "../../db/schema";
import { getAudioPresignUrl } from "../../lib/r2-audio";

type ListeningEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function getListeningController(
  c: Context<ListeningEnv>,
): Promise<Response> {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid listening ID" }, 400);

  const db = createDb(c.env.DB);

  const [listeningRow] = await db
    .select()
    .from(listenings)
    .where(eq(listenings.id, id))
    .limit(1);

  if (!listeningRow) return c.json({ error: "Listening not found" }, 404);

  // Questions ordered by display position; explanation withheld until submission
  const qs = await db
    .select({
      id: listeningQuestions.id,
      order: listeningQuestions.order,
      text: listeningQuestions.text,
      type: listeningQuestions.type,
    })
    .from(listeningQuestions)
    .where(eq(listeningQuestions.listeningId, id));

  const questionIds = qs.map((q) => q.id);

  // Options — isCorrect deliberately NOT selected
  const opts =
    questionIds.length > 0
      ? await db
          .select({
            id: listeningQuestionOptions.id,
            questionId: listeningQuestionOptions.questionId,
            label: listeningQuestionOptions.label,
            text: listeningQuestionOptions.text,
          })
          .from(listeningQuestionOptions)
          .where(inArray(listeningQuestionOptions.questionId, questionIds))
      : [];

  const optsByQuestion = new Map<number, typeof opts>();
  for (const opt of opts) {
    const arr = optsByQuestion.get(opt.questionId) ?? [];
    arr.push(opt);
    optsByQuestion.set(opt.questionId, arr);
  }

  // Presigned GET URL for the audio file — expires in 1 hour
  const audioUrl = await getAudioPresignUrl(c.env.AUDIO_BUCKET, listeningRow.audioKey);

  return c.json({
    id: listeningRow.id,
    title: listeningRow.title,
    level: listeningRow.level,
    durationSeconds: listeningRow.durationSeconds,
    audioUrl,
    questions: qs.map((q) => ({
      ...q,
      options: optsByQuestion.get(q.id) ?? [],
    })),
  });
}
