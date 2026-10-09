<script setup lang="ts">
import { onMounted, watch } from "vue";
import logo from "../assets/LogoAleStyle.jpg";
import { useBiometricLock } from "../composables/useBiometricLock";
import { useSession } from "../composables/useSession";

const { locked, unlock } = useBiometricLock();
const { end } = useSession();

onMounted(unlock);
watch(locked, (isLocked) => isLocked && unlock());
</script>

<template>
  <div class="lock">
    <img :src="logo" alt="Ale Style" class="logo" />
    <p class="muted">L'app è bloccata</p>
    <button @click="unlock">Sblocca</button>
    <button class="secondary" @click="end">Accedi con il PIN</button>
  </div>
</template>

<style scoped>
.lock {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  background: var(--color-bg);
}

.logo {
  width: min(100%, 320px);
}

button {
  width: min(100%, 320px);
}
</style>
