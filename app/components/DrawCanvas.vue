<script setup lang="ts">
import type { Point } from '../../shared/types'
import { appendPoint } from '../lib/drawing'
const props = defineProps<{ modelValue: Point[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [Point[]]; finished: [] }>()
const surface = ref<SVGSVGElement>()
const active = ref(false)
let pointerId: number | null = null
const line = computed(() =>
  props.modelValue.map((p) => `${40 + p.x * 720},${24 + (1 - p.y) * 282}`).join(' '),
)
function coordinate(event: PointerEvent): Point {
  const rect = surface.value!.getBoundingClientRect()
  return {
    x: (((event.clientX - rect.left) / rect.width) * 800 - 40) / 720,
    y: 1 - (((event.clientY - rect.top) / rect.height) * 350 - 24) / 282,
  }
}
function start(event: PointerEvent) {
  if (props.disabled || !event.isPrimary || event.button !== 0) return
  pointerId = event.pointerId
  active.value = true
  surface.value!.setPointerCapture(pointerId)
  emit('update:modelValue', appendPoint([], coordinate(event)))
}
function move(event: PointerEvent) {
  if (!active.value || event.pointerId !== pointerId) return
  let points = props.modelValue
  for (const e of event.getCoalescedEvents?.() || [event])
    points = appendPoint(points, coordinate(e))
  emit('update:modelValue', points)
}
function finish(event: PointerEvent) {
  if (event.pointerId !== pointerId) return
  active.value = false
  pointerId = null
  emit('finished')
}
</script>

<template>
  <div class="drawing-wrap" :class="{ 'is-drawing': active, 'has-line': modelValue.length > 1 }">
    <svg
      ref="surface"
      data-testid="drawing-canvas"
      class="drawing-surface"
      viewBox="0 0 800 350"
      preserveAspectRatio="none"
      role="img"
      aria-label="Drawing canvas. Draw from left to right, or use an example pattern below."
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup="finish"
      @pointercancel="finish"
      @lostpointercapture="finish"
    >
      <g class="chart-grid">
        <line
          v-for="y in [24, 94.5, 165, 235.5, 306]"
          :key="`y${y}`"
          x1="40"
          x2="760"
          :y1="y"
          :y2="y"
        />
        <line
          v-for="x in [40, 184, 328, 472, 616, 760]"
          :key="`x${x}`"
          :x1="x"
          :x2="x"
          y1="24"
          y2="306"
        />
      </g>
      <g v-if="!modelValue.length" class="ghost-line" aria-hidden="true">
        <path
          d="M120 222 C180 222 190 115 240 146 S310 265 366 227 S435 99 482 139 S560 235 660 88"
        />
        <circle cx="120" cy="222" r="4" />
        <circle cx="660" cy="88" r="4" />
      </g>
      <polyline v-if="modelValue.length" :points="line" class="drawn-line" />
      <circle
        v-if="modelValue.length"
        :cx="40 + modelValue[modelValue.length - 1]!.x * 720"
        :cy="24 + (1 - modelValue[modelValue.length - 1]!.y) * 282"
        r="4"
        class="line-end"
      />
      <text x="40" y="337" class="axis-label">START</text>
      <text x="760" y="337" text-anchor="end" class="axis-label">TIME →</text>
    </svg>
    <div v-if="!modelValue.length" class="canvas-invitation" aria-hidden="true">
      <span class="pencil-mark"
        ><svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="m11 27 16-16 5 5-16 16-8 2 3-7Z M24 14l5 5 M11 27l5 5 M9 34l-3 1" /></svg></span
      ><strong>Your next discovery<br />starts with a scribble.</strong
      ><span>Draw one line, from left to right.<br />Or try a shape from the collection.</span>
    </div>
  </div>
</template>
