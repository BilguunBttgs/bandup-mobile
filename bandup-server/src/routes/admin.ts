import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createReadingSchema, createReadingController } from "../controllers/admin/createReading.controller";
import { listReadingsAdminController } from "../controllers/admin/listReadings.controller";
import { deleteReadingController } from "../controllers/admin/deleteReading.controller";
import { createListeningSchema, createListeningController } from "../controllers/admin/createListening.controller";
import { mongoError, zodValidationHook } from "../lib/errors";

const admin = new Hono<{ Bindings: CloudflareBindings }>();

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Checks the X-Admin-Key header against ADMIN_API_KEY from the environment.
admin.use("*", async (c, next) => {
  const key = c.req.header("X-Admin-Key");
  if (!key || key !== c.env.ADMIN_API_KEY) {
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
