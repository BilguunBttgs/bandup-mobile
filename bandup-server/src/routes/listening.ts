import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { listQuerySchema, listListeningsController } from "../controllers/listening/list.controller";
import { getListeningController } from "../controllers/listening/get.controller";
import { submitSchema, submitListeningController } from "../controllers/listening/submit.controller";

const listening = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// All routes in this file require a valid JWT
listening.use("*", authMiddleware);

// GET /listening?level=easy|medium|hard
listening.get("/", zValidator("query", listQuerySchema), listListeningsController);

// GET /listening/:id  — returns metadata + questions + presigned audio URL (1h)
listening.get("/:id", getListeningController);

// POST /listening/:id/submit
listening.post("/:id/submit", zValidator("json", submitSchema), submitListeningController);

export { listening };
