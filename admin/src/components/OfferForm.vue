<script setup lang="ts">
import { ref } from "vue";
import { useAsyncAction } from "../composables/useAsyncAction";
import type { OfferInput } from "../types";

const props = defineProps<{ submitLabel: string; submit: (offer: OfferInput) => Promise<unknown> }>();

const { busy, error, run } = useAsyncAction();
const title = ref("");
const description = ref("");
const sent = ref(false);

async function send() {
  sent.value = false;
  const result = await run(() =>
    props.submit({ title: title.value.trim(), description: description.value.trim() || undefined }),
  );
  if (result === undefined) return;
  title.value = "";
  description.value = "";
  sent.value = true;
}
</script>

<template>
  <form class="form" @submit.prevent="send">
    <input v-model="title" placeholder="Titolo (es. -15% sul prossimo taglio)" required />
    <textarea v-model="description" rows="2" placeholder="Dettagli (facoltativo)" />
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="sent" class="muted">Offerta creata e notifica inviata.</p>
    <button type="submit" :disabled="busy">{{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 0.75rem;
}
</style>
