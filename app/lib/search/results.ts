import type { Match, Period, StockDataset } from '../../../shared/types'
import { heikinAshi } from '../../../shared/candles'
import type { Candidate } from './candidates'
export function selectMatches(
  dataset: StockDataset,
  ranked: (Candidate & { distance: number })[],
  period: Period,
): Match[] {
  const seen = new Set<string>()
  const matches: Match[] = []
  ranked.sort(
    (a, b) =>
      a.distance - b.distance || a.stock.ticker.localeCompare(b.stock.ticker) || a.start - b.start,
  )
  for (const c of ranked) {
    if (seen.has(c.stock.ticker)) continue
    seen.add(c.stock.ticker)
    matches.push({
      ticker: c.stock.ticker,
      distance: c.distance,
      shape: c.shape,
      dates: c.stock.sessions.slice(c.start, c.start + period).map((s) => dataset.dates[s]!),
      prices: c.stock.close.slice(c.start, c.start + period),
      ...(c.stock.ohlc
        ? {
            ohlc: c.stock.ohlc.slice(c.start, c.start + period),
            heikinAshi: heikinAshi(c.stock, c.start + period)!.slice(c.start),
          }
        : {}),
    })
    if (matches.length === 5) break
  }
  return matches
}
