import { createMiddleware } from "hono/factory";
import { verifyToken } from "../services/token";
import type { Env, Variables } from "../types";

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "unauthorized" }, 401);

  const result = await verifyToken(token, c.env.AUTH_SECRET);
  if (!result) return c.json({ error: "unauthorized" }, 401);

  c.set("customerId", result.customerId);
  await next();
});
