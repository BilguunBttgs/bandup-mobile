import type { Context } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../lib/password";
import { mongoError } from "../../lib/errors";

export const changePinSchema = z.object({
  current_pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  new_pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

type ChangePinInput = z.infer<typeof changePinSchema>;

type AuthEnv = {
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
};

// POST /auth/change-pin — verify the current 4-digit PIN, then store a new one.
export async function changePinController(
  c: Context<AuthEnv>,
): Promise<Response> {
  const { current_pin, new_pin } = await c.req.json<ChangePinInput>();
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return c.json(mongoError("AUTH_NOT_FOUND"), 404);

  const ok = await verifyPassword(current_pin, user.password);
  if (!ok) return c.json(mongoError("PIN_INCORRECT"), 401);

  const hashed = await hashPassword(new_pin);
  await db.update(users).set({ password: hashed }).where(eq(users.id, userId));

  return c.json({ success: true });
}
