import { addPointsEntry, getLoyaltyRule, getPointsLogForCustomer } from "../db";
import { getLoyaltyProgress } from "./loyalty";
import { computeBalance } from "./points";

export interface LoyaltySnapshot {
  points: number;
  points_per_reward: number;
  reward_euros: number;
  rewards_available: number;
  rewards_total_euros: number;
  points_into_next: number;
  points_to_next: number;
  percent: number;
}

export type RedeemRewardOutcome = { status: "redeemed"; snapshot: LoyaltySnapshot } | { status: "not_enough_points" };

export async function getCustomerLoyalty(db: D1Database, customerId: number): Promise<LoyaltySnapshot> {
  const [entries, rule] = await Promise.all([getPointsLogForCustomer(db, customerId), getLoyaltyRule(db)]);
  const points = computeBalance(entries);
  const progress = getLoyaltyProgress(points, rule);
  return {
    points,
    points_per_reward: rule.pointsPerReward,
    reward_euros: rule.rewardEuros,
    rewards_available: progress.rewardsAvailable,
    rewards_total_euros: progress.rewardsTotalEuros,
    points_into_next: progress.pointsIntoNext,
    points_to_next: progress.pointsToNext,
    percent: progress.percent,
  };
}

export async function redeemLoyaltyReward(db: D1Database, customerId: number): Promise<RedeemRewardOutcome> {
  const before = await getCustomerLoyalty(db, customerId);
  if (before.rewards_available < 1) return { status: "not_enough_points" };

  await addPointsEntry(db, customerId, -before.points_per_reward, `Sconto fedeltà di ${before.reward_euros} €`);
  return { status: "redeemed", snapshot: await getCustomerLoyalty(db, customerId) };
}
