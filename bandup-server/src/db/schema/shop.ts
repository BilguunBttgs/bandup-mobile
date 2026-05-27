import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// ─── Shop Items ───────────────────────────────────────────────────────────────
// Catalogue of purchasable items. Types:
//   booster             — temporary gameplay effect (e.g. "xp_multiplier_2x")
//   cosmetic_profile    — profile avatar / frame skin
//   cosmetic_character  — character skin referenced by characters.skin_id

export const shopItems = sqliteTable("shop_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  nameMn: text("name_mn").notNull(),
  descriptionMn: text("description_mn").notNull(),
  type: text("type", {
    enum: ["booster", "cosmetic_profile", "cosmetic_character"],
  }).notNull(),
  // Identifies what the item does; null for pure cosmetics with no game effect
  effectKey: text("effect_key"),
  priceCoin: integer("price_coin").notNull(),
  iconKey: text("icon_key").notNull(),   // key used by the client to resolve the asset
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
});

export type ShopItem = typeof shopItems.$inferSelect;
export type NewShopItem = typeof shopItems.$inferInsert;

// ─── User Inventory ───────────────────────────────────────────────────────────
// Records each purchase. expiresAt is non-null for time-limited boosters.
// isEquipped tracks which cosmetic is currently active; application code must
// enforce at-most-one equipped per slot.

export const userInventory = sqliteTable("user_inventory", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemId: integer("item_id", { mode: "number" })
    .notNull()
    .references(() => shopItems.id, { onDelete: "cascade" }),
  purchasedAt: integer("purchased_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: "timestamp" }),  // null = permanent
  isEquipped: integer("is_equipped", { mode: "boolean" }).notNull().default(false),
});

export type UserInventoryItem = typeof userInventory.$inferSelect;
export type NewUserInventoryItem = typeof userInventory.$inferInsert;
