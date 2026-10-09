<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";

const router = useRouter();
const { isLoggedIn, signOut } = useAuth();

async function logout() {
  signOut();
  await router.push({ name: "login" });
}
</script>

<template>
  <header v-if="isLoggedIn" class="topbar">
    <strong>Ale Style</strong>
    <nav>
      <RouterLink :to="{ name: 'customers' }">Clienti</RouterLink>
      <RouterLink :to="{ name: 'broadcast' }">Offerta a tutti</RouterLink>
      <RouterLink :to="{ name: 'prizes' }">Ruota</RouterLink>
    </nav>
    <button class="secondary" @click="logout">Esci</button>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>

<style scoped>
.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

nav {
  display: flex;
  flex: 1;
  gap: 1rem;
}

nav a {
  color: var(--color-muted);
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: var(--color-accent);
  font-weight: 600;
}

.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
</style>
