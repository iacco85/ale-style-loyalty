export interface CustomerWithPoints {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  points: number;
}

export type PrizeType = "discount" | "points" | "none";

export interface Prize {
  id: number;
  label: string;
  type: PrizeType;
  value: number | null;
  weight: number;
}

export interface PrizeInput {
  label: string;
  type: PrizeType;
  value?: number;
  weight: number;
}

export interface OfferInput {
  title: string;
  description?: string;
}

export interface WonPrize {
  id: number;
  label: string;
  type: PrizeType;
  value: number | null;
  spun_at: string;
  redeemed_at: string | null;
  expires_at: string;
  status: "available" | "redeemed" | "expired";
}

export interface LoyaltyRule {
  points_per_reward: number;
  reward_euros: number;
}

export interface LoyaltySnapshot extends LoyaltyRule {
  points: number;
  rewards_available: number;
  rewards_total_euros: number;
  points_into_next: number;
  points_to_next: number;
  percent: number;
}

export interface LoyaltyRedemption extends LoyaltySnapshot {
  redeemed_count: number;
  redeemed_euros: number;
}
