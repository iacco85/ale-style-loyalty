<script setup lang="ts">
import { computed } from "vue";
import WheelDisc from "../components/WheelDisc.vue";
import { useWheel } from "../composables/useWheel";
import { formatDateTime } from "../formatDate";

const { prizes, slices, status, rotation, spinning, result, canSpin, error, spin } = useWheel();

const resultMessages = {
  none: "Questa volta niente, riprova la prossima settimana!",
  discount: "Hai vinto!",
  points: "Hai vinto dei punti! Sono già nel tuo saldo",
};

const resultMessage = computed(() => (result.value ? resultMessages[result.value.type] : ""));

const nextSpinMessage = computed(() =>
  status.value.next_spin_at ? `Potrai girare di nuovo ${formatDateTime(status.value.next_spin_at)}` : "",
);

</script>

<template>
  <h1>Ruota della fortuna</h1>

  <div class="stage">
    <div class="pointer"></div>
    <WheelDisc :slices="slices" :rotation="rotation" />
  </div>

  <p v-if="error" class="error">{{ error }}</p>

  <section v-if="result" class="card result">
    <span class="muted">{{ resultMessage }}</span>
    <strong v-if="result.type !== 'none'">{{ result.label }}</strong>
    <RouterLink v-if="result.type === 'discount'" :to="{ name: 'prizes' }" class="see-prizes">
      Lo trovi in "Premi", valido 30 giorni
    </RouterLink>
  </section>

  <button class="spin" :disabled="!canSpin" @click="spin">{{ spinning ? "Si gira..." : "Gira" }}</button>
  <p v-if="!status.can_spin && nextSpinMessage" class="muted next">{{ nextSpinMessage }}</p>
  <p v-if="prizes.length === 0 && !error" class="muted next">La ruota non è ancora pronta.</p>
</template>

<style scoped>
.stage {
  position: relative;
  width: min(100%, 320px);
  margin: 1.5rem auto;
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

.see-prizes {
  font-size: 0.85rem;
}

.result strong {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-accent);
}

</style>
