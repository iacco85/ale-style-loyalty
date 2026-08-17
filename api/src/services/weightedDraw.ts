export function pickWeightedPrize<T extends { weight: number }>(items: T[], random: () => number = Math.random): T {
  if (items.length === 0) throw new Error("cannot draw from an empty prize list");

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const target = random() * totalWeight;

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (target < cumulative) return item;
  }
  return items[items.length - 1] as T;
}
