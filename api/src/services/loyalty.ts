import type { LoyaltyRule } from "../types";

export interface LoyaltyProgress {
  rewardsAvailable: number;
  pointsIntoNext: number;
  pointsToNext: number;
  percent: number;
}

export function getLoyaltyProgress(points: number, { pointsPerReward }: LoyaltyRule): LoyaltyProgress {
  const pointsIntoNext = points % pointsPerReward;
  return {
    rewardsAvailable: Math.floor(points / pointsPerReward),
    pointsIntoNext,
    pointsToNext: pointsPerReward - pointsIntoNext,
    percent: Math.floor((pointsIntoNext / pointsPerReward) * 100),
  };
}
