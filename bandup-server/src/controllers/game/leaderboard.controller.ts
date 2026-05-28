import type { Context } from "hono";
import { desc, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { userStats, users } from "../../db/schema";

type GameEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

export async function leaderboardController(c: Context<GameEnv>): Promise<Response> {
  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      userId: userStats.userId,
      username: users.username,
      totalXp: userStats.totalXp,
      streakDays: userStats.streakDays,
    })
    .from(userStats)
    .innerJoin(users, eq(userStats.userId, users.id))
    .orderBy(desc(userStats.totalXp))
    .limit(20);

  return c.json(
    rows.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      username: row.username,
      totalXp: row.totalXp,
      streakDays: row.streakDays,
    })),
  );
}
