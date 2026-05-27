import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { signupSchema, signupController } from "../controllers/auth/signup.controller";
import { signinSchema, signinController } from "../controllers/auth/signin.controller";

const auth = new Hono<{ Bindings: CloudflareBindings }>();

// POST /auth/signup
auth.post("/signup", zValidator("json", signupSchema), signupController);

// POST /auth/signin
auth.post("/signin", zValidator("json", signinSchema), signinController);

export { auth };
