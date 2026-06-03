import type { Context } from "hono";
import { and, eq, gte } from "drizzle-orm";
import { createDb } from "../../db";
import {
  userReadingSubmissions,
  userListeningSubmissions,
} from "../../db/schema";

type GameEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

// GET /game/activity — daily submission counts for the last 365 days,
// aggregated across reading + listening. Powers the GitHub-style profile
// heatmap. Returns [{ date: "YYYY-MM-DD", count: number }] sorted ascending.
export async function activityController(
  c: Context<GameEnv>,
): Promise<Response> {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  // Cutoff: midnight UTC 364 days ago — a full 365-day inclusive window.
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - 364);

  // Sequential (not Promise.all) — D1 runs queries serially anyway.
  const readingRows = await db
    .select({ submittedAt: userReadingSubmissions.submittedAt })
    .from(userReadingSubmissions)
    .where(
      and(
        eq(userReadingSubmissions.userId, userId),
        gte(userReadingSubmissions.submittedAt, cutoff),
      ),
    );

  const listeningRows = await db
    .select({ submittedAt: userListeningSubmissions.submittedAt })
    .from(userListeningSubmissions)
    .where(
      and(
        eq(userListeningSubmissions.userId, userId),
        gte(userListeningSubmissions.submittedAt, cutoff),
      ),
    );

  const countByDate = new Map<string, number>();
  for (const row of [...readingRows, ...listeningRows]) {
    const iso = row.submittedAt.toISOString().slice(0, 10);
    countByDate.set(iso, (countByDate.get(iso) ?? 0) + 1);
  }

  const activity = Array.from(countByDate, ([date, count]) => ({
    date,
    count,
  })).sort((a, b) => (a.date < b.date ? -1 : 1));

  return c.json(activity);
}
