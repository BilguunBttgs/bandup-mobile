import type { Context } from "hono";
import { z } from "zod";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
import { verifyPassword } from "../../lib/password";
import { mongoError } from "../../lib/errors";

export const signinSchema = z.object({
  // A single field — can be either an email address or a username
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().regex(/^\d{4}$/, "Password must be exactly 4 digits"),
});

type SigninInput = z.infer<typeof signinSchema>;

export async function signinController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const { identifier, password } = await c.req.json<SigninInput>();
  const db = createDb(c.env.DB);

  // Detect whether the identifier looks like an email (contains @)
  const isEmail = identifier.includes("@");

  const [user] = await db
    .select()
    .from(users)
    .where(
      isEmail ? eq(users.email, identifier) : eq(users.username, identifier),
    )
    .limit(1);

  // SECURITY FIX: Username/email enumeration. Returning 404 for "not found" and
  // 401 for "wrong password" lets an attacker probe which accounts exist.
  // Always return the same generic 401 + run verifyPassword against a fixed
  // dummy hash so the timing of "no such user" matches "wrong password".
  const DUMMY_HASH =
    // base64(zero salt || zero derived key) — verifyPassword always fails but
    // performs the same PBKDF2 work, normalizing response time.
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const passwordMatch = await verifyPassword(
    password,
    user ? user.password : DUMMY_HASH,
  );
  if (!user || !passwordMatch) {
    return c.json(mongoError("AUTH_INVALID"), 401);
  }

  // Issue a JWT valid for 7 days
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: String(user.id),
      username: user.username,
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7 days
    },
    c.env.JWT_SECRET,
  );

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isOnboarding: user.isOnboarding,
      onboardingStep: user.onboardingStep,
      createdAt: user.createdAt,
    },
  });
}
