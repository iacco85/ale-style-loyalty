import { Hono } from "hono";
import { z } from "zod";
import { createCustomer, findCustomerByPhone } from "../db";
import { normalizePhone } from "../services/phone";
import { signToken } from "../services/token";
import type { Env } from "../types";

const loginSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string(),
});

const login = new Hono<{ Bindings: Env }>();

login.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_payload" }, 400);

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return c.json({ error: "invalid_phone" }, 400);

  const customer = (await findCustomerByPhone(c.env.DB, phone)) ?? (await createCustomer(c.env.DB, parsed.data.name, phone));

  const token = await signToken(customer.id, c.env.AUTH_SECRET);
  return c.json({ token, customer: { id: customer.id, name: customer.name, phone: customer.phone } });
});

export default login;
