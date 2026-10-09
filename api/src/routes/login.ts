import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { loginCustomer } from "../services/customerLogin";
import { isValidPin } from "../services/pin";
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
    "Telefono + PIN a 4-6 cifre. Se il telefono non è mai stato visto crea un nuovo cliente con quel PIN (il nome serve solo in questo caso); altrimenti verifica il PIN. Dopo 5 PIN errati l'account è bloccato per 15 minuti. Un cliente creato prima dell'introduzione dei PIN sceglie il PIN al primo accesso.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).openapi({ example: "Ale" }),
            phone: z.string().openapi({ example: "3331234567", description: "Numero mobile italiano, in qualsiasi formato" }),
            pin: z.string().refine(isValidPin, "PIN di 4-6 cifre").openapi({ example: "4821", description: "4-6 cifre" }),
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
    401: { description: "PIN errato", content: { "application/json": { schema: errorSchema } } },
    429: {
      description: "Troppi tentativi: account bloccato fino a `locked_until`",
      content: { "application/json": { schema: z.object({ error: z.string(), locked_until: z.string() }) } },
    },
  },
});

const login = new OpenAPIHono<{ Bindings: Env }>();

login.openapi(loginRoute, async (c) => {
  const { name, phone: rawPhone, pin } = c.req.valid("json");
  const phone = normalizePhone(rawPhone);
  if (!phone) return c.json({ error: "invalid_phone" }, 400);

  const outcome = await loginCustomer(c.env.DB, { name, phone, pin });
  if (outcome.status === "locked") return c.json({ error: "too_many_attempts", locked_until: outcome.lockedUntil }, 429);
  if (outcome.status === "invalid_credentials") return c.json({ error: "invalid_credentials" }, 401);

  const { customer } = outcome;
  const token = await signToken(customer.id, c.env.AUTH_SECRET);
  return c.json({ token, customer: { id: customer.id, name: customer.name, phone: customer.phone } }, 200);
});

export default login;
