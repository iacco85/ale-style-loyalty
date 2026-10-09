export const spinDurationMs = 4000;

const fullTurn = 360;
const minSlices = 8;

export interface WheelSlice {
  prizeId: number;
  label: string;
}

export function buildSlices(prizes: Array<{ id: number; label: string }>): WheelSlice[] {
  if (prizes.length === 0) return [];
  let repetitions = Math.ceil(minSlices / prizes.length);
  const oddWheel = (prizes.length * repetitions) % 2 === 1;
  if (oddWheel && repetitions > 1) repetitions++;
  return Array.from({ length: prizes.length * repetitions }, (_, i) => {
    const { id, label } = prizes[i % prizes.length] as { id: number; label: string };
    return { prizeId: id, label };
  });
}

// Il premio lo ha già deciso il server: qui si sceglie solo quale degli spicchi ripetuti far fermare sotto la freccia
export function pickSliceIndex(slices: WheelSlice[], prizeId: number, random: () => number): number {
  const candidates = slices.flatMap((slice, index) => (slice.prizeId === prizeId ? [index] : []));
  if (candidates.length === 0) throw new Error(`prize ${prizeId} is not on the wheel`);
  return candidates[Math.floor(random() * candidates.length)] as number;
}

export function sliceTone(index: number, count: number): 0 | 1 | 2 {
  if (count % 2 === 1 && index === count - 1) return 2;
  return index % 2 === 0 ? 0 : 1;
}

export function sliceCenterAngle(index: number, count: number): number {
  return (index + 0.5) * (fullTurn / count);
}

const round = (n: number) => Math.round(n * 1000) / 1000 + 0;

function pointAt(angleDeg: number, cx: number, cy: number, radius: number): [number, number] {
  const radians = (angleDeg * Math.PI) / 180;
  return [round(cx + radius * Math.sin(radians)), round(cy - radius * Math.cos(radians))];
}

export function slicePath(index: number, count: number, cx: number, cy: number, radius: number): string {
  const size = fullTurn / count;
  const [x1, y1] = pointAt(index * size, cx, cy, radius);
  const [x2, y2] = pointAt((index + 1) * size, cx, cy, radius);
  const largeArc = size > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function labelTransform(index: number, count: number, cx: number, cy: number): string {
  return `rotate(${sliceCenterAngle(index, count) - 90} ${cx} ${cy})`;
}

function ellipsize(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function packWords(words: string[], maxLength: number): string[] {
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= maxLength) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(ellipsize(word, maxLength));
  }
  return lines;
}

export function wrapLabel(label: string, maxLength: number, maxLines: number): string[] {
  const lines = packWords(label.split(/\s+/).filter(Boolean), maxLength);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const lastKept = kept[maxLines - 1] as string;
  kept[maxLines - 1] = ellipsize(`${lastKept}…`, maxLength);
  return kept;
}

interface StopRotationInput {
  index: number;
  count: number;
  currentRotation: number;
  extraTurns: number;
}

export function stopRotation({ index, count, currentRotation, extraTurns }: StopRotationInput): number {
  const segmentCenter = sliceCenterAngle(index, count);
  const currentTurnStart = currentRotation - (currentRotation % fullTurn);
  return currentTurnStart + extraTurns * fullTurn + (fullTurn - segmentCenter);
}
