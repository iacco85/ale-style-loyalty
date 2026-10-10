import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceToken } from "../api";
import { routeForPush } from "../pushScreen";
import { router } from "../router";

let listening = false;

// Il nome è quello che la cliente vede nelle impostazioni di Android; l'id è il default nel manifest.
const OFFERS_POINTS_CHANNEL = { id: "offers_points", name: "Offerte e punti", importance: 4 } as const;

async function openTappedScreen(data: Record<string, unknown> | undefined) {
  const screen = routeForPush(data);
  if (!screen) return;
  await router.isReady();
  await router.replace({ name: screen });
}

async function listenForPushEvents() {
  if (listening) return;
  listening = true;
  await PushNotifications.addListener("registration", ({ value }) => {
    registerDeviceToken(value).catch(() => undefined);
  });
  // ad app chiusa Capacitor conserva il tocco finché non c'è un listener, quindi arriva anche dopo il login
  await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    openTappedScreen(notification.data).catch(() => undefined);
  });
}

export async function enablePush() {
  if (!Capacitor.isNativePlatform()) return;
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;
  await PushNotifications.createChannel(OFFERS_POINTS_CHANNEL);
  await listenForPushEvents();
  await PushNotifications.register();
}
