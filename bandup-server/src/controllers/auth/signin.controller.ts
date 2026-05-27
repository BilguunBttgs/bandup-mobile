import type { Context } from "hono";
import { z } from "zod";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
import { verifyPassword } from "../../lib/password";

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

  if (!user) {
    return c.json(
      {
        error: isEmail
          ? "No account found with that email"
          : "No account found with that username",
      },
      404,
    );
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    return c.json({ error: "Incorrect password" }, 401);
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
