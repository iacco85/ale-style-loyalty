import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { listPrizes } from "../db";
import { authMiddleware } from "../middleware/auth";
import { getSpinAvailabilityForCustomer, spinForCustomer } from "../services/wheelSpin";
import type { Env, Variables } from "../types";

const errorSchema = z.object({ error: z.string() });

const wheelSegmentSchema = z.object({
  id: z.number(),
  label: z.string(),
  type: z.enum(["discount", "points", "none"]),
  value: z.number().nullable(),
});

const spinStatusSchema = z.object({
  can_spin: z.boolean(),
  next_spin_at: z.string().nullable().openapi({ description: "ISO-8601, null se può girare subito" }),
});

const prizeResultSchema = z.object({
  id: z.number(),
  label: z.string(),
  type: z.enum(["discount", "points", "none"]),
  value: z.number().nullable(),
});

const statusRoute = createRoute({
  method: "get",
  path: "/spin/status",
  tags: ["Wheel"],
  summary: "Può il cliente girare la ruota adesso?",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: { description: "Stato del cooldown", content: { "application/json": { schema: spinStatusSchema } } },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
  },
});

const spinRoute = createRoute({
  method: "post",
  path: "/spin",
  tags: ["Wheel"],
  summary: "Gira la ruota della fortuna",
  description:
    "Server-authoritative: il premio è estratto e registrato qui, il client si limita ad animare il risultato. Consentito una volta ogni N giorni per cliente, con N impostato dall'admin (`/admin/wheel-settings`, default 7; 0 = sempre).",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: {
      description: "Premio estratto e registrato",
      content: {
        "application/json": {
          schema: z.object({ prize: prizeResultSchema, spun_at: z.string() }),
        },
      },
    },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
    429: {
      description: "Cooldown non ancora scaduto",
      content: {
        "application/json": {
          schema: z.object({ error: z.string(), next_spin_at: z.string() }),
        },
      },
    },
    500: {
      description: "Nessun premio configurato lato admin",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const prizesRoute = createRoute({
  method: "get",
  path: "/prizes",
  tags: ["Wheel"],
  summary: "Segmenti della ruota (senza pesi)",
  description: "Serve all'app per disegnare la ruota. I pesi non sono esposti: le probabilità restano private.",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  responses: {
    200: { description: "Premi in ordine stabile", content: { "application/json": { schema: z.array(wheelSegmentSchema) } } },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
  },
});

const spin = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

function spinOptions(env: Env) {
  return { cooldownDisabled: env.SPIN_COOLDOWN_DISABLED === "true" };
}

spin.openapi(prizesRoute, async (c) => {
  const prizes = await listPrizes(c.env.DB);
  const segments = prizes
    .map(({ id, label, type, value }) => ({ id, label, type, value }))
    .sort((a, b) => a.id - b.id);
  return c.json(segments, 200);
});

spin.openapi(statusRoute, async (c) => {
  const availability = await getSpinAvailabilityForCustomer(c.env.DB, c.get("customerId"), spinOptions(c.env));
  return c.json({ can_spin: availability.allowed, next_spin_at: availability.nextAvailableAt }, 200);
});

spin.openapi(spinRoute, async (c) => {
  const outcome = await spinForCustomer(c.env.DB, c.get("customerId"), spinOptions(c.env));

  if (outcome.status === "cooldown") return c.json({ error: "cooldown_active", next_spin_at: outcome.nextSpinAt }, 429);
  if (outcome.status === "no_prizes") return c.json({ error: "no_prizes_configured" }, 500);

  const { prize, spunAt } = outcome;
  return c.json({ prize: { id: prize.id, label: prize.label, type: prize.type, value: prize.value }, spun_at: spunAt }, 200);
});

export default spin;
