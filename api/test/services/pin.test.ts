import { describe, expect, it } from "vitest";
import { hashPin, isValidPin, verifyPin } from "../../src/services/pin";

describe("isValidPin", () => {
  it.each(["1234", "123456", "0000"])("accepts %s", (pin) => {
    expect(isValidPin(pin)).toBe(true);
  });

  it.each(["123", "1234567", "12a4", "", "12 34"])("rejects %j", (pin) => {
    expect(isValidPin(pin)).toBe(false);
  });
});

describe("hashPin / verifyPin", () => {
  it("verifies the correct PIN", async () => {
    const { hash, salt } = await hashPin("4821");
    expect(await verifyPin("4821", hash, salt)).toBe(true);
  });

  it("rejects a wrong PIN", async () => {
    const { hash, salt } = await hashPin("4821");
    expect(await verifyPin("4822", hash, salt)).toBe(false);
  });

  it("does not store the PIN in clear text", async () => {
    const { hash, salt } = await hashPin("4821");
    expect(hash).not.toContain("4821");
    expect(salt).not.toContain("4821");
  });

  it("uses a different salt every time, so equal PINs get different hashes", async () => {
    const first = await hashPin("4821");
    const second = await hashPin("4821");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
