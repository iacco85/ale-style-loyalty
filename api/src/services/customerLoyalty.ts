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

export type RedeemRewardOutcome =
  | { status: "redeemed"; snapshot: LoyaltySnapshot; redeemedCount: number; redeemedEuros: number }
  | { status: "not_enough_points" };

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

function redemptionReason(count: number, euros: number, total: number): string {
  return count === 1 ? `Sconto fedeltà di ${euros} €` : `Sconti fedeltà: ${count} × ${euros} € = ${total} €`;
}

export async function redeemLoyaltyRewards(
  db: D1Database,
  customerId: number,
  { all = false }: { all?: boolean } = {},
): Promise<RedeemRewardOutcome> {
  const before = await getCustomerLoyalty(db, customerId);
  if (before.rewards_available < 1) return { status: "not_enough_points" };

  const redeemedCount = all ? before.rewards_available : 1;
  const redeemedEuros = redeemedCount * before.reward_euros;
  const reason = redemptionReason(redeemedCount, before.reward_euros, redeemedEuros);

  // una sola riga di log per tutti gli sconti usati insieme
  await addPointsEntry(db, customerId, -redeemedCount * before.points_per_reward, reason);
  return { status: "redeemed", snapshot: await getCustomerLoyalty(db, customerId), redeemedCount, redeemedEuros };
}
