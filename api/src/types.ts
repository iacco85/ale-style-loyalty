export type Env = {
  DB: D1Database;
  AUTH_SECRET: string;
  ADMIN_PASSWORD: string;
  FCM_PROJECT_ID: string;
  FCM_CLIENT_EMAIL: string;
  FCM_PRIVATE_KEY: string;
  /** Solo sviluppo: "true" spegne il cooldown settimanale della ruota. Mai impostarla in produzione. */
  SPIN_COOLDOWN_DISABLED?: string;
};

export type Variables = {
  customerId: number;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  created_at: string;
};

export type CustomerCredentials = Customer & {
  pin_hash: string | null;
  pin_salt: string | null;
  failed_pin_attempts: number;
  pin_locked_until: string | null;
};

export type CustomerWithPoints = Customer & { points: number };

export type Offer = {
  id: number;
  customer_id: number | null;
  title: string;
  description: string | null;
  created_at: string;
};

export type PrizeType = "discount" | "points" | "none";

export type Prize = {
  id: number;
  label: string;
  type: PrizeType;
  value: number | null;
  weight: number;
};

export type Spin = {
  id: number;
  customer_id: number;
  prize_id: number;
  spun_at: string;
};

export type WonPrize = {
  id: number;
  label: string;
  type: PrizeType;
  value: number | null;
  spun_at: string;
  redeemed_at: string | null;
};

export type LoyaltyRule = {
  pointsPerReward: number;
  rewardEuros: number;
};
