<script setup lang="ts">
import { ref } from "vue";
import { getLoyaltyRule, setLoyaltyRule } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";

const { busy, error, run } = useAsyncAction();
const pointsPerReward = ref(100);
const rewardEuros = ref(5);
const saved = ref(false);

async function load() {
  const rule = await run(getLoyaltyRule);
  if (!rule) return;
  pointsPerReward.value = rule.points_per_reward;
  rewardEuros.value = rule.reward_euros;
}

async function save() {
  saved.value = false;
  const rule = await run(() =>
    setLoyaltyRule({ points_per_reward: pointsPerReward.value, reward_euros: rewardEuros.value }),
  );
  saved.value = rule !== undefined;
}

load();
</script>

<template>
  <h1>Fedeltà</h1>
  <p class="muted">
    Ogni quanti punti il cliente guadagna uno sconto in euro. Il cambio vale subito per tutti e la barra nell'app si
    ricalcola sui punti già accumulati.
  </p>
  <form class="card form" @submit.prevent="save">
    <label>
      Punti per ottenere uno sconto
      <input v-model.number="pointsPerReward" type="number" min="1" step="1" required />
    </label>
    <label>
      Sconto in euro
      <input v-model.number="rewardEuros" type="number" min="1" step="1" required />
    </label>
    <p class="preview">Ogni <strong>{{ pointsPerReward }}</strong> punti = <strong>{{ rewardEuros }} €</strong> di sconto</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="saved" class="muted">Salvato.</p>
    <button type="submit" :disabled="busy">Salva</button>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

label {
  display: grid;
  gap: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.preview {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.2rem;
}

.preview strong {
  color: var(--color-accent);
}
</style>
