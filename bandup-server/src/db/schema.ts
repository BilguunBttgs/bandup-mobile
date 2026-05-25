import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // PBKDF2-hashed 4-digit PIN
  isOnboarding: integer("is_onboarding", { mode: "boolean" }).notNull().default(true),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  // IELTS band scores (0–9 in 0.5 increments), null = not yet assessed
  readingScore: real("reading_score"),
  listeningScore: real("listening_score"),
  speakingScore: real("speaking_score"),
  writingScore: real("writing_score"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── Readings ─────────────────────────────────────────────────────────────────
// A reading passage with an associated set of questions.
// Levels:
//   easy   — daily life topics, straightforward comprehension questions
//   medium — IELTS Academic passages with proper IELTS question types
//   hard   — SAT Academic passages with tricky, inference-heavy questions

export const readings = sqliteTable("readings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  passage: text("passage").notNull(),
  level: text("level", { enum: ["easy", "medium", "hard"] }).notNull(),
  // Timer duration shown to the client; suggested defaults: easy=300, medium=1200, hard=1500
  timerSeconds: integer("timer_seconds").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Reading = typeof readings.$inferSelect;
export type NewReading = typeof readings.$inferInsert;

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

// ─── User Reading Submissions ─────────────────────────────────────────────────
// Records a user's attempt at a reading. Retakes are allowed; no uniqueness
// constraint on (userId, readingId). Best-score logic lives in application code.

export const userReadingSubmissions = sqliteTable("user_reading_submissions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  readingId: integer("reading_id", { mode: "number" })
    .notNull()
    .references(() => readings.id, { onDelete: "cascade" }),
  // JSON array: [{ question_id: number, option_id: number }]
  answers: text("answers").notNull(),
  correctCount: integer("correct_count").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  bandScore: real("band_score").notNull(), // 0–9 in 0.5 steps
  timeTakenSeconds: integer("time_taken_seconds").notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type UserReadingSubmission = typeof userReadingSubmissions.$inferSelect;
export type NewUserReadingSubmission = typeof userReadingSubmissions.$inferInsert;

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(userReadingSubmissions),
}));

export const readingsRelations = relations(readings, ({ many }) => ({
  questions: many(questions),
  submissions: many(userReadingSubmissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  reading: one(readings, {
    fields: [questions.readingId],
    references: [readings.id],
  }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const userReadingSubmissionsRelations = relations(userReadingSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [userReadingSubmissions.userId],
    references: [users.id],
  }),
  reading: one(readings, {
    fields: [userReadingSubmissions.readingId],
    references: [readings.id],
  }),
}));
