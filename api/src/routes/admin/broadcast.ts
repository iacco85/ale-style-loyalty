import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createOffer } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import { notifyBroadcastOffer } from "../../services/notifications";
import type { Env, Variables } from "../../types";

const errorSchema = z.object({ error: z.string() });

const broadcastRoute = createRoute({
  method: "post",
  path: "/admin/broadcast",
  tags: ["Admin"],
  summary: "Crea un'offerta per tutti i clienti e invia la push a tutti i device registrati",
  description: "La push è best-effort: l'offerta resta comunque creata anche se l'invio a qualche device fallisce.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().min(1).openapi({ example: "Weekend: -10% su tutti i trattamenti" }),
            description: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Offerta broadcast creata",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            customer_id: z.number().nullable(),
            title: z.string(),
            description: z.string().nullable(),
            created_at: z.string(),
          }),
        },
      },
    },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
  },
});

const broadcast = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

broadcast.openapi(broadcastRoute, async (c) => {
  const { title, description } = c.req.valid("json");

  const offer = await createOffer(c.env.DB, null, title, description);
  await notifyBroadcastOffer(c.env, c.env.DB, { title: offer.title, body: offer.description ?? offer.title });

  return c.json(offer, 201);
});

export default broadcast;
