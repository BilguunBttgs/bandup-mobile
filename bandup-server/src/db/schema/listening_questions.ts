import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { listenings } from "./listenings";

// ─── Listening Questions ──────────────────────────────────────────────────────
// Mirrors the shape of the questions + question_options tables but belongs
// exclusively to listenings (separate table; see listenings.ts for the rationale).

export const listeningQuestions = sqliteTable("listening_questions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  listeningId: integer("listening_id", { mode: "number" })
    .notNull()
    .references(() => listenings.id, { onDelete: "cascade" }),
  order: integer("order").notNull(), // display order within the listening (0-based)
  text: text("text").notNull(),
  type: text("type", { enum: ["multiple_choice", "true_false_not_given"] }).notNull(),
  explanation: text("explanation"),
});

export type ListeningQuestion = typeof listeningQuestions.$inferSelect;
export type NewListeningQuestion = typeof listeningQuestions.$inferInsert;

// ─── Listening Question Options ───────────────────────────────────────────────

export const listeningQuestionOptions = sqliteTable("listening_question_options", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  questionId: integer("question_id", { mode: "number" })
    .notNull()
    .references(() => listeningQuestions.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "A"/"B"/"C"/"D" or "True"/"False"/"Not Given"
  text: text("text").notNull(),
  // Stored in DB but NEVER returned to the client in GET routes
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
});

export type ListeningQuestionOption = typeof listeningQuestionOptions.$inferSelect;
export type NewListeningQuestionOption = typeof listeningQuestionOptions.$inferInsert;
