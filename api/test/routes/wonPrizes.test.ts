import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const ADMIN_AUTH = { authorization: "Bearer test-admin-password" };

async function login(phone: string) {
  const res = await SELF.fetch("https://example.com/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ale", phone, pin: "1234" }),
  });
  return res.json<{ token: string; customer: { id: number } }>();
}

async function createPrize(label: string, type: "discount" | "points" | "none", value: number | null) {
  const row = await env.DB.prepare("INSERT INTO prizes (label, type, value, weight) VALUES (?, ?, ?, 1) RETURNING id")
    .bind(label, type, value)
    .first<{ id: number }>();
  return row!.id;
}

async function addSpin(customerId: number, prizeId: number, spunAt: string) {
  const row = await env.DB.prepare("INSERT INTO spins (customer_id, prize_id, spun_at) VALUES (?, ?, ?) RETURNING id")
    .bind(customerId, prizeId, spunAt)
    .first<{ id: number }>();
  return row!.id;
}

// Formato di datetime('now') di SQLite: "YYYY-MM-DD HH:MM:SS" in UTC
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

interface WonPrize {
  id: number;
  label: string;
  type: string;
  value: number | null;
  spun_at: string;
  redeemed_at: string | null;
  expires_at: string;
  status: "available" | "redeemed" | "expired";
}

function getMyPrizes(token: string) {
  return SELF.fetch("https://example.com/my-prizes", { headers: { authorization: `Bearer ${token}` } });
}

describe("GET /my-prizes", () => {
  it("returns 401 without a token", async () => {
    expect((await SELF.fetch("https://example.com/my-prizes")).status).toBe(401);
  });

  it("lists the won prizes, newest first, leaving out the losing spins", async () => {
    const { token, customer } = await login("3337770001");
    const lost = await createPrize("Hai perso", "none", null);
    const discount = await createPrize("-15% taglio", "discount", 15);
    const gift = await createPrize("Trattamento omaggio", "discount", 100);
    await addSpin(customer.id, discount, daysAgo(8));
    await addSpin(customer.id, lost, daysAgo(2));
    await addSpin(customer.id, gift, daysAgo(1));

    const prizes = await (await getMyPrizes(token)).json<WonPrize[]>();

    expect(prizes.map((p) => p.label)).toEqual(["Trattamento omaggio", "-15% taglio"]);
    expect(prizes[0]).toMatchObject({ type: "discount", value: 100, redeemed_at: null, status: "available" });
  });

  it("flags a prize as expired 30 days after it was won", async () => {
    const { token, customer } = await login("3337770010");
    const fresh = await createPrize("Ancora valido", "discount", 10);
    const old = await createPrize("Scaduto", "discount", 10);
    await addSpin(customer.id, fresh, daysAgo(29));
    await addSpin(customer.id, old, daysAgo(31));

    const prizes = await (await getMyPrizes(token)).json<WonPrize[]>();
    const byLabel = Object.fromEntries(prizes.map((p) => [p.label, p]));

    expect(byLabel["Ancora valido"]?.status).toBe("available");
    expect(byLabel["Scaduto"]?.status).toBe("expired");
    expect(Date.parse(byLabel["Ancora valido"]!.expires_at)).toBeGreaterThan(Date.now());
  });

  it("only shows the prizes of the logged-in customer", async () => {
    const mine = await login("3337770002");
    const other = await login("3337770003");
    const prize = await createPrize("Premio altrui", "discount", 10);
    await addSpin(other.customer.id, prize, daysAgo(1));

    expect(await (await getMyPrizes(mine.token)).json()).toEqual([]);
  });
});

describe("GET /admin/customers/:id/prizes", () => {
  it("requires admin auth", async () => {
    expect((await SELF.fetch("https://example.com/admin/customers/1/prizes")).status).toBe(401);
  });

  it("returns 404 for an unknown customer", async () => {
    const res = await SELF.fetch("https://example.com/admin/customers/999999/prizes", { headers: ADMIN_AUTH });
    expect(res.status).toBe(404);
  });

  it("lists the won prizes of that customer", async () => {
    const { customer } = await login("3337770004");
    const prize = await createPrize("-10% colore", "discount", 10);
    const spinId = await addSpin(customer.id, prize, daysAgo(1));

    const res = await SELF.fetch(`https://example.com/admin/customers/${customer.id}/prizes`, { headers: ADMIN_AUTH });
    const prizes = await res.json<WonPrize[]>();

    expect(prizes).toHaveLength(1);
    expect(prizes[0]).toMatchObject({ id: spinId, label: "-10% colore", redeemed_at: null });
  });
});

describe("POST /admin/spins/:id/redeem", () => {
  function redeem(spinId: number, headers: Record<string, string> = ADMIN_AUTH) {
    return SELF.fetch(`https://example.com/admin/spins/${spinId}/redeem`, { method: "POST", headers });
  }

  it("requires admin auth", async () => {
    expect((await redeem(1, {})).status).toBe(401);
  });

  it("returns 404 for an unknown spin", async () => {
    expect((await redeem(999999)).status).toBe(404);
  });

  it("marks the prize as used and the customer sees it as redeemed", async () => {
    const { token, customer } = await login("3337770005");
    const prize = await createPrize("-20% piega", "discount", 20);
    const spinId = await addSpin(customer.id, prize, daysAgo(1));

    const res = await redeem(spinId);
    expect(res.status).toBe(200);

    const [won] = await (await getMyPrizes(token)).json<WonPrize[]>();
    expect(won?.redeemed_at).toEqual(expect.any(String));
  });

  it("refuses to redeem the same prize twice", async () => {
    const { customer } = await login("3337770006");
    const prize = await createPrize("-5% taglio", "discount", 5);
    const spinId = await addSpin(customer.id, prize, daysAgo(1));

    expect((await redeem(spinId)).status).toBe(200);
    const second = await redeem(spinId);
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "already_redeemed" });
  });

  it("refuses to redeem an expired prize", async () => {
    const { token, customer } = await login("3337770011");
    const prize = await createPrize("Scaduto da riscattare", "discount", 10);
    const spinId = await addSpin(customer.id, prize, daysAgo(31));

    const res = await redeem(spinId);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "expired" });

    const [won] = await (await getMyPrizes(token)).json<WonPrize[]>();
    expect(won?.status).toBe("expired");
  });

  it("shows a redeemed prize as redeemed", async () => {
    const { token, customer } = await login("3337770012");
    const prize = await createPrize("Usato", "discount", 10);
    const spinId = await addSpin(customer.id, prize, daysAgo(3));
    await redeem(spinId);

    const [won] = await (await getMyPrizes(token)).json<WonPrize[]>();
    expect(won?.status).toBe("redeemed");
  });

  it("refuses to redeem a losing spin", async () => {
    const { customer } = await login("3337770007");
    const lost = await createPrize("Hai perso", "none", null);
    const spinId = await addSpin(customer.id, lost, daysAgo(1));

    expect((await redeem(spinId)).status).toBe(404);
  });
});
