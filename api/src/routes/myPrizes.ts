import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { listWonPrizesWithStatus } from "../services/wonPrizes";
import type { Env, Variables } from "../types";

export const wonPrizeSchema = z.object({
  id: z.number().openapi({ description: "Id dello spin: serve alla titolare per segnare il premio come usato" }),
  label: z.string(),
  type: z.enum(["discount", "points", "none"]),
  value: z.number().nullable(),
  spun_at: z.string().openapi({ description: "ISO-8601, quando è stato vinto" }),
  redeemed_at: z.string().nullable().openapi({ description: "ISO-8601 se già usato, altrimenti null" }),
  expires_at: z.string().openapi({ description: "ISO-8601, 30 giorni dopo la vincita" }),
  status: z.enum(["available", "redeemed", "expired"]).openapi({ description: "da usare, già usato o scaduto" }),
});

const errorSchema = z.object({ error: z.string() });

const myPrizesRoute = createRoute({
  method: "get",
  path: "/my-prizes",
  tags: ["Wheel"],
  summary: "Premi vinti dalla ruota dal cliente autenticato",
  description: "Esclude i giri persi. Dal più recente. Ogni premio vale 30 giorni (`expires_at`); `status` dice se è ancora da usare, già usato in salone o scaduto.",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: { description: "Premi vinti", content: { "application/json": { schema: z.array(wonPrizeSchema) } } },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
  },
});

const myPrizes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

myPrizes.openapi(myPrizesRoute, async (c) => {
  const prizes = await listWonPrizesWithStatus(c.env.DB, c.get("customerId"));
  return c.json(prizes, 200);
});

export default myPrizes;
