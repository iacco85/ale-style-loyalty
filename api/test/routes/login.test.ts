import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("POST /login", () => {
  it("creates a new customer for an unseen phone number and returns a token", async () => {
    const res = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale", phone: "3331234567" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ token: string; customer: { id: number; name: string; phone: string } }>();
    expect(body.token).toEqual(expect.any(String));
    expect(body.customer).toMatchObject({ name: "Ale", phone: "+393331234567" });
  });

  it("reuses the existing customer on a repeat login with the same phone number", async () => {
    const first = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale", phone: "3339876543" }),
    });
    const firstBody = await first.json<{ customer: { id: number } }>();

    const second = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale Style", phone: "3339876543" }),
    });
    const secondBody = await second.json<{ customer: { id: number; name: string } }>();

    expect(secondBody.customer.id).toBe(firstBody.customer.id);
    expect(secondBody.customer.name).toBe("Ale");
  });

  it("rejects an invalid phone number with 400", async () => {
    const res = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale", phone: "123" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a missing name with 400", async () => {
    const res = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "3331234567" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /me", () => {
  async function login(phone: string) {
    const res = await SELF.fetch("https://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ale", phone }),
    });
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
