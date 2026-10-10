import { describe, expect, it } from "vitest";
import { getSpinAvailability } from "../../src/services/spinCooldown";

const weekly = { cooldownDays: 7 };

describe("getSpinAvailability", () => {
  it("allows spinning when the customer has never spun before", () => {
    const result = getSpinAvailability(null, new Date("2026-01-08T00:00:00Z"), weekly);
    expect(result).toEqual({ allowed: true, nextAvailableAt: null });
  });

  it("blocks spinning before 7 days have passed since the last spin", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-06T00:00:00Z"), weekly);
    expect(result.allowed).toBe(false);
    expect(result.nextAvailableAt).toBe("2026-01-08T00:00:00.000Z");
  });

  it("allows spinning exactly 7 days after the last spin", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-08T00:00:00Z"), weekly);
    expect(result.allowed).toBe(true);
    expect(result.nextAvailableAt).toBeNull();
  });

  it("allows spinning well after the cooldown has passed", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-02-01T00:00:00Z"), weekly);
    expect(result.allowed).toBe(true);
  });
});

describe("getSpinAvailability with the interval set by the admin", () => {
  it("follows a different number of days", () => {
    const blocked = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-02T00:00:00Z"), { cooldownDays: 3 });
    expect(blocked).toEqual({ allowed: false, nextAvailableAt: "2026-01-04T00:00:00.000Z" });

    const allowed = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-04T00:00:00Z"), { cooldownDays: 3 });
    expect(allowed.allowed).toBe(true);
  });

  it("lets the customer spin again right away when the interval is 0 days", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-01T00:00:01Z"), { cooldownDays: 0 });
    expect(result).toEqual({ allowed: true, nextAvailableAt: null });
  });

  it("applies a new interval to the spins already done", () => {
    // ultimo giro il 1°, intervallo portato da 7 a 14 giorni: il prossimo giro slitta al 15
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-09T00:00:00Z"), { cooldownDays: 14 });
    expect(result).toEqual({ allowed: false, nextAvailableAt: "2026-01-15T00:00:00.000Z" });
  });
});

describe("getSpinAvailability with the cooldown disabled (dev only)", () => {
  it("allows spinning right after the last spin", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-01T00:00:01Z"), {
      ...weekly,
      cooldownDisabled: true,
    });
    expect(result).toEqual({ allowed: true, nextAvailableAt: null });
  });

  it("keeps the configured cooldown when the option is not set", () => {
    const result = getSpinAvailability("2026-01-01T00:00:00Z", new Date("2026-01-01T00:00:01Z"), weekly);
    expect(result.allowed).toBe(false);
  });
});
