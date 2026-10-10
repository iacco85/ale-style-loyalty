const DAY_MS = 24 * 60 * 60 * 1000;

export type SpinAvailability = { allowed: boolean; nextAvailableAt: string | null };

export type CooldownRule = {
  /** Giorni tra un giro e il successivo, impostati dall'admin. 0 = si può girare sempre. */
  cooldownDays: number;
  /** Solo sviluppo: ignora l'intervallo. */
  cooldownDisabled?: boolean;
};

export function getSpinAvailability(
  lastSpunAt: string | null,
  now: Date,
  { cooldownDays, cooldownDisabled = false }: CooldownRule,
): SpinAvailability {
  if (cooldownDisabled || cooldownDays === 0 || !lastSpunAt) return { allowed: true, nextAvailableAt: null };

  const nextAvailableAt = new Date(new Date(lastSpunAt).getTime() + cooldownDays * DAY_MS);
  if (now.getTime() >= nextAvailableAt.getTime()) return { allowed: true, nextAvailableAt: null };

  return { allowed: false, nextAvailableAt: nextAvailableAt.toISOString() };
}
