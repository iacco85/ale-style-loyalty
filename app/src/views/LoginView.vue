<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../api";
import logo from "../assets/LogoAleStyle.jpg";
import { useAsyncAction } from "../composables/useAsyncAction";
import { useSession } from "../composables/useSession";

const router = useRouter();
const { start } = useSession();
const { busy, error, run } = useAsyncAction();
const name = ref("");
const phone = ref("");

async function submit() {
  const response = await run(() => login(name.value.trim(), phone.value.trim()));
  if (!response) return;
  start(response);
  await router.push({ name: "home" });
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <img :src="logo" alt="Ale Style" class="logo" />
    <h1>La tua tessera fedeltà</h1>
    <p class="muted">Inserisci nome e numero di cellulare per accedere.</p>
    <input v-model="name" placeholder="Nome" autocomplete="given-name" required />
    <input v-model="phone" type="tel" placeholder="Cellulare" autocomplete="tel" required />
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" :disabled="busy">Accedi</button>
  </form>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
  text-align: center;
}

.logo {
  width: 100%;
}
</style>
