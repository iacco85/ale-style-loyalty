export const spinDurationMs = 4000;

const fullTurn = 360;

interface StopRotationInput {
  index: number;
  count: number;
  currentRotation: number;
  extraTurns: number;
}

export function stopRotation({ index, count, currentRotation, extraTurns }: StopRotationInput): number {
  const segmentSize = fullTurn / count;
  const segmentCenter = (index + 0.5) * segmentSize;
  const currentTurnStart = currentRotation - (currentRotation % fullTurn);
  return currentTurnStart + extraTurns * fullTurn + (fullTurn - segmentCenter);
}

export function buildWheelGradient(count: number, colorA: string, colorB: string): string {
  const segmentSize = fullTurn / count;
  const stops = Array.from({ length: count }, (_, i) => {
    const color = i % 2 === 0 ? colorA : colorB;
    return `${color} ${i * segmentSize}deg ${(i + 1) * segmentSize}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}
