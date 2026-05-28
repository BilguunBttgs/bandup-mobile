import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { userInventory, shopItems } from "../../db/schema";

type ShopEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function inventoryController(c: Context<ShopEnv>): Promise<Response> {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const items = await db
    .select({
      id: userInventory.id,
      itemId: userInventory.itemId,
      purchasedAt: userInventory.purchasedAt,
      expiresAt: userInventory.expiresAt,
      isEquipped: userInventory.isEquipped,
      nameMn: shopItems.nameMn,
      descriptionMn: shopItems.descriptionMn,
      type: shopItems.type,
      effectKey: shopItems.effectKey,
      iconKey: shopItems.iconKey,
    })
    .from(userInventory)
    .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
    .where(eq(userInventory.userId, userId));

  return c.json(items);
}
