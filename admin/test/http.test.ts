import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../src/http";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the admin password as Bearer token", async () => {
    const fetchMock = stubFetch(200, []);
    await apiFetch("/admin/customers", { password: "segreta" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/admin/customers");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer segreta");
  });

  it("serializes the json body and sets the content type", async () => {
    const fetchMock = stubFetch(200, { ok: true });
    await apiFetch("/admin/customers/1/points", { password: "p", method: "POST", body: { delta: 1 } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"delta":1}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("returns the parsed json on success", async () => {
    stubFetch(200, [{ id: 1 }]);
    expect(await apiFetch("/x", { password: "p" })).toEqual([{ id: 1 }]);
  });

  it("throws ApiError with status and code on failure", async () => {
    stubFetch(401, { error: "unauthorized" });
    const error = await apiFetch("/x", { password: "p" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("unauthorized");
  });
});
