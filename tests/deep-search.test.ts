import { describe, expect, it } from 'vitest'
import { search } from '../app/lib/matching'
import type { Point, StockDataset } from '../shared/types'

const rise: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]
const stock = (close: number[]): StockDataset => ({
  version: 1,
  dates: close.map((_, i) => `session-${i}`),
  stocks: [{ ticker: 'FOUND', sessions: close.map((_, i) => i), close }],
})

describe('search depth', () => {
  it('retains a Quick DTW winner when five denser decoys crowd it out by direct distance', () => {
    const wave = (i: number) =>
      Math.sin((i * 2 * Math.PI) / 5) + 0.3 * Math.sin((i * 4 * Math.PI) / 5)
    const query = Array.from({ length: 20 }, (_, i) => 100 + 10 * wave(i))
    const points = query.map((y, i) => ({ x: i / 19, y }))
    const decoy = Array.from(
      { length: 1500 },
      (_, i) => 100 + 10 * (wave(i + 2) + 0.5 * Math.cos(((i + 2) * 6 * Math.PI) / 5)),
    )
    const winner = query.map((_, i) => query[Math.min(19, i + 1)]!)
    winner[0] = query[0]!
    const data: StockDataset = {
      version: 1,
      dates: decoy.map((_, i) => String(i)),
      stocks: [
        ...Array.from({ length: 5 }, (_, s) => ({
          ticker: `DECOY${s}`,
          sessions: decoy.map((_, i) => i),
          close: decoy,
        })),
        { ticker: 'WINNER', sessions: winner.map((_, i) => i), close: winner },
      ],
    }
    const quick = search(data, points, 20, 'quick')
    const deep = search(data, points, 20, 'deep')
    expect(quick.matches[0]?.ticker).toBe('WINNER')
    expect(deep.matches[0]?.ticker).toBe('WINNER')
    expect(deep.matches[0]?.distance).toBeCloseTo(0.073991173236563, 12)
    expect(deep.candidatesRanked).toBeGreaterThan(1000)
  })
  it('finds an exact match starting between Quick search dates', () => {
    const data = stock([90, 80, ...Array.from({ length: 20 }, (_, i) => 10 + i), 4, 3, 2, 1])
    const quick = search(data, rise, 20)
    const deep = search(data, rise, 20, 'deep')
    expect(quick.windows).toBe(3)
    expect(deep.windows).toBe(7)
    expect(deep.matches[0]?.dates[0]).toBe('session-2')
    expect(deep.matches[0]?.distance).toBeCloseTo(0, 12)
    expect(deep.matches[0]!.distance).toBeLessThan(quick.matches[0]!.distance)
    expect(deep.mode).toBe('deep')
  })

  it.each(['quick', 'deep'] as const)('excludes gaps and short histories in %s mode', (mode) => {
    const data = stock(Array.from({ length: 24 }, (_, i) => 10 + i))
    data.stocks[0]!.sessions = Array.from({ length: 24 }, (_, i) => (i < 12 ? i : i + 1))
    data.dates.push('session-24')
    data.stocks.push({ ticker: 'SHORT', sessions: [0], close: [10] })
    expect(search(data, rise, 20, mode).matches).toEqual([])
    expect(search(data, rise, 20, mode).windows).toBe(0)
  })

  it('retains flat handling and all final windows in Deep mode', () => {
    const data = stock([90, 80, ...Array(20).fill(10)])
    const result = search(
      data,
      [
        { x: 0, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
      20,
      'deep',
    )
    expect(result.windows).toBe(3)
    expect(result.matches[0]?.dates[0]).toBe('session-2')
    expect(result.matches[0]?.distance).toBe(0)
  })

  it('rejects an unsupported mode instead of silently running a different search', () => {
    expect(() => search(stock(Array(20).fill(10)), rise, 20, 'unknown' as never)).toThrow(/mode/i)
  })

  it('reranks more candidates and never loses the baseline quality or distinct stocks', () => {
    const data: StockDataset = {
      version: 1,
      dates: Array.from({ length: 500 }, (_, i) => `session-${i}`),
      stocks: [],
    }
    data.stocks = Array.from({ length: 7 }, (_, s) => ({
      ticker: `STOCK${s}`,
      sessions: data.dates.map((_, i) => i),
      close: data.dates.map((_, i) => 100 + i / 10 + 10 * Math.sin(i / (8 + s))),
    }))
    for (const points of [
      rise,
      [
        { x: 0, y: 0.8 },
        { x: 0.5, y: 0.1 },
        { x: 1, y: 0.9 },
      ],
    ]) {
      const quick = search(data, points, 60, 'quick')
      const deep = search(data, points, 60, 'deep')
      expect(deep.candidatesRanked).toBeGreaterThan(quick.candidatesRanked)
      expect(deep.candidatesRanked).toBeLessThanOrEqual(1200)
      expect(new Set(deep.matches.map((m) => m.ticker)).size).toBe(5)
      for (let i = 0; i < 5; i++)
        expect(deep.matches[i]!.distance).toBeLessThanOrEqual(quick.matches[i]!.distance)
    }
  })
})
