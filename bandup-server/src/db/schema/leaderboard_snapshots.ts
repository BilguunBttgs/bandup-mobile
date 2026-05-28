import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// ─── Leaderboard Snapshots ────────────────────────────────────────────────────
// Weekly top-10 snapshot captured every Monday at 00:00 UTC by the cron job.
// snapshotDate is the ISO date of the Monday the snapshot was taken.

export const leaderboardSnapshots = sqliteTable("leaderboard_snapshots", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  totalXp: integer("total_xp").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;
export type NewLeaderboardSnapshot = typeof leaderboardSnapshots.$inferInsert;
