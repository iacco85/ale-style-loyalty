import { describe, expect, it } from "vitest";
import { pickWeightedPrize } from "../../src/services/weightedDraw";

describe("pickWeightedPrize", () => {
  const prizes = [
    { id: 1, weight: 70 },
    { id: 2, weight: 20 },
    { id: 3, weight: 10 },
  ];

  it("picks the first item when random lands at the start of its range", () => {
    expect(pickWeightedPrize(prizes, () => 0).id).toBe(1);
  });

  it("picks the item whose cumulative weight range contains the random draw", () => {
    // total weight 100: [0,70) -> id 1, [70,90) -> id 2, [90,100) -> id 3
    expect(pickWeightedPrize(prizes, () => 0.5).id).toBe(1); // 50
    expect(pickWeightedPrize(prizes, () => 0.75).id).toBe(2); // 75
    expect(pickWeightedPrize(prizes, () => 0.95).id).toBe(3); // 95
  });

  it("never picks a value from beyond the last range even at the top edge", () => {
    expect(pickWeightedPrize(prizes, () => 0.999999).id).toBe(3);
  });

  it("throws on an empty prize list", () => {
    expect(() => pickWeightedPrize([], () => 0)).toThrow();
  });

  it("respects the configured weights over many draws", () => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const prize = pickWeightedPrize(prizes, Math.random);
      counts[prize.id as 1 | 2 | 3]++;
    }
    expect(counts[1] / trials).toBeGreaterThan(0.6);
    expect(counts[1] / trials).toBeLessThan(0.8);
    expect(counts[3] / trials).toBeGreaterThan(0.05);
    expect(counts[3] / trials).toBeLessThan(0.15);
  });
});
