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

async function onlyPrize(type: "points" | "discount", value: number | undefined, label: string) {
  await env.DB.prepare("DELETE FROM spins").run();
  await env.DB.prepare("DELETE FROM prizes").run();
  await SELF.fetch("https://example.com/admin/prizes", {
    method: "POST",
    headers: { ...ADMIN_AUTH, "content-type": "application/json" },
    body: JSON.stringify({ label, type, value, weight: 1 }),
  });
}

function spin(token: string) {
  return SELF.fetch("https://example.com/spin", { method: "POST", headers: { authorization: `Bearer ${token}` } });
}

async function balanceOf(token: string) {
  const res = await SELF.fetch("https://example.com/me", { headers: { authorization: `Bearer ${token}` } });
  return (await res.json<{ points: number }>()).points;
}

describe("POST /spin — removed prizes", () => {
  it("never draws a prize removed by the admin", async () => {
    await onlyPrize("discount", 15, "Rimosso");
    const { token, customer } = await login("3338880010");
    // peso altissimo: se il premio rimosso restasse nell'estrazione uscirebbe quasi sempre
    const removed = await env.DB.prepare("UPDATE prizes SET weight = 100000 RETURNING id").first<{ id: number }>();
    // un giro già vinto fa sì che il premio venga disattivato e non cancellato
    await env.DB.prepare("INSERT INTO spins (customer_id, prize_id, spun_at) VALUES (?, ?, '2000-01-01 00:00:00')")
      .bind(customer.id, removed!.id)
      .run();
    await SELF.fetch(`https://example.com/admin/prizes/${removed!.id}`, { method: "DELETE", headers: ADMIN_AUTH });
    await SELF.fetch("https://example.com/admin/prizes", {
      method: "POST",
      headers: { ...ADMIN_AUTH, "content-type": "application/json" },
      body: JSON.stringify({ label: "Rimasto", type: "none", weight: 1 }),
    });

    const res = await spin(token);
    expect((await res.json<{ prize: { label: string } }>()).prize.label).toBe("Rimasto");
  });
});

describe("POST /spin — points prizes", () => {
  it("credits the points to the balance as soon as the prize is won", async () => {
    await onlyPrize("points", 10, "+10 punti");
    const { token } = await login("3338880001");

    const res = await spin(token);
    expect(res.status).toBe(200);
    expect((await res.json<{ prize: { type: string; value: number } }>()).prize).toMatchObject({ type: "points", value: 10 });
    expect(await balanceOf(token)).toBe(10);
  });

  it("records where the points came from in the points log", async () => {
    await onlyPrize("points", 5, "+5 punti");
    const { token, customer } = await login("3338880002");
    await spin(token);

    const entry = await env.DB.prepare("SELECT delta, reason FROM points_log WHERE customer_id = ?")
      .bind(customer.id)
      .first<{ delta: number; reason: string }>();
    expect(entry?.delta).toBe(5);
    expect(entry?.reason).toContain("Ruota della fortuna");
  });

  it("does not credit points for a discount prize", async () => {
    await onlyPrize("discount", 15, "-15%");
    const { token } = await login("3338880003");
    await spin(token);
    expect(await balanceOf(token)).toBe(0);
  });

  it("does not list a points prize among the prizes still to use (it is already in the balance)", async () => {
    await onlyPrize("points", 10, "+10 punti");
    const { token } = await login("3338880004");
    await spin(token);

    const res = await SELF.fetch("https://example.com/my-prizes", { headers: { authorization: `Bearer ${token}` } });
    expect(await res.json()).toEqual([]);
  });
});
