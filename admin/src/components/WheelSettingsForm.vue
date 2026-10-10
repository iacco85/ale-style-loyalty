<script setup lang="ts">
import { computed, ref } from "vue";
import { getWheelSettings, setWheelSettings } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";

const { busy, error, run } = useAsyncAction();
const cooldownDays = ref(7);
const saved = ref(false);

const summary = computed(() => {
  if (cooldownDays.value === 0) return "La cliente può girare la ruota tutte le volte che vuole";
  if (cooldownDays.value === 1) return "La cliente può girare la ruota una volta al giorno";
  return `La cliente può girare la ruota una volta ogni ${cooldownDays.value} giorni`;
});

async function load() {
  const settings = await run(getWheelSettings);
  if (settings) cooldownDays.value = settings.spin_cooldown_days;
}

async function save() {
  saved.value = false;
  const settings = await run(() => setWheelSettings({ spin_cooldown_days: cooldownDays.value }));
  saved.value = settings !== undefined;
}

load();
</script>

<template>
  <form class="card form" @submit.prevent="save">
    <h2>Ogni quanto si gira</h2>
    <label>
      Giorni tra un giro e il successivo
      <input v-model.number="cooldownDays" type="number" min="0" step="1" required />
      <small class="hint">0 = sempre. Il cambio vale subito per tutte le clienti.</small>
    </label>
    <p class="preview">{{ summary }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="saved" class="muted">Salvato.</p>
    <button type="submit" :disabled="busy">Salva</button>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0;
}

h2 {
  margin: 0;
  font-size: 1.4rem;
}

label {
  display: grid;
  gap: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.hint {
  text-transform: none;
  letter-spacing: normal;
}

.preview {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-accent);
}

button {
  justify-self: start;
}
</style>
