import { SELF } from "cloudflare:test";
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

async function createPrize(label: string, weight: number) {
  await SELF.fetch("https://example.com/admin/prizes", {
    method: "POST",
    headers: { ...ADMIN_AUTH, "content-type": "application/json" },
    body: JSON.stringify({ label, type: "none", weight }),
  });
}

describe("GET /spin/status", () => {
  it("returns 401 without a token", async () => {
    const res = await SELF.fetch("https://example.com/spin/status");
    expect(res.status).toBe(401);
  });

  it("allows spinning for a customer who has never spun", async () => {
    const { token } = await login("3335550001");
    const res = await SELF.fetch("https://example.com/spin/status", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ can_spin: true, next_spin_at: null });
  });
});

describe("POST /spin", () => {
  it("returns 500 when no prizes are configured", async () => {
    const { token } = await login("3335550002");
    const res = await SELF.fetch("https://example.com/spin", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(500);
  });

  it("draws a configured prize and records the spin", async () => {
    await createPrize("Hai perso", 70);
    await createPrize("-15% prossimo servizio", 30);

    const { token } = await login("3335550003");
    const res = await SELF.fetch("https://example.com/spin", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ prize: { label: string }; spun_at: string }>();
    expect(["Hai perso", "-15% prossimo servizio"]).toContain(body.prize.label);
    expect(body.spun_at).toEqual(expect.any(String));
  });

  it("rejects a second spin before the cooldown expires", async () => {
    await createPrize("Premio", 100);
    const { token } = await login("3335550004");

    const first = await SELF.fetch("https://example.com/spin", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.status).toBe(200);

    const second = await SELF.fetch("https://example.com/spin", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.status).toBe(429);
    const body = await second.json<{ error: string; next_spin_at: string }>();
    expect(body.error).toBe("cooldown_active");
    expect(body.next_spin_at).toEqual(expect.any(String));

    const status = await SELF.fetch("https://example.com/spin/status", { headers: { authorization: `Bearer ${token}` } });
    const statusBody = await status.json<{ can_spin: boolean }>();
    expect(statusBody.can_spin).toBe(false);
  });
});

describe("GET /prizes", () => {
  it("returns 401 without a token", async () => {
    const res = await SELF.fetch("https://example.com/prizes");
    expect(res.status).toBe(401);
  });

  it("lists the wheel segments without exposing weights", async () => {
    await createPrize("Segmento visibile", 55);
    const { token } = await login("3335550099");
    const res = await SELF.fetch("https://example.com/prizes", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const prizes = await res.json<Array<Record<string, unknown>>>();
    const segment = prizes.find((p) => p.label === "Segmento visibile");
    expect(segment).toBeDefined();
    expect(segment).not.toHaveProperty("weight");
    expect(prizes.map((p) => p.id)).toEqual([...prizes.map((p) => p.id as number)].sort((a, b) => a - b));
  });
});
