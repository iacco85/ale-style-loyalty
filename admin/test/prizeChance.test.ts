import { describe, expect, it } from "vitest";
import { chancePercent, draftChancePercent } from "../src/prizeChance";

const prizes = [
  { id: 1, weight: 70 },
  { id: 2, weight: 20 },
  { id: 3, weight: 10 },
];

describe("chancePercent", () => {
  it("is the share of the weight on the total", () => {
    expect(chancePercent(20, 100)).toBe(20);
    expect(chancePercent(1, 3)).toBeCloseTo(33.33, 2);
  });

  it("is zero when there are no weights", () => {
    expect(chancePercent(0, 0)).toBe(0);
  });
});

describe("draftChancePercent", () => {
  it("adds a new prize to the existing ones", () => {
    // 25 su 70 + 20 + 10 + 25 = 125
    expect(draftChancePercent(prizes, 25)).toBe(20);
  });

  it("replaces the old weight of the prize being edited", () => {
    // 10 diventa 30: 30 su 70 + 20 + 30 = 120
    expect(draftChancePercent(prizes, 30, 3)).toBe(25);
  });

  it("is 100% for the only prize on the wheel", () => {
    expect(draftChancePercent([], 5)).toBe(100);
  });

  it("is zero while the weight is missing or not valid", () => {
    expect(draftChancePercent(prizes, 0)).toBe(0);
    expect(draftChancePercent(prizes, -5)).toBe(0);
    expect(draftChancePercent(prizes, Number.NaN)).toBe(0);
  });
});
