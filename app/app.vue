<script setup lang="ts">
import type { Point, Period, Snapshot, SearchMode } from '../shared/types'
import { captureSnapshot } from './lib/drawing'
import { sample } from './lib/shape'

const points = ref<Point[]>([]),
  period = ref<Period>(60),
  snapshot = shallowRef<Snapshot | null>(null)
const searchMode = ref<SearchMode>('quick')
const selected = ref(0),
  drawingError = ref(''),
  showData = ref(false)
const {
  meta,
  result,
  loading,
  searching,
  progress,
  error,
  source,
  sourceKind,
  find,
  importFile,
  invalidate,
  load,
} = useStockSearch()
const match = computed(() => result.value?.matches[selected.value] ?? null)
const patterns: { name: string; label: string; values: number[]; path: string }[] = [
  {
    name: 'cup',
    label: 'The comeback',
    values: [0.8, 0.61, 0.3, 0.12, 0.07, 0.16, 0.34, 0.65, 0.88],
    path: 'M2 4 Q16 29 30 4',
  },
  {
    name: 'rise',
    label: 'The steady climb',
    values: [0.08, 0.22, 0.19, 0.4, 0.34, 0.63, 0.6, 0.75, 0.9],
    path: 'M2 24 10 17 16 19 23 8 30 3',
  },
  {
    name: 'double peak',
    label: 'The double peak',
    values: [0.1, 0.5, 0.9, 0.65, 0.35, 0.6, 0.88, 0.48, 0.15],
    path: 'M2 24 9 3 16 18 23 4 30 24',
  },
]
const valid = computed(() => {
  try {
    sample(points.value)
    return true
  } catch {
    return false
  }
})
const statusText = computed(() =>
  loading.value
    ? 'Loading historical prices'
    : meta.value
      ? `${meta.value.stocks.toLocaleString()} ${meta.value.stocks === 1 ? 'stock' : 'stocks'} loaded`
      : 'Local CSV supported',
)
function example(values: number[]) {
  resetResults()
  points.value = values.map((y, i) => ({ x: 0.04 + (i / (values.length - 1)) * 0.92, y }))
  drawingError.value = ''
}
function validate() {
  try {
    sample(points.value)
    drawingError.value = ''
  } catch (e) {
    drawingError.value = e instanceof Error ? e.message : 'Draw a longer line.'
  }
}
function resetResults() {
  invalidate()
  snapshot.value = null
  selected.value = 0
  drawingError.value = ''
}
function drawAgain() {
  resetResults()
}
function clear() {
  resetResults()
  points.value = []
}
function submit() {
  validate()
  if (!valid.value) return
  if (!meta.value) {
    showData.value = true
    return
  }
  snapshot.value = captureSnapshot(points.value, period.value)
  selected.value = 0
  find(snapshot.value.points, period.value, searchMode.value)
}
function deepen() {
  if (!snapshot.value) return
  searchMode.value = 'deep'
  selected.value = 0
  find(snapshot.value.points, snapshot.value.period, 'deep')
}
function choosePeriod(value: Period) {
  if (value !== period.value) {
    resetResults()
    period.value = value
  }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0]
  if (!file) return
  resetResults()
  await importFile(file)
  input.value = ''
}
function howItWorks() {
  document.getElementById('how-it-works')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#workspace">Skip to drawing</a>
    <header class="site-header">
      <a href="./" class="wordmark" aria-label="Stock Drawer home"
        ><svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="m3 24 8-10 6 6L29 6" />
          <circle cx="29" cy="6" r="2" /></svg
        >stock<span>drawer</span><span class="brand-period">.</span></a
      >
      <nav aria-label="Main navigation">
        <button class="text-button" @click="howItWorks">
          How it works <span aria-hidden="true">↗</span></button
        ><button
          class="text-button data-nav"
          :aria-expanded="showData"
          aria-controls="data-details"
          @click="showData = !showData"
        >
          The data <span aria-hidden="true">↗</span>
        </button>
        <a
          class="creator-nav"
          href="https://www.jarrodsavard.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="creator-nav-label">An experiment by</span>
          Jarrod Savard <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div>
          <p class="eyebrow">
            <span class="tiny-cross" aria-hidden="true">✳</span> A PLAYGROUND FOR PATTERNS
          </p>
          <h1 id="hero-title">A doodle today.<br />A piece of <em>history.</em></h1>
        </div>
        <div class="hero-note">
          <span class="note-rule" />
          <p>
            What if you could search<br class="desktop-break" />
            the market with a pencil?
          </p>
          <span class="hero-caption"
            >Draw a shape. Find real stock charts that look like it. Then watch the history
            unfold.</span
          >
          <span class="hero-footnote">No account. Just curiosity.</span>
        </div>
      </section>

      <section id="workspace" class="workspace" aria-label="Pattern studio" tabindex="-1">
        <div class="workspace-top">
          <div class="studio-title"><span class="status-dot" /><span>THE PATTERN STUDIO</span></div>
          <span class="dataset-status" aria-live="polite">{{ statusText }}</span>
        </div>
        <div class="studio-body">
          <div class="main-stage">
            <div class="stage-toolbar">
              <div class="stage-heading">
                <span class="step-number">{{ match ? '02' : '01' }}</span>
                <h2>{{ match ? `${match.ticker}, meet your sketch.` : 'Make your mark.' }}</h2>
              </div>
              <button v-if="match || snapshot" class="text-button" @click="drawAgain">
                Draw again <span aria-hidden="true">↶</span></button
              ><button
                v-else
                class="text-button"
                :disabled="!points.length"
                aria-label="Clear drawing"
                @click="clear"
              >
                Clear <span aria-hidden="true">↶</span>
              </button>
            </div>
            <ReplayChart v-if="match && snapshot" :match="match" :snapshot="snapshot" />
            <template v-else
              ><DrawCanvas v-model="points" :disabled="searching" @finished="validate" />
              <div class="drawing-bottom">
                <span v-if="drawingError" class="validation-message" role="alert">{{
                  drawingError
                }}</span
                ><span v-else>Up, down, or somewhere in between. Follow your intuition.</span
                ><span class="canvas-label">{{ period }} trading days</span>
              </div></template
            >
            <SearchProgress
              v-if="searching"
              :mode="searchMode"
              :progress="progress"
              @cancel="drawAgain"
            />
            <div v-if="match" class="overlay-note">
              Shapes are scaled to compare. Matching uses actual closing prices.
            </div>
          </div>

          <aside class="studio-aside" aria-label="Pattern controls">
            <template v-if="snapshot && result">
              <p class="control-label">YOUR SNAPSHOT</p>
              <div class="snapshot-preview">
                <img :src="snapshot.image" alt="Your captured drawing" />
              </div>
              <p class="snapshot-caption">
                One moment of intuition,<br />captured exactly as you drew it.
              </p>
              <div class="aside-divider" />
              <div class="detail-row">
                <span>Window</span><strong>{{ snapshot.period }} trading days</strong>
              </div>
              <div class="detail-row">
                <span>Search depth</span
                ><strong data-testid="search-depth">{{
                  result.mode === 'deep' ? 'Deep' : 'Quick'
                }}</strong>
              </div>
              <div class="detail-row">
                <span>Search time</span><strong>{{ (result.elapsedMs / 1000).toFixed(2) }}s</strong>
              </div>
              <div class="detail-row">
                <span>Patterns searched</span
                ><strong data-testid="windows-searched">{{
                  result.windows.toLocaleString()
                }}</strong>
              </div>
              <button v-if="result.mode === 'quick'" class="deepen-button" @click="deepen">
                Search deeper <span aria-hidden="true">◎</span>
              </button>
              <p v-else class="depth-hint">
                Every starting day checked. Closer resemblance is possible, never guaranteed.
              </p>
              <button class="primary-button aside-action" @click="drawAgain">
                Try another shape <span aria-hidden="true">↗</span>
              </button>
            </template>
            <template v-else>
              <p class="control-label">A LITTLE INSPIRATION</p>
              <h3>Where will your<br />line take you?</h3>
              <p class="aside-copy">
                Start with a familiar shape.<br />Or make something entirely yours.
              </p>
              <div class="example-list">
                <button
                  v-for="pattern in patterns"
                  :key="pattern.name"
                  :aria-label="`Try a ${pattern.name} pattern`"
                  :disabled="loading || searching"
                  @click="example(pattern.values)"
                >
                  <svg viewBox="0 0 32 28" aria-hidden="true"><path :d="pattern.path" /></svg
                  ><span>{{ pattern.label }}</span
                  ><span class="example-arrow" aria-hidden="true">↗</span>
                </button>
              </div>
              <div class="period-control">
                <span class="control-label" id="period-label">GIVE IT SOME TIME</span>
                <div class="period-buttons" role="group" aria-labelledby="period-label">
                  <button
                    v-for="value in [20, 60, 120] as const"
                    :key="value"
                    :aria-pressed="period === value"
                    :disabled="searching"
                    @click="choosePeriod(value)"
                  >
                    {{ value }} days
                  </button>
                </div>
                <span class="period-hint">Trading days, not calendar days.</span>
              </div>
              <SearchDepthControl v-model="searchMode" :disabled="loading || searching" />
              <button
                class="primary-button"
                :disabled="!valid || loading || searching"
                @click="submit"
              >
                {{ searching ? 'Finding your matches' : 'Find matches' }}
                <span aria-hidden="true">↗</span></button
              ><span class="button-caption">A shape search. Not a prediction.</span>
            </template>
          </aside>
        </div>
        <div class="workspace-bottom">
          <span
            ><span class="small-dot" />
            {{ meta ? `${meta.from} — ${meta.to}` : 'Historical closing prices' }}</span
          ><button
            class="text-button"
            :aria-expanded="showData"
            aria-controls="data-details"
            @click="showData = !showData"
          >
            {{ meta ? 'About this dataset' : 'Load your data' }} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <p v-if="error && meta" class="notice error-notice" role="alert">
        {{ error }} <button class="text-button" @click="drawAgain">Return to drawing</button>
      </p>
      <section
        v-if="result"
        class="results-section"
        aria-labelledby="matches-title"
        aria-live="polite"
      >
        <div class="results-heading">
          <div>
            <p class="eyebrow">A FAMILIAR SHAPE, FOUND IN HISTORY</p>
            <h2 id="matches-title">
              {{ result.matches.length ? 'Meet your matches.' : 'A shape of its own.' }}
            </h2>
          </div>
          <p v-if="result.matches.length">
            Closest shapes first.<br /><span>Lower distance means a closer resemblance.</span>
          </p>
        </div>
        <MatchResults :matches="result.matches" :selected="selected" @select="selected = $event" />
        <p v-if="!result.matches.length" class="empty-results">
          No comparable windows in this dataset. Try a different shape or a shorter period.
        </p>
      </section>

      <section
        v-if="showData || (!loading && !meta)"
        id="data-details"
        class="data-details"
        aria-labelledby="data-title"
      >
        <div>
          <p class="eyebrow">THE SOURCE MATTERS</p>
          <h2 id="data-title">
            {{ meta ? 'Real history. In your browser.' : 'Bring your own history' }}
          </h2>
          <p v-if="meta">
            {{ source }} · {{ meta.observations.toLocaleString() }} observations.
            <template v-if="sourceKind === 'bundled'"
              >Daily IEX prices, ready to explore. This is a historical snapshot, not a live market
              feed.</template
            >
            <template v-else
              >Closing prices as supplied; adjustment status is unverified. Your file stays in your
              browser.</template
            >
          </p>
          <p v-else>
            Retry the bundled history, or load a historical CSV to start exploring. Your file stays
            in your browser.
          </p>
          <p v-if="error && !meta" class="data-error" role="status">{{ error }}</p>
          <details>
            <summary>Data source &amp; reuse</summary>
            <p>
              The default snapshot contains selected stocks from
              <a href="https://hfdatalibrary.com/" target="_blank" rel="noreferrer"
                >HF Data Library</a
              >
              (Ahmed Elkassabgi, 2026). Its compilation is shared under
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
                >CC BY 4.0</a
              >. We retain only daily bars identified as IEX, from March 2022 onward, and convert
              them to a compact browser dataset. These prices reflect trades on IEX only; they can
              differ from market-wide closes. Prices are supplied in the provider’s cleaned version;
              corporate-action adjustments have not been independently verified.
              <a href="data/source.json" target="_blank">Snapshot coverage &amp; source manifest</a
              >.
            </p>
            <p>
              Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to
              the
              <a href="https://www.iex.io/legal/hist-data-terms" target="_blank" rel="noreferrer"
                >IEX Historical Data Terms of Use</a
              >. Imported CSVs replace this snapshot for your current session and carry their own
              source terms.
            </p>
            <p>
              CSV columns: <code>date,close,Name</code> (or <code>ticker</code>). Dates: YYYY-MM-DD.
              Positive closing prices in USD. Missing observations break windows relative to the
              dataset’s combined calendar; sessions absent from every stock cannot be inferred. Add
              open, high and low columns to explore candlestick and Heikin-Ashi views.
            </p>
          </details>
        </div>
        <div class="data-actions">
          <label class="upload-button"
            >Load a stock CSV <span aria-hidden="true">↑</span
            ><input
              type="file"
              accept=".csv,text/csv"
              aria-label="Load a stock CSV"
              @change="upload" /></label
          ><span>CSV · up to 100 MB · never uploaded</span
          ><button v-if="!meta" class="text-button" :disabled="loading" @click="load">
            Retry dataset <span aria-hidden="true">↻</span>
          </button>
        </div>
      </section>

      <section id="how-it-works" class="how-section" aria-labelledby="how-title">
        <div class="how-header">
          <p class="eyebrow">FROM A DOODLE TO A DISCOVERY</p>
          <h2 id="how-title">Less searching. More seeing.</h2>
        </div>
        <div class="how-steps">
          <article>
            <span class="how-number">01 /</span>
            <h3>Draw a feeling.</h3>
            <p>A steady climb. A comeback. A few twists and turns. Give your idea a shape.</p>
          </article>
          <article>
            <span class="how-number">02 /</span>
            <h3>Find its echoes.</h3>
            <p>
              We compare your snapshot with historical charts, allowing a little room in the timing.
            </p>
          </article>
          <article>
            <span class="how-number">03 /</span>
            <h3>Watch history unfold.</h3>
            <p>Replay a real stock’s movement alongside your line. See where they come together.</p>
          </article>
        </div>
      </section>
      <section class="maker-section" aria-labelledby="maker-title">
        <div class="maker-intro">
          <p class="eyebrow">SIDE PROJECT. SERIOUS CURIOSITY.</p>
          <h2 id="maker-title">Built for the joy of<br /><em>figuring it out.</em></h2>
          <div class="maker-byline">
            <span class="maker-monogram" aria-hidden="true">JS</span>
            <div>
              <span>Created by <strong>Jarrod Savard</strong></span
              ><span class="maker-role">Founding engineer &amp; product builder</span>
            </div>
          </div>
        </div>
        <div class="maker-story">
          <p>
            A small idea, taken all the way: turn a hand-drawn line into a way to explore market
            history.
          </p>
          <p>
            This is a personal portfolio experiment in playful interfaces, data visualization, and
            making complex interactions feel simple. Have a scribble. See what turns up.
          </p>
          <a
            class="portfolio-link"
            href="https://www.jarrodsavard.com/"
            target="_blank"
            rel="noopener noreferrer"
            >Explore my work <span aria-hidden="true">↗</span></a
          >
          <details class="build-details">
            <summary>A look under the hood <span aria-hidden="true">+</span></summary>
            <dl>
              <div>
                <dt>The interface</dt>
                <dd>
                  Nuxt, Vue &amp; TypeScript. Custom SVG drawing and chart replay, built for mouse,
                  touch, and keyboard.
                </dd>
              </div>
              <div>
                <dt>The matching</dt>
                <dd>
                  Shape normalization and dynamic time warping find similar movements while allowing
                  small differences in timing.
                </dd>
              </div>
              <div>
                <dt>The experience</dt>
                <dd>
                  A Web Worker handles the search. Local data, no upload, and a responsive interface
                  throughout.
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <a href="https://www.jarrodsavard.com/" target="_blank" rel="noopener noreferrer"
        >Made by Jarrod Savard <span aria-hidden="true">↗</span></a
      >
      <p>Historical shapes. Not predictions.</p>
      <a href="https://github.com/JarrodSavard" target="_blank" rel="noopener noreferrer"
        >Find me on GitHub <span aria-hidden="true">↗</span></a
      >
    </footer>
  </div>
</template>
