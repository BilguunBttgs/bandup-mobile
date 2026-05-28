import type { Context } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { shopItems, userInventory } from "../../db/schema";
import { spendCoins } from "../../lib/xp-engine";
import { mongoError } from "../../lib/errors";

export const buySchema = z.object({
  itemId: z.number().int().positive(),
});

type BuyInput = z.infer<typeof buySchema>;

type ShopEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

const BOOSTER_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function buyController(c: Context<ShopEnv>): Promise<Response> {
  const userId = c.get("userId");
  const { itemId } = await c.req.json<BuyInput>();
  const db = createDb(c.env.DB);

  const [item] = await db
    .select()
    .from(shopItems)
    .where(and(eq(shopItems.id, itemId), eq(shopItems.isAvailable, true)))
    .limit(1);

  if (!item) {
    return c.json(mongoError("NOT_FOUND"), 404);
  }

  const { success, coins } = await spendCoins(db, userId, item.priceCoin);
  if (!success) {
    return c.json({ ...mongoError("INSUFFICIENT_COINS"), coins }, 402);
  }

  const expiresAt =
    item.type === "booster" && item.effectKey
      ? new Date(Date.now() + BOOSTER_DURATION_MS)
      : null;

  const [inserted] = await db
    .insert(userInventory)
    .values({ userId, itemId, expiresAt })
    .returning();

  const inventoryItem = {
    id: inserted.id,
    itemId: inserted.itemId,
    purchasedAt: inserted.purchasedAt,
    expiresAt: inserted.expiresAt,
    isEquipped: inserted.isEquipped,
    nameMn: item.nameMn,
    descriptionMn: item.descriptionMn,
    type: item.type,
    effectKey: item.effectKey,
    iconKey: item.iconKey,
  };

  return c.json({ success: true, inventory: inventoryItem, coins });
}
