import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceToken } from "../api";

let listening = false;

async function listenForDeviceToken() {
  if (listening) return;
  listening = true;
  await PushNotifications.addListener("registration", ({ value }) => {
    registerDeviceToken(value).catch(() => undefined);
  });
}

export async function enablePush() {
  if (!Capacitor.isNativePlatform()) return;
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;
  await listenForDeviceToken();
  await PushNotifications.register();
}
