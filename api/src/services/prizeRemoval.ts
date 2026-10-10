import { deactivatePrize, deleteUnwonPrize } from "../db";

export type PrizeRemovalOutcome = "deleted" | "deactivated" | "not_found";

// Un premio già vinto è citato dai giri e da "I tuoi premi" della cliente: non si cancella, si toglie solo dalla ruota
export async function removePrize(db: D1Database, prizeId: number): Promise<PrizeRemovalOutcome> {
  if (await deleteUnwonPrize(db, prizeId)) return "deleted";
  if (await deactivatePrize(db, prizeId)) return "deactivated";
  return "not_found";
}
