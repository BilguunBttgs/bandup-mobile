import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─── Listenings ───────────────────────────────────────────────────────────────
// An audio-based exercise. The audio file is stored in R2 (audioKey is the R2
// object key); presigned GET URLs are generated per-request in the route handler.
//
// transcript is withheld from GET /listening/:id — only returned post-submission
// so learners cannot read their way through a listening exercise.
//
// Design note: listening questions live in a separate listening_questions table
// (see listening_questions.ts) rather than reusing the existing questions table,
// because questions.readingId is NOT NULL — making it nullable would require
// changing existing code and lose the DB-level guarantee. Separate tables keep
// each exercise type self-contained and leave reading code untouched.

export const listenings = sqliteTable("listenings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  // R2 object key — e.g. "listening/easy/climate-intro.mp3"
  audioKey: text("audio_key").notNull(),
  // Full transcript; null until explicitly added; NEVER returned in GET before submission
  transcript: text("transcript"),
  level: text("level", { enum: ["easy", "medium", "hard"] }).notNull(),
  // Audio length in seconds; shown to the client as a playback hint
  durationSeconds: integer("duration_seconds").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Listening = typeof listenings.$inferSelect;
export type NewListening = typeof listenings.$inferInsert;
