import { base64UrlEncode } from "./services/base64url";
import type { Env } from "./types";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_LIFETIME_SECONDS = 3600;

export type PushCredentials = Pick<Env, "FCM_PROJECT_ID" | "FCM_CLIENT_EMAIL" | "FCM_PRIVATE_KEY">;

export type PushNotification = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function pemToPkcs8(privateKey: string): ArrayBuffer {
  const base64 = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

async function importSigningKey(privateKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", pemToPkcs8(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

async function signServiceAccountJwt(credentials: PushCredentials): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: credentials.FCM_CLIENT_EMAIL,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + TOKEN_LIFETIME_SECONDS,
  };
  const encoder = new TextEncoder();
  const unsigned = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(encoder.encode(JSON.stringify(claims)))}`;

  const key = await importSigningKey(credentials.FCM_PRIVATE_KEY);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function fetchAccessToken(credentials: PushCredentials): Promise<string> {
  const assertion = await signServiceAccountJwt(credentials);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`fcm_token_exchange_failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

/** Unico punto di contatto con Firebase Cloud Messaging (API HTTP v1). Nessun altro modulo deve importare/chiamare FCM direttamente. */
export async function sendPush(credentials: PushCredentials, deviceToken: string, notification: PushNotification): Promise<void> {
  const accessToken = await fetchAccessToken(credentials);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.FCM_PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`fcm_send_failed: ${response.status} ${await response.text()}`);
  }
}
