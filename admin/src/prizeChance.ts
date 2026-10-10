type Weighted = { id: number; weight: number };

export function chancePercent(weight: number, totalWeight: number): number {
  return totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
}

/** Probabilità che avrà il premio in modifica (o nuovo, senza `editingId`) con il peso scritto nel form. */
export function draftChancePercent(prizes: Weighted[], draftWeight: number, editingId?: number): number {
  if (!(draftWeight > 0)) return 0;
  const othersWeight = prizes.filter((p) => p.id !== editingId).reduce((sum, p) => sum + p.weight, 0);
  return chancePercent(draftWeight, othersWeight + draftWeight);
}
