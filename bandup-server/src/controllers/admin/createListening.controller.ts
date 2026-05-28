import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../../db";
import { listenings, listeningQuestions, listeningQuestionOptions } from "../../db/schema";
import { getListeningUploadUrl } from "../../lib/r2-audio";
// ─── Audio upload flow ────────────────────────────────────────────────────────
// Two-step process for adding a new listening exercise:
//
//   Step 1 — Request an upload URL (optional shortcut):
//     POST /admin/listenings  { ..., audioKey: null }
//     → server returns { uploadUrl, audioKey } (presigned PUT, valid 10 min)
//     → client PUTs the audio file directly to R2 at uploadUrl
//
//   Step 2 — Create the record with the confirmed key:
//     POST /admin/listenings  { ..., audioKey: "listening/easy/<uuid>.webm" }
//     → server inserts the DB row (audioKey must already exist in R2)
//     → returns { id, message }
//
// If audioKey is omitted/null the server generates a key under
// listening/{level}/{uuid}.webm, returns the presigned PUT URL, and does NOT
// insert a DB row. Re-call with the same audioKey to create the record.
// ─────────────────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  label: z.string().min(1).max(20),
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  order: z.number().int().nonnegative(),
  text: z.string().min(1),
  type: z.enum(["multiple_choice", "true_false_not_given"]),
  explanation: z.string().optional(),
  options: z
    .array(optionSchema)
    .min(2, "A question must have at least 2 options")
    .refine((opts) => opts.filter((o) => o.is_correct).length === 1, {
      message: "Exactly one option per question must have is_correct: true",
    }),
});

export const createListeningSchema = z.object({
  title: z.string().min(1).max(200),
  // Omit audioKey (or pass null) to receive a presigned PUT URL instead of inserting.
  audioKey: z.string().min(1).nullable().optional(),
  transcript: z.string().optional(),
  level: z.enum(["easy", "medium", "hard"]),
  duration_seconds: z.number().int().positive(),
  questions: z
    .array(questionSchema)
    .min(1, "A listening must have at least one question"),
});

type CreateListeningInput = z.infer<typeof createListeningSchema>;

export async function createListeningController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const body = await c.req.json<CreateListeningInput>();

  // ── Step 1: no audioKey yet — generate a presigned PUT URL for upload ────────
  if (!body.audioKey) {
    const { uploadUrl, audioKey } = await getListeningUploadUrl(
      c.env.AUDIO_BUCKET,
      body.level,
    );
    return c.json(
      {
        message: "Upload the audio file to uploadUrl, then re-call this endpoint with audioKey.",
        uploadUrl,
        audioKey,
      },
      200,
    );
  }

  // ── Step 2: audioKey provided — insert the record ────────────────────────────
  const db = createDb(c.env.DB);

  const newListeningId = await db.transaction(async (tx) => {
    const [newListening] = await tx
      .insert(listenings)
      .values({
        title: body.title,
        audioKey: body.audioKey!,
        transcript: body.transcript ?? null,
        level: body.level,
        durationSeconds: body.duration_seconds,
      })
      .returning({ id: listenings.id });

    for (const q of body.questions) {
      const [newQuestion] = await tx
        .insert(listeningQuestions)
        .values({
          listeningId: newListening.id,
          order: q.order,
          text: q.text,
          type: q.type,
          explanation: q.explanation ?? null,
        })
        .returning({ id: listeningQuestions.id });

      await tx.insert(listeningQuestionOptions).values(
        q.options.map((opt) => ({
          questionId: newQuestion.id,
          label: opt.label,
          text: opt.text,
          isCorrect: opt.is_correct,
        })),
      );
    }

    return newListening.id;
  });

  return c.json({ id: newListeningId, message: "Listening created successfully" }, 201);
}
