import { getAllDeviceTokens, getDeviceTokensForCustomer } from "../db";
import { sendPush, type PushCredentials, type PushNotification } from "../push";

async function sendToTokens(credentials: PushCredentials, tokens: string[], notification: PushNotification): Promise<void> {
  await Promise.allSettled(
    tokens.map(async (token) => {
      try {
        await sendPush(credentials, token, notification);
      } catch (err) {
        console.error(`push_send_failed token=${token}`, err);
      }
    }),
  );
}

export async function notifyCustomer(
  credentials: PushCredentials,
  db: D1Database,
  customerId: number,
  notification: PushNotification,
): Promise<void> {
  const tokens = await getDeviceTokensForCustomer(db, customerId);
  await sendToTokens(credentials, tokens, notification);
}

export async function notifyBroadcastOffer(
  credentials: PushCredentials,
  db: D1Database,
  notification: PushNotification,
): Promise<void> {
  const tokens = await getAllDeviceTokens(db);
  await sendToTokens(credentials, tokens, notification);
}
