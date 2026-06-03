import type { Context } from "hono";
import { createDb } from "../../db";
import { recordActivity } from "../../lib/streak-engine";
import { generateQuests, getActiveQuests } from "../../lib/quest-engine";

type GameEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function checkinController(c: Context<GameEnv>): Promise<Response> {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const dateIso = new Date().toISOString().slice(0, 10);

  const { streakDays, wasNew } = await recordActivity(db, userId, dateIso);

  // Auto-generate the current period's quests on the first check-in of the day.
  // generateQuests is idempotent per window so calling it is safe, but we
  // gate on wasNew to avoid the extra DB round-trip on repeat calls.
  if (wasNew) {
    await generateQuests(db, userId, dateIso);
  }

  const quests = await getActiveQuests(db, userId, dateIso);

  return c.json({
    streakDays,
    wasNew,
    date: dateIso,
    quests: quests.map((q) => ({
      id: q.id,
      titleMn: q.titleMn,
      skillTarget: q.skillTarget,
      questType: q.questType,
      periodStart: q.periodStart,
      periodEnd: q.periodEnd,
      requiredCount: q.requiredCount,
      progress: q.progress,
      isCompleted: q.isCompleted,
      xpReward: q.xpReward,
      coinReward: q.coinReward,
    })),
  });
}
