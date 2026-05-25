import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

/**
 * JWT auth middleware for Hono 4.x.
 *
 * Reads `Authorization: Bearer <token>` from the request header,
 * verifies the token with the worker's JWT_SECRET, and sets
 * `userId` and `username` in the Hono context for downstream handlers.
 *
 * On failure returns 401 JSON — the route handler never runs.
 *
 * Usage in a route file:
 *   import { authMiddleware } from "../lib/auth-middleware";
 *
 *   const router = new Hono<{
 *     Bindings: CloudflareBindings;
 *     Variables: { userId: number; username: string };
 *   }>();
 *   router.use("*", authMiddleware);
 *
 *   router.get("/", (c) => {
 *     const userId = c.get("userId"); // number
 *   });
 */
export const authMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or malformed Authorization header" }, 401);
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    // verify() from hono/jwt uses Web Crypto API (Cloudflare Workers compatible).
    // It validates the signature and checks exp automatically.
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as {
      sub: string;
      username: string;
      exp: number;
    };

    c.set("userId", Number(payload.sub));
    c.set("username", payload.username);
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  await next();
});
