import { expect, it } from 'vitest'
import { runSearch } from '../app/lib/search/execution'
import { search } from '../app/lib/matching'
import type { SearchProgress, StockDataset } from '../shared/types'
const data: StockDataset = {
  version: 1,
  dates: Array.from({ length: 5000 }, (_, i) => String(i)),
  stocks: [
    {
      ticker: 'LONG',
      sessions: Array.from({ length: 5000 }, (_, i) => i),
      close: Array.from({ length: 5000 }, (_, i) => 100 + i),
    },
  ],
}
const points = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]
it('yields within a long single-stock history, reports monotonic progress and matches the synchronous engine', async () => {
  const progress: SearchProgress[] = []
  let yields = 0
  const result = await runSearch(data, points, 20, 'deep', {
    onProgress: (p) => progress.push(p),
    yieldControl: async () => {
      yields++
    },
    timeBudgetMs: 0,
  })
  expect(yields).toBeGreaterThan(2)
  expect(progress.some((p) => p.completedStocks === 0 && p.windows > 0)).toBe(true)
  expect(progress[0]).toMatchObject({ completedStocks: 0, totalStocks: 1, windows: 0 })
  expect(progress.at(-1)).toMatchObject({ completedStocks: 1, windows: 4981 })
  expect(progress.every((p, i) => !i || p.windows >= progress[i - 1]!.windows)).toBe(true)
  expect(result.matches).toEqual(search(data, points, 20, 'deep').matches)
})
it('cancels after scanning part of a single stock, before scoring or returning results', async () => {
  const controller = new AbortController()
  const progress: SearchProgress[] = []
  let yields = 0
  await expect(
    runSearch(data, points, 20, 'deep', {
      signal: controller.signal,
      timeBudgetMs: 0,
      onProgress: (p) => progress.push(p),
      yieldControl: async () => {
        if (++yields === 2) {
          expect(progress.at(-1)?.completedStocks).toBe(0)
          expect(progress.at(-1)!.windows).toBeGreaterThan(0)
          controller.abort()
        }
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(progress.at(-1)!.windows).toBeLessThan(4981)
})
it('honors an already-aborted signal without progress or results', async () => {
  const signal = AbortSignal.abort()
  const progress: SearchProgress[] = []
  await expect(
    runSearch(data, points, 20, 'deep', { signal, onProgress: (p) => progress.push(p) }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(progress).toEqual([])
})
