const ITALIAN_MOBILE = /^3\d{8,9}$/;

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");
  const digits = cleaned.startsWith("+39")
    ? cleaned.slice(3)
    : cleaned.startsWith("0039")
      ? cleaned.slice(4)
      : cleaned;

  if (!ITALIAN_MOBILE.test(digits)) return null;

  return `+39${digits}`;
}
