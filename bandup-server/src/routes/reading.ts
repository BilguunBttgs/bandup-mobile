import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { listQuerySchema, listReadingsController } from "../controllers/reading/list.controller";
import { getReadingController } from "../controllers/reading/get.controller";
import { submitSchema, submitReadingController } from "../controllers/reading/submit.controller";

const reading = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// All routes in this file require a valid JWT
reading.use("*", authMiddleware);

// GET /reading?level=easy|medium|hard
reading.get("/", zValidator("query", listQuerySchema), listReadingsController);

// GET /reading/:id
reading.get("/:id", getReadingController);

// POST /reading/:id/submit
reading.post("/:id/submit", zValidator("json", submitSchema), submitReadingController);

export { reading };
