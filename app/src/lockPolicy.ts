export const resumeGraceMs = 60_000;

interface ResumeContext {
  enabled: boolean;
  leftAt: number | null;
  now: number;
  graceMs: number;
}

export function shouldLockOnResume({ enabled, leftAt, now, graceMs }: ResumeContext): boolean {
  if (!enabled) return false;
  if (leftAt === null) return true;
  return now - leftAt >= graceMs;
}
