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
