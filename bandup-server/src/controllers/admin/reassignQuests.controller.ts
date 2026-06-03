import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users, userQuests } from "../../db/schema";
import { generateQuests } from "../../lib/quest-engine";

// POST /admin/quests/reassign
// Wipes ALL existing quest assignments (history included), then regenerates the
// current period's quests (daily / weekly / monthly) for every onboarded user.
// Useful after changing the quest catalogue or the assignment rules.
export async function reassignQuestsController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const db = createDb(c.env.DB);
  const dateIso = new Date().toISOString().slice(0, 10);

  // 1. Wipe every user_quests row.
  await db.delete(userQuests);

  // 2. Regenerate for each onboarded user (those who have finished onboarding;
  //    users still in onboarding receive their first quests at step 3).
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isOnboarding, false));

  let questsAssigned = 0;
  // D1 is serial — sequential loop, never Promise.all.
  for (const u of rows) {
    const inserted = await generateQuests(db, u.id, dateIso);
    questsAssigned += inserted.length;
  }

  return c.json({
    message: "Quests reassigned",
    date: dateIso,
    users: rows.length,
    quests_assigned: questsAssigned,
  });
}
