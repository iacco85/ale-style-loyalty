import { describe, expect, it } from "vitest";
import {
  loyaltyRedeemedMessage,
  offerMessage,
  pointsAddedMessage,
  prizeRedeemedMessage,
} from "../../src/services/pushMessages";

function snapshot(points: number, { pointsPerReward = 100, rewardEuros = 5 } = {}) {
  return {
    points,
    reward_euros: rewardEuros,
    rewards_available: Math.floor(points / pointsPerReward),
    points_to_next: pointsPerReward - (points % pointsPerReward),
  };
}

describe("offerMessage", () => {
  it("uses the offer title and description and opens the offers screen", () => {
    expect(offerMessage({ title: "-15% sul taglio", description: "Fino a fine mese" })).toEqual({
      title: "-15% sul taglio",
      body: "Fino a fine mese",
      data: { screen: "offers" },
    });
  });

  it("repeats the title when there is no description", () => {
    expect(offerMessage({ title: "Weekend -10%", description: null }).body).toBe("Weekend -10%");
  });
});

describe("pointsAddedMessage", () => {
  it("tells how many points are missing to the next discount", () => {
    expect(pointsAddedMessage(10, snapshot(50), snapshot(60))).toEqual({
      title: "Hai ricevuto 10 punti",
      body: "Ora hai 60 punti: ne mancano 40 per il prossimo sconto di 5 €.",
      data: { screen: "home" },
    });
  });

  it("uses the singular for one point", () => {
    const message = pointsAddedMessage(1, snapshot(0), snapshot(1));
    expect(message?.title).toBe("Hai ricevuto 1 punto");
    expect(message?.body).toBe("Ora hai 1 punto: ne mancano 99 per il prossimo sconto di 5 €.");
  });

  it("uses the singular when one point is missing", () => {
    expect(pointsAddedMessage(9, snapshot(90), snapshot(99))?.body).toBe(
      "Ora hai 99 punti: ne manca 1 per il prossimo sconto di 5 €.",
    );
  });

  it("announces a discount unlocked by the added points", () => {
    expect(pointsAddedMessage(30, snapshot(80), snapshot(110))?.body).toBe(
      "Hai sbloccato uno sconto di 5 €! Ora hai 110 punti.",
    );
  });

  it("announces more than one discount unlocked at once", () => {
    expect(pointsAddedMessage(200, snapshot(50), snapshot(250))?.body).toBe(
      "Hai sbloccato 2 sconti da 5 €! Ora hai 250 punti.",
    );
  });

  it("sends nothing when points are taken away", () => {
    expect(pointsAddedMessage(-10, snapshot(60), snapshot(50))).toBeNull();
  });
});

describe("loyaltyRedeemedMessage", () => {
  it("confirms a single discount used and the remaining points", () => {
    expect(loyaltyRedeemedMessage(1, 5, snapshot(40))).toEqual({
      title: "Sconto usato",
      body: "Hai usato uno sconto di 5 €. Ora hai 40 punti.",
      data: { screen: "home" },
    });
  });

  it("confirms several discounts used together", () => {
    expect(loyaltyRedeemedMessage(3, 15, snapshot(20))).toEqual({
      title: "Sconti usati",
      body: "Hai usato 3 sconti per un totale di 15 €. Ora hai 20 punti.",
      data: { screen: "home" },
    });
  });
});

describe("prizeRedeemedMessage", () => {
  it("confirms the wheel prize used and opens the prizes screen", () => {
    expect(prizeRedeemedMessage("-15% prossimo servizio")).toEqual({
      title: "Premio usato",
      body: "Hai usato il premio «-15% prossimo servizio».",
      data: { screen: "prizes" },
    });
  });
});
