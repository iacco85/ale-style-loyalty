import { describe, expect, it } from "vitest";
import { getSpinAvailability } from "../../src/services/spinCooldown";

describe("getSpinAvailability", () => {
  it("allows spinning when the customer has never spun before", () => {
    const result = getSpinAvailability(null, new Date("2026-01-08T00:00:00Z"));
    expect(result).toEqual({ allowed: true, nextAvailableAt: null });
  });

  it("blocks spinning before 7 days have passed since the last spin", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-06T00:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.nextAvailableAt).toBe("2026-01-08T00:00:00.000Z");
  });

  it("allows spinning exactly 7 days after the last spin", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-08T00:00:00Z"));
    expect(result.allowed).toBe(true);
    expect(result.nextAvailableAt).toBeNull();
  });

  it("allows spinning well after the cooldown has passed", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-02-01T00:00:00Z"));
    expect(result.allowed).toBe(true);
  });
});
