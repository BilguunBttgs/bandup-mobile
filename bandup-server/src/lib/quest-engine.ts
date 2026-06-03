import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { type Database } from "../db";
import { quests, userQuests } from "../db/schema";
import type { UserQuest } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestType = "daily" | "weekly" | "monthly";

/** A completed user_quest enriched with the template's reward fields. */
export type CompletedQuest = UserQuest & {
  titleMn: string;
  skillTarget: "reading" | "listening" | "writing" | "speaking" | "any";
  questType: QuestType;
  xpReward: number;
  coinReward: number;
};

/** A user_quest row with the full quest template merged in. */
export type QuestWithTemplate = UserQuest & {
  titleMn: string;
  descriptionMn: string;
  skillTarget: "reading" | "listening" | "writing" | "speaking" | "any";
  questType: QuestType;
  requiredCount: number;
  xpReward: number;
  coinReward: number;
};

// ─── Configuration ──────────────────────────────────────────────────────────────

/** How many quests of each type to assign per active period. */
export const QUESTS_PER_PERIOD: Record<QuestType, number> = {
  daily: 3,
  weekly: 2,
  monthly: 1,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** In-place Fisher-Yates shuffle; returns a new array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Formats a Date as an ISO date string (YYYY-MM-DD), UTC. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the calendar-aligned active window for a quest of `type` containing
 * `dateIso`. All math is UTC so the result is timezone-stable.
 *
 * - daily   → [dateIso, dateIso]
 * - weekly  → Monday … Sunday of dateIso's week
 * - monthly → first … last day of dateIso's month
 */
export function getPeriodRange(
  type: QuestType,
  dateIso: string,
): { start: string; end: string } {
  const d = new Date(`${dateIso}T00:00:00.000Z`);

  if (type === "weekly") {
    const day = d.getUTCDay(); // 0=Sun … 6=Sat
    const daysSinceMonday = (day + 6) % 7;
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - daysSinceMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: isoDate(start), end: isoDate(end) };
  }

  if (type === "monthly") {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return { start: isoDate(start), end: isoDate(end) };
  }

  // daily
  return { start: dateIso, end: dateIso };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Assigns the current period's quests to `userId` for the day containing
 * `dateIso`. For each quest type (daily / weekly / monthly) it computes the
 * calendar-aligned active window and fills up to `QUESTS_PER_PERIOD[type]`
 * quests for that window, skipping any already assigned for the same window.
 *
 * Idempotent per window — calling it repeatedly within the same day/week/month
 * will not create duplicate quests.
 *
 * Returns all newly inserted user_quest rows (across every type).
 */
export async function generateQuests(
  db: Database,
  userId: number,
  dateIso: string,
): Promise<UserQuest[]> {
  // All active quest templates, split by type.
  const allActive = await db
    .select()
    .from(quests)
    .where(eq(quests.isActive, true));

  const types: QuestType[] = ["daily", "weekly", "monthly"];
  const inserted: UserQuest[] = [];

  // D1 is serial — sequential loops, never Promise.all.
  for (const type of types) {
    const limit = QUESTS_PER_PERIOD[type];
    if (limit <= 0) continue;

    const templates = allActive.filter((q) => q.questType === type);
    if (templates.length === 0) continue;

    const { start, end } = getPeriodRange(type, dateIso);

    // Templates already assigned to this user for this exact window.
    const existing = await db
      .select({ questId: userQuests.questId })
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.periodStart, start),
          inArray(
            userQuests.questId,
            templates.map((q) => q.id),
          ),
        ),
      );

    const assignedIds = new Set(existing.map((r) => r.questId));
    const available = templates.filter((q) => !assignedIds.has(q.id));
    const picked = shuffle(available).slice(0, limit);

    if (picked.length === 0) continue;

    const rows = await db
      .insert(userQuests)
      .values(
        picked.map((q) => ({
          userId,
          questId: q.id,
          periodStart: start,
          periodEnd: end,
          progress: 0,
          isCompleted: false,
        })),
      )
      .returning();

    inserted.push(...rows);
  }

  return inserted;
}

/**
 * Called after a user completes an activity for `skill` on `dateIso`.
 *
 * Finds every incomplete user_quest whose active window contains `dateIso` and
 * whose template's skillTarget matches `skill` or is `"any"`, increments
 * progress by 1, and marks rows completed when progress reaches requiredCount.
 *
 * Returns only the quests that transitioned to completed in this call so the
 * caller can award XP and coins (via xp-engine) without re-querying.
 */
export async function incrementQuestProgress(
  db: Database,
  userId: number,
  skill: string,
  dateIso: string,
): Promise<CompletedQuest[]> {
  // Join active incomplete user_quests with their templates in one query.
  const rows = await db
    .select({
      // user_quest fields
      id: userQuests.id,
      userId: userQuests.userId,
      questId: userQuests.questId,
      periodStart: userQuests.periodStart,
      periodEnd: userQuests.periodEnd,
      progress: userQuests.progress,
      isCompleted: userQuests.isCompleted,
      completedAt: userQuests.completedAt,
      // template fields needed for matching + rewards
      skillTarget: quests.skillTarget,
      questType: quests.questType,
      requiredCount: quests.requiredCount,
      xpReward: quests.xpReward,
      coinReward: quests.coinReward,
      titleMn: quests.titleMn,
    })
    .from(userQuests)
    .innerJoin(quests, eq(userQuests.questId, quests.id))
    .where(
      and(
        eq(userQuests.userId, userId),
        lte(userQuests.periodStart, dateIso),
        gte(userQuests.periodEnd, dateIso),
        eq(userQuests.isCompleted, false),
      ),
    );

  // Filter to quests that count for this skill
  const matching = rows.filter(
    (r) => r.skillTarget === skill || r.skillTarget === "any",
  );

  const completed: CompletedQuest[] = [];

  // D1 is serial — sequential for-loop, never Promise.all
  for (const row of matching) {
    const newProgress = row.progress + 1;
    const justCompleted = newProgress >= row.requiredCount;
    const completedAt = justCompleted ? new Date() : null;

    await db
      .update(userQuests)
      .set({
        progress: newProgress,
        ...(justCompleted && { isCompleted: true, completedAt }),
      })
      .where(eq(userQuests.id, row.id));

    if (justCompleted) {
      completed.push({
        id: row.id,
        userId: row.userId,
        questId: row.questId,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        progress: newProgress,
        isCompleted: true,
        completedAt,
        titleMn: row.titleMn,
        skillTarget: row.skillTarget,
        questType: row.questType,
        xpReward: row.xpReward,
        coinReward: row.coinReward,
      });
    }
  }

  return completed;
}

/**
 * Returns the quests currently active for `userId` (those whose window contains
 * `dateIso`) joined with their templates. Use this to render the quest list in
 * the mobile app.
 */
export async function getActiveQuests(
  db: Database,
  userId: number,
  dateIso: string,
): Promise<QuestWithTemplate[]> {
  return db
    .select({
      // user_quest fields
      id: userQuests.id,
      userId: userQuests.userId,
      questId: userQuests.questId,
      periodStart: userQuests.periodStart,
      periodEnd: userQuests.periodEnd,
      progress: userQuests.progress,
      isCompleted: userQuests.isCompleted,
      completedAt: userQuests.completedAt,
      // template fields
      titleMn: quests.titleMn,
      descriptionMn: quests.descriptionMn,
      skillTarget: quests.skillTarget,
      questType: quests.questType,
      requiredCount: quests.requiredCount,
      xpReward: quests.xpReward,
      coinReward: quests.coinReward,
    })
    .from(userQuests)
    .innerJoin(quests, eq(userQuests.questId, quests.id))
    .where(
      and(
        eq(userQuests.userId, userId),
        lte(userQuests.periodStart, dateIso),
        gte(userQuests.periodEnd, dateIso),
      ),
    );
}
