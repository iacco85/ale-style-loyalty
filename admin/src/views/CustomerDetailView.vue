<script setup lang="ts">
import { computed, ref } from "vue";
import { addPoints, createCustomerOffer, listCustomers, resetPin } from "../api";
import LoyaltyCard from "../components/LoyaltyCard.vue";
import OfferForm from "../components/OfferForm.vue";
import WonPrizesList from "../components/WonPrizesList.vue";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { CustomerWithPoints } from "../types";

const props = defineProps<{ id: string }>();

const customerId = computed(() => Number(props.id));
const { busy, error, run } = useAsyncAction();
const customer = ref<CustomerWithPoints>();
const delta = ref(1);
const reason = ref("");
const pinResetDone = ref(false);
const loyaltyKey = ref(0);

async function load() {
  const customers = await run(() => listCustomers());
  customer.value = customers?.find((c) => c.id === customerId.value);
}

async function submitPoints() {
  const result = await run(() => addPoints(customerId.value, delta.value, reason.value.trim() || undefined));
  if (result === undefined) return;
  reason.value = "";
  await load();
  loyaltyKey.value++;
}

async function submitPinReset() {
  const confirmed = window.confirm("Azzerare il PIN? Il cliente ne sceglierà uno nuovo al prossimo accesso. Fallo solo se sei sicura che sia lui/lei.");
  if (!confirmed) return;
  pinResetDone.value = (await run(() => resetPin(customerId.value))) !== undefined;
}

function sendOffer(offer: Parameters<typeof createCustomerOffer>[1]) {
  return createCustomerOffer(customerId.value, offer);
}

load();
</script>

<template>
  <RouterLink :to="{ name: 'customers' }">← Clienti</RouterLink>
  <p v-if="error" class="error">{{ error }}</p>
  <template v-if="customer">
    <h1>{{ customer.name }}</h1>
    <p class="muted">{{ customer.phone }} · <strong>{{ customer.points }} punti</strong></p>

    <section class="card section">
      <h2>Fedeltà</h2>
      <LoyaltyCard :key="loyaltyKey" :customer-id="customerId" @redeemed="load" />
    </section>

    <section class="card section">
      <h2>Punti</h2>
      <form class="points-form" @submit.prevent="submitPoints">
        <div class="quick">
          <button type="button" class="secondary" @click="delta = 1">+1</button>
          <input v-model.number="delta" type="number" step="1" aria-label="Punti da aggiungere" />
        </div>
        <input v-model="reason" placeholder="Motivo (es. Taglio + piega)" />
        <button type="submit" :disabled="busy || delta === 0">Registra punti</button>
      </form>
    </section>

    <section class="card section">
      <h2>Premi vinti alla ruota</h2>
      <p class="muted">Quando la cliente mostra un premio, segnalo come usato: vale una volta sola e per 30 giorni.</p>
      <WonPrizesList :customer-id="customerId" />
    </section>

    <section class="card section">
      <h2>Offerta personale</h2>
      <OfferForm submit-label="Crea e invia" :submit="sendOffer" />
    </section>

    <section class="card section">
      <h2>PIN dimenticato</h2>
      <p class="muted">Azzera il PIN: il cliente ne sceglierà uno nuovo al prossimo accesso e l'account viene sbloccato.</p>
      <p v-if="pinResetDone" class="muted">PIN azzerato.</p>
      <button type="button" class="secondary" :disabled="busy" @click="submitPinReset">Azzera PIN</button>
    </section>
  </template>
  <p v-else-if="!busy && !error" class="muted">Cliente non trovato.</p>
</template>

<style scoped>
.section {
  margin-top: 1rem;
}

h2 {
  margin: 0 0 0.75rem;
  font-size: 1.4rem;
}

.points-form {
  display: grid;
  gap: 0.75rem;
}

.quick {
  display: flex;
  gap: 0.5rem;
}
</style>
