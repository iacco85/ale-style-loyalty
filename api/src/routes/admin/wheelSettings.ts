import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getSpinCooldownDays, setSpinCooldownDays } from "../../db";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import type { Env, Variables } from "../../types";

const errorSchema = z.object({ error: z.string() });
const unauthorized = { description: "Password admin mancante o errata", content: { "application/json": { schema: errorSchema } } };

const settingsSchema = z.object({
  spin_cooldown_days: z
    .number()
    .int()
    .min(0)
    .openapi({ description: "Giorni tra un giro e il successivo per ogni cliente. 0 = si può girare sempre", example: 7 }),
});

const getSettingsRoute = createRoute({
  method: "get",
  path: "/admin/wheel-settings",
  tags: ["Admin"],
  summary: "Ogni quanti giorni la cliente può girare la ruota",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  responses: {
    200: { description: "Impostazione corrente", content: { "application/json": { schema: settingsSchema } } },
    401: unauthorized,
  },
});

const putSettingsRoute = createRoute({
  method: "put",
  path: "/admin/wheel-settings",
  tags: ["Admin"],
  summary: "Cambia ogni quanti giorni la cliente può girare la ruota",
  description: "Vale subito per tutte: il prossimo giro si calcola dall'ultimo giro di ogni cliente più il nuovo intervallo.",
  security: [{ Bearer: [] }],
  middleware: adminAuthMiddleware,
  request: { body: { required: true, content: { "application/json": { schema: settingsSchema } } } },
  responses: {
    200: { description: "Impostazione aggiornata", content: { "application/json": { schema: settingsSchema } } },
    400: { description: "Valore non valido", content: { "application/json": { schema: errorSchema } } },
    401: unauthorized,
  },
});

const adminWheelSettings = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

adminWheelSettings.openapi(getSettingsRoute, async (c) => {
  return c.json({ spin_cooldown_days: await getSpinCooldownDays(c.env.DB) }, 200);
});

adminWheelSettings.openapi(putSettingsRoute, async (c) => {
  const { spin_cooldown_days } = c.req.valid("json");
  await setSpinCooldownDays(c.env.DB, spin_cooldown_days);
  return c.json({ spin_cooldown_days }, 200);
});

export default adminWheelSettings;
