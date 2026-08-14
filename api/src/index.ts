import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import deviceToken from "./routes/deviceToken";
import login from "./routes/login";
import me from "./routes/me";
import offers from "./routes/offers";
import type { Env } from "./types";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Token restituito da POST /login",
});

app.route("/", login);
app.route("/", me);
app.route("/", offers);
app.route("/", deviceToken);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Ale Style Loyalty API",
    version: "0.1.0",
    description:
      "API del pilot fedeltà per Ale Style: login cliente, saldo punti, offerte, registrazione device per le push. Vedi PLAN.md e CLAUDE.md nella root del repo per il contesto completo.",
  },
});
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

export default app;
