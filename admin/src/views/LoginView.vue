<script setup lang="ts">
import { ref } from "vue";
import logo from "../assets/LogoAleStyle.jpg";
import { useRouter } from "vue-router";
import { checkPassword } from "../api";
import { useAsyncAction } from "../composables/useAsyncAction";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { signIn } = useAuth();
const { busy, error, run } = useAsyncAction();
const password = ref("");

async function submit() {
  const verified = await run(() => checkPassword(password.value));
  if (verified === undefined) return;
  signIn(password.value);
  await router.push({ name: "customers" });
}
</script>

<template>
  <form class="card login" @submit.prevent="submit">
    <img :src="logo" alt="Ale Style" class="logo" />
    <h1>Area gestione</h1>
    <label>
      Password
      <input v-model="password" type="password" autocomplete="current-password" required />
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" :disabled="busy">Entra</button>
  </form>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1rem;
  max-width: 360px;
  margin: 3rem auto;
  text-align: center;
}

.logo {
  width: 100%;
}

label {
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

label input {
  margin-top: 0.4rem;
}
</style>
