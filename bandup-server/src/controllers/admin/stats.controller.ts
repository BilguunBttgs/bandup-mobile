import type { Context } from "hono";
import { count, gte, eq } from "drizzle-orm";
import { createDb } from "../../db";
import {
  users,
  readings,
  listenings,
  userReadingSubmissions,
  userListeningSubmissions,
} from "../../db/schema";

// GET /admin/stats — aggregate usage counters for the admin dashboard.
export async function statsController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const db = createDb(c.env.DB);

  // "Last 7 days" threshold. createdAt is a timestamp-mode column, so compare
  // against a Date — Drizzle encodes it to unixepoch seconds for the query.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    [usersTotal],
    [usersOnboarded],
    [usersNew7d],
    [readingsTotal],
    [listeningsTotal],
    [readingSubsTotal],
    [listeningSubsTotal],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.isOnboarding, false)),
    db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ value: count() }).from(readings),
    db.select({ value: count() }).from(listenings),
    db.select({ value: count() }).from(userReadingSubmissions),
    db.select({ value: count() }).from(userListeningSubmissions),
  ]);

  return c.json({
    users: {
      total: usersTotal.value,
      onboarded: usersOnboarded.value,
      newLast7Days: usersNew7d.value,
    },
    content: {
      readings: readingsTotal.value,
      listenings: listeningsTotal.value,
    },
    submissions: {
      reading: readingSubsTotal.value,
      listening: listeningSubsTotal.value,
      total: readingSubsTotal.value + listeningSubsTotal.value,
    },
  });
}
