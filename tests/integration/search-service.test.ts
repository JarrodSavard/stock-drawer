import { describe, expect, it } from 'vitest'
import { createSearchService } from '../../app/workers/search-service'
import { runSearch } from '../../app/lib/search/execution'
import { parseStockCsv } from '../../shared/importer'
import type { StockDataset, WorkerResponse } from '../../shared/types'

const csv =
  'date,open,high,low,close,Name\n' +
  Array.from({ length: 26 }, (_, i) => {
    const close = [90, 80, ...Array.from({ length: 20 }, (_, j) => 10 + j), 4, 3, 2, 1][i]!
    return `2018-01-${String(i + 1).padStart(2, '0')},${close},${close + 1},${close - 0.5},${close},AAA`
  }).join('\n')
const points = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]
const request = (id: number) => ({
  type: 'search' as const,
  id,
  points,
  period: 20 as const,
  mode: 'deep' as const,
})
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
function setup(loadDataset = async () => parseStockCsv(csv)) {
  const messages: WorkerResponse[] = []
  const service = createSearchService({ loadDataset, publish: (message) => messages.push(message) })
  return { messages, service }
}

describe('worker application integration', () => {
  it('imports CSV, reports progress and returns aligned real observations through the search contract', async () => {
    const { service, messages } = setup()
    await service.handle({ type: 'import', id: 1, csv })
    await service.handle(request(2))
    expect(messages[0]).toMatchObject({ type: 'ready', id: 1, stocks: 1, observations: 26 })
    expect(messages).toContainEqual(expect.objectContaining({ type: 'progress', id: 2 }))
    const response = messages.find((m) => m.type === 'result')!
    expect(response).toMatchObject({
      type: 'result',
      id: 2,
      result: {
        mode: 'deep',
        windows: 7,
        matches: [
          {
            ticker: 'AAA',
            dates: expect.arrayContaining(['2018-01-03']),
            prices: Array.from({ length: 20 }, (_, i) => 10 + i),
          },
        ],
      },
    })
    if (response.type !== 'result') throw new Error('Missing result')
    expect(response.result.matches[0]?.ohlc?.[0]?.close).toBe(10)
    expect(response.result.matches[0]?.heikinAshi).toHaveLength(20)
  })
  it('turns invalid input and unavailable data into recoverable errors', async () => {
    const { service, messages } = setup()
    await service.handle(request(1))
    expect(messages.at(-1)).toMatchObject({ type: 'error', id: 1 })
    await service.handle({ type: 'import', id: 2, csv: 'date,close,Name\n2018-01-01,NaN,AAA' })
    expect(messages.at(-1)).toMatchObject({ type: 'error', id: 2 })
    await service.handle({ type: 'import', id: 3, csv })
    await service.handle(request(4))
    expect(messages.at(-1)).toMatchObject({ type: 'result', id: 4 })
  })
  it.each(['resolve', 'reject'] as const)(
    'ignores a superseded load that later %ss',
    async (outcome) => {
      const old = deferred<StockDataset>()
      let calls = 0
      const { service, messages } = setup(() =>
        ++calls === 1 ? old.promise : Promise.resolve(parseStockCsv(csv)),
      )
      const pending = service.handle({ type: 'load', id: 1, url: '/old' })
      await service.handle({ type: 'load', id: 2, url: '/new' })
      if (outcome === 'resolve') old.resolve(parseStockCsv(csv.replaceAll('AAA', 'STALE')))
      else old.reject(new Error('Old network failure'))
      await pending
      await service.handle(request(3))
      expect(messages.filter((m) => m.id === 1)).toEqual([])
      expect(messages.at(-1)).toMatchObject({
        type: 'result',
        id: 3,
        result: { matches: [{ ticker: 'AAA' }] },
      })
    },
  )
  it('cancels work during a scheduler yield without publishing a result or error', async () => {
    const gate = deferred<void>(),
      started = deferred<void>()
    const messages: WorkerResponse[] = []
    const service = createSearchService({
      loadDataset: async () => parseStockCsv(csv),
      publish: (m) => messages.push(m),
      search: (data, p, period, mode, execution) =>
        runSearch(data, p, period, mode, {
          ...execution,
          yieldControl: () => {
            started.resolve()
            return gate.promise
          },
        }),
    })
    await service.handle({ type: 'import', id: 1, csv })
    const pending = service.handle(request(2))
    await started.promise
    await service.handle({ type: 'cancel', id: 2 })
    const count = messages.length
    gate.resolve()
    await pending
    expect(messages.slice(count)).toEqual([])
    expect(messages.some((m) => m.type === 'result' && m.id === 2)).toBe(false)
  })
  it('new searches and new data replace in-flight work without stale replies', async () => {
    const gates = [deferred<void>(), deferred<void>()],
      started = [deferred<void>(), deferred<void>()]
    let runs = 0
    const messages: WorkerResponse[] = []
    const service = createSearchService({
      loadDataset: async () => parseStockCsv(csv),
      publish: (m) => messages.push(m),
      search: (data, p, period, mode, execution) => {
        const index = runs++
        return runSearch(data, p, period, mode, {
          ...execution,
          yieldControl: () => {
            started[index]?.resolve()
            return gates[index]?.promise ?? Promise.resolve()
          },
        })
      },
    })
    await service.handle({ type: 'import', id: 1, csv })
    const first = service.handle(request(2))
    await started[0]!.promise
    const second = service.handle(request(3))
    await started[1]!.promise
    await service.handle({ type: 'import', id: 4, csv: csv.replaceAll('AAA', 'NEW') })
    gates.forEach((g) => g.resolve())
    await Promise.all([first, second])
    await service.handle(request(5))
    expect(messages.filter((m) => m.type === 'result').map((m) => m.id)).toEqual([5])
    expect(messages.at(-1)).toMatchObject({
      type: 'result',
      id: 5,
      result: { matches: [{ ticker: 'NEW' }] },
    })
  })
})
