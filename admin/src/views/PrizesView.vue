<script setup lang="ts">
import { computed, ref } from "vue";
import { createPrize, listPrizes, removePrize, updatePrize } from "../api";
import WheelSettingsForm from "../components/WheelSettingsForm.vue";
import { useAsyncAction } from "../composables/useAsyncAction";
import { chancePercent, draftChancePercent } from "../prizeChance";
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
const draftChance = computed(() => draftChancePercent(prizes.value, draft.value.weight, editingId.value));

function emptyDraft(): PrizeInput {
  return { label: "", type: "none", weight: 10 };
}

function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

function prizeChance(prize: Prize): string {
  return formatPercent(chancePercent(prize.weight, totalWeight.value));
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

async function remove(prize: Prize) {
  const question = `Eliminare "${prize.label}" dalla ruota? Le clienti che l'hanno già vinto lo conservano nei loro premi.`;
  if (!window.confirm(question)) return;
  const removed = await run(() => removePrize(prize.id));
  if (removed === undefined) return;
  if (editingId.value === prize.id) reset();
  await load();
}

load();
</script>

<template>
  <h1>Ruota della fortuna</h1>
  <p class="muted">
    Ogni premio ha un peso: più è alto, più il premio esce spesso. La percentuale accanto a ogni premio è la probabilità
    che esca a ogni giro.
  </p>
  <WheelSettingsForm />

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
      <span class="chance">{{ prizeChance(prize) }}</span>
      <button class="secondary" @click="edit(prize)">Modifica</button>
      <button class="secondary" :disabled="busy" @click="remove(prize)">Elimina</button>
    </li>
  </ul>

  <form class="card form" @submit.prevent="save">
    <h2>{{ editingId === undefined ? "Nuovo premio" : "Modifica premio" }}</h2>
    <label>
      Nome sulla ruota
      <input v-model="draft.label" placeholder="es. -15% prossimo servizio" required />
    </label>
    <label>
      Tipo
      <select v-model="draft.type">
        <option v-for="(label, type) in typeLabels" :key="type" :value="type">{{ label }}</option>
      </select>
    </label>
    <label v-if="needsValue">
      {{ draft.type === "points" ? "Punti regalati" : "Percentuale di sconto" }}
      <input v-model.number="draft.value" type="number" min="1" required />
    </label>
    <label>
      Peso
      <input v-model.number="draft.weight" type="number" min="1" step="1" required />
      <small class="hint">Un numero da 1 in su, confrontato con i pesi degli altri premi.</small>
    </label>
    <p class="preview">
      Con questo peso esce in <strong>{{ formatPercent(draftChance) }}</strong> dei giri
    </p>
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
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-accent);
}

.form {
  display: grid;
  gap: 0.75rem;
}

h2 {
  margin: 0;
  font-size: 1.4rem;
}

label {
  display: grid;
  gap: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.hint {
  text-transform: none;
  letter-spacing: normal;
}

.preview {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.2rem;
}

.preview strong {
  color: var(--color-accent);
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
