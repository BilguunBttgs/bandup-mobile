import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createReadingSchema, createReadingController } from "../controllers/admin/createReading.controller";
import { listReadingsAdminController } from "../controllers/admin/listReadings.controller";
import { deleteReadingController } from "../controllers/admin/deleteReading.controller";
import { createListeningSchema, createListeningController } from "../controllers/admin/createListening.controller";
import { mongoError, zodValidationHook } from "../lib/errors";

const admin = new Hono<{ Bindings: CloudflareBindings }>();

// SECURITY FIX: Constant-time comparison for the admin key. A naïve `!==` on
// strings short-circuits at the first byte difference, which is observable by a
// remote attacker via response-time analysis and enables byte-by-byte key
// recovery. This helper compares all bytes in time proportional to the longer
// of the two inputs and returns the same boolean.
function timingSafeEqual(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  // Compare against the max length so length-mismatches don't short-circuit
  const len = Math.max(ae.length, be.length);
  let diff = ae.length ^ be.length;
  for (let i = 0; i < len; i++) {
    diff |= (ae[i] ?? 0) ^ (be[i] ?? 0);
  }
  return diff === 0;
}

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Checks the X-Admin-Key header against ADMIN_API_KEY from the environment.
admin.use("*", async (c, next) => {
  const key = c.req.header("X-Admin-Key");
  // SECURITY FIX: Fail closed if ADMIN_API_KEY is unset or empty — never allow
  // the admin surface to be reachable with a missing/blank server-side secret.
  const expected = c.env.ADMIN_API_KEY;
  if (!expected || !key || !timingSafeEqual(key, expected)) {
    return c.json(mongoError("AUTH_UNAUTHORIZED"), 401);
  }
  await next();
});

// POST /admin/readings
admin.post("/readings", zValidator("json", createReadingSchema, zodValidationHook), createReadingController);

// GET /admin/readings
admin.get("/readings", listReadingsAdminController);

// DELETE /admin/readings/:id
admin.delete("/readings/:id", deleteReadingController);

// POST /admin/listenings
// Pass audioKey: null to receive a presigned PUT URL; re-call with the key to insert the record.
admin.post("/listenings", zValidator("json", createListeningSchema, zodValidationHook), createListeningController);

export { admin };
