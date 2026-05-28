import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";
import { reading } from "./routes/reading";
import { listening } from "./routes/listening";
import { gameRouter } from "./routes/game";
import { shopRouter } from "./routes/shop";
import { admin } from "./routes/admin";
import { createDb } from "./db";
import { userStats, users, leaderboardSnapshots } from "./db/schema";
import { applyMissedStreakDamage } from "./lib/streak-engine";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// ── Global error handler ────────────────────────────────────────────────────
// Catches any unhandled exception in route handlers and returns JSON instead
// of an opaque 500, making debugging from the mobile client much easier.
app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.url}`, err);
  return c.json({ error: "Internal server error", detail: err.message }, 500);
});

app.use(renderer);

app.route("/auth", auth);
app.route("/reading", reading);
app.route("/listening", listening);
app.route("/game", gameRouter);
app.route("/shop", shopRouter);
app.route("/admin", admin);

export default {
  fetch: app.fetch.bind(app),

  async scheduled(
    event: ScheduledEvent,
    env: CloudflareBindings,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const db = createDb(env.DB);

    if (event.cron === "0 17 * * *") {
      // Daily midnight sweep (Ulaanbaatar UTC+8):
      // Damage all characters of users who missed yesterday's activity
      await applyMissedStreakDamage(db);
    }

    if (event.cron === "0 0 * * 1") {
      // Weekly Monday snapshot: record top 10 users by totalXp
      const snapshotDate = new Date().toISOString().slice(0, 10);

      const top10 = await db
        .select({
          userId: userStats.userId,
          totalXp: userStats.totalXp,
        })
        .from(userStats)
        .innerJoin(users, eq(userStats.userId, users.id))
        .orderBy(desc(userStats.totalXp))
        .limit(10);

      // Idempotent: clear any existing snapshot for this date before inserting
      await db
        .delete(leaderboardSnapshots)
        .where(eq(leaderboardSnapshots.snapshotDate, snapshotDate));

      for (let i = 0; i < top10.length; i++) {
        const { userId, totalXp } = top10[i];
        await db.insert(leaderboardSnapshots).values({
          snapshotDate,
          userId,
          rank: i + 1,
          totalXp,
        });
      }
    }
  },
};
