import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sign } from "hono/jwt";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createDb } from "../db";
import { users } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/password";

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .regex(/^\d{4}$/, "Password must be exactly 4 digits"),
});

const auth = new Hono<{ Bindings: CloudflareBindings }>();

// POST /auth/signup
auth.post("/signup", zValidator("json", signupSchema), async (c) => {
  const { username, email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  // Check for duplicate email or username
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingEmail) {
    return c.json({ error: "Email already registered" }, 409);
  }

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
});

const signinSchema = z.object({
  // A single field — can be either an email address or a username
  identifier: z.string().min(1, "Email or username is required"),
  password: z
    .string()
    .regex(/^\d{4}$/, "Password must be exactly 4 digits"),
});

// POST /auth/signin
auth.post("/signin", zValidator("json", signinSchema), async (c) => {
  const { identifier, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  // Detect whether the identifier looks like an email (contains @)
  const isEmail = identifier.includes("@");

  const [user] = await db
    .select()
    .from(users)
    .where(
      isEmail
        ? eq(users.email, identifier)
        : eq(users.username, identifier)
    )
    .limit(1);

  if (!user) {
    return c.json(
      { error: isEmail ? "No account found with that email" : "No account found with that username" },
      404
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
});

export { auth };
