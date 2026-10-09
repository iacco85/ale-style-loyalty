<script setup lang="ts">
import { ref } from "vue";
import { getCustomerLoyalty, redeemReward } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { LoyaltySnapshot } from "../types";
import LoyaltyBar from "./LoyaltyBar.vue";

const props = defineProps<{ customerId: number }>();
const emit = defineEmits<{ redeemed: [] }>();

const { busy, error, run } = useAsyncAction();
const loyalty = ref<LoyaltySnapshot>();

async function load() {
  loyalty.value = await run(() => getCustomerLoyalty(props.customerId));
}

async function useReward() {
  if (!loyalty.value) return;
  const { reward_euros, points_per_reward } = loyalty.value;
  const question = `Usare lo sconto da ${reward_euros} €? Verranno scalati ${points_per_reward} punti dal saldo.`;
  if (!window.confirm(question)) return;
  if ((await run(() => redeemReward(props.customerId))) === undefined) return;
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
      <span>
        <strong>{{ loyalty.rewards_total_euros }} € di sconto sbloccato</strong>
        <small v-if="loyalty.rewards_available > 1" class="muted">
          {{ loyalty.rewards_available }} sconti da {{ loyalty.reward_euros }} € ciascuno
        </small>
      </span>
      <button :disabled="busy" @click="useReward">Usa sconto</button>
    </div>
  </template>
</template>

<style scoped>
.summary {
  margin: 0 0 0.5rem;
}

.available small {
  display: block;
}

.available {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-accent);
}
</style>
