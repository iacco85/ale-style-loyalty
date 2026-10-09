<script setup lang="ts">
import { computed } from "vue";
import { useWheel } from "../composables/useWheel";
import { formatDateTime } from "../formatDate";
import { spinDurationMs } from "../wheelGeometry";

const { prizes, status, rotation, spinning, result, gradient, canSpin, error, spin } = useWheel();

const wheelRotation = computed(() => `${rotation.value}deg`);
const wheelDuration = `${spinDurationMs}ms`;

const resultMessage = computed(() => (result.value?.type === "none" ? "Questa volta niente, riprova la prossima settimana!" : "Hai vinto!"));

const nextSpinMessage = computed(() =>
  status.value.next_spin_at ? `Potrai girare di nuovo ${formatDateTime(status.value.next_spin_at)}` : "",
);

</script>

<template>
  <h1>Ruota della fortuna</h1>

  <div class="stage">
    <div class="pointer"></div>
    <div class="wheel"></div>
  </div>

  <p v-if="error" class="error">{{ error }}</p>

  <section v-if="result" class="card result">
    <span class="muted">{{ resultMessage }}</span>
    <strong v-if="result.type !== 'none'">{{ result.label }}</strong>
  </section>

  <button class="spin" :disabled="!canSpin" @click="spin">{{ spinning ? "Si gira..." : "Gira" }}</button>
  <p v-if="!status.can_spin && nextSpinMessage" class="muted next">{{ nextSpinMessage }}</p>
  <p v-if="prizes.length === 0 && !error" class="muted next">La ruota non è ancora pronta.</p>

  <h2>Premi in palio</h2>
  <ul class="legend">
    <li v-for="prize in prizes" :key="prize.id">{{ prize.label }}</li>
  </ul>
</template>

<style scoped>
.stage {
  position: relative;
  width: min(100%, 320px);
  margin: 1.5rem auto;
}

.wheel {
  aspect-ratio: 1;
  border-radius: 50%;
  border: 4px solid var(--color-accent);
  background: v-bind(gradient);
  transform: rotate(v-bind(wheelRotation));
  transition: transform v-bind(wheelDuration) cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

.pointer {
  position: absolute;
  top: -10px;
  left: 50%;
  z-index: 1;
  transform: translateX(-50%);
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 22px solid var(--color-text);
}

.spin {
  display: block;
  width: 100%;
  font-size: 1rem;
}

.next {
  text-align: center;
}

.result {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 1rem;
  text-align: center;
  border-color: var(--color-accent);
}

.result strong {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-accent);
}

.legend {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-muted);
  line-height: 1.8;
}
</style>
