import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { readings } from "./readings";

// ─── Questions ────────────────────────────────────────────────────────────────
// Each question belongs to one reading.
// Supported types:
//   multiple_choice       — 4 options (A/B/C/D), exactly one is correct
//   true_false_not_given  — 3 options (True/False/Not Given), exactly one is correct

export const questions = sqliteTable("questions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  readingId: integer("reading_id", { mode: "number" })
    .notNull()
    .references(() => readings.id, { onDelete: "cascade" }),
  order: integer("order").notNull(), // display order within the reading (0-based)
  text: text("text").notNull(),
  type: text("type", { enum: ["multiple_choice", "true_false_not_given"] }).notNull(),
  // Explanation of why the correct answer is correct; shown only after submission
  explanation: text("explanation"),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

// ─── Question Options ─────────────────────────────────────────────────────────
// Answer choices for a question.
//   Multiple choice:      label = "A"|"B"|"C"|"D"
//   True/False/Not Given: label = "True"|"False"|"Not Given", text mirrors the label

export const questionOptions = sqliteTable("question_options", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  questionId: integer("question_id", { mode: "number" })
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "A"/"B"/"C"/"D" or "True"/"False"/"Not Given"
  text: text("text").notNull(),
  // Stored in DB but NEVER returned to the client in GET routes — only used server-side
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
});

export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;
