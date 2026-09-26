import { describe, it, expect } from 'vitest'
import { normalize, sample, dtw, search } from '../app/lib/matching'
import type { StockDataset } from '../shared/types'

describe('shape processing', () => {
  it('removes price scale and offset without reversing direction', () => {
    expect(normalize([100, 150, 200])).toEqual([0, 0.5, 1])
    expect(normalize([9, 6, 3])).toEqual([1, 0.5, 0])
  })
  it('keeps flat lines finite', () => {
    expect(normalize([7, 7, 7])).toEqual([0.5, 0.5, 0.5])
  })
  it('interpolates by horizontal position, not drawing speed', () => {
    expect(
      sample(
        [
          { x: 0, y: 0 },
          { x: 0.25, y: 1 },
          { x: 1, y: 0 },
        ],
        5,
      ),
    ).toEqual([0, 1, 2 / 3, 1 / 3, 0])
  })
  it('rejects incomplete and non-finite sketches', () => {
    expect(() =>
      sample([
        { x: 0.1, y: 0.3 },
        { x: 0.2, y: 0.5 },
      ]),
    ).toThrow(/across/)
    expect(() =>
      sample([
        { x: 0, y: 0 },
        { x: 1, y: NaN },
      ]),
    ).toThrow()
  })
  it('allows nearby peaks but penalizes reversed time', () => {
    expect(dtw([0, 0, 1, 0, 0], [0, 1, 0, 0, 0])).toBe(0)
    expect(dtw([0, 0.2, 0.4, 0.8, 1], [1, 0.8, 0.4, 0.2, 0])).toBeGreaterThan(0.1)
  })
})

describe('historical search', () => {
  const dates = Array.from({ length: 42 }, (_, i) => `session-${i}`)
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
  const up = Array.from({ length: 42 }, (_, i) => 10 + i)
  const dataset: StockDataset = {
    version: 1,
    dates,
    stocks: [
      { ticker: 'UP', sessions: up.map((_, i) => i), close: up },
      { ticker: 'DOWN', sessions: up.map((_, i) => i), close: [...up].reverse() },
      { ticker: 'FLAT', sessions: up.map((_, i) => i), close: up.map(() => 12) },
    ],
  }
  it('ranks directionally similar stocks first with distinct tickers and real observations', () => {
    const result = search(dataset, points, 20)
    expect(result.matches[0]?.ticker).toBe('UP')
    expect(new Set(result.matches.map((m) => m.ticker)).size).toBe(result.matches.length)
    expect(result.matches[0]?.prices).toHaveLength(20)
    expect(result.matches[0]?.dates[0]).toBe('session-0')
    expect(result.matches[0]?.prices[0]).toBe(10)
    expect(result.windows).toBe(18)
  })
  it('excludes windows crossing missing sessions and incomplete histories', () => {
    const broken: StockDataset = {
      version: 1,
      dates,
      stocks: [
        {
          ticker: 'GAP',
          sessions: [
            ...Array.from({ length: 10 }, (_, i) => i),
            ...Array.from({ length: 10 }, (_, i) => i + 11),
          ],
          close: up.slice(0, 20),
        },
        { ticker: 'SHORT', sessions: [0, 1], close: [10, 11] },
      ],
    }
    expect(search(broken, points, 20).matches).toEqual([])
  })
  it('includes the final window when its start is not divisible by five', () => {
    const result = search(
      {
        version: 1,
        dates,
        stocks: [
          {
            ticker: 'LAST',
            sessions: Array.from({ length: 22 }, (_, i) => i),
            close: [90, 70, ...Array.from({ length: 20 }, (_, i) => i + 1)],
          },
        ],
      },
      points,
      20,
    )
    expect(result.matches[0]?.dates[0]).toBe('session-2')
  })
  it('does not return non-flat charts as flat matches', () => {
    const result = search(
      dataset,
      [
        { x: 0, y: 0.4 },
        { x: 1, y: 0.4 },
      ],
      20,
    )
    expect(result.matches.map((m) => m.ticker)).toEqual(['FLAT'])
  })
  it('retains five distinct stocks when one stock has hundreds of closer windows', () => {
    const many: StockDataset = {
      version: 1,
      dates: Array.from({ length: 1200 }, (_, i) => `session-${i}`),
      stocks: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].map((ticker, s) => ({
        ticker,
        sessions: Array.from({ length: 1200 }, (_, i) => i),
        close: Array.from({ length: 1200 }, (_, i) => 100 + i + s * Math.sin(i)),
      })),
    }
    expect(search(many, points, 20).matches).toHaveLength(5)
  })
})
