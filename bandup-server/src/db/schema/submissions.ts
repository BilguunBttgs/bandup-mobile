import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { readings } from "./readings";

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
