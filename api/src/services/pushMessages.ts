import type { PushNotification } from "../push";
import type { LoyaltySnapshot } from "./customerLoyalty";

/** Schermata dell'app da aprire toccando la notifica: è un contratto con `app/src/pushScreen.ts`. */
export type PushScreen = "home" | "offers" | "prizes";

type LoyaltyState = Pick<LoyaltySnapshot, "points" | "reward_euros" | "rewards_available" | "points_to_next">;

function message(title: string, body: string, screen: PushScreen): PushNotification {
  return { title, body, data: { screen } };
}

function pointsLabel(points: number): string {
  return points === 1 ? "1 punto" : `${points} punti`;
}

function missingLabel(points: number): string {
  return points === 1 ? "ne manca 1" : `ne mancano ${points}`;
}

function unlockedLabel(count: number, euros: number): string {
  return count === 1 ? `uno sconto di ${euros} €` : `${count} sconti da ${euros} €`;
}

export function offerMessage(offer: { title: string; description: string | null }): PushNotification {
  return message(offer.title, offer.description ?? offer.title, "offers");
}

export function pointsAddedMessage(added: number, before: LoyaltyState, after: LoyaltyState): PushNotification | null {
  if (added <= 0) return null;

  const unlocked = after.rewards_available - before.rewards_available;
  const body =
    unlocked > 0
      ? `Hai sbloccato ${unlockedLabel(unlocked, after.reward_euros)}! Ora hai ${pointsLabel(after.points)}.`
      : `Ora hai ${pointsLabel(after.points)}: ${missingLabel(after.points_to_next)} per il prossimo sconto di ${after.reward_euros} €.`;
  return message(`Hai ricevuto ${pointsLabel(added)}`, body, "home");
}

export function loyaltyRedeemedMessage(count: number, totalEuros: number, after: LoyaltyState): PushNotification {
  const used = count === 1 ? `uno sconto di ${totalEuros} €` : `${count} sconti per un totale di ${totalEuros} €`;
  const title = count === 1 ? "Sconto usato" : "Sconti usati";
  return message(title, `Hai usato ${used}. Ora hai ${pointsLabel(after.points)}.`, "home");
}

export function prizeRedeemedMessage(label: string): PushNotification {
  return message("Premio usato", `Hai usato il premio «${label}».`, "prizes");
}
