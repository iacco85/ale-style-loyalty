const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface FailureState {
  attempts: number;
  lockedUntil: string | null;
}

export function nextFailureState(previousAttempts: number, now: Date): FailureState {
  const attempts = previousAttempts + 1;
  if (attempts < MAX_FAILED_ATTEMPTS) return { attempts, lockedUntil: null };
  return { attempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() };
}

export function isLockedOut(lockedUntil: string | null, now: Date): boolean {
  return lockedUntil !== null && new Date(lockedUntil).getTime() > now.getTime();
}
