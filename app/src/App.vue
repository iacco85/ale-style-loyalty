<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";
import LockScreen from "./components/LockScreen.vue";
import { useBiometricLock } from "./composables/useBiometricLock";
import { enablePush } from "./composables/usePush";
import { useSession } from "./composables/useSession";

const router = useRouter();
const { isLoggedIn } = useSession();
const biometricLock = useBiometricLock();

biometricLock.init();

function onSessionChange(loggedIn: boolean) {
  if (loggedIn) return enablePush().catch(() => undefined);
  biometricLock.disable();
  // sessione terminata (logout o token scaduto) mentre si è su una pagina protetta
  router.replace({ name: "login" });
}

watch(isLoggedIn, onSessionChange, { immediate: true });
</script>

<template>
  <LockScreen v-if="isLoggedIn && biometricLock.locked.value" />
  <main class="page">
    <RouterView />
  </main>
  <nav v-if="isLoggedIn" class="tabs">
    <RouterLink :to="{ name: 'home' }">Tessera</RouterLink>
    <RouterLink :to="{ name: 'offers' }">Offerte</RouterLink>
    <RouterLink :to="{ name: 'wheel' }">Ruota</RouterLink>
    <RouterLink :to="{ name: 'prizes' }">Premi</RouterLink>
  </nav>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 6rem;
}

.tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 0.9rem 0 calc(0.9rem + env(safe-area-inset-bottom));
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.tabs a {
  color: var(--color-muted);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tabs a.router-link-exact-active {
  color: var(--color-accent);
}
</style>
