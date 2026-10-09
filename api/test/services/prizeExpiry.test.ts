import { describe, expect, it } from "vitest";
import { getPrizeExpiry, getPrizeStatus } from "../../src/services/prizeExpiry";

const now = new Date("2026-10-31T12:00:00.000Z");

describe("getPrizeExpiry", () => {
  it("expires 30 days after the spin", () => {
    expect(getPrizeExpiry("2026-10-01T12:00:00.000Z")).toBe("2026-10-31T12:00:00.000Z");
  });
});

describe("getPrizeStatus", () => {
  it("is available before the expiry", () => {
    expect(getPrizeStatus({ spunAt: "2026-10-02T12:00:00.000Z", redeemedAt: null }, now)).toBe("available");
  });

  it("is expired from the expiry instant on", () => {
    expect(getPrizeStatus({ spunAt: "2026-10-01T12:00:00.000Z", redeemedAt: null }, now)).toBe("expired");
    expect(getPrizeStatus({ spunAt: "2026-09-01T00:00:00.000Z", redeemedAt: null }, now)).toBe("expired");
  });

  it("is redeemed once used, even if the validity has run out since", () => {
    expect(getPrizeStatus({ spunAt: "2026-09-01T00:00:00.000Z", redeemedAt: "2026-09-10T00:00:00.000Z" }, now)).toBe("redeemed");
  });
});
