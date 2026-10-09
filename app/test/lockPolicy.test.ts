import { describe, expect, it } from "vitest";
import { shouldLockOnResume } from "../src/lockPolicy";

const graceMs = 60_000;

describe("shouldLockOnResume", () => {
  it("never locks when the biometric lock is disabled", () => {
    expect(shouldLockOnResume({ enabled: false, leftAt: 0, now: 10 * graceMs, graceMs })).toBe(false);
  });

  it("does not lock if the app was in background for less than the grace period", () => {
    expect(shouldLockOnResume({ enabled: true, leftAt: 1_000, now: 1_000 + graceMs - 1, graceMs })).toBe(false);
  });

  it("locks once the grace period has passed", () => {
    expect(shouldLockOnResume({ enabled: true, leftAt: 1_000, now: 1_000 + graceMs, graceMs })).toBe(true);
  });

  it("locks when the moment the app left is unknown", () => {
    expect(shouldLockOnResume({ enabled: true, leftAt: null, now: 5_000, graceMs })).toBe(true);
  });
});
