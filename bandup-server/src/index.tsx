import { Hono } from "hono";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";
import { reading } from "./routes/reading";
import { listening } from "./routes/listening";
import { gameRouter } from "./routes/game";
import { admin } from "./routes/admin";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// ── Global error handler ────────────────────────────────────────────────────
// Catches any unhandled exception in route handlers and returns JSON instead
// of an opaque 500, making debugging from the mobile client much easier.
app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.url}`, err);
  return c.json({ error: "Internal server error", detail: err.message }, 500);
});

app.use(renderer);

app.route("/auth", auth);
app.route("/reading", reading);
app.route("/listening", listening);
app.route("/game", gameRouter);
app.route("/admin", admin);

export default app;
