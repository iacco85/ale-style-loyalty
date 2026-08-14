import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getOffersForCustomer } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const errorSchema = z.object({ error: z.string() });

const offerSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable().openapi({ description: "null per un'offerta broadcast" }),
  title: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
});

const offersRoute = createRoute({
  method: "get",
  path: "/offers",
  tags: ["Customer"],
  summary: "Offerte del cliente autenticato",
  description: "Include le offerte create per il cliente specifico e quelle broadcast (customer_id null).",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: {
      description: "Elenco offerte, più recenti prima",
      content: { "application/json": { schema: z.array(offerSchema) } },
    },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
  },
});

const offers = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

offers.openapi(offersRoute, async (c) => {
  const customerId = c.get("customerId");
  const list = await getOffersForCustomer(c.env.DB, customerId);
  return c.json(list, 200);
});

export default offers;
