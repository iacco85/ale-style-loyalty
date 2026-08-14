import { describe, expect, it } from "vitest";
import { computeBalance } from "../../src/services/points";

describe("computeBalance", () => {
  it("returns 0 for no entries", () => {
    expect(computeBalance([])).toBe(0);
  });

  it("sums positive deltas", () => {
    expect(computeBalance([{ delta: 5 }, { delta: 3 }])).toBe(8);
  });

  it("subtracts negative deltas", () => {
    expect(computeBalance([{ delta: 10 }, { delta: -4 }])).toBe(6);
  });

  it("never returns a balance below 0", () => {
    expect(computeBalance([{ delta: 5 }, { delta: -20 }])).toBe(0);
  });
});
