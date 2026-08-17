import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "../services/timingSafeEqual";
import type { Env, Variables } from "../types";

export const adminAuthMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const header = c.req.header("Authorization");
  const password = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!password || !timingSafeEqual(password, c.env.ADMIN_PASSWORD)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});
