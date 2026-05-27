import { and, eq, gt, lt } from "drizzle-orm";
import { type Database } from "../db";
import { characters, userStats } from "../db/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

/** HP deducted from every character when a streak is broken. */
export const HP_DAMAGE_PER_MISS = 20;

// ─── Date helpers (pure, no side-effects) ────────────────────────────────────

/** Returns the ISO date string for the day before `dateIso` (UTC). */
function yesterday(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Returns today's ISO date string in UTC (YYYY-MM-DD). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records that `userId` was active on `dateIso` (YYYY-MM-DD).
 *
 * Streak rules:
 *   - lastActivityDate == today   → no-op   (already counted)
 *   - lastActivityDate == yesterday → +1 streak
 *   - lastActivityDate is older / null  → reset to 1
 *
 * Upserts the user_stats row if it doesn't exist yet.
 * Returns the resulting streakDays and whether the state actually changed.
 */
export async function recordActivity(
  db: Database,
  userId: number,
  dateIso: string,
): Promise<{ streakDays: number; wasNew: boolean }> {
  const [row] = await db
    .select({
      streakDays: userStats.streakDays,
      lastActivityDate: userStats.lastActivityDate,
    })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  // Already recorded today — nothing to do
  if (row?.lastActivityDate === dateIso) {
    return { streakDays: row.streakDays, wasNew: false };
  }

  const newStreakDays =
    row?.lastActivityDate === yesterday(dateIso) ? row.streakDays + 1 : 1;

  if (row) {
    await db
      .update(userStats)
      .set({ streakDays: newStreakDays, lastActivityDate: dateIso })
      .where(eq(userStats.userId, userId));
  } else {
    // First-ever activity for this user
    await db
      .insert(userStats)
      .values({ userId, streakDays: newStreakDays, lastActivityDate: dateIso });
  }

  return { streakDays: newStreakDays, wasNew: true };
}

/**
 * Cron handler — should be called once daily (e.g. at midnight UTC).
 *
 * Finds every user whose lastActivityDate is before today AND whose streak is
 * still > 0, then inside a single transaction:
 *   1. Resets their streakDays to 0.
 *   2. Deals HP_DAMAGE_PER_MISS HP to each of their characters.
 *   3. Sets isAlive = false on any character whose HP reaches 0.
 *
 * D1 transactions are serial — sequential for-loops, never Promise.all.
 * Returns the number of user_stats rows that were reset.
 */
export async function applyMissedStreakDamage(
  db: Database,
): Promise<{ affected: number }> {
  const today = todayIso();

  // Collect affected users before opening the transaction
  const affectedStats = await db
    .select({ userId: userStats.userId })
    .from(userStats)
    .where(
      and(
        lt(userStats.lastActivityDate, today),
        gt(userStats.streakDays, 0),
      ),
    );

  if (affectedStats.length === 0) return { affected: 0 };

  await db.transaction(async (tx) => {
    for (const { userId } of affectedStats) {
      // 1. Reset streak
      await tx
        .update(userStats)
        .set({ streakDays: 0 })
        .where(eq(userStats.userId, userId));

      // 2. Fetch all characters for this user
      const chars = await tx
        .select({ id: characters.id, hp: characters.hp })
        .from(characters)
        .where(eq(characters.userId, userId));

      // 3. Apply damage to each character
      for (const char of chars) {
        const newHp = Math.max(0, char.hp - HP_DAMAGE_PER_MISS);
        await tx
          .update(characters)
          .set({ hp: newHp, isAlive: newHp > 0 })
          .where(eq(characters.id, char.id));
      }
    }
  });

  return { affected: affectedStats.length };
}

/**
 * Returns a combined streak + HP snapshot for a user.
 * hp values are null for skills where no character row exists yet.
 */
export async function getStreakInfo(
  db: Database,
  userId: number,
): Promise<{
  streakDays: number;
  lastActivityDate: string | null;
  hp: {
    reading: number | null;
    listening: number | null;
    writing: number | null;
    speaking: number | null;
  };
}> {
  const [stats] = await db
    .select({
      streakDays: userStats.streakDays,
      lastActivityDate: userStats.lastActivityDate,
    })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  const chars = await db
    .select({ skill: characters.skill, hp: characters.hp })
    .from(characters)
    .where(eq(characters.userId, userId));

  const hp: {
    reading: number | null;
    listening: number | null;
    writing: number | null;
    speaking: number | null;
  } = {
    reading: null,
    listening: null,
    writing: null,
    speaking: null,
  };

  for (const char of chars) {
    hp[char.skill] = char.hp;
  }

  return {
    streakDays: stats?.streakDays ?? 0,
    lastActivityDate: stats?.lastActivityDate ?? null,
    hp,
  };
}
