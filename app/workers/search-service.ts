import { parseStockCsv } from '../../shared/importer'
import type { StockDataset, WorkerRequest, WorkerResponse } from '../../shared/types'
import { runSearch, type SearchRunner } from '../lib/search/execution'

interface SearchServiceDependencies {
  loadDataset: (url: string, signal: AbortSignal) => Promise<StockDataset>
  publish: (message: WorkerResponse) => void
  search?: SearchRunner
}
interface Operation {
  id: number
  controller: AbortController
}

/** Owns request lifetimes; HTTP, worker transport, and computation are separate dependencies. */
export function createSearchService({
  loadDataset,
  publish,
  search = runSearch,
}: SearchServiceDependencies) {
  let dataset: StockDataset | undefined
  let activeLoad: Operation | undefined, activeSearch: Operation | undefined
  const reportError = (id: number, error: unknown) =>
    publish({
      type: 'error',
      id,
      message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
    })

  async function handle(request: WorkerRequest): Promise<void> {
    if (request.type === 'cancel') {
      if (activeSearch?.id === request.id) {
        activeSearch.controller.abort()
        activeSearch = undefined
      }
      return
    }
    activeSearch?.controller.abort()
    activeSearch = undefined
    if (request.type === 'search') {
      if (!dataset) {
        reportError(request.id, new Error('Load historical prices before searching.'))
        return
      }
      const operation = { id: request.id, controller: new AbortController() }
      activeSearch = operation
      const current = () => activeSearch === operation && !operation.controller.signal.aborted
      try {
        const result = await search(dataset, request.points, request.period, request.mode, {
          signal: operation.controller.signal,
          onProgress: (progress) => {
            if (current()) publish({ type: 'progress', id: request.id, progress })
          },
        })
        if (current()) publish({ type: 'result', id: request.id, result })
      } catch (error) {
        if (current()) reportError(request.id, error)
      } finally {
        if (activeSearch === operation) activeSearch = undefined
      }
      return
    }

    activeLoad?.controller.abort()
    const operation = { id: request.id, controller: new AbortController() }
    activeLoad = operation
    dataset = undefined
    try {
      const next =
        request.type === 'import'
          ? parseStockCsv(request.csv)
          : await loadDataset(request.url, operation.controller.signal)
      if (activeLoad !== operation || operation.controller.signal.aborted) return
      dataset = next
      publish({
        type: 'ready',
        id: request.id,
        stocks: next.stocks.length,
        from: next.dates[0]!,
        to: next.dates.at(-1)!,
        observations: next.stocks.reduce((n, s) => n + s.close.length, 0),
      })
    } catch (error) {
      if (activeLoad === operation && !operation.controller.signal.aborted)
        reportError(request.id, error)
    } finally {
      if (activeLoad === operation) activeLoad = undefined
    }
  }
  return { handle }
}
