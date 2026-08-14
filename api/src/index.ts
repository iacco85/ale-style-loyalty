import { Hono } from "hono";
import deviceToken from "./routes/deviceToken";
import login from "./routes/login";
import me from "./routes/me";
import offers from "./routes/offers";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.route("/", login);
app.route("/", me);
app.route("/", offers);
app.route("/", deviceToken);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

export default app;
