import { describe, expect, it } from "vitest";
import {
  buildSlices,
  labelTransform,
  pickSliceIndex,
  sliceCenterAngle,
  slicePath,
  sliceTone,
  stopRotation,
  wrapLabel,
} from "../src/wheelGeometry";

const prize = (id: number, label = `Premio ${id}`) => ({ id, label });

describe("buildSlices", () => {
  it("repeats the prizes in order until the wheel has at least 8 slices", () => {
    const slices = buildSlices([prize(1), prize(2)]);
    expect(slices.map((s) => s.prizeId)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
  });

  it("keeps the label of each prize on every repetition", () => {
    const slices = buildSlices([prize(1, "Hai perso"), prize(2, "-15%")]);
    expect(slices.slice(0, 4).map((s) => s.label)).toEqual(["Hai perso", "-15%", "Hai perso", "-15%"]);
  });

  it("always gives an even number of slices so colors can alternate", () => {
    for (let count = 1; count <= 12; count++) {
      const prizes = Array.from({ length: count }, (_, i) => prize(i + 1));
      const total = buildSlices(prizes).length;
      expect(total).toBeGreaterThanOrEqual(8);
      expect(total % 2 === 0 || count > 8).toBe(true);
    }
  });

  it("does not repeat prizes when there are already enough", () => {
    const prizes = Array.from({ length: 10 }, (_, i) => prize(i + 1));
    expect(buildSlices(prizes)).toHaveLength(10);
  });

  it("returns no slices when there are no prizes", () => {
    expect(buildSlices([])).toEqual([]);
  });
});

describe("pickSliceIndex", () => {
  const slices = buildSlices([prize(1), prize(2)]);

  it("only picks slices of the won prize", () => {
    for (const random of [0, 0.3, 0.6, 0.999]) {
      const index = pickSliceIndex(slices, 2, () => random);
      expect(slices[index]?.prizeId).toBe(2);
    }
  });

  it("uses the random value to choose among the repeated slices", () => {
    expect(pickSliceIndex(slices, 1, () => 0)).toBe(0);
    expect(pickSliceIndex(slices, 1, () => 0.999)).toBe(6);
  });

  it("throws for a prize that is not on the wheel", () => {
    expect(() => pickSliceIndex(slices, 99, () => 0)).toThrow();
  });
});

describe("sliceTone", () => {
  it("alternates between two tones", () => {
    expect([0, 1, 2, 3].map((i) => sliceTone(i, 4))).toEqual([0, 1, 0, 1]);
  });

  it("uses a third tone for the last slice of an odd wheel so it differs from the first", () => {
    expect([0, 1, 2].map((i) => sliceTone(i, 3))).toEqual([0, 1, 2]);
  });
});

describe("slice geometry", () => {
  it("draws the first of four slices from the top to the right", () => {
    expect(slicePath(0, 4, 100, 100, 100)).toBe("M 100 100 L 100 0 A 100 100 0 0 1 200 100 Z");
  });

  it("computes the angle of a slice center, clockwise from the top", () => {
    expect(sliceCenterAngle(0, 4)).toBe(45);
    expect(sliceCenterAngle(3, 4)).toBe(315);
  });

  it("rotates the label so it runs along the slice radius", () => {
    expect(labelTransform(0, 4, 100, 100)).toBe("rotate(-45 100 100)");
    expect(labelTransform(1, 4, 100, 100)).toBe("rotate(45 100 100)");
  });
});

describe("wrapLabel", () => {
  it("keeps a short label on one line", () => {
    expect(wrapLabel("Hai perso", 16, 2)).toEqual(["Hai perso"]);
  });

  it("wraps long labels on word boundaries", () => {
    expect(wrapLabel("-15% prossimo taglio", 16, 2)).toEqual(["-15% prossimo", "taglio"]);
    expect(wrapLabel("Trattamento omaggio", 16, 2)).toEqual(["Trattamento", "omaggio"]);
  });

  it("never exceeds the maximum line length", () => {
    const lines = wrapLabel("Sconto speciale sul prossimo trattamento", 16, 3);
    expect(lines.every((line) => line.length <= 16)).toBe(true);
  });

  it("adds an ellipsis to the last line when the text does not fit in the allowed lines", () => {
    const lines = wrapLabel("Sconto speciale sul prossimo trattamento completo", 16, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith("…")).toBe(true);
    expect(lines[1]?.length).toBeLessThanOrEqual(16);
  });

  it("shortens a single word that is longer than a line", () => {
    const [line] = wrapLabel("Supertrattamentoomaggio", 16, 2);
    expect(line).toHaveLength(16);
    expect(line?.endsWith("…")).toBe(true);
  });

  it("returns no lines for an empty label", () => {
    expect(wrapLabel("  ", 16, 2)).toEqual([]);
  });
});

describe("stopRotation", () => {
  it("lands the center of the first of four segments under the top pointer", () => {
    expect(stopRotation({ index: 0, count: 4, currentRotation: 0, extraTurns: 0 })).toBe(315);
  });

  it("lands the last segment", () => {
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
