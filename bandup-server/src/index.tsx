import { Hono } from "hono";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";
import { reading } from "./routes/reading";
import { admin } from "./routes/admin";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(renderer);

app.route("/auth", auth);
app.route("/reading", reading);
app.route("/admin", admin);

export default app;
