import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../db";
import { readings, questions, questionOptions } from "../db/schema";

const admin = new Hono<{ Bindings: CloudflareBindings }>();

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Checks the X-Admin-Key header against ADMIN_API_KEY from the environment.
// Applied to every route in this file.

admin.use("*", async (c, next) => {
  const key = c.req.header("X-Admin-Key");
  if (!key || key !== c.env.ADMIN_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// ─── POST /admin/readings ─────────────────────────────────────────────────────
// Creates a full reading with all questions and options in one atomic request.
// Uses db.transaction() so either everything is saved or nothing is.

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
    .refine(
      (opts) => opts.filter((o) => o.is_correct).length === 1,
      { message: "Exactly one option per question must have is_correct: true" }
    ),
});

const createReadingSchema = z.object({
  title: z.string().min(1).max(200),
  passage: z.string().min(1),
  level: z.enum(["easy", "medium", "hard"]),
  // Suggested defaults: easy=300, medium=1200, hard=1500 (seconds)
  timer_seconds: z.number().int().positive(),
  questions: z.array(questionSchema).min(1, "A reading must have at least one question"),
});

admin.post("/readings", zValidator("json", createReadingSchema), async (c) => {
  const body = c.req.valid("json");
  const db = createDb(c.env.DB);

  // Insert reading → questions → options atomically.
  // D1 transactions are serial — sequential for-loop, not Promise.all.
  const newReadingId = await db.transaction(async (tx) => {
    const [newReading] = await tx
      .insert(readings)
      .values({
        title: body.title,
        passage: body.passage,
        level: body.level,
        timerSeconds: body.timer_seconds,
      })
      .returning({ id: readings.id });

    for (const q of body.questions) {
      const [newQuestion] = await tx
        .insert(questions)
        .values({
          readingId: newReading.id,
          order: q.order,
          text: q.text,
          type: q.type,
          explanation: q.explanation ?? null,
        })
        .returning({ id: questions.id });

      await tx.insert(questionOptions).values(
        q.options.map((opt) => ({
          questionId: newQuestion.id,
          label: opt.label,
          text: opt.text,
          isCorrect: opt.is_correct,
        }))
      );
    }

    return newReading.id;
  });

  return c.json({ id: newReadingId, message: "Reading created successfully" }, 201);
});

// ─── GET /admin/readings ──────────────────────────────────────────────────────
// List all readings with question counts. No filter — admin sees everything.

admin.get("/readings", async (c) => {
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
    }))
  );
});

// ─── DELETE /admin/readings/:id ───────────────────────────────────────────────
// Deletes a reading. ON DELETE CASCADE removes questions, options, and
// user submissions automatically.

admin.delete("/readings/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid reading ID" }, 400);

  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: readings.id })
    .from(readings)
    .where(eq(readings.id, id))
    .limit(1);

  if (!existing) return c.json({ error: "Reading not found" }, 404);

  await db.delete(readings).where(eq(readings.id, id));

  return c.json({ message: "Reading deleted" });
});

export { admin };
