import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { userStats, characters } from "../../db/schema";
import { getTodayQuests } from "../../lib/quest-engine";

const ALL_SKILLS = ["reading", "listening", "writing", "speaking"] as const;
type Skill = (typeof ALL_SKILLS)[number];

type GameEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function gameStateController(c: Context<GameEnv>): Promise<Response> {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  // ── Lazy-init user_stats ──────────────────────────────────────────────────
  // Insert a default row if none exists; no-op if it already does.
  await db.insert(userStats).values({ userId }).onConflictDoNothing();

  const [stats] = await db
    .select({
      totalXp: userStats.totalXp,
      coins: userStats.coins,
      streakDays: userStats.streakDays,
      lastActivityDate: userStats.lastActivityDate,
    })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  // ── Lazy-init characters ──────────────────────────────────────────────────
  // Create a default character for any skill that doesn't have a row yet.
  // D1 is serial — sequential for-loop, not Promise.all.
  const existingChars = await db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId));

  const existingSkills = new Set(existingChars.map((ch) => ch.skill));
  const missingSkills = ALL_SKILLS.filter((s) => !existingSkills.has(s));

  for (const skill of missingSkills) {
    await db.insert(characters).values({ userId, skill });
  }

  // Re-fetch so newly inserted rows are included
  const allChars =
    missingSkills.length > 0
      ? await db.select().from(characters).where(eq(characters.userId, userId))
      : existingChars;

  // ── Today's quests ────────────────────────────────────────────────────────
  const dateIso = new Date().toISOString().slice(0, 10);
  const quests = await getTodayQuests(db, userId, dateIso);

  return c.json({
    stats: stats ?? { totalXp: 0, coins: 0, streakDays: 0, lastActivityDate: null },
    characters: allChars.map((ch) => ({
      skill: ch.skill,
      hp: ch.hp,
      xp: ch.xp,
      level: ch.level,
      isAlive: ch.isAlive,
      skinId: ch.skinId,
    })),
    quests: quests.map((q) => ({
      id: q.id,
      titleMn: q.titleMn,
      descriptionMn: q.descriptionMn,
      skillTarget: q.skillTarget,
      requiredCount: q.requiredCount,
      progress: q.progress,
      isCompleted: q.isCompleted,
      xpReward: q.xpReward,
      coinReward: q.coinReward,
    })),
  });
}
