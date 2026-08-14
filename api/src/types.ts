export type Env = {
  DB: D1Database;
  AUTH_SECRET: string;
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

export type Offer = {
  id: number;
  customer_id: number | null;
  title: string;
  description: string | null;
  created_at: string;
};
