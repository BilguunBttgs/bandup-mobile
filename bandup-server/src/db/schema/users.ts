import { sql } from "drizzle-orm";
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
