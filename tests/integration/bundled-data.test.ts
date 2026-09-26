import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validateDataset } from '../../shared/importer'
import { search } from '../../app/lib/matching'
import manifest from '../../public/data/source.json' with { type: 'json' }

describe('published historical snapshot', () => {
  const bytes = readFileSync('public/data/history.json')
  const raw = JSON.parse(bytes.toString())
  const data = validateDataset(raw)
  it('matches the provenance manifest and contains only dates inside the approved source period', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.sha256)
    expect(bytes.length).toBe(manifest.bytes)
    expect(data.stocks.length).toBe(manifest.stocks)
    expect(data.stocks.reduce((n, s) => n + s.close.length, 0)).toBe(manifest.observations)
    expect(data.dates[0]! >= '2022-03-07').toBe(true)
    expect(data.dates.at(-1)! <= manifest.through).toBe(true)
    expect(raw.attribution.upstreamTerms).toBe('https://www.iex.io/legal/hist-data-terms')
    expect(data.stocks.every((s) => s.ohlc?.every(Boolean))).toBe(true)
  })
  it.each([20, 60, 120] as const)(
    'provides five distinct replayable %i-session stock matches',
    (period) => {
      const result = search(
        data,
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        period,
      )
      expect(result.matches).toHaveLength(5)
      expect(new Set(result.matches.map((m) => m.ticker)).size).toBe(5)
      for (const match of result.matches) {
        expect(match.prices).toHaveLength(period)
        expect(match.dates).toHaveLength(period)
        const stock = data.stocks.find((s) => s.ticker === match.ticker)!
        const start = stock.sessions.indexOf(data.dates.indexOf(match.dates[0]!))
        expect(match.prices).toEqual(stock.close.slice(start, start + period))
      }
    },
  )
})
