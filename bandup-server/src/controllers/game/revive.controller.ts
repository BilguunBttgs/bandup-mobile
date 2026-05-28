import type { Context } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { characters } from "../../db/schema";
import { spendCoins } from "../../lib/xp-engine";
import { mongoError } from "../../lib/errors";

export const reviveSchema = z.object({
  skill: z.enum(["reading", "listening", "writing", "speaking"]),
});

type ReviveInput = z.infer<typeof reviveSchema>;

const REVIVE_COST = 50;

type GameEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function reviveController(c: Context<GameEnv>): Promise<Response> {
  const userId = c.get("userId");
  const { skill } = await c.req.json<ReviveInput>();
  const db = createDb(c.env.DB);

  // Deduct coins first — abort early if balance is insufficient
  const { success, coins } = await spendCoins(db, userId, REVIVE_COST);
  if (!success) {
    return c.json({ ...mongoError("INSUFFICIENT_COINS"), coins }, 402);
  }

  // Restore the character — create it with full HP if it doesn't exist yet
  const [existing] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.skill, skill)))
    .limit(1);

  if (existing) {
    await db
      .update(characters)
      .set({ hp: 100, isAlive: true })
      .where(eq(characters.id, existing.id));
  } else {
    await db.insert(characters).values({ userId, skill, hp: 100, isAlive: true });
  }

  const [updated] = await db
    .select({
      skill: characters.skill,
      hp: characters.hp,
      xp: characters.xp,
      level: characters.level,
      isAlive: characters.isAlive,
      skinId: characters.skinId,
    })
    .from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.skill, skill)))
    .limit(1);

  return c.json({ character: updated, coins });
}
