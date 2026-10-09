import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { onMounted, onUnmounted } from "vue";

const refreshIntervalMs = 30_000;

// Fa scattare `refresh` quando l'app torna in primo piano, quando la pagina torna visibile
// e ogni 30 secondi finché è visibile. Si ferma da sola quando la schermata viene chiusa.
export function useAutoRefresh(refresh: () => void) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let removeAppListener: (() => Promise<void>) | undefined;

  function refreshIfVisible() {
    if (document.visibilityState === "visible") refresh();
  }

  onMounted(async () => {
    timer = setInterval(refreshIfVisible, refreshIntervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    if (!Capacitor.isNativePlatform()) return;
    const listener = await App.addListener("appStateChange", ({ isActive }) => isActive && refresh());
    removeAppListener = () => listener.remove();
  });

  onUnmounted(() => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", refreshIfVisible);
    removeAppListener?.();
  });
}
