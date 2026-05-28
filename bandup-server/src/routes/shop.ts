import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { listItemsController } from "../controllers/shop/listItems.controller";
import { inventoryController } from "../controllers/shop/inventory.controller";
import { buySchema, buyController } from "../controllers/shop/buy.controller";
import { equipSchema, equipController } from "../controllers/shop/equip.controller";

const shopRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

shopRouter.use("*", authMiddleware);

// GET /shop/items — all available shop items
shopRouter.get("/items", listItemsController);

// GET /shop/inventory — user's purchased items joined with item details
shopRouter.get("/inventory", inventoryController);

// POST /shop/buy — purchase an item
shopRouter.post("/buy", zValidator("json", buySchema), buyController);

// POST /shop/equip — equip a cosmetic (unequips others of same type)
shopRouter.post("/equip", zValidator("json", equipSchema), equipController);

export { shopRouter };
