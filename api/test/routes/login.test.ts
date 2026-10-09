import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

interface LoginBody {
  name?: string;
  phone: string;
  pin?: string;
}

function postLogin(body: LoginBody) {
  return SELF.fetch("https://example.com/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ale", ...body }),
  });
}

describe("POST /login — first access", () => {
  it("creates a new customer for an unseen phone number and returns a token", async () => {
    const res = await postLogin({ phone: "3331234567", pin: "4821" });

    expect(res.status).toBe(200);
    const body = await res.json<{ token: string; customer: { id: number; name: string; phone: string } }>();
    expect(body.token).toEqual(expect.any(String));
    expect(body.customer).toMatchObject({ name: "Ale", phone: "+393331234567" });
  });

  it("never returns the PIN or its hash", async () => {
    const res = await postLogin({ phone: "3331234568", pin: "4821" });
    const text = await res.text();
    expect(text).not.toContain("4821");
    expect(text).not.toContain("pin_hash");
  });

  it("rejects an invalid phone number with 400", async () => {
    expect((await postLogin({ phone: "123", pin: "4821" })).status).toBe(400);
  });

  it("rejects a missing name with 400", async () => {
    const res = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "3331234567", pin: "4821" }),
    });
    expect(res.status).toBe(400);
  });

  it.each(["123", "1234567", "12ab", ""])("rejects the malformed PIN %j with 400", async (pin) => {
    expect((await postLogin({ phone: "3331234569", pin })).status).toBe(400);
  });

  it("rejects a missing PIN with 400", async () => {
    expect((await postLogin({ phone: "3331234569" })).status).toBe(400);
  });
});

describe("POST /login — returning customer", () => {
  it("logs in again with the same PIN and reuses the customer", async () => {
    const first = await postLogin({ phone: "3339876543", pin: "1111" });
    const firstBody = await first.json<{ customer: { id: number } }>();

    const second = await postLogin({ name: "Ale Style", phone: "3339876543", pin: "1111" });
    const secondBody = await second.json<{ customer: { id: number; name: string } }>();

    expect(second.status).toBe(200);
    expect(secondBody.customer.id).toBe(firstBody.customer.id);
    expect(secondBody.customer.name).toBe("Ale");
  });

  it("rejects a wrong PIN with 401", async () => {
    await postLogin({ phone: "3339876544", pin: "1111" });
    const res = await postLogin({ phone: "3339876544", pin: "2222" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
  });

  it("locks the account after 5 wrong PINs, even if the next PIN is correct", async () => {
    await postLogin({ phone: "3339876545", pin: "1111" });
    for (let i = 0; i < 4; i++) {
      expect((await postLogin({ phone: "3339876545", pin: "0000" })).status).toBe(401);
    }

    const fifth = await postLogin({ phone: "3339876545", pin: "0000" });
    expect(fifth.status).toBe(429);
    expect((await fifth.json<{ error: string }>()).error).toBe("too_many_attempts");

    const correctWhileLocked = await postLogin({ phone: "3339876545", pin: "1111" });
    expect(correctWhileLocked.status).toBe(429);
  });

  it("resets the failure counter after a successful login", async () => {
    await postLogin({ phone: "3339876546", pin: "1111" });
    for (let i = 0; i < 3; i++) await postLogin({ phone: "3339876546", pin: "0000" });
    expect((await postLogin({ phone: "3339876546", pin: "1111" })).status).toBe(200);

    for (let i = 0; i < 4; i++) {
      expect((await postLogin({ phone: "3339876546", pin: "0000" })).status).toBe(401);
    }
  });
});

describe("POST /login — customer created before PINs existed", () => {
  it("lets the first login choose the PIN, then enforces it", async () => {
    await env.DB.prepare("INSERT INTO customers (name, phone) VALUES (?, ?)").bind("Vecchia", "+393330000001").run();

    expect((await postLogin({ phone: "3330000001", pin: "7777" })).status).toBe(200);
    expect((await postLogin({ phone: "3330000001", pin: "8888" })).status).toBe(401);
    expect((await postLogin({ phone: "3330000001", pin: "7777" })).status).toBe(200);
  });
});

describe("GET /me", () => {
  async function login(phone: string) {
    const res = await postLogin({ phone, pin: "1234" });
    return res.json<{ token: string }>();
  }

  it("returns 401 without a token", async () => {
    const res = await SELF.fetch("https://example.com/me");
    expect(res.status).toBe(401);
  });

  it("returns the customer profile with a points balance of 0 for a new customer", async () => {
    const { token } = await login("3335551234");
    const res = await SELF.fetch("https://example.com/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ points: number }>();
    expect(body.points).toBe(0);
  });
});
