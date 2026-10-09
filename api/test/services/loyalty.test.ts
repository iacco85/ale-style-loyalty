import { describe, expect, it } from "vitest";
import { getLoyaltyProgress } from "../../src/services/loyalty";

const rule = { pointsPerReward: 100, rewardEuros: 5 };

describe("getLoyaltyProgress", () => {
  it("starts empty with no points", () => {
    expect(getLoyaltyProgress(0, rule)).toEqual({ rewardsAvailable: 0, rewardsTotalEuros: 0, pointsIntoNext: 0, pointsToNext: 100, percent: 0 });
  });

  it("fills the bar toward the first reward", () => {
    expect(getLoyaltyProgress(40, rule)).toEqual({ rewardsAvailable: 0, rewardsTotalEuros: 0, pointsIntoNext: 40, pointsToNext: 60, percent: 40 });
  });

  it("unlocks a reward at exactly the threshold and restarts the bar", () => {
    expect(getLoyaltyProgress(100, rule)).toEqual({ rewardsAvailable: 1, rewardsTotalEuros: 5, pointsIntoNext: 0, pointsToNext: 100, percent: 0 });
  });

  it("counts more than one reward and the progress toward the next", () => {
    expect(getLoyaltyProgress(250, rule)).toEqual({ rewardsAvailable: 2, rewardsTotalEuros: 10, pointsIntoNext: 50, pointsToNext: 50, percent: 50 });
  });

  it("follows a different rule", () => {
    expect(getLoyaltyProgress(130, { pointsPerReward: 50, rewardEuros: 3 })).toEqual({
      rewardsAvailable: 2,
      rewardsTotalEuros: 6,
      pointsIntoNext: 30,
      pointsToNext: 20,
      percent: 60,
    });
  });

  it("rounds the percentage down so the bar never shows full before the reward is unlocked", () => {
    expect(getLoyaltyProgress(199, { pointsPerReward: 200, rewardEuros: 10 }).percent).toBe(99);
  });
});
