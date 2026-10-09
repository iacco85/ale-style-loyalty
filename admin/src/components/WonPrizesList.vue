<script setup lang="ts">
import { ref } from "vue";
import { listCustomerPrizes, redeemPrize } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import { formatDay } from "../formatDate";
import type { WonPrize } from "../types";

const props = defineProps<{ customerId: number }>();

const { busy, error, run } = useAsyncAction();
const prizes = ref<WonPrize[]>([]);

const statusLabels: Record<WonPrize["status"], string> = {
  available: "Da usare",
  redeemed: "Usato",
  expired: "Scaduto",
};

async function load() {
  prizes.value = (await run(() => listCustomerPrizes(props.customerId))) ?? [];
}

async function markUsed(prize: WonPrize) {
  if (!window.confirm(`Segnare "${prize.label}" come usato? Non si può annullare.`)) return;
  await run(() => redeemPrize(prize.id));
  await load();
}

function detail(prize: WonPrize): string {
  if (prize.status === "redeemed" && prize.redeemed_at) return `Usato il ${formatDay(prize.redeemed_at)}`;
  if (prize.status === "expired") return `Scaduto il ${formatDay(prize.expires_at)}`;
  return `Vinto il ${formatDay(prize.spun_at)} · valido fino al ${formatDay(prize.expires_at)}`;
}

load();
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!busy && prizes.length === 0" class="muted">Nessun premio vinto alla ruota.</p>
  <ul class="list">
    <li v-for="prize in prizes" :key="prize.id" class="row" :class="`is-${prize.status}`">
      <span class="info">
        <strong>{{ prize.label }}</strong>
        <small class="muted">{{ detail(prize) }}</small>
      </span>
      <button v-if="prize.status === 'available'" :disabled="busy" @click="markUsed(prize)">Segna come usato</button>
      <span v-else class="badge">{{ statusLabels[prize.status] }}</span>
    </li>
  </ul>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.info small {
  display: block;
}

.badge {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.7rem;
  color: var(--color-muted);
}

.is-redeemed .info,
.is-expired .info {
  opacity: 0.55;
}
</style>
