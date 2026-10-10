// Contratto con api/src/services/pushMessages.ts: il Worker mette nei `data` della push la schermata da aprire
const pushScreens = ["home", "offers", "prizes"] as const;

export type PushScreen = (typeof pushScreens)[number];

function isPushScreen(value: unknown): value is PushScreen {
  return pushScreens.includes(value as PushScreen);
}

export function routeForPush(data: Record<string, unknown> | undefined): PushScreen | undefined {
  const screen = data?.screen;
  return isPushScreen(screen) ? screen : undefined;
}
