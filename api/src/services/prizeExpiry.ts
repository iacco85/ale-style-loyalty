const VALIDITY_DAYS = 30;
const VALIDITY_MS = VALIDITY_DAYS * 24 * 60 * 60 * 1000;

export type PrizeStatus = "available" | "redeemed" | "expired";

export function getPrizeExpiry(spunAt: string): string {
  return new Date(new Date(spunAt).getTime() + VALIDITY_MS).toISOString();
}

export function getPrizeStatus(prize: { spunAt: string; redeemedAt: string | null }, now: Date): PrizeStatus {
  if (prize.redeemedAt) return "redeemed";
  return now.getTime() >= new Date(getPrizeExpiry(prize.spunAt)).getTime() ? "expired" : "available";
}
