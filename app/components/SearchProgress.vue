<script setup lang="ts">
import type { SearchMode, SearchProgress } from '../../shared/types'
defineProps<{ mode: SearchMode; progress: SearchProgress | null }>()
defineEmits<{ cancel: [] }>()
</script>
<template>
  <div class="search-progress">
    <div class="search-progress-content">
      <p class="eyebrow">{{ mode === 'deep' ? 'A CLOSER LOOK' : 'FINDING YOUR MATCHES' }}</p>
      <p class="progress-heading" role="status">
        {{
          progress && progress.completedStocks === progress.totalStocks
            ? 'Comparing the closest shapes…'
            : 'Looking through market history…'
        }}
      </p>
      <progress
        aria-label="Stocks checked"
        :value="progress?.completedStocks ?? 0"
        :max="progress?.totalStocks || 1"
      />
      <p class="progress-detail">
        {{ (progress?.windows ?? 0).toLocaleString() }} historical windows checked
      </p>
      <button class="text-button" @click="$emit('cancel')">
        Cancel search <span aria-hidden="true">×</span>
      </button>
    </div>
  </div>
</template>
