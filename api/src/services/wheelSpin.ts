import { getLastSpunAtForCustomer, listPrizes, recordSpin } from "../db";
import type { Prize } from "../types";
import { getSpinAvailability } from "./spinCooldown";
import { pickWeightedPrize } from "./weightedDraw";

export type SpinOutcome =
  | { status: "cooldown"; nextSpinAt: string }
  | { status: "no_prizes" }
  | { status: "ok"; prize: Prize; spunAt: string };

interface SpinOptions {
  now?: Date;
  cooldownDisabled?: boolean;
}

function bonusPointsFor(prize: Prize): { delta: number; reason: string } | undefined {
  if (prize.type !== "points" || !prize.value || prize.value <= 0) return undefined;
  return { delta: prize.value, reason: `Ruota della fortuna: ${prize.label}` };
}

export async function spinForCustomer(
  db: D1Database,
  customerId: number,
  { now = new Date(), cooldownDisabled = false }: SpinOptions = {},
): Promise<SpinOutcome> {
  const lastSpunAt = await getLastSpunAtForCustomer(db, customerId);
  const availability = getSpinAvailability(lastSpunAt, now, { cooldownDisabled });
  if (!availability.allowed) return { status: "cooldown", nextSpinAt: availability.nextAvailableAt as string };

  const prizes = await listPrizes(db);
  if (prizes.length === 0) return { status: "no_prizes" };

  const prize = pickWeightedPrize(prizes);
  const spin = await recordSpin(db, customerId, prize.id, bonusPointsFor(prize));
  return { status: "ok", prize, spunAt: spin.spun_at };
}
