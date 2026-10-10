import { computed, onMounted, ref } from "vue";
import { getSpinStatus, listWheelPrizes, spinWheel } from "../api";
import type { SpinStatus, WheelPrize } from "../types";
import { buildSlices, pickSliceIndex, spinDurationMs, stopRotation } from "../wheelGeometry";
import { useAsyncAction } from "./useAsyncAction";
import { useAutoRefresh } from "./useAutoRefresh";

const extraTurns = 6;

export function useWheel() {
  const { busy, error, run } = useAsyncAction();
  const prizes = ref<WheelPrize[]>([]);
  const status = ref<SpinStatus>({ can_spin: false, next_spin_at: null });
  const rotation = ref(0);
  const spinning = ref(false);
  const result = ref<WheelPrize>();

  const slices = computed(() => buildSlices(prizes.value));
  const canSpin = computed(() => status.value.can_spin && prizes.value.length > 0 && !spinning.value && !busy.value);

  function fetchWheel() {
    return Promise.all([listWheelPrizes(), getSpinStatus()]);
  }

  async function load() {
    const [loadedPrizes, loadedStatus] = (await run(fetchWheel)) ?? [prizes.value, status.value];
    prizes.value = loadedPrizes;
    status.value = loadedStatus;
  }

  // aggiornamento silenzioso (premi cambiati dall'admin, giro di nuovo disponibile), mai durante un giro:
  // cambiare gli spicchi mentre la ruota gira la farebbe fermare sul premio sbagliato
  async function refreshInBackground() {
    if (spinning.value || busy.value) return;
    const loaded = await fetchWheel().catch(() => undefined);
    if (!loaded || spinning.value) return;
    [prizes.value, status.value] = loaded;
  }

  function animateTo(prize: WheelPrize): Promise<void> {
    const index = pickSliceIndex(slices.value, prize.id, Math.random);
    rotation.value = stopRotation({ index, count: slices.value.length, currentRotation: rotation.value, extraTurns });
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
  useAutoRefresh(refreshInBackground);

  return { prizes, slices, status, rotation, spinning, result, canSpin, error, spin };
}
