import { base64UrlDecode, base64UrlEncode } from "./base64url";
import { timingSafeEqual } from "./timingSafeEqual";

// 100000 è il massimo di iterazioni PBKDF2 che Cloudflare Workers consente
const ITERATIONS = 100_000;
const SALT_BYTES = 16;

export interface PinHash {
  hash: string;
  salt: string;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return base64UrlEncode(new Uint8Array(bits));
}

export async function hashPin(pin: string): Promise<PinHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { hash: await derive(pin, salt), salt: base64UrlEncode(salt) };
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return timingSafeEqual(await derive(pin, base64UrlDecode(salt)), hash);
}
