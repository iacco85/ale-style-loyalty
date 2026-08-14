import { Hono } from "hono";
import { getCustomerById, getPointsLogForCustomer } from "../db";
import { authMiddleware } from "../middleware/auth";
import { computeBalance } from "../services/points";
import type { Env, Variables } from "../types";

const me = new Hono<{ Bindings: Env; Variables: Variables }>();

me.get("/me", authMiddleware, async (c) => {
  const customerId = c.get("customerId");
  const customer = await getCustomerById(c.env.DB, customerId);
  if (!customer) return c.json({ error: "not_found" }, 404);

  const entries = await getPointsLogForCustomer(c.env.DB, customerId);
  const points = computeBalance(entries);

  return c.json({ id: customer.id, name: customer.name, phone: customer.phone, points });
});

export default me;
