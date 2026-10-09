<script setup lang="ts">
import { ref } from "vue";
import { getProfile } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import { useSession } from "../composables/useSession";
import type { Profile } from "../types";

const { end } = useSession();
const { error, run } = useAsyncAction();
const profile = ref<Profile>();

async function load() {
  profile.value = await run(getProfile);
}

load();
</script>

<template>
  <h1>Ciao{{ profile ? `, ${profile.name}` : "" }}</h1>
  <p v-if="error" class="error">{{ error }}</p>

  <section class="card points-card">
    <span class="label">I tuoi punti</span>
    <span class="points">{{ profile?.points ?? "–" }}</span>
  </section>

  <RouterLink :to="{ name: 'wheel' }" class="card link">
    <strong>Ruota della fortuna</strong>
    <span class="muted">Un giro a settimana, prova a vincere un premio</span>
  </RouterLink>

  <RouterLink :to="{ name: 'offers' }" class="card link">
    <strong>Le tue offerte</strong>
    <span class="muted">Sconti riservati a te</span>
  </RouterLink>

  <button class="secondary logout" @click="end">Esci</button>
</template>

<style scoped>
.points-card {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 2rem 1.25rem;
  text-align: center;
  border-color: var(--color-accent);
}

.label {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.points {
  font-family: var(--font-heading);
  font-size: 4rem;
  color: var(--color-accent);
  line-height: 1;
}

.link {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.logout {
  margin-top: 1.5rem;
  width: 100%;
}
</style>
