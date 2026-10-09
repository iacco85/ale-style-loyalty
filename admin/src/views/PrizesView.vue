<script setup lang="ts">
import { computed, ref } from "vue";
import { createPrize, listPrizes, updatePrize } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { Prize, PrizeInput, PrizeType } from "../types";

const typeLabels: Record<PrizeType, string> = {
  none: "Hai perso",
  discount: "Sconto %",
  points: "Punti",
};

const { busy, error, run } = useAsyncAction();
const prizes = ref<Prize[]>([]);
const draft = ref<PrizeInput>(emptyDraft());
const editingId = ref<number>();

const totalWeight = computed(() => prizes.value.reduce((sum, p) => sum + p.weight, 0));
const needsValue = computed(() => draft.value.type !== "none");

function emptyDraft(): PrizeInput {
  return { label: "", type: "none", weight: 10 };
}

function chancePercent(prize: Prize): string {
  return totalWeight.value ? `${((prize.weight / totalWeight.value) * 100).toFixed(1)}%` : "-";
}

async function load() {
  prizes.value = (await run(listPrizes)) ?? prizes.value;
}

function edit(prize: Prize) {
  editingId.value = prize.id;
  draft.value = { label: prize.label, type: prize.type, value: prize.value ?? undefined, weight: prize.weight };
}

function reset() {
  editingId.value = undefined;
  draft.value = emptyDraft();
}

async function save() {
  const input = { ...draft.value, value: needsValue.value ? draft.value.value : undefined };
  const id = editingId.value;
  const saved = await run(() => (id === undefined ? createPrize(input) : updatePrize(id, input)));
  if (saved === undefined) return;
  reset();
  await load();
}

load();
</script>

<template>
  <h1>Ruota della fortuna</h1>
  <p class="muted">Più alto è il peso, più il premio esce spesso. La probabilità è calcolata sul totale.</p>
  <p v-if="error" class="error">{{ error }}</p>

  <ul class="list">
    <li v-for="prize in prizes" :key="prize.id" class="card row">
      <span>
        <strong>{{ prize.label }}</strong>
        <small class="muted">
          {{ typeLabels[prize.type] }}<template v-if="prize.value !== null"> {{ prize.value }}</template>
          · peso {{ prize.weight }}
        </small>
      </span>
      <span class="chance">{{ chancePercent(prize) }}</span>
      <button class="secondary" @click="edit(prize)">Modifica</button>
    </li>
  </ul>

  <form class="card form" @submit.prevent="save">
    <h2>{{ editingId === undefined ? "Nuovo premio" : "Modifica premio" }}</h2>
    <input v-model="draft.label" placeholder="Nome (es. -15% prossimo servizio)" required />
    <select v-model="draft.type">
      <option v-for="(label, type) in typeLabels" :key="type" :value="type">{{ label }}</option>
    </select>
    <input v-if="needsValue" v-model.number="draft.value" type="number" min="1" placeholder="Valore" required />
    <input v-model.number="draft.weight" type="number" min="1" step="1" placeholder="Peso" required />
    <div class="actions">
      <button type="submit" :disabled="busy">Salva</button>
      <button v-if="editingId !== undefined" type="button" class="secondary" @click="reset">Annulla</button>
    </div>
  </form>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.row span:first-child {
  flex: 1;
}

.row small {
  display: block;
}

.chance {
  font-weight: 600;
  color: var(--color-accent);
}

.form {
  display: grid;
  gap: 0.75rem;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
