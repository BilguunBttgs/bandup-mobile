import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { zodValidationHook } from "../lib/errors";
import { gameStateController } from "../controllers/game/state.controller";
import { checkinController } from "../controllers/game/checkin.controller";
import { reviveSchema, reviveController } from "../controllers/game/revive.controller";
import { leaderboardController } from "../controllers/game/leaderboard.controller";

const gameRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// All routes in this file require a valid JWT
gameRouter.use("*", authMiddleware);

// GET /game/state — full player state: stats, all 4 characters, today's quests
gameRouter.get("/state", gameStateController);

// POST /game/checkin — record daily activity; auto-generates quests on first call of the day
gameRouter.post("/checkin", checkinController);

// POST /game/revive — spend 50 coins to restore a character to full HP
gameRouter.post("/revive", zValidator("json", reviveSchema, zodValidationHook), reviveController);

// GET /game/leaderboard — top 20 by totalXp
gameRouter.get("/leaderboard", leaderboardController);

export { gameRouter };
