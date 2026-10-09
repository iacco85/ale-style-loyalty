<script setup lang="ts">
import { ref, watch } from "vue";
import { listCustomers } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { CustomerWithPoints } from "../types";

const { busy, error, run } = useAsyncAction();
const search = ref("");
const customers = ref<CustomerWithPoints[]>([]);

async function load() {
  customers.value = (await run(() => listCustomers(search.value.trim()))) ?? customers.value;
}

let debounce: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(debounce);
  debounce = setTimeout(load, 300);
});

load();
</script>

<template>
  <h1>Clienti</h1>
  <input v-model="search" type="search" placeholder="Cerca per nome o telefono" />
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!busy && customers.length === 0" class="muted">Nessun cliente trovato.</p>
  <ul class="list">
    <li v-for="customer in customers" :key="customer.id">
      <RouterLink :to="{ name: 'customer', params: { id: customer.id } }" class="card row">
        <span>
          <strong>{{ customer.name }}</strong>
          <small class="muted">{{ customer.phone }}</small>
        </span>
        <span class="points">{{ customer.points }} pt</span>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.3s, background 0.3s;
}

.row:hover {
  border-color: var(--color-accent);
  background: var(--color-surface-hover);
}

.row small {
  display: block;
}

.points {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--color-accent);
}
</style>
