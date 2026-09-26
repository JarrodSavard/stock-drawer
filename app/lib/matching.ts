import type {
  Point,
  StockDataset,
  SearchResult,
  Period,
  SearchMode,
  SearchProgress,
} from '../../shared/types'
import { normalize, sample } from './shape'
import { searchPolicy } from './search/policies'
import { CandidatePool, type Candidate } from './search/candidates'
import { createWindowSampler, windowStarts } from './search/windows'
import { dtw, directDistance } from './search/scoring'
import { selectMatches } from './search/results'
export { normalize, sample } from './shape'
export { dtw } from './search/scoring'

/** Deterministic computation yielding bounded chunks, independent of its execution environment. */
export function* searchSteps(
  dataset: StockDataset,
  points: readonly Point[],
  period: Period,
  mode: SearchMode = 'quick',
): Generator<SearchProgress, SearchResult> {
  const started = performance.now()
  if (![20, 60, 120].includes(period)) throw new Error('Choose a supported period.')
  const policy = searchPolicy(mode),
    baselinePolicy = searchPolicy('quick')
  const query = normalize(sample(points)),
    isFlat = query.every((v) => v === 0.5)
  const pool = new CandidatePool(policy.shortlistSize)
  const sampleWindow = createWindowSampler(period)
  const baseline = policy.retainBaseline ? new CandidatePool(baselinePolicy.shortlistSize) : null
  let windows = 0,
    attempted = 0
  for (const [stockIndex, stock] of dataset.stocks.entries()) {
    for (const start of windowStarts(stock.close.length, period, policy.stride)) {
      if (++attempted % 2048 === 0)
        yield { completedStocks: stockIndex, totalStocks: dataset.stocks.length, windows }
      const shape = sampleWindow(stock, start)
      if (!shape) continue
      windows++
      if (isFlat !== shape.every((v) => v === 0.5)) continue
      const candidate = { stock, start, shape, directDistance: directDistance(query, shape) }
      pool.add(candidate)
      if (
        baseline &&
        (start % baselinePolicy.stride === 0 || start === stock.close.length - period)
      )
        baseline.add(candidate)
    }
    yield { completedStocks: stockIndex + 1, totalStocks: dataset.stocks.length, windows }
  }
  const candidates = new Map<string, Candidate>()
  for (const c of [...pool.finalists(), ...(baseline?.finalists() ?? [])])
    candidates.set(c.stock.ticker + ':' + c.start, c)
  const ranked: (Candidate & { distance: number })[] = []
  for (const c of candidates.values()) {
    ranked.push({ ...c, distance: dtw(query, c.shape) })
    if (ranked.length % 100 === 0)
      yield { completedStocks: dataset.stocks.length, totalStocks: dataset.stocks.length, windows }
  }
  return {
    mode,
    matches: selectMatches(dataset, ranked, period),
    windows,
    candidatesRanked: ranked.length,
    elapsedMs: performance.now() - started,
  }
}

/** Synchronous entry point for unit tests and CPU benchmarks; the worker uses the yielding runner. */
export function search(
  dataset: StockDataset,
  points: readonly Point[],
  period: Period,
  mode: SearchMode = 'quick',
): SearchResult {
  const steps = searchSteps(dataset, points, period, mode)
  let step = steps.next()
  while (!step.done) step = steps.next()
  return step.value
}
