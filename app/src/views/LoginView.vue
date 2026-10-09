<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../api";
import logo from "../assets/LogoAleStyle.jpg";
import { useAsyncAction } from "../composables/useAsyncAction";
import { useRememberedAccount } from "../composables/useRememberedAccount";
import { useSession } from "../composables/useSession";

const router = useRouter();
const { start } = useSession();
const { account, remember, forget } = useRememberedAccount();
const { busy, error, run } = useAsyncAction();
const name = ref("");
const phone = ref("");
const pin = ref("");

async function submit() {
  const known = account.value;
  const response = await run(() => login(known?.name ?? name.value.trim(), known?.phone ?? phone.value.trim(), pin.value));
  if (!response) return;
  remember(response.customer);
  start(response);
  pin.value = "";
  await router.push({ name: "home" });
}

function switchAccount() {
  forget();
  pin.value = "";
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <img :src="logo" alt="Ale Style" class="logo" />
    <template v-if="account">
      <h1>Ciao, {{ account.name }}</h1>
      <p class="muted">Inserisci il tuo PIN per entrare.</p>
    </template>
    <template v-else>
      <h1>La tua tessera fedeltà</h1>
      <p class="muted">Accedi con il tuo numero di cellulare e il tuo PIN. Se è la prima volta, il PIN che scegli ora sarà il tuo.</p>
      <input v-model="name" placeholder="Nome" autocomplete="given-name" required />
      <input v-model="phone" type="tel" placeholder="Cellulare" autocomplete="tel" required />
    </template>
    <input
      v-model="pin"
      type="password"
      inputmode="numeric"
      pattern="[0-9]{4,6}"
      maxlength="6"
      placeholder="PIN (4-6 cifre)"
      autocomplete="current-password"
      required
    />
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" :disabled="busy">Accedi</button>
    <template v-if="account">
      <button type="button" class="secondary" @click="switchAccount">Non sei {{ account.name }}? Cambia account</button>
      <p class="muted hint">Hai dimenticato il PIN? Chiedilo in salone.</p>
    </template>
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

.hint {
  margin: 0;
  font-size: 0.85rem;
}
</style>
