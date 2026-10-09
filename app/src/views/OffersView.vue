<script setup lang="ts">
import { listOffers } from "../api";
import { useLiveData } from "../composables/useLiveData";
import { formatDay } from "../formatDate";
import type { Offer } from "../types";

const { data: offers, busy, error } = useLiveData(listOffers, [] as Offer[]);
</script>

<template>
  <h1>Le tue offerte</h1>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!busy && offers.length === 0" class="muted">Nessuna offerta al momento. Torna a trovarci presto!</p>
  <ul class="list">
    <li v-for="offer in offers" :key="offer.id" class="card">
      <strong>{{ offer.title }}</strong>
      <p v-if="offer.description" class="description">{{ offer.description }}</p>
      <small class="muted">{{ offer.customer_id === null ? "Per tutti" : "Per te" }} · {{ formatDay(offer.created_at) }}</small>
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

.description {
  margin: 0.4rem 0;
}
</style>
