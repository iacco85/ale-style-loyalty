import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("CORS", () => {
  it("answers preflight requests so the app and the admin can call the API from another origin", async () => {
    const res = await SELF.fetch("https://example.com/me", {
      method: "OPTIONS",
      headers: {
        origin: "https://localhost",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
  });

  it("adds the allow-origin header to normal responses", async () => {
    const res = await SELF.fetch("https://example.com/me", { headers: { origin: "https://localhost" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
