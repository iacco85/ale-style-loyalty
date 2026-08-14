import { describe, expect, it } from "vitest";
import { normalizePhone } from "../../src/services/phone";

describe("normalizePhone", () => {
  it("normalizes a plain 10-digit Italian mobile number", () => {
    expect(normalizePhone("3331234567")).toBe("+393331234567");
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhone("333 123-4567")).toBe("+393331234567");
  });

  it("normalizes a number already prefixed with +39", () => {
    expect(normalizePhone("+39 333 123 4567")).toBe("+393331234567");
  });

  it("normalizes a number prefixed with 0039", () => {
    expect(normalizePhone("0039 333 123 4567")).toBe("+393331234567");
  });

  it("rejects numbers that don't start with 3 (landline)", () => {
    expect(normalizePhone("02 1234567")).toBeNull();
  });

  it("rejects numbers that are too short", () => {
    expect(normalizePhone("33312")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(normalizePhone("not-a-phone")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizePhone("")).toBeNull();
  });
});
