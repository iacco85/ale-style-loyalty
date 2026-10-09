export interface Customer {
  id: number;
  name: string;
  phone: string;
}

export interface Loyalty {
  points_per_reward: number;
  reward_euros: number;
  rewards_available: number;
  rewards_total_euros: number;
  points_into_next: number;
  points_to_next: number;
  percent: number;
}

export interface Profile extends Customer {
  points: number;
  loyalty: Loyalty;
}

export interface LoginResponse {
  token: string;
  customer: Customer;
}

export interface Offer {
  id: number;
  customer_id: number | null;
  title: string;
  description: string | null;
  created_at: string;
}

export type PrizeType = "discount" | "points" | "none";

export interface WheelPrize {
  id: number;
  label: string;
  type: PrizeType;
  value: number | null;
}

export interface SpinStatus {
  can_spin: boolean;
  next_spin_at: string | null;
}

export interface SpinResult {
  prize: WheelPrize;
  spun_at: string;
}

export interface WonPrize extends WheelPrize {
  spun_at: string;
  redeemed_at: string | null;
  expires_at: string;
  status: "available" | "redeemed" | "expired";
}
