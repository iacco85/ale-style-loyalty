import { getWonSpin, listWonPrizes, markSpinRedeemed } from "../db";
import type { WonPrize } from "../types";
import { type PrizeStatus, getPrizeExpiry, getPrizeStatus } from "./prizeExpiry";

export type WonPrizeWithStatus = WonPrize & { expires_at: string; status: PrizeStatus };
export type RedeemOutcome = "redeemed" | "already_redeemed" | "expired" | "not_found";

export async function listWonPrizesWithStatus(
  db: D1Database,
  customerId: number,
  now = new Date(),
): Promise<WonPrizeWithStatus[]> {
  const prizes = await listWonPrizes(db, customerId);
  return prizes.map((prize) => ({
    ...prize,
    expires_at: getPrizeExpiry(prize.spun_at),
    status: getPrizeStatus({ spunAt: prize.spun_at, redeemedAt: prize.redeemed_at }, now),
  }));
}

export async function redeemPrize(db: D1Database, spinId: number, now = new Date()): Promise<RedeemOutcome> {
  const spin = await getWonSpin(db, spinId);
  if (!spin) return "not_found";

  const status = getPrizeStatus({ spunAt: spin.spun_at, redeemedAt: spin.redeemed_at }, now);
  if (status === "redeemed") return "already_redeemed";
  if (status === "expired") return "expired";

  // l'UPDATE condizionato protegge da due richieste contemporanee sullo stesso premio
  return (await markSpinRedeemed(db, spinId)) ? "redeemed" : "already_redeemed";
}
