import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { readings } from "../../db/schema";

export async function deleteReadingController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid reading ID" }, 400);

  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: readings.id })
    .from(readings)
    .where(eq(readings.id, id))
    .limit(1);

  if (!existing) return c.json({ error: "Reading not found" }, 404);

  await db.delete(readings).where(eq(readings.id, id));

  return c.json({ message: "Reading deleted" });
}
