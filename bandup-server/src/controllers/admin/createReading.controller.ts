import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../../db";
import { readings, questions, questionOptions } from "../../db/schema";

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

export const createReadingSchema = z.object({
  title: z.string().min(1).max(200),
  passage: z.string().min(1),
  level: z.enum(["easy", "medium", "hard"]),
  // Suggested defaults: easy=300, medium=1200, hard=1500 (seconds)
  timer_seconds: z.number().int().positive(),
  questions: z
    .array(questionSchema)
    .min(1, "A reading must have at least one question"),
});

type CreateReadingInput = z.infer<typeof createReadingSchema>;

export async function createReadingController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const body = await c.req.json<CreateReadingInput>();
  const db = createDb(c.env.DB);

  // Insert reading → questions → options sequentially.
  // NOTE: Cloudflare D1 does not support interactive transactions over the
  // Workers binding (SQL `BEGIN TRANSACTION`/`SAVEPOINT` are rejected), and
  // `db.batch()` can't be used here because each question's auto-generated id
  // is needed as the FK for its options. So these run as plain sequential
  // inserts — not atomic. A mid-way failure can leave a partial reading.
  const [newReading] = await db
    .insert(readings)
    .values({
      title: body.title,
      passage: body.passage,
      level: body.level,
      timerSeconds: body.timer_seconds,
    })
    .returning({ id: readings.id });

  for (const q of body.questions) {
    const [newQuestion] = await db
      .insert(questions)
      .values({
        readingId: newReading.id,
        order: q.order,
        text: q.text,
        type: q.type,
        explanation: q.explanation ?? null,
      })
      .returning({ id: questions.id });

    await db.insert(questionOptions).values(
      q.options.map((opt) => ({
        questionId: newQuestion.id,
        label: opt.label,
        text: opt.text,
        isCorrect: opt.is_correct,
      })),
    );
  }

  const newReadingId = newReading.id;

  return c.json({ id: newReadingId, message: "Reading created successfully" }, 201);
}
