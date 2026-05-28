import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { shopItems } from "../../db/schema";

type ShopEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function listItemsController(c: Context<ShopEnv>): Promise<Response> {
  const db = createDb(c.env.DB);

  const items = await db
    .select()
    .from(shopItems)
    .where(eq(shopItems.isAvailable, true));

  return c.json(items);
}
