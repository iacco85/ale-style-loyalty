const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export type SpinAvailability = { allowed: boolean; nextAvailableAt: string | null };

export function getSpinAvailability(
  lastSpunAt: string | null,
  now: Date,
  { cooldownDisabled = false }: { cooldownDisabled?: boolean } = {},
): SpinAvailability {
  if (cooldownDisabled || !lastSpunAt) return { allowed: true, nextAvailableAt: null };

  const nextAvailableAt = new Date(new Date(lastSpunAt).getTime() + COOLDOWN_MS);
  if (now.getTime() >= nextAvailableAt.getTime()) return { allowed: true, nextAvailableAt: null };

  return { allowed: false, nextAvailableAt: nextAvailableAt.toISOString() };
}
