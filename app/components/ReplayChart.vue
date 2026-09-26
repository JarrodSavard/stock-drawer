<script setup lang="ts">
import type { Match, Snapshot, OhlcBar } from '../../shared/types'
import { normalize, sample } from '../lib/shape'
const props = defineProps<{ match: Match; snapshot: Snapshot }>()
type ChartMode = 'Line' | 'Candlestick' | 'Heikin-Ashi'
const modes: ChartMode[] = ['Line', 'Candlestick', 'Heikin-Ashi']
const mode = ref<ChartMode>('Line')
const hasCandles = computed(
  () => props.match.ohlc?.length === props.match.prices.length && props.match.ohlc.every(Boolean),
)
const bars = computed(
  () =>
    (mode.value === 'Heikin-Ashi' ? props.match.heikinAshi : props.match.ohlc) as
      OhlcBar[] | undefined,
)
const progress = ref(0),
  playing = ref(false)
const clipId = `replay-${useId().replace(/:/g, '')}`
let frame = 0,
  lastTime = 0
const shape = computed(() => normalize(sample(props.snapshot.points)))
const prices = computed(() => normalize(props.match.prices))
const index = computed(() =>
  Math.min(
    props.match.prices.length - 1,
    Math.floor((progress.value / 100) * (props.match.prices.length - 1) + 1e-8),
  ),
)
const price = computed(() => props.match.prices[index.value]!)
const date = computed(() => props.match.dates[index.value]!)
const min = computed(() =>
    mode.value === 'Line'
      ? Math.min(...props.match.prices)
      : Math.min(...bars.value!.map((b) => b.low)),
  ),
  max = computed(() =>
    mode.value === 'Line'
      ? Math.max(...props.match.prices)
      : Math.max(...bars.value!.map((b) => b.high)),
  )
const y = (value: number) =>
  max.value === min.value ? 154 : 28 + (1 - (value - min.value) / (max.value - min.value)) * 252
const x = (i: number) => 40 + (i / (props.match.prices.length - 1)) * 676
const candleWidth = computed(() => Math.min(16, (676 / props.match.prices.length) * 0.65))
const currentBar = computed(() => (mode.value === 'Line' ? undefined : bars.value?.[index.value]))
const path = (values: readonly number[]) =>
  values.map((v, i) => `${40 + (i / (values.length - 1)) * 676},${28 + (1 - v) * 252}`).join(' ')
const fmtDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
function tick(time: number) {
  if (!playing.value) return
  if (lastTime) progress.value = Math.min(100, progress.value + (time - lastTime) / 70)
  lastTime = time
  if (progress.value >= 100) {
    playing.value = false
    return
  }
  frame = requestAnimationFrame(tick)
}
function pause() {
  playing.value = false
  cancelAnimationFrame(frame)
  lastTime = 0
}
function play() {
  pause()
  if (progress.value >= 100) progress.value = 0
  playing.value = true
  frame = requestAnimationFrame(tick)
}
function restart() {
  progress.value = 0
  play()
}
function scrub(event: Event) {
  pause()
  progress.value =
    (Number((event.target as HTMLInputElement).value) / (props.match.prices.length - 1)) * 100
}
function select() {
  pause()
  if (!hasCandles.value) mode.value = 'Line'
  progress.value = 0
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play()
}
onMounted(select)
watch(() => props.match, select)
onBeforeUnmount(pause)
</script>

<template>
  <div class="replay-chart">
    <div class="chart-mode" role="group" aria-label="Chart type">
      <button
        v-for="option in modes"
        :key="option"
        :aria-pressed="mode === option"
        :disabled="option !== 'Line' && !hasCandles"
        @click="mode = option"
      >
        {{ option }}
      </button>
    </div>
    <div class="replay-readout">
      <div>
        <span class="readout-label">Actual close</span>
        <span class="live-price">${{ price.toFixed(2) }}</span
        ><span class="readout-date">{{ fmtDate(date) }}</span>
      </div>
      <div class="chart-legend">
        <span
          ><i class="legend-line stock" />{{
            mode === 'Line'
              ? 'Closing price'
              : mode === 'Heikin-Ashi'
                ? 'Averaged candles'
                : 'Price candles'
          }}</span
        ><span><i class="legend-line sketch" />Your shape</span>
      </div>
    </div>
    <div v-if="currentBar" class="candle-readout" aria-label="Current candle prices">
      <span
        v-for="(label, field) in { open: 'Open', high: 'High', low: 'Low', close: 'Close' }"
        :key="field"
      >
        {{ label }} <strong>${{ currentBar[field].toFixed(2) }}</strong>
      </span>
    </div>
    <svg
      class="replay-surface"
      viewBox="0 0 800 330"
      preserveAspectRatio="none"
      role="img"
      :aria-label="`${match.ticker} historical ${mode} chart, ${fmtDate(match.dates[0]!)} to ${fmtDate(match.dates.at(-1)!)}, overlaid with your drawing`"
    >
      <defs>
        <clipPath :id="clipId">
          <rect x="36" y="20" :width="4 + (progress / 100) * 676" height="268" />
        </clipPath>
      </defs>
      <g class="chart-grid">
        <line v-for="y in [28, 91, 154, 217, 280]" :key="y" x1="40" x2="716" :y1="y" :y2="y" />
      </g>
      <text
        v-for="(v, i) in [max, (max + min) / 2, min]"
        :key="i"
        x="738"
        :y="33 + i * 126"
        class="axis-price"
      >
        {{ v.toFixed(2) }}
      </text>
      <polyline :points="path(shape)" class="snapshot-overlay" />
      <polyline
        v-if="mode === 'Line'"
        :points="path(prices)"
        class="stock-line"
        :clip-path="`url(#${clipId})`"
      />
      <g v-else>
        <g
          v-for="(bar, i) in bars!.slice(0, index + 1)"
          :key="i"
          class="candle"
          :class="bar.close >= bar.open ? 'candle-up' : 'candle-down'"
        >
          <title>
            {{ fmtDate(match.dates[i]!) }}: {{ mode === 'Heikin-Ashi' ? 'averaged ' : '' }}open ${{
              bar.open.toFixed(2)
            }}, high ${{ bar.high.toFixed(2) }}, low ${{ bar.low.toFixed(2) }}, close ${{
              bar.close.toFixed(2)
            }}
          </title>
          <line :x1="x(i)" :x2="x(i)" :y1="y(bar.high)" :y2="y(bar.low)" />
          <rect
            :x="x(i) - candleWidth / 2"
            :y="Math.min(y(bar.open), y(bar.close)) - (bar.open === bar.close ? 0.5 : 0)"
            :width="candleWidth"
            :height="Math.max(1, Math.abs(y(bar.open) - y(bar.close)))"
          />
        </g>
      </g>
      <line
        :x1="40 + (progress / 100) * 676"
        :x2="40 + (progress / 100) * 676"
        y1="28"
        y2="280"
        class="playhead"
      />
      <circle
        v-if="mode === 'Line'"
        :cx="40 + (index / (prices.length - 1)) * 676"
        :cy="28 + (1 - prices[index]!) * 252"
        r="4"
        class="stock-dot"
      />
      <text x="40" y="312" class="axis-label">{{ fmtDate(match.dates[0]!) }}</text>
      <text x="716" y="312" text-anchor="end" class="axis-label">
        {{ fmtDate(match.dates.at(-1)!) }}
      </text>
    </svg>
    <p class="candle-note" v-if="!hasCandles">
      Candle views need complete, valid open, high, low and close prices for this period. Line view
      remains available.
    </p>
    <p class="candle-note" v-else-if="mode === 'Heikin-Ashi'">
      Averaged candles smooth the price movement; their values are not actual traded prices.
      Matching still uses actual closes.
    </p>
    <p class="candle-note" v-else-if="mode === 'Candlestick'">
      Hollow candles close at or above their open; filled candles close below it. Wicks show the
      high and low.
    </p>
    <div class="replay-controls">
      <button
        class="icon-button play-button"
        :aria-label="playing ? 'Pause replay' : 'Play replay'"
        @click="playing ? pause() : play()"
      >
        <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span>
      </button>
      <button class="icon-button" aria-label="Restart replay" @click="restart">
        <span aria-hidden="true">↺</span>
      </button>
      <input
        :value="index"
        type="range"
        min="0"
        :max="match.prices.length - 1"
        step="1"
        aria-label="Replay position"
        :aria-valuetext="`${fmtDate(date)}, ${price.toFixed(2)} dollars`"
        @input="scrub"
      />
      <span class="session-count">{{ index + 1 }} / {{ match.prices.length }}</span>
    </div>
  </div>
</template>
