<script setup lang="ts">
import type { Match } from '../../shared/types'
const props = defineProps<{ matches: Match[]; selected: number }>()
const emit = defineEmits<{ select: [number] }>()
const path = (values: number[]) =>
  values.map((v, i) => `${(i / (values.length - 1)) * 180},${45 - v * 40}`).join(' ')
const month = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
</script>
<template>
  <div class="matches-grid">
    <button
      v-for="(match, i) in props.matches"
      :key="match.ticker"
      data-testid="match-result"
      class="match-item"
      :class="{ selected: selected === i }"
      :aria-pressed="selected === i"
      :aria-label="`Replay ${match.ticker}, match ${i + 1}`"
      @click="emit('select', i)"
    >
      <span class="match-top"
        ><span class="match-rank">0{{ i + 1 }}</span
        ><strong>{{ match.ticker }}</strong
        ><span class="match-arrow" aria-hidden="true">↗</span></span
      >
      <svg viewBox="-2 -2 184 52" role="img" :aria-label="`${match.ticker} price shape`">
        <polyline :points="path(match.shape)" />
      </svg>
      <span class="match-dates"
        >{{ month(match.dates[0]!) }} — {{ month(match.dates.at(-1)!) }}</span
      >
      <span class="match-distance"
        >{{ match.distance.toFixed(3) }} <span>shape distance</span></span
      >
    </button>
  </div>
</template>
