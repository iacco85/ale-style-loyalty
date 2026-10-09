import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const ADMIN_AUTH = { authorization: "Bearer test-admin-password" };

async function login(phone: string, name = "Ale") {
  const res = await SELF.fetch("https://example.com/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, phone, pin: "1234" }),
  });
  return res.json<{ token: string; customer: { id: number } }>();
}

async function createCustomer(phone: string, name = "Ale") {
  const { customer } = await login(phone, name);
  return customer.id;
}

describe("admin auth", () => {
  it("rejects requests without a password", async () => {
    const res = await SELF.fetch("https://example.com/admin/customers");
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong password", async () => {
    const res = await SELF.fetch("https://example.com/admin/customers", {
      headers: { authorization: "Bearer wrong-password" },
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /admin/customers", () => {
  it("lists customers with their points balance", async () => {
    const id = await createCustomer("3331112222", "Bea");

    const res = await SELF.fetch("https://example.com/admin/customers", { headers: ADMIN_AUTH });
    expect(res.status).toBe(200);
    const customers = await res.json<{ id: number; points: number }[]>();
    expect(customers.find((c) => c.id === id)).toMatchObject({ points: 0 });
  });

  it("filters by search", async () => {
    await createCustomer("3332223333", "Zoe Unica");

    const res = await SELF.fetch("https://example.com/admin/customers?search=Zoe+Unica", { headers: ADMIN_AUTH });
    const customers = await res.json<{ name: string }[]>();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({ name: "Zoe Unica" });
  });
});

describe("POST /admin/customers/:id/points", () => {
  it("adds points to a customer", async () => {
    const id = await createCustomer("3334445555", "Gio");

    const res = await SELF.fetch(`https://example.com/admin/customers/${id}/points`, {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ delta: 5, reason: "Taglio" }),
    });
    expect(res.status).toBe(200);

    const list = await (await SELF.fetch("https://example.com/admin/customers", { headers: ADMIN_AUTH })).json<
      { id: number; points: number }[]
    >();
    expect(list.find((c) => c.id === id)).toMatchObject({ points: 5 });
  });

  it("returns 404 for an unknown customer", async () => {
    const res = await SELF.fetch("https://example.com/admin/customers/999999/points", {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ delta: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects a delta of 0", async () => {
    const id = await createCustomer("3336667777", "Nino");
    const res = await SELF.fetch(`https://example.com/admin/customers/${id}/points`, {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ delta: 0 }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /admin/customers/:id/offers", () => {
  it("creates an offer for the customer and makes it visible via GET /offers", async () => {
    const { token, customer } = await login("3338889999", "Rita");

    const res = await SELF.fetch(`https://example.com/admin/customers/${customer.id}/offers`, {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ title: "-15% prossimo taglio" }),
    });
    expect(res.status).toBe(201);
    const offer = await res.json<{ customer_id: number; title: string }>();
    expect(offer).toMatchObject({ customer_id: customer.id, title: "-15% prossimo taglio" });

    const offersRes = await SELF.fetch("https://example.com/offers", { headers: { authorization: `Bearer ${token}` } });
    const offers = await offersRes.json<{ title: string }[]>();
    expect(offers.some((o) => o.title === "-15% prossimo taglio")).toBe(true);
  });

  it("returns 404 for an unknown customer", async () => {
    const res = await SELF.fetch("https://example.com/admin/customers/999999/offers", {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ title: "Offerta" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/broadcast", () => {
  it("creates a broadcast offer visible to any customer", async () => {
    const { token } = await login("3330001111", "Uma");

    const broadcastRes = await SELF.fetch("https://example.com/admin/broadcast", {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ title: "Weekend -10%" }),
    });
    expect(broadcastRes.status).toBe(201);
    const broadcastOffer = await broadcastRes.json<{ customer_id: number | null }>();
    expect(broadcastOffer.customer_id).toBeNull();

    const offersRes = await SELF.fetch("https://example.com/offers", { headers: { authorization: `Bearer ${token}` } });
    const offers = await offersRes.json<{ title: string }[]>();
    expect(offers.some((o) => o.title === "Weekend -10%")).toBe(true);
  });
});

describe("admin prizes", () => {
  it("creates and updates a prize", async () => {
    const createRes = await SELF.fetch("https://example.com/admin/prizes", {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ label: "Hai perso", type: "none", weight: 70 }),
    });
    expect(createRes.status).toBe(201);
    const prize = await createRes.json<{ id: number; weight: number }>();

    const updateRes = await SELF.fetch(`https://example.com/admin/prizes/${prize.id}`, {
      method: "PUT",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ label: "Hai perso", type: "none", weight: 50 }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json<{ weight: number }>();
    expect(updated.weight).toBe(50);

    const listRes = await SELF.fetch("https://example.com/admin/prizes", { headers: ADMIN_AUTH });
    const list = await listRes.json<{ id: number }[]>();
    expect(list.some((p) => p.id === prize.id)).toBe(true);
  });

  it("returns 404 when updating an unknown prize", async () => {
    const res = await SELF.fetch("https://example.com/admin/prizes/999999", {
      method: "PUT",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ label: "X", type: "none", weight: 1 }),
    });
    expect(res.status).toBe(404);
  });
});

describe("admin PIN management", () => {
  async function postLogin(phone: string, pin: string) {
    return SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale", phone, pin }),
    });
  }

  it("never exposes PIN data in the customer list", async () => {
    await createCustomer("3336660001");
    const res = await SELF.fetch("https://example.com/admin/customers", { headers: ADMIN_AUTH });
    const text = await res.text();
    expect(text).not.toContain("pin_hash");
    expect(text).not.toContain("pin_salt");
  });

  it("lets the owner reset a forgotten PIN so the customer can choose a new one", async () => {
    const id = await createCustomer("3336660002");
    expect((await postLogin("3336660002", "9999")).status).toBe(401);

    const reset = await SELF.fetch(`https://example.com/admin/customers/${id}/reset-pin`, {
      method: "POST",
      headers: ADMIN_AUTH,
    });
    expect(reset.status).toBe(200);

    expect((await postLogin("3336660002", "9999")).status).toBe(200);
    expect((await postLogin("3336660002", "1234")).status).toBe(401);
  });

  it("also unlocks a locked account when resetting the PIN", async () => {
    const id = await createCustomer("3336660003");
    for (let i = 0; i < 5; i++) await postLogin("3336660003", "0000");
    expect((await postLogin("3336660003", "1234")).status).toBe(429);

    await SELF.fetch(`https://example.com/admin/customers/${id}/reset-pin`, { method: "POST", headers: ADMIN_AUTH });
    expect((await postLogin("3336660003", "5555")).status).toBe(200);
  });

  it("requires admin auth and a known customer", async () => {
    expect((await SELF.fetch("https://example.com/admin/customers/1/reset-pin", { method: "POST" })).status).toBe(401);
    const missing = await SELF.fetch("https://example.com/admin/customers/999999/reset-pin", {
      method: "POST",
      headers: ADMIN_AUTH,
    });
    expect(missing.status).toBe(404);
  });
});
