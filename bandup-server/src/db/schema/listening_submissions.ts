import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { listenings } from "./listenings";

// ─── User Listening Submissions ───────────────────────────────────────────────
// Mirrors user_reading_submissions. Retakes are allowed; best-score logic in app.

export const userListeningSubmissions = sqliteTable("user_listening_submissions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  listeningId: integer("listening_id", { mode: "number" })
    .notNull()
    .references(() => listenings.id, { onDelete: "cascade" }),
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

export type UserListeningSubmission = typeof userListeningSubmissions.$inferSelect;
export type NewUserListeningSubmission = typeof userListeningSubmissions.$inferInsert;
