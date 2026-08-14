import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { upsertDeviceToken } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const errorSchema = z.object({ error: z.string() });

const deviceTokenRoute = createRoute({
  method: "post",
  path: "/device-token",
  tags: ["Customer"],
  summary: "Registra il token FCM del dispositivo",
  description: "Salva (o riusa se già presente) il token del dispositivo per l'invio di notifiche push. Nessuna chiamata a FCM avviene qui.",
  security: [{ Bearer: [] }],
  middleware: authMiddleware,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ token: z.string().min(1).openapi({ example: "fcm-device-token-abc123" }) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token salvato",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    400: { description: "Payload non valido", content: { "application/json": { schema: errorSchema } } },
    401: { description: "Token mancante o non valido", content: { "application/json": { schema: errorSchema } } },
  },
});

const deviceToken = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

deviceToken.openapi(deviceTokenRoute, async (c) => {
  const { token } = c.req.valid("json");
  const customerId = c.get("customerId");
  await upsertDeviceToken(c.env.DB, customerId, token);
  return c.json({ ok: true }, 200);
});

export default deviceToken;
