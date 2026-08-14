import { Hono } from "hono";
import { z } from "zod";
import { upsertDeviceToken } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const deviceTokenSchema = z.object({ token: z.string().trim().min(1) });

const deviceToken = new Hono<{ Bindings: Env; Variables: Variables }>();

deviceToken.post("/device-token", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = deviceTokenSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_payload" }, 400);

  const customerId = c.get("customerId");
  await upsertDeviceToken(c.env.DB, customerId, parsed.data.token);
  return c.json({ ok: true });
});

export default deviceToken;
