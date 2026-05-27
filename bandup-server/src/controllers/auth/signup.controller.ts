import type { Context } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
import { hashPassword } from "../../lib/password";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z.string().email("Invalid email address"),
  password: z.string().regex(/^\d{4}$/, "Password must be exactly 4 digits"),
});

type SignupInput = z.infer<typeof signupSchema>;

export async function signupController(
  c: Context<{ Bindings: CloudflareBindings }>,
): Promise<Response> {
  const { username, email, password } = await c.req.json<SignupInput>();
  const db = createDb(c.env.DB);

  // Check for duplicate email
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingEmail) {
    return c.json({ error: "Email already registered" }, 409);
  }

  // Check for duplicate username
  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUsername) {
    return c.json({ error: "Username already taken" }, 409);
  }

  const hashedPassword = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ username, email, password: hashedPassword })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      isOnboarding: users.isOnboarding,
      onboardingStep: users.onboardingStep,
      createdAt: users.createdAt,
    });

  return c.json(user, 201);
}
