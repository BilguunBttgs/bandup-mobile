import type { Context } from "hono";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { createDb } from "../../db";
import { userInventory, shopItems } from "../../db/schema";
import { mongoError } from "../../lib/errors";

export const equipSchema = z.object({
  inventoryId: z.number().int().positive(),
});

type EquipInput = z.infer<typeof equipSchema>;

type ShopEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function equipController(c: Context<ShopEnv>): Promise<Response> {
  const userId = c.get("userId");
  const { inventoryId } = await c.req.json<EquipInput>();
  const db = createDb(c.env.DB);

  // Fetch the inventory row + item type in one join
  const [row] = await db
    .select({
      id: userInventory.id,
      userId: userInventory.userId,
      itemId: userInventory.itemId,
      type: shopItems.type,
    })
    .from(userInventory)
    .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
    .where(and(eq(userInventory.id, inventoryId), eq(userInventory.userId, userId)))
    .limit(1);

  if (!row) {
    return c.json(mongoError("NOT_FOUND"), 404);
  }

  if (row.type === "booster") {
    return c.json(mongoError("BOOSTER_NOT_EQUIPPABLE"), 400);
  }

  // Unequip all other cosmetics of the same type for this user, then equip the target
  const sameTypeIds = await db
    .select({ id: userInventory.id })
    .from(userInventory)
    .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
    .where(
      and(
        eq(userInventory.userId, userId),
        eq(shopItems.type, row.type),
        ne(userInventory.id, inventoryId),
      ),
    );

  for (const { id } of sameTypeIds) {
    await db.update(userInventory).set({ isEquipped: false }).where(eq(userInventory.id, id));
  }

  await db.update(userInventory).set({ isEquipped: true }).where(eq(userInventory.id, inventoryId));

  // Return the full updated inventory
  const inventory = await db
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

  return c.json({ inventory });
}
