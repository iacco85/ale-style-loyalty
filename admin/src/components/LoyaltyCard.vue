<script setup lang="ts">
import { computed, ref } from "vue";
import { getCustomerLoyalty, redeemRewards } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { LoyaltySnapshot } from "../types";
import LoyaltyBar from "./LoyaltyBar.vue";

const props = defineProps<{ customerId: number }>();
const emit = defineEmits<{ redeemed: [] }>();

const { busy, error, run } = useAsyncAction();
const loyalty = ref<LoyaltySnapshot>();
const useAll = ref(true);

// Con un solo sconto sbloccato il flag non serve: si usa quello
const canChoose = computed(() => (loyalty.value?.rewards_available ?? 0) > 1);
const redeemCount = computed(() => (useAll.value ? (loyalty.value?.rewards_available ?? 0) : 1));
const redeemEuros = computed(() => redeemCount.value * (loyalty.value?.reward_euros ?? 0));
const redeemPoints = computed(() => redeemCount.value * (loyalty.value?.points_per_reward ?? 0));
const redeemLabel = computed(() => (redeemCount.value > 1 ? `Usa ${redeemCount.value} sconti` : "Usa sconto"));

async function load() {
  loyalty.value = await run(() => getCustomerLoyalty(props.customerId));
}

async function useRewards() {
  const question = `Usare ${redeemEuros.value} € di sconto? Verranno scalati ${redeemPoints.value} punti dal saldo.`;
  if (!window.confirm(question)) return;
  if ((await run(() => redeemRewards(props.customerId, useAll.value))) === undefined) return;
  useAll.value = true;
  await load();
  emit("redeemed");
}

load();
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <template v-if="loyalty">
    <p class="summary">
      <strong>{{ loyalty.points }} punti</strong> ·
      {{ loyalty.points_into_next }}/{{ loyalty.points_per_reward }} verso lo sconto da {{ loyalty.reward_euros }} €
    </p>
    <LoyaltyBar :percent="loyalty.percent" />
    <p class="muted">Mancano {{ loyalty.points_to_next }} punti al prossimo sconto.</p>
    <div v-if="loyalty.rewards_available > 0" class="available">
      <div class="amount">
        <strong>{{ loyalty.rewards_total_euros }} € di sconto sbloccato</strong>
        <small v-if="loyalty.rewards_available > 1" class="muted">
          {{ loyalty.rewards_available }} sconti da {{ loyalty.reward_euros }} € ciascuno
        </small>
      </div>
      <label v-if="canChoose" class="choice">
        <input v-model="useAll" type="checkbox" />
        <span>
          Usa tutti gli sconti sbloccati
          <small class="muted">
            {{ useAll ? "Verranno usati tutti" : "Verrà usato un solo sconto" }}: {{ redeemEuros }} € ·
            {{ redeemPoints }} punti dal saldo
          </small>
        </span>
      </label>
      <button :disabled="busy" @click="useRewards">{{ redeemLabel }} · {{ redeemEuros }} €</button>
    </div>
  </template>
</template>

<style scoped>
.summary {
  margin: 0 0 0.5rem;
}

.available {
  display: grid;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-accent);
}

.amount small,
.choice small {
  display: block;
}

.choice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.choice input {
  width: auto;
  margin-top: 0.2rem;
  accent-color: var(--color-accent);
}
</style>
