import { Hono } from "hono";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(renderer);

app.route("/auth", auth);

export default app;
