<script setup lang="ts">
import { createBroadcast } from "../api";
import OfferForm from "../components/OfferForm.vue";
</script>

<template>
  <h1>Offerta per tutti i clienti</h1>
  <p class="muted">La notifica arriva a tutti i dispositivi registrati.</p>
  <OfferForm submit-label="Invia a tutti" :submit="createBroadcast" />
</template>
