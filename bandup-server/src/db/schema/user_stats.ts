import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// ─── User Stats ───────────────────────────────────────────────────────────────
// One row per user (enforced by unique constraint on user_id). Tracks lifetime
// XP, coin balance, and the current login/activity streak.

export const userStats = sqliteTable("user_stats", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  // ISO date string YYYY-MM-DD; null until the user completes their first activity
  lastActivityDate: text("last_activity_date"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;
