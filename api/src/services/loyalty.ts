import type { LoyaltyRule } from "../types";

export interface LoyaltyProgress {
  rewardsAvailable: number;
  rewardsTotalEuros: number;
  pointsIntoNext: number;
  pointsToNext: number;
  percent: number;
}

export function getLoyaltyProgress(points: number, { pointsPerReward, rewardEuros }: LoyaltyRule): LoyaltyProgress {
  const pointsIntoNext = points % pointsPerReward;
  const rewardsAvailable = Math.floor(points / pointsPerReward);
  return {
    rewardsAvailable,
    rewardsTotalEuros: rewardsAvailable * rewardEuros,
    pointsIntoNext,
    pointsToNext: pointsPerReward - pointsIntoNext,
    percent: Math.floor((pointsIntoNext / pointsPerReward) * 100),
  };
}
