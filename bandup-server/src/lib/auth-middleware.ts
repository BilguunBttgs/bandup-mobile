import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { mongoError } from "./errors";

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
    return c.json(mongoError("AUTH_MISSING_TOKEN"), 401);
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // SECURITY FIX: Fail closed if JWT_SECRET is missing or empty. Without this
  // check, an unconfigured secret would cause `verify()` to throw and surface as
  // a generic 401, masking a serious deployment misconfiguration.
  if (!c.env.JWT_SECRET) {
    return c.json(mongoError("AUTH_INVALID_TOKEN"), 401);
  }

  try {
    // verify() from hono/jwt uses Web Crypto API (Cloudflare Workers compatible).
    // It validates the signature and checks exp automatically.
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as {
      sub: string;
      username: string;
      exp: number;
    };

    // SECURITY FIX: Validate JWT payload shape. A token signed with our secret
    // but containing a non-numeric `sub` would otherwise let the request through
    // with userId=NaN, which silently returns empty result sets instead of
    // failing hard. Treat malformed payloads as invalid tokens.
    const userId = Number(payload?.sub);
    if (
      !payload ||
      typeof payload.sub !== "string" ||
      !Number.isInteger(userId) ||
      userId <= 0 ||
      typeof payload.username !== "string"
    ) {
      return c.json(mongoError("AUTH_INVALID_TOKEN"), 401);
    }

    c.set("userId", userId);
    c.set("username", payload.username);
  } catch {
    return c.json(mongoError("AUTH_INVALID_TOKEN"), 401);
  }

  await next();
});
