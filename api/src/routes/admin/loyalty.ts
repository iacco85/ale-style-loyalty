import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getCustomerById, getLoyaltyRule, setLoyaltyRule } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import { getCustomerLoyalty, redeemLoyaltyRewards } from "../../services/customerLoyalty";
import type { Env, Variables } from "../../types";
import { loyaltySnapshotSchema } from "../loyaltySchema";

const errorSchema = z.object({ error: z.string() });
const unauthorized = { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } };
const notFound = { description: "Cliente non trovato", content: { "application/json": { schema: errorSchema } } };

const ruleSchema = z.object({
  points_per_reward: z.number().int().min(1).openapi({ description: "Punti necessari per uno sconto", example: 100 }),
  reward_euros: z.number().int().min(1).openapi({ description: "Euro di sconto", example: 5 }),
});

const redeemResultSchema = loyaltySnapshotSchema.extend({
  redeemed_count: z.number().openapi({ description: "Quanti sconti sono stati usati" }),
  redeemed_euros: z.number().openapi({ description: "Importo totale degli sconti usati" }),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

const getRuleRoute = createRoute({
  method: "get",
  path: "/admin/loyalty-rule",
  tags: ["Admin"],
  summary: "Regola fedeltà: ogni N punti, X euro di sconto",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  responses: {
    200: { description: "Regola corrente", content: { "application/json": { schema: ruleSchema } } },
    401: unauthorized,
  },
});

const putRuleRoute = createRoute({
  method: "put",
  path: "/admin/loyalty-rule",
  tags: ["Admin"],
  summary: "Cambia la regola fedeltà",
  description: "Vale subito per tutti i clienti: la barra nell'app si ricalcola sui punti già accumulati.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { body: { required: true, content: { "application/json": { schema: ruleSchema } } } },
  responses: {
    200: { description: "Regola aggiornata", content: { "application/json": { schema: ruleSchema } } },
    400: { description: "Valori non validi", content: { "application/json": { schema: errorSchema } } },
    401: unauthorized,
  },
});

const customerLoyaltyRoute = createRoute({
  method: "get",
  path: "/admin/customers/{id}/loyalty",
  tags: ["Admin"],
  summary: "Saldo punti e avanzamento fedeltà di un cliente",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { params: idParamSchema },
  responses: {
    200: { description: "Punti e avanzamento", content: { "application/json": { schema: loyaltySnapshotSchema } } },
    401: unauthorized,
    404: notFound,
  },
});

const redeemRewardRoute = createRoute({
  method: "post",
  path: "/admin/customers/{id}/redeem-reward",
  tags: ["Admin"],
  summary: "Usa gli sconti fedeltà: scala i punti dal saldo",
  description:
    "Da usare quando la cliente sfrutta gli sconti in salone. Di default usa **uno** sconto; con `all: true` usa tutti quelli sbloccati. Aggiunge una sola riga negativa a points_log.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: {
    params: idParamSchema,
    body: {
      required: false,
      content: { "application/json": { schema: z.object({ all: z.boolean().optional().openapi({ description: "true = usa tutti gli sconti sbloccati" }) }) } },
    },
  },
  responses: {
    200: { description: "Sconti usati, stato aggiornato", content: { "application/json": { schema: redeemResultSchema } } },
    401: unauthorized,
    404: notFound,
    409: { description: "Punti insufficienti per uno sconto", content: { "application/json": { schema: errorSchema } } },
  },
});

const adminLoyalty = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

adminLoyalty.openapi(getRuleRoute, async (c) => {
  const { pointsPerReward, rewardEuros } = await getLoyaltyRule(c.env.DB);
  return c.json({ points_per_reward: pointsPerReward, reward_euros: rewardEuros }, 200);
});

adminLoyalty.openapi(putRuleRoute, async (c) => {
  const { points_per_reward, reward_euros } = c.req.valid("json");
  await setLoyaltyRule(c.env.DB, { pointsPerReward: points_per_reward, rewardEuros: reward_euros });
  return c.json({ points_per_reward, reward_euros }, 200);
});

adminLoyalty.openapi(customerLoyaltyRoute, async (c) => {
  const { id } = c.req.valid("param");
  if (!(await getCustomerById(c.env.DB, id))) return c.json({ error: "not_found" }, 404);
  return c.json(await getCustomerLoyalty(c.env.DB, id), 200);
});

adminLoyalty.openapi(redeemRewardRoute, async (c) => {
  const { id } = c.req.valid("param");
  if (!(await getCustomerById(c.env.DB, id))) return c.json({ error: "not_found" }, 404);

  const body = c.req.valid("json");
  const outcome = await redeemLoyaltyRewards(c.env.DB, id, { all: body?.all });
  if (outcome.status === "not_enough_points") return c.json({ error: "not_enough_points" }, 409);

  const { snapshot, redeemedCount, redeemedEuros } = outcome;
  return c.json({ ...snapshot, redeemed_count: redeemedCount, redeemed_euros: redeemedEuros }, 200);
});

export default adminLoyalty;
