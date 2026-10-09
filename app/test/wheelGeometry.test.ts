import { describe, expect, it } from "vitest";
import { buildWheelGradient, stopRotation } from "../src/wheelGeometry";

describe("stopRotation", () => {
  it("lands the center of the first of four segments under the top pointer", () => {
    // segmento 0 copre 0-90°, centro a 45°: la ruota deve ruotare di 315° per portarlo in cima
    expect(stopRotation({ index: 0, count: 4, currentRotation: 0, extraTurns: 0 })).toBe(315);
  });

  it("lands the last segment", () => {
    // segmento 3 copre 270-360°, centro 315° → serve ruotare di 45°
    expect(stopRotation({ index: 3, count: 4, currentRotation: 0, extraTurns: 0 })).toBe(45);
  });

  it("adds the extra full turns for the spinning effect", () => {
    expect(stopRotation({ index: 0, count: 4, currentRotation: 0, extraTurns: 5 })).toBe(5 * 360 + 315);
  });

  it("always keeps spinning forward from the current rotation", () => {
    const first = stopRotation({ index: 1, count: 6, currentRotation: 0, extraTurns: 5 });
    const second = stopRotation({ index: 2, count: 6, currentRotation: first, extraTurns: 5 });
    expect(second).toBeGreaterThan(first + 5 * 360 - 360);
  });
});

describe("buildWheelGradient", () => {
  it("alternates colors per segment with hard stops", () => {
    expect(buildWheelGradient(2, "A", "B")).toBe("conic-gradient(A 0deg 180deg, B 180deg 360deg)");
  });

  it("keeps alternating for an odd count", () => {
    expect(buildWheelGradient(3, "A", "B")).toBe(
      "conic-gradient(A 0deg 120deg, B 120deg 240deg, A 240deg 360deg)",
    );
  });
});
