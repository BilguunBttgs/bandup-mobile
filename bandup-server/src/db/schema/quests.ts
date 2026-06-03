import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// ─── Quest Templates ──────────────────────────────────────────────────────────
// Reusable quest definitions seeded by admins. Text is in Mongolian for the
// mobile app. skillTarget "any" means the quest counts activity across all
// skills.

export const quests = sqliteTable("quests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  titleMn: text("title_mn").notNull(),
  descriptionMn: text("description_mn").notNull(),
  skillTarget: text("skill_target", {
    enum: ["reading", "listening", "writing", "speaking", "any"],
  }).notNull(),
  // Period the quest stays active once assigned: a daily quest lives for one
  // calendar day, a weekly quest for the calendar week (Mon–Sun), a monthly
  // quest for the calendar month.
  questType: text("quest_type", {
    enum: ["daily", "weekly", "monthly"],
  })
    .notNull()
    .default("daily"),
  requiredCount: integer("required_count").notNull(), // how many times to complete the activity
  xpReward: integer("xp_reward").notNull(),
  coinReward: integer("coin_reward").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;

// ─── User Quests ──────────────────────────────────────────────────────────────
// Tracks a user's progress on a quest template for one active period. The
// quest is visible/active while today falls within [periodStart, periodEnd]
// (both ISO YYYY-MM-DD, inclusive). One row per (userId, questId, periodStart)
// in practice — uniqueness enforced in application code.

export const userQuests = sqliteTable("user_quests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questId: integer("quest_id", { mode: "number" })
    .notNull()
    .references(() => quests.id, { onDelete: "cascade" }),
  // Active window — ISO date YYYY-MM-DD, both inclusive.
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  progress: integer("progress").notNull().default(0),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type UserQuest = typeof userQuests.$inferSelect;
export type NewUserQuest = typeof userQuests.$inferInsert;
