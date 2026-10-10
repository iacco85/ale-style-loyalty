import { SELF, env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

const ADMIN_AUTH = { authorization: "Bearer test-admin-password" };

async function login(phone: string) {
  const res = await SELF.fetch("https://example.com/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ale", phone, pin: "1234" }),
  });
  return res.json<{ token: string }>();
}

function putSettings(body: unknown, headers: Record<string, string> = ADMIN_AUTH) {
  return SELF.fetch("https://example.com/admin/wheel-settings", {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function spin(token: string) {
  return SELF.fetch("https://example.com/spin", { method: "POST", headers: { authorization: `Bearer ${token}` } });
}

async function spinStatus(token: string) {
  const res = await SELF.fetch("https://example.com/spin/status", { headers: { authorization: `Bearer ${token}` } });
  return res.json<{ can_spin: boolean; next_spin_at: string | null }>();
}

async function ensurePrize() {
  await env.DB.prepare("INSERT INTO prizes (label, type, value, weight) VALUES ('Hai perso', 'none', NULL, 1)").run();
}

afterEach(async () => {
  // gli altri file di test si aspettano l'intervallo predefinito di 7 giorni
  await env.DB.prepare("UPDATE wheel_settings SET spin_cooldown_days = 7 WHERE id = 1").run();
});

describe("admin wheel settings", () => {
  it("requires admin auth", async () => {
    expect((await SELF.fetch("https://example.com/admin/wheel-settings")).status).toBe(401);
    expect((await putSettings({ spin_cooldown_days: 3 }, {})).status).toBe(401);
  });

  it("starts with one spin every 7 days", async () => {
    const res = await SELF.fetch("https://example.com/admin/wheel-settings", { headers: ADMIN_AUTH });
    expect(await res.json()).toEqual({ spin_cooldown_days: 7 });
  });

  it("saves a new interval", async () => {
    const res = await putSettings({ spin_cooldown_days: 3 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ spin_cooldown_days: 3 });

    const saved = await SELF.fetch("https://example.com/admin/wheel-settings", { headers: ADMIN_AUTH });
    expect(await saved.json()).toEqual({ spin_cooldown_days: 3 });
  });

  it("rejects negative or fractional days", async () => {
    expect((await putSettings({ spin_cooldown_days: -1 })).status).toBe(400);
    expect((await putSettings({ spin_cooldown_days: 1.5 })).status).toBe(400);
  });
});

describe("spinning with the interval set by the admin", () => {
  it("lets the customer spin again right away when the interval is 0", async () => {
    await ensurePrize();
    await putSettings({ spin_cooldown_days: 0 });
    const { token } = await login("3337771001");

    expect((await spin(token)).status).toBe(200);
    expect(await spinStatus(token)).toEqual({ can_spin: true, next_spin_at: null });
    expect((await spin(token)).status).toBe(200);
  });

  it("tells the customer when the next spin is, using the configured days", async () => {
    await ensurePrize();
    await putSettings({ spin_cooldown_days: 2 });
    const { token } = await login("3337771002");

    expect((await spin(token)).status).toBe(200);
    const status = await spinStatus(token);

    expect(status.can_spin).toBe(false);
    const days = (Date.parse(status.next_spin_at!) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(2, 2);
    expect((await spin(token)).status).toBe(429);
  });
});
