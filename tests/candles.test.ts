import { expect, it } from 'vitest'
import { search } from '../app/lib/matching'
import { parseStockCsv } from '../shared/importer'

it('returns original candles and recursively averaged Heikin-Ashi candles without changing ranking', () => {
  const csv =
    'date,open,high,low,close,Name\n' +
    Array.from(
      { length: 25 },
      (_, i) =>
        `2018-01-${String(i + 1).padStart(2, '0')},${10 + i},${14 + i},${9 + i},${12 + i},AAA`,
    ).join('\n')
  const dataset = parseStockCsv(csv)
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
  const match = search(dataset, points, 20).matches[0]!
  const closeOnly = search(
    { ...dataset, stocks: dataset.stocks.map(({ ohlc, ...s }) => s) },
    points,
    20,
  ).matches[0]!
  expect(match.distance).toBe(closeOnly.distance)
  expect(match.dates).toEqual(closeOnly.dates)
  expect(match.ohlc?.[0]).toEqual({ open: 10, high: 14, low: 9, close: 12 })
  expect(match.heikinAshi?.slice(0, 2)).toEqual([
    { open: 11, high: 14, low: 9, close: 11.25 },
    { open: 11.125, high: 15, low: 10, close: 12.25 },
  ])
})

it('seeds averaging from earlier history and resets after unavailable candles or missing sessions', () => {
  const dates = Array.from({ length: 22 }, (_, i) => `2018-01-${String(i + 1).padStart(2, '0')}`)
  const bar = { open: 10, high: 16, low: 8, close: 14 }
  const dataset = {
    version: 1 as const,
    dates,
    stocks: [
      {
        ticker: 'AAA',
        sessions: dates.map((_, i) => i),
        close: dates.map(() => 14),
        ohlc: dates.map(() => bar),
      },
    ],
  }
  // Only the final window is flat; the matching window starts after two observations.
  dataset.stocks[0]!.close[0] = 13
  dataset.stocks[0]!.close[1] = 13
  dataset.stocks[0]!.ohlc[0] = { open: 8, high: 16, low: 8, close: 13 }
  dataset.stocks[0]!.ohlc[1] = { open: 10, high: 16, low: 8, close: 13 }
  const points = [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
  ]
  expect(search(dataset, points, 20).matches[0]?.heikinAshi?.[0]?.open).toBe(11.3125)
  const missing = {
    ...dataset,
    stocks: [{ ...dataset.stocks[0]!, ohlc: [null, null, ...dataset.stocks[0]!.ohlc.slice(2)] }],
  }
  expect(search(missing, points, 20).matches[0]?.heikinAshi?.[0]?.open).toBe(12)
  const gap = {
    ...dataset,
    dates: [...dates, '2018-01-23'],
    stocks: [
      { ...dataset.stocks[0]!, sessions: [0, 1, ...Array.from({ length: 20 }, (_, i) => i + 3)] },
    ],
  }
  expect(search(gap, points, 20).matches[0]?.heikinAshi?.[0]?.open).toBe(12)
})
