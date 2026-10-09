<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ percent: number }>();

const width = computed(() => `${props.percent}%`);
</script>

<template>
  <div class="bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
    <div class="fill"></div>
  </div>
</template>

<style scoped>
.bar {
  height: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.fill {
  height: 100%;
  width: v-bind(width);
  background: var(--color-accent);
  transition: width 0.4s ease;
}
</style>
