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
  requiredCount: integer("required_count").notNull(), // how many times to complete the activity
  xpReward: integer("xp_reward").notNull(),
  coinReward: integer("coin_reward").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;

// ─── User Quests ──────────────────────────────────────────────────────────────
// Tracks a user's daily progress on a quest template. One row per
// (userId, questId, date) in practice — uniqueness enforced in application code.

export const userQuests = sqliteTable("user_quests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questId: integer("quest_id", { mode: "number" })
    .notNull()
    .references(() => quests.id, { onDelete: "cascade" }),
  // ISO date YYYY-MM-DD — which day this quest instance was assigned
  date: text("date").notNull(),
  progress: integer("progress").notNull().default(0),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type UserQuest = typeof userQuests.$inferSelect;
export type NewUserQuest = typeof userQuests.$inferInsert;
