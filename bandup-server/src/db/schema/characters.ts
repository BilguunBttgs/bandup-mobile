import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// ─── Characters ───────────────────────────────────────────────────────────────
// Each user can have one character per skill (reading, listening, writing,
// speaking). HP starts at 100 and decreases on wrong answers; XP drives the
// level-up curve. skinId links to a cosmetic purchased from the shop.

export const characters = sqliteTable("characters", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  skill: text("skill", {
    enum: ["reading", "listening", "writing", "speaking"],
  }).notNull(),
  hp: integer("hp").notNull().default(100),       // current HP; max 100
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  skinId: text("skin_id"),                        // nullable — FK resolved in app layer
  isAlive: integer("is_alive", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
