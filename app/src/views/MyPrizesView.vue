<script setup lang="ts">
import { ref } from "vue";
import { listMyPrizes } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import { formatDay, formatExpiry } from "../formatDate";
import type { WonPrize } from "../types";

const { busy, error, run } = useAsyncAction();
const prizes = ref<WonPrize[]>([]);

const statusLabels: Record<WonPrize["status"], string> = {
  available: "Da usare",
  redeemed: "Usato",
  expired: "Scaduto",
};

function detail(prize: WonPrize): string {
  if (prize.status === "redeemed") return "Già usato in salone";
  if (prize.status === "expired") return `Scaduto il ${formatExpiry(prize.expires_at)}`;
  return `Valido fino al ${formatExpiry(prize.expires_at)}`;
}

async function load() {
  prizes.value = (await run(listMyPrizes)) ?? [];
}

load();
</script>

<template>
  <h1>I tuoi premi</h1>
  <p class="muted">Mostra il premio in salone per usarlo. Vale 30 giorni dalla vincita.</p>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!busy && prizes.length === 0" class="muted">Non hai ancora vinto nessun premio. Prova la ruota!</p>
  <ul class="list">
    <li v-for="prize in prizes" :key="prize.id" class="card prize" :class="`is-${prize.status}`">
      <span class="badge">{{ statusLabels[prize.status] }}</span>
      <strong>{{ prize.label }}</strong>
      <small class="muted">Vinto il {{ formatDay(prize.spun_at) }} · {{ detail(prize) }}</small>
    </li>
  </ul>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.prize {
  display: grid;
  gap: 0.35rem;
}

.prize strong {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--color-accent);
}

.badge {
  justify-self: start;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.65rem;
  color: var(--color-accent);
}

.is-available {
  border-color: var(--color-accent);
}

.is-redeemed,
.is-expired {
  opacity: 0.5;
}

.is-redeemed .badge,
.is-expired .badge {
  border-color: var(--color-muted);
  color: var(--color-muted);
}
</style>
