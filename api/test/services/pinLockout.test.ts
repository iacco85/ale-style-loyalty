import { describe, expect, it } from "vitest";
import { isLockedOut, nextFailureState } from "../../src/services/pinLockout";

const now = new Date("2026-10-09T10:00:00.000Z");

describe("nextFailureState", () => {
  it("counts a failed attempt without locking while under the limit", () => {
    expect(nextFailureState(0, now)).toEqual({ attempts: 1, lockedUntil: null });
    expect(nextFailureState(3, now)).toEqual({ attempts: 4, lockedUntil: null });
  });

  it("locks for 15 minutes on the 5th failed attempt and resets the counter", () => {
    expect(nextFailureState(4, now)).toEqual({ attempts: 0, lockedUntil: "2026-10-09T10:15:00.000Z" });
  });
});

describe("isLockedOut", () => {
  it("is not locked when there is no lock", () => {
    expect(isLockedOut(null, now)).toBe(false);
  });

  it("is locked until the lock expires", () => {
    expect(isLockedOut("2026-10-09T10:15:00.000Z", now)).toBe(true);
    expect(isLockedOut("2026-10-09T09:59:59.000Z", now)).toBe(false);
  });

  it("is not locked exactly at the expiry instant", () => {
    expect(isLockedOut("2026-10-09T10:00:00.000Z", now)).toBe(false);
  });
});
