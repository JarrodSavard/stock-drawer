import type { OhlcBar, StockSeries } from './types'

export function validCandle(bar: OhlcBar): boolean {
  return (
    !!bar &&
    [bar.open, bar.high, bar.low, bar.close].every((v) => Number.isFinite(v) && v > 0) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close)
  )
}

/** Seed from available history, restarting at missing candles or observed-session gaps. */
export function heikinAshi(stock: StockSeries, end: number): (OhlcBar | null)[] | undefined {
  if (!stock.ohlc) return undefined
  let previous: OhlcBar | null = null
  return stock.ohlc.slice(0, end).map((bar, i) => {
    if (!bar) {
      previous = null
      return null
    }
    if (i && stock.sessions[i]! - stock.sessions[i - 1]! !== 1) previous = null
    const open = previous ? (previous.open + previous.close) / 2 : (bar.open + bar.close) / 2
    const close = (bar.open + bar.high + bar.low + bar.close) / 4
    previous = {
      open,
      close,
      high: Math.max(bar.high, open, close),
      low: Math.min(bar.low, open, close),
    }
    return previous
  })
}
