import { computed, onMounted, ref } from "vue";
import { getSpinStatus, listWheelPrizes, spinWheel } from "../api";
import type { SpinStatus, WheelPrize } from "../types";
import { buildWheelGradient, spinDurationMs, stopRotation } from "../wheelGeometry";
import { useAsyncAction } from "./useAsyncAction";

const extraTurns = 6;

export function useWheel() {
  const { busy, error, run } = useAsyncAction();
  const prizes = ref<WheelPrize[]>([]);
  const status = ref<SpinStatus>({ can_spin: false, next_spin_at: null });
  const rotation = ref(0);
  const spinning = ref(false);
  const result = ref<WheelPrize>();

  const gradient = computed(() => buildWheelGradient(Math.max(prizes.value.length, 1), "var(--wheel-a)", "var(--wheel-b)"));
  const canSpin = computed(() => status.value.can_spin && prizes.value.length > 0 && !spinning.value && !busy.value);

  async function load() {
    const [loadedPrizes, loadedStatus] =
      (await run(() => Promise.all([listWheelPrizes(), getSpinStatus()]))) ?? [prizes.value, status.value];
    prizes.value = loadedPrizes;
    status.value = loadedStatus;
  }

  function animateTo(prize: WheelPrize): Promise<void> {
    const index = prizes.value.findIndex((p) => p.id === prize.id);
    rotation.value = stopRotation({ index, count: prizes.value.length, currentRotation: rotation.value, extraTurns });
    return new Promise((resolve) => setTimeout(resolve, spinDurationMs));
  }

  async function spin() {
    if (!canSpin.value) return;
    result.value = undefined;
    spinning.value = true;
    try {
      const outcome = await run(spinWheel);
      if (outcome) {
        await animateTo(outcome.prize);
        result.value = outcome.prize;
      }
    } finally {
      spinning.value = false;
    }
    await load();
  }

  onMounted(load);

  return { prizes, status, rotation, spinning, result, gradient, canSpin, error, spin };
}
