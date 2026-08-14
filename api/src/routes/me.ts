import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getCustomerById, getPointsLogForCustomer } from "../db";
import { authMiddleware } from "../middleware/auth";
import { computeBalance } from "../services/points";
import type { Env, Variables } from "../types";

const errorSchema = z.object({ error: z.string() });

const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Customer"],
  summary: "Profilo cliente e saldo punti",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: {
      description: "Profilo del cliente autenticato, con saldo punti calcolato da points_log",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            phone: z.string(),
            points: z.number().openapi({ example: 12 }),
          }),
        },
      },
    },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const me = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

me.openapi(meRoute, async (c) => {
  const customerId = c.get("customerId");
  const customer = await getCustomerById(c.env.DB, customerId);
  if (!customer) return c.json({ error: "not_found" }, 404);

  const entries = await getPointsLogForCustomer(c.env.DB, customerId);
  const points = computeBalance(entries);

  return c.json({ id: customer.id, name: customer.name, phone: customer.phone, points }, 200);
});

export default me;
