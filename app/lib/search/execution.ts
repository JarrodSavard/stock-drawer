import type {
  StockDataset,
  Point,
  Period,
  SearchMode,
  SearchProgress,
  SearchResult,
} from '../../../shared/types'
import { searchSteps } from '../matching'

export interface SearchExecution {
  signal?: AbortSignal
  onProgress?: (progress: SearchProgress) => void
  yieldControl?: () => Promise<void>
  timeBudgetMs?: number
}
export type SearchRunner = (
  dataset: StockDataset,
  points: readonly Point[],
  period: Period,
  mode: SearchMode,
  execution: SearchExecution,
) => Promise<SearchResult>

/** Cooperative execution makes worker cancellation possible without copying the loaded dataset. */
export async function runSearch(
  dataset: StockDataset,
  points: readonly Point[],
  period: Period,
  mode: SearchMode,
  execution: SearchExecution = {},
): Promise<SearchResult> {
  const {
    signal,
    onProgress,
    yieldControl = () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    timeBudgetMs = 12,
  } = execution
  signal?.throwIfAborted()
  onProgress?.({ completedStocks: 0, totalStocks: dataset.stocks.length, windows: 0 })
  await yieldControl()
  signal?.throwIfAborted()
  const steps = searchSteps(dataset, points, period, mode)
  let lastYield = performance.now()
  try {
    while (true) {
      signal?.throwIfAborted()
      const step = steps.next()
      if (step.done) return step.value
      if (
        performance.now() - lastYield >= timeBudgetMs ||
        step.value.completedStocks === step.value.totalStocks
      ) {
        onProgress?.(step.value)
        await yieldControl()
        lastYield = performance.now()
      }
    }
  } finally {
    steps.return(undefined as never)
  }
}
