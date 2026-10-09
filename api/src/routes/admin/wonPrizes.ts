import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getCustomerById } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import { listWonPrizesWithStatus, redeemPrize } from "../../services/wonPrizes";
import type { Env, Variables } from "../../types";
import { wonPrizeSchema } from "../myPrizes";

const errorSchema = z.object({ error: z.string() });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

const listRoute = createRoute({
  method: "get",
  path: "/admin/customers/{id}/prizes",
  tags: ["Admin"],
  summary: "Premi vinti da un cliente alla ruota",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { params: idParamSchema },
  responses: {
    200: { description: "Premi vinti, dal più recente", content: { "application/json": { schema: z.array(wonPrizeSchema) } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const redeemRoute = createRoute({
  method: "post",
  path: "/admin/spins/{id}/redeem",
  tags: ["Admin"],
  summary: "Segna un premio vinto come usato",
  description: "`id` è l'id restituito da `GET /admin/customers/:id/prizes`. Un premio si può usare una volta sola e solo entro 30 giorni dalla vincita.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { params: idParamSchema },
  responses: {
    200: { description: "Premio segnato come usato", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Premio non trovato (o giro perso)", content: { "application/json": { schema: errorSchema } } },
    409: { description: "Premio già usato (`already_redeemed`) o scaduto (`expired`)", content: { "application/json": { schema: errorSchema } } },
  },
});

const adminWonPrizes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

adminWonPrizes.openapi(listRoute, async (c) => {
  const { id } = c.req.valid("param");
  if (!(await getCustomerById(c.env.DB, id))) return c.json({ error: "not_found" }, 404);
  return c.json(await listWonPrizesWithStatus(c.env.DB, id), 200);
});

adminWonPrizes.openapi(redeemRoute, async (c) => {
  const { id } = c.req.valid("param");
  const outcome = await redeemPrize(c.env.DB, id);
  if (outcome === "not_found") return c.json({ error: "not_found" }, 404);
  if (outcome !== "redeemed") return c.json({ error: outcome }, 409);
  return c.json({ ok: true }, 200);
});

export default adminWonPrizes;
