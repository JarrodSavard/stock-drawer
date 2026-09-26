<script setup lang="ts">
import type { SearchMode } from '../../shared/types'
defineProps<{ modelValue: SearchMode; disabled: boolean }>()
defineEmits<{ 'update:modelValue': [SearchMode] }>()
const descriptionId = `search-depth-${useId()}`
</script>
<template>
  <div class="depth-control">
    <span class="control-label">SEARCH DEPTH</span>
    <div
      class="depth-buttons"
      role="group"
      aria-label="Search depth"
      :aria-describedby="descriptionId"
    >
      <button
        v-for="mode in ['quick', 'deep'] as const"
        :key="mode"
        :disabled="disabled"
        :aria-pressed="modelValue === mode"
        :aria-label="`${mode === 'quick' ? 'Quick' : 'Deep'} search`"
        @click="$emit('update:modelValue', mode)"
      >
        {{ mode === 'quick' ? 'Quick' : 'Deep'
        }}<span aria-hidden="true">{{ mode === 'quick' ? '↗' : '◎' }}</span>
      </button>
    </div>
    <p :id="descriptionId" class="depth-hint">
      {{
        modelValue === 'quick'
          ? 'A faster first look. Checks every fifth starting day.'
          : 'Every starting day. More shapes compared. Takes a little longer.'
      }}
    </p>
  </div>
</template>
