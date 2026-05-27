import { and, eq, sql } from "drizzle-orm";
import { type Database } from "../db";
import { characters, userStats } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Skill = "reading" | "listening" | "writing" | "speaking";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a cumulative XP total to a level.
 * Formula: floor(1 + sqrt(xp / 100)), capped at 50.
 *
 * Reference points:
 *   0 XP  → level 1   (floor(1 + 0))
 *   100   → level 2   (floor(1 + 1))
 *   400   → level 3   (floor(1 + 2))
 *   2500  → level 6   (floor(1 + 5))
 *   240100 → level 50 (49^2 * 100)
 */
export function xpToLevel(xp: number): number {
  return Math.min(50, Math.floor(1 + Math.sqrt(xp / 100)));
}

/**
 * Returns the minimum XP needed to reach a given level.
 * Formula: (level - 1)^2 * 100.
 *
 * Inverse of xpToLevel — levelToXpThreshold(xpToLevel(xp)) <= xp always holds.
 *
 * Reference points:
 *   level 1  →      0 XP
 *   level 2  →    100 XP
 *   level 10 →   8100 XP
 *   level 50 → 240100 XP
 */
export function levelToXpThreshold(level: number): number {
  return (level - 1) ** 2 * 100;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Adds `xpAmount` to the character row for (userId, skill).
 * If no character row exists yet, one is created automatically.
 * Returns the new XP total, the new level, and whether a level-up occurred.
 *
 * Callers are responsible for creating the drizzle db via createDb(c.env.DB).
 */
export async function awardSkillXp(
  db: Database,
  userId: number,
  skill: Skill,
  xpAmount: number,
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const [char] = await db
    .select({ id: characters.id, xp: characters.xp, level: characters.level })
    .from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.skill, skill)))
    .limit(1);

  if (char) {
    const newXp = char.xp + xpAmount;
    const newLevel = xpToLevel(newXp);
    await db
      .update(characters)
      .set({ xp: newXp, level: newLevel })
      .where(eq(characters.id, char.id));
    return { newXp, newLevel, leveledUp: newLevel > char.level };
  }

  // No character yet — create one with default HP/level derived from the XP
  const newXp = xpAmount;
  const newLevel = xpToLevel(newXp);
  await db.insert(characters).values({ userId, skill, xp: newXp, level: newLevel });
  // A brand-new character starts at level 1; only level up if xpAmount pushed past level 1
  return { newXp, newLevel, leveledUp: newLevel > 1 };
}

/**
 * Adds `xpAmount` to user_stats.totalXp.
 * Upserts the row if it doesn't exist yet.
 * Returns the new totalXp.
 */
export async function awardUserXp(
  db: Database,
  userId: number,
  xpAmount: number,
): Promise<{ totalXp: number }> {
  await db
    .insert(userStats)
    .values({ userId, totalXp: xpAmount })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { totalXp: sql`${userStats.totalXp} + ${xpAmount}` },
    });

  const [row] = await db
    .select({ totalXp: userStats.totalXp })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  return { totalXp: row?.totalXp ?? xpAmount };
}

/**
 * Adds `amount` coins to user_stats.coins.
 * Upserts the row if it doesn't exist yet.
 * Returns the new coin balance.
 */
export async function awardCoins(
  db: Database,
  userId: number,
  amount: number,
): Promise<{ coins: number }> {
  await db
    .insert(userStats)
    .values({ userId, coins: amount })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { coins: sql`${userStats.coins} + ${amount}` },
    });

  const [row] = await db
    .select({ coins: userStats.coins })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  return { coins: row?.coins ?? amount };
}

/**
 * Deducts `amount` coins from user_stats.coins.
 * Returns success: false (and the unchanged balance) if the user's balance is
 * insufficient — callers must check this before proceeding with a purchase.
 */
export async function spendCoins(
  db: Database,
  userId: number,
  amount: number,
): Promise<{ coins: number; success: boolean }> {
  const [row] = await db
    .select({ coins: userStats.coins })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  const current = row?.coins ?? 0;
  if (current < amount) {
    return { coins: current, success: false };
  }

  const newCoins = current - amount;
  await db
    .update(userStats)
    .set({ coins: newCoins })
    .where(eq(userStats.userId, userId));

  return { coins: newCoins, success: true };
}
