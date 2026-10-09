import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const ADMIN_AUTH = { authorization: "Bearer test-admin-password" };
const JSON_HEADERS = { "content-type": "application/json" };

async function login(phone: string) {
  const res = await SELF.fetch("https://example.com/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name: "Ale", phone, pin: "1234" }),
  });
  return res.json<{ token: string; customer: { id: number } }>();
}

// Come i client veri: senza corpo non c'è nemmeno il Content-Type
function adminPost(path: string, body?: unknown) {
  return SELF.fetch(`https://example.com${path}`, {
    method: "POST",
    headers: body === undefined ? ADMIN_AUTH : { ...ADMIN_AUTH, ...JSON_HEADERS },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function givePoints(customerId: number, delta: number) {
  await adminPost(`/admin/customers/${customerId}/points`, { delta });
}

interface Loyalty {
  points_per_reward: number;
  reward_euros: number;
  rewards_available: number;
  rewards_total_euros: number;
  points_into_next: number;
  points_to_next: number;
  percent: number;
}

async function getMe(token: string) {
  const res = await SELF.fetch("https://example.com/me", { headers: { authorization: `Bearer ${token}` } });
  return res.json<{ points: number; loyalty: Loyalty }>();
}

beforeEach(async () => {
  await env.DB.prepare("UPDATE loyalty_settings SET points_per_reward = 100, reward_euros = 5").run();
});

describe("loyalty rule", () => {
  it("starts at 100 points for 5 euros", async () => {
    const res = await SELF.fetch("https://example.com/admin/loyalty-rule", { headers: ADMIN_AUTH });
    expect(await res.json()).toEqual({ points_per_reward: 100, reward_euros: 5 });
  });

  it("can be changed by the owner", async () => {
    const res = await SELF.fetch("https://example.com/admin/loyalty-rule", {
      method: "PUT",
      headers: { ...ADMIN_AUTH, ...JSON_HEADERS },
      body: JSON.stringify({ points_per_reward: 50, reward_euros: 3 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ points_per_reward: 50, reward_euros: 3 });
  });

  it.each([{ points_per_reward: 0, reward_euros: 5 }, { points_per_reward: 100, reward_euros: 0 }, { points_per_reward: 10.5, reward_euros: 5 }])(
    "rejects invalid rule %j",
    async (rule) => {
      const res = await SELF.fetch("https://example.com/admin/loyalty-rule", {
        method: "PUT",
        headers: { ...ADMIN_AUTH, ...JSON_HEADERS },
        body: JSON.stringify(rule),
      });
      expect(res.status).toBe(400);
    },
  );

  it("requires admin auth", async () => {
    expect((await SELF.fetch("https://example.com/admin/loyalty-rule")).status).toBe(401);
    expect((await SELF.fetch("https://example.com/admin/loyalty-rule", { method: "PUT" })).status).toBe(401);
  });
});

describe("GET /me loyalty progress", () => {
  it("shows an empty bar for a new customer", async () => {
    const { token } = await login("3339990001");
    expect((await getMe(token)).loyalty).toEqual({
      points_per_reward: 100,
      reward_euros: 5,
      rewards_available: 0,
      rewards_total_euros: 0,
      points_into_next: 0,
      points_to_next: 100,
      percent: 0,
    });
  });

  it("follows the points given by the owner", async () => {
    const { token, customer } = await login("3339990002");
    await givePoints(customer.id, 130);
    expect((await getMe(token)).loyalty).toMatchObject({ rewards_available: 1, rewards_total_euros: 5, points_into_next: 30, points_to_next: 70, percent: 30 });
  });

  it("follows a rule changed by the owner", async () => {
    const { token, customer } = await login("3339990003");
    await givePoints(customer.id, 130);
    await env.DB.prepare("UPDATE loyalty_settings SET points_per_reward = 50, reward_euros = 3").run();
    expect((await getMe(token)).loyalty).toMatchObject({ points_per_reward: 50, reward_euros: 3, rewards_available: 2, rewards_total_euros: 6 });
  });
});

describe("GET /admin/customers/:id/loyalty", () => {
  it("returns points and progress for the owner", async () => {
    const { customer } = await login("3339990004");
    await givePoints(customer.id, 250);
    const res = await SELF.fetch(`https://example.com/admin/customers/${customer.id}/loyalty`, { headers: ADMIN_AUTH });
    expect(await res.json()).toMatchObject({ points: 250, rewards_available: 2, points_into_next: 50 });
  });

  it("returns 404 for an unknown customer and requires auth", async () => {
    expect((await SELF.fetch("https://example.com/admin/customers/999999/loyalty", { headers: ADMIN_AUTH })).status).toBe(404);
    expect((await SELF.fetch("https://example.com/admin/customers/1/loyalty")).status).toBe(401);
  });
});

describe("POST /admin/customers/:id/redeem-reward", () => {
  it("takes the points of one reward off the balance", async () => {
    const { token, customer } = await login("3339990005");
    await givePoints(customer.id, 130);

    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ reward_euros: 5, points: 30, rewards_available: 0 });
    expect((await getMe(token)).points).toBe(30);
  });

  it("records the redemption in the points log", async () => {
    const { customer } = await login("3339990006");
    await givePoints(customer.id, 100);
    await adminPost(`/admin/customers/${customer.id}/redeem-reward`);

    const entry = await env.DB.prepare("SELECT delta, reason FROM points_log WHERE customer_id = ? AND delta < 0")
      .bind(customer.id)
      .first<{ delta: number; reason: string }>();
    expect(entry?.delta).toBe(-100);
    expect(entry?.reason).toContain("Sconto fedeltà");
  });

  it("refuses when there are not enough points", async () => {
    const { customer } = await login("3339990007");
    await givePoints(customer.id, 99);
    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "not_enough_points" });
  });

  it("returns 404 for an unknown customer and requires auth", async () => {
    expect((await adminPost("/admin/customers/999999/redeem-reward")).status).toBe(404);
    expect((await SELF.fetch("https://example.com/admin/customers/1/redeem-reward", { method: "POST" })).status).toBe(401);
  });
});

describe("POST /admin/customers/:id/redeem-reward with all=true", () => {
  it("uses every unlocked reward in one go", async () => {
    const { token, customer } = await login("3339991001");
    await givePoints(customer.id, 250);

    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: true });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      redeemed_count: 2,
      redeemed_euros: 10,
      points: 50,
      rewards_available: 0,
      points_into_next: 50,
    });
    expect((await getMe(token)).points).toBe(50);
  });

  it("records one single log entry for all the rewards used", async () => {
    const { customer } = await login("3339991002");
    await givePoints(customer.id, 300);
    await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: true });

    const { results } = await env.DB.prepare("SELECT delta, reason FROM points_log WHERE customer_id = ? AND delta < 0")
      .bind(customer.id)
      .all<{ delta: number; reason: string }>();
    expect(results).toHaveLength(1);
    expect(results[0]?.delta).toBe(-300);
    expect(results[0]?.reason).toContain("15 €");
  });

  it("uses just the one available reward when there is only one", async () => {
    const { customer } = await login("3339991003");
    await givePoints(customer.id, 130);
    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: true });
    expect(await res.json()).toMatchObject({ redeemed_count: 1, redeemed_euros: 5, points: 30 });
  });

  it("still uses one reward at a time when all is false or missing", async () => {
    const { customer } = await login("3339991004");
    await givePoints(customer.id, 250);

    const first = await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: false });
    expect(await first.json()).toMatchObject({ redeemed_count: 1, redeemed_euros: 5, points: 150, rewards_available: 1 });

    const second = await adminPost(`/admin/customers/${customer.id}/redeem-reward`);
    expect(await second.json()).toMatchObject({ redeemed_count: 1, points: 50 });
  });

  it("refuses when there is no reward to use, even with all=true", async () => {
    const { customer } = await login("3339991005");
    await givePoints(customer.id, 99);
    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: true });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "not_enough_points" });
  });

  it("follows the current rule when computing the amount", async () => {
    const { customer } = await login("3339991006");
    await givePoints(customer.id, 130);
    await env.DB.prepare("UPDATE loyalty_settings SET points_per_reward = 50, reward_euros = 3").run();
    const res = await adminPost(`/admin/customers/${customer.id}/redeem-reward`, { all: true });
    expect(await res.json()).toMatchObject({ redeemed_count: 2, redeemed_euros: 6, points: 30 });
  });
});
