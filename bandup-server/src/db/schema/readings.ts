import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
