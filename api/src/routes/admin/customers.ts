import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createOffer, getCustomerById, listCustomers, resetCustomerPin } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import { addCustomerPoints } from "../../services/customerLoyalty";
import { notifyCustomer } from "../../services/notifications";
import { offerMessage, pointsAddedMessage } from "../../services/pushMessages";
import type { Env, Variables } from "../../types";

const errorSchema = z.object({ error: z.string() });

const customerWithPointsSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  created_at: z.string(),
  points: z.number(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

const listCustomersRoute = createRoute({
  method: "get",
  path: "/admin/customers",
  tags: ["Admin"],
  summary: "Lista clienti con saldo punti",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    query: z.object({ search: z.string().optional().openapi({ description: "Filtra per nome o telefono" }) }),
  },
  responses: {
    200: {
      description: "Elenco clienti, ordinati per nome",
      content: { "application/json": { schema: z.array(customerWithPointsSchema) } },
    },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
  },
});

const addPointsRoute = createRoute({
  method: "post",
  path: "/admin/customers/{id}/points",
  tags: ["Admin"],
  summary: "Aggiungi (o sottrai) punti a un cliente",
  description:
    "Se `delta` è positivo invia al cliente una push con il nuovo saldo (o lo sconto sbloccato). La push è best-effort e parte dopo la risposta.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    params: idParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            delta: z.number().int().refine((n) => n !== 0, "delta non può essere 0").openapi({ example: 1 }),
            reason: z.string().optional().openapi({ example: "Taglio + piega" }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Punti registrati", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const createOfferRoute = createRoute({
  method: "post",
  path: "/admin/customers/{id}/offers",
  tags: ["Admin"],
  summary: "Crea un'offerta per un cliente e invia la push",
  description: "La push è best-effort: se il cliente non ha device token registrati o l'invio fallisce, l'offerta resta comunque creata.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    params: idParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().min(1).openapi({ example: "-15% sul prossimo taglio" }),
            description: z.string().optional().openapi({ example: "Valido fino a fine mese" }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Offerta creata",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            customer_id: z.number(),
            title: z.string(),
            description: z.string().nullable(),
            created_at: z.string(),
          }),
        },
      },
    },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const resetPinRoute = createRoute({
  method: "post",
  path: "/admin/customers/{id}/reset-pin",
  tags: ["Admin"],
  summary: "Azzera il PIN di un cliente (PIN dimenticato)",
  description:
    "Cancella il PIN e sblocca l'account: al prossimo accesso il cliente sceglie un nuovo PIN. Va usato dopo aver verificato di persona chi è il cliente.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { params: idParamSchema },
  responses: {
    200: { description: "PIN azzerato", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    401: { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } },
  },
});

const adminCustomers = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

adminCustomers.openapi(listCustomersRoute, async (c) => {
  const { search } = c.req.valid("query");
  const customers = await listCustomers(c.env.DB, search);
  return c.json(customers, 200);
});

adminCustomers.openapi(addPointsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { delta, reason } = c.req.valid("json");

  const customer = await getCustomerById(c.env.DB, id);
  if (!customer) return c.json({ error: "not_found" }, 404);

  const { before, after } = await addCustomerPoints(c.env.DB, id, delta, reason);
  const message = pointsAddedMessage(delta, before, after);
  if (message) c.executionCtx.waitUntil(notifyCustomer(c.env, c.env.DB, id, message));
  return c.json({ ok: true }, 200);
});

adminCustomers.openapi(resetPinRoute, async (c) => {
  const { id } = c.req.valid("param");

  const customer = await getCustomerById(c.env.DB, id);
  if (!customer) return c.json({ error: "not_found" }, 404);

  await resetCustomerPin(c.env.DB, id);
  return c.json({ ok: true }, 200);
});

adminCustomers.openapi(createOfferRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { title, description } = c.req.valid("json");

  const customer = await getCustomerById(c.env.DB, id);
  if (!customer) return c.json({ error: "not_found" }, 404);

  const offer = await createOffer(c.env.DB, id, title, description);
  await notifyCustomer(c.env, c.env.DB, id, offerMessage(offer));

  return c.json({ ...offer, customer_id: id }, 201);
});

export default adminCustomers;
