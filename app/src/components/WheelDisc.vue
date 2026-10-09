<script setup lang="ts">
import { computed } from "vue";
import { labelTransform, slicePath, sliceTone, truncateLabel, spinDurationMs } from "../wheelGeometry";
import type { WheelSlice } from "../wheelGeometry";

const props = defineProps<{ slices: WheelSlice[]; rotation: number }>();

const center = 100;
const radius = 96;
const labelMaxLength = 17;

const rotationDeg = computed(() => `${props.rotation}deg`);
const duration = `${spinDurationMs}ms`;
const count = computed(() => props.slices.length);
</script>

<template>
  <svg class="disc" viewBox="0 0 200 200" role="img" aria-label="Ruota della fortuna">
    <g v-for="(slice, index) in slices" :key="index">
      <path :d="slicePath(index, count, center, center, radius)" :class="`tone-${sliceTone(index, count)}`" />
      <text
        :x="center + radius - 8"
        :y="center"
        :transform="labelTransform(index, count, center, center)"
        :class="`label label-${sliceTone(index, count)}`"
      >
        {{ truncateLabel(slice.label, labelMaxLength) }}
      </text>
    </g>
    <circle :cx="center" :cy="center" :r="radius" class="rim" />
    <circle :cx="center" :cy="center" r="9" class="hub" />
  </svg>
</template>

<style scoped>
.disc {
  display: block;
  width: 100%;
  transform: rotate(v-bind(rotationDeg));
  transition: transform v-bind(duration) cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

.tone-0 {
  fill: var(--wheel-a);
}

.tone-1 {
  fill: var(--wheel-b);
}

.tone-2 {
  fill: var(--wheel-c);
}

.label {
  font-family: var(--font-body);
  font-size: 7.5px;
  font-weight: 700;
  text-anchor: end;
  dominant-baseline: central;
  pointer-events: none;
}

.label-0 {
  fill: var(--color-on-accent);
}

.label-1,
.label-2 {
  fill: var(--color-text);
}

.rim {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 3;
}

.hub {
  fill: var(--color-bg);
  stroke: var(--color-accent);
  stroke-width: 2;
}
</style>
