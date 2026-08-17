export type Env = {
  DB: D1Database;
  AUTH_SECRET: string;
  ADMIN_PASSWORD: string;
  FCM_PROJECT_ID: string;
  FCM_CLIENT_EMAIL: string;
  FCM_PRIVATE_KEY: string;
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
