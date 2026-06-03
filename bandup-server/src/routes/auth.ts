import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../lib/auth-middleware";
import { zodValidationHook } from "../lib/errors";
import { signupSchema, signupController } from "../controllers/auth/signup.controller";
import { signinSchema, signinController } from "../controllers/auth/signin.controller";
import {
  onboardingStepSchema,
  onboardingStepController,
} from "../controllers/auth/onboardingStep.controller";
import {
  changePinSchema,
  changePinController,
} from "../controllers/auth/changePin.controller";

const auth = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { userId: number; username: string };
}>();

// POST /auth/signup — public
auth.post("/signup", zValidator("json", signupSchema, zodValidationHook), signupController);

// POST /auth/signin — public
auth.post("/signin", zValidator("json", signinSchema, zodValidationHook), signinController);

// POST /auth/onboarding/step — JWT required
auth.post(
  "/onboarding/step",
  authMiddleware,
  zValidator("json", onboardingStepSchema, zodValidationHook),
  onboardingStepController,
);

// POST /auth/change-pin — JWT required
auth.post(
  "/change-pin",
  authMiddleware,
  zValidator("json", changePinSchema, zodValidationHook),
  changePinController,
);

export { auth };
