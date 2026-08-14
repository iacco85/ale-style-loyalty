import { Hono } from "hono";
import { getOffersForCustomer } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const offers = new Hono<{ Bindings: Env; Variables: Variables }>();

offers.get("/offers", authMiddleware, async (c) => {
  const customerId = c.get("customerId");
  const list = await getOffersForCustomer(c.env.DB, customerId);
  return c.json(list);
});

export default offers;
