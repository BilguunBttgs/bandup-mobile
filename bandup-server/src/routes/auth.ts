import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { signupSchema, signupController } from "../controllers/auth/signup.controller";
import { signinSchema, signinController } from "../controllers/auth/signin.controller";
import {
  onboardingStepSchema,
  onboardingStepController,
} from "../controllers/auth/onboardingStep.controller";

const auth = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// POST /auth/signup — public
auth.post("/signup", zValidator("json", signupSchema), signupController);

// POST /auth/signin — public
auth.post("/signin", zValidator("json", signinSchema), signinController);

// POST /auth/onboarding/step — JWT required
auth.post(
  "/onboarding/step",
  authMiddleware,
  zValidator("json", onboardingStepSchema),
  onboardingStepController,
);

export { auth };
