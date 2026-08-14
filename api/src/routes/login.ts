import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createCustomer, findCustomerByPhone } from "../db";
import { normalizePhone } from "../services/phone";
import { signToken } from "../services/token";
import type { Env } from "../types";

const customerSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Ale" }),
  phone: z.string().openapi({ example: "+393331234567" }),
});

const errorSchema = z.object({ error: z.string().openapi({ example: "invalid_phone" }) });

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login o registrazione cliente",
  description:
    "Login semplice con nome + numero di telefono, senza OTP (vedi PLAN.md). Se il telefono non è mai stato visto, crea un nuovo cliente; altrimenti riusa quello esistente.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).openapi({ example: "Ale" }),
            phone: z.string().openapi({ example: "3331234567", description: "Numero mobile italiano, in qualsiasi formato" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login riuscito: usa il token come Bearer nelle richieste successive",
      content: {
        "application/json": {
          schema: z.object({ token: z.string(), customer: customerSchema }),
        },
      },
    },
    400: {
      description: "Payload non valido o numero di telefono non riconosciuto come mobile italiano",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const login = new OpenAPIHono<{ Bindings: Env }>();

login.openapi(loginRoute, async (c) => {
  const { name, phone: rawPhone } = c.req.valid("json");
  const phone = normalizePhone(rawPhone);
  if (!phone) return c.json({ error: "invalid_phone" }, 400);

  const customer = (await findCustomerByPhone(c.env.DB, phone)) ?? (await createCustomer(c.env.DB, name, phone));

  const token = await signToken(customer.id, c.env.AUTH_SECRET);
  return c.json({ token, customer: { id: customer.id, name: customer.name, phone: customer.phone } }, 200);
});

export default login;
