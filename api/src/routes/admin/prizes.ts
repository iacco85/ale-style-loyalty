import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createPrize, listPrizes, updatePrize } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import type { Env, Variables } from "../../types";

const errorSchema = z.object({ error: z.string() });

const prizeSchema = z.object({
  id: z.number(),
  label: z.string(),
  type: z.enum(["discount", "points", "none"]),
  value: z.number().nullable(),
  weight: z.number(),
});

const prizeBodySchema = z.object({
  label: z.string().min(1).openapi({ example: "-15% prossimo servizio" }),
  type: z.enum(["discount", "points", "none"]).openapi({ description: "'none' per 'hai perso'" }),
  value: z.number().optional().openapi({ description: "Percentuale sconto o punti, assente per type=none" }),
  weight: z.number().int().positive().openapi({ description: "Peso relativo nell'estrazione", example: 10 }),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

const listPrizesRoute = createRoute({
  method: "get",
  path: "/admin/prizes",
  tags: ["Admin"],
  summary: "Lista premi della ruota della fortuna",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  responses: {
    200: { description: "Elenco premi", content: { "application/json": { schema: z.array(prizeSchema) } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
  },
});

const createPrizeRoute = createRoute({
  method: "post",
  path: "/admin/prizes",
  tags: ["Admin"],
  summary: "Crea un premio della ruota",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    body: { required: true, content: { "application/json": { schema: prizeBodySchema } } },
  },
  responses: {
    201: { description: "Premio creato", content: { "application/json": { schema: prizeSchema } } },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
  },
});

const updatePrizeRoute = createRoute({
  method: "put",
  path: "/admin/prizes/{id}",
  tags: ["Admin"],
  summary: "Aggiorna un premio della ruota (es. cambia il peso)",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    params: idParamSchema,
    body: { required: true, content: { "application/json": { schema: prizeBodySchema } } },
  },
  responses: {
    200: { description: "Premio aggiornato", content: { "application/json": { schema: prizeSchema } } },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Premio non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const prizes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

prizes.openapi(listPrizesRoute, async (c) => {
  const list = await listPrizes(c.env.DB);
  return c.json(list, 200);
});

prizes.openapi(createPrizeRoute, async (c) => {
  const body = c.req.valid("json");
  const prize = await createPrize(c.env.DB, body);
  return c.json(prize, 201);
});

prizes.openapi(updatePrizeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const prize = await updatePrize(c.env.DB, id, body);
  if (!prize) return c.json({ error: "not_found" }, 404);
  return c.json(prize, 200);
});

export default prizes;
