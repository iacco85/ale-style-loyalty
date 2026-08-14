import { afterEach, describe, expect, it, vi } from "vitest";
import { signToken, verifyToken } from "../../src/services/token";

const SECRET = "test-secret";

describe("signToken / verifyToken", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a signed token back to its customerId", async () => {
    const token = await signToken(42, SECRET);
    const result = await verifyToken(token, SECRET);
    expect(result).toEqual({ customerId: 42 });
  });

  it("rejects a token tampered with after signing", async () => {
    const token = await signToken(42, SECRET);
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(await verifyToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signToken(42, SECRET);
    expect(await verifyToken(token, "other-secret")).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifyToken("not-a-valid-token", SECRET)).toBeNull();
  });

  it("accepts a token just under 180 days old", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signToken(42, SECRET);

    vi.setSystemTime(new Date("2026-06-25T00:00:00Z")); // ~175 days later
    expect(await verifyToken(token, SECRET)).toEqual({ customerId: 42 });
  });

  it("rejects a token older than 180 days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signToken(42, SECRET);

    vi.setSystemTime(new Date("2026-07-15T00:00:00Z")); // ~195 days later
    expect(await verifyToken(token, SECRET)).toBeNull();
  });
});
