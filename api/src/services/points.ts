export function computeBalance(entries: { delta: number }[]): number {
  const total = entries.reduce((sum, entry) => sum + entry.delta, 0);
  return Math.max(0, total);
}
