import { and, eq } from "drizzle-orm";
import { type Database } from "../db";
import { quests, userQuests } from "../db/schema";
import type { UserQuest } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A completed user_quest enriched with the template's reward fields. */
export type CompletedQuest = UserQuest & {
  titleMn: string;
  skillTarget: "reading" | "listening" | "writing" | "speaking" | "any";
  xpReward: number;
  coinReward: number;
};

/** A user_quest row with the full quest template merged in. */
export type QuestWithTemplate = UserQuest & {
  titleMn: string;
  descriptionMn: string;
  skillTarget: "reading" | "listening" | "writing" | "speaking" | "any";
  requiredCount: number;
  xpReward: number;
  coinReward: number;
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Assigns up to 3 random active quests to `userId` for `dateIso`.
 * Skips quests already assigned for this user+date, so calling it more than
 * once per day is safe (idempotent beyond the first call).
 *
 * Returns the newly inserted user_quest rows (may be fewer than 3 if the
 * pool of unassigned active quests is small).
 */
export async function generateDailyQuests(
  db: Database,
  userId: number,
  dateIso: string,
): Promise<UserQuest[]> {
  // 1. All active quest templates
  const allActive = await db
    .select()
    .from(quests)
    .where(eq(quests.isActive, true));

  // 2. Quest IDs already assigned to this user today
  const existing = await db
    .select({ questId: userQuests.questId })
    .from(userQuests)
    .where(and(eq(userQuests.userId, userId), eq(userQuests.date, dateIso)));

  const assignedIds = new Set(existing.map((r) => r.questId));

  // 3. Shuffle the available pool and pick up to 3
  const available = allActive.filter((q) => !assignedIds.has(q.id));
  const picked = shuffle(available).slice(0, 3);

  if (picked.length === 0) return [];

  // 4. Bulk-insert and return the created rows
  const inserted = await db
    .insert(userQuests)
    .values(
      picked.map((q) => ({
        userId,
        questId: q.id,
        date: dateIso,
        progress: 0,
        isCompleted: false,
      })),
    )
    .returning();

  return inserted;
}

/**
 * Called after a user completes an activity for `skill` on `dateIso`.
 *
 * Finds every incomplete user_quest for today whose template's skillTarget
 * matches `skill` or is `"any"`, increments progress by 1, and marks rows
 * completed when progress reaches requiredCount.
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
  // Join today's incomplete user_quests with their templates in one query
  const rows = await db
    .select({
      // user_quest fields
      id: userQuests.id,
      userId: userQuests.userId,
      questId: userQuests.questId,
      date: userQuests.date,
      progress: userQuests.progress,
      isCompleted: userQuests.isCompleted,
      completedAt: userQuests.completedAt,
      // template fields needed for matching + rewards
      skillTarget: quests.skillTarget,
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
        eq(userQuests.date, dateIso),
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
        date: row.date,
        progress: newProgress,
        isCompleted: true,
        completedAt,
        titleMn: row.titleMn,
        skillTarget: row.skillTarget,
        xpReward: row.xpReward,
        coinReward: row.coinReward,
      });
    }
  }

  return completed;
}

/**
 * Returns today's assigned quests for `userId` joined with their templates.
 * Use this to render the quest list in the mobile app.
 */
export async function getTodayQuests(
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
      date: userQuests.date,
      progress: userQuests.progress,
      isCompleted: userQuests.isCompleted,
      completedAt: userQuests.completedAt,
      // template fields
      titleMn: quests.titleMn,
      descriptionMn: quests.descriptionMn,
      skillTarget: quests.skillTarget,
      requiredCount: quests.requiredCount,
      xpReward: quests.xpReward,
      coinReward: quests.coinReward,
    })
    .from(userQuests)
    .innerJoin(quests, eq(userQuests.questId, quests.id))
    .where(and(eq(userQuests.userId, userId), eq(userQuests.date, dateIso)));
}
