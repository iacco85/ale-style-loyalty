import { onMounted, ref } from "vue";

export const splashHoldMs = 1800;
export const splashFadeOutMs = 500;

// Lo splash resta visibile `splashHoldMs`, poi sfuma in `splashFadeOutMs` e viene rimosso
export function useSplash() {
  const visible = ref(true);
  const leaving = ref(false);

  onMounted(() => {
    setTimeout(() => (leaving.value = true), splashHoldMs);
    setTimeout(() => (visible.value = false), splashHoldMs + splashFadeOutMs);
  });

  return { visible, leaving };
}
