import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../src/http";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the customer token as Bearer when present", async () => {
    const fetchMock = stubFetch(200, {});
    await apiFetch("/me", { token: "abc" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc");
  });

  it("omits Authorization without a token (login)", async () => {
    const fetchMock = stubFetch(200, {});
    await apiFetch("/login", { method: "POST", body: { name: "Ale", phone: "333" } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(init.body).toBe('{"name":"Ale","phone":"333"}');
  });

  it("exposes status, code and the whole body on errors", async () => {
    stubFetch(429, { error: "cooldown_active", next_spin_at: "2026-10-16T10:00:00.000Z" });
    const error = await apiFetch("/spin", { method: "POST", token: "t" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.code).toBe("cooldown_active");
    expect(error.body.next_spin_at).toBe("2026-10-16T10:00:00.000Z");
  });
});
