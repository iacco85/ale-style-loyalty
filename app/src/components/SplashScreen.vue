<script setup lang="ts">
import logo from "../assets/LogoAleStyle.jpg";
import { splashFadeOutMs } from "../composables/useSplash";

defineProps<{ leaving: boolean }>();

const fadeOutDuration = `${splashFadeOutMs}ms`;
</script>

<template>
  <div class="splash" :class="{ leaving }">
    <img :src="logo" alt="Ale Style" class="logo" />
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: var(--color-bg);
}

.logo {
  width: min(100%, 320px);
  animation: fade-in 1000ms ease-out both;
}

.leaving {
  animation: fade-out v-bind(fadeOutDuration) ease-in forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo {
    animation: none;
  }
}
</style>
