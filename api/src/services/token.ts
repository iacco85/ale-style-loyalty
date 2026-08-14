const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function signToken(customerId: number, secret: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${customerId}.${issuedAt}`;
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyToken(token: string, secret: string): Promise<{ customerId: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerIdRaw, issuedAtRaw, signatureRaw] = parts as [string, string, string];

  const key = await hmacKey(secret);
  let signature: Uint8Array;
  try {
    signature = base64UrlDecode(signatureRaw);
  } catch {
    return null;
  }

  const payload = `${customerIdRaw}.${issuedAtRaw}`;
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
  if (!valid) return null;

  const customerId = Number(customerIdRaw);
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isInteger(customerId) || !Number.isInteger(issuedAt)) return null;

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  if (ageSeconds > MAX_AGE_SECONDS) return null;

  return { customerId };
}
