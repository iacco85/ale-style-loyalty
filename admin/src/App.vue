<script setup lang="ts">
import { useRouter } from "vue-router";
import logo from "./assets/LogoAleStyle.jpg";
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
    <img :src="logo" alt="Ale Style" class="logo" />
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
  gap: 1rem 2rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  height: 56px;
}

nav {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
}

nav a {
  color: var(--color-text);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.85rem;
  font-weight: 700;
  padding-bottom: 4px;
  border-bottom: 1px solid transparent;
  transition: color 0.3s, border-color 0.3s;
}

nav a:hover {
  color: var(--color-accent);
}

nav a.router-link-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}
</style>
