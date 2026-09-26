import type { StockSeries } from '../../../shared/types'
import { normalize } from '../shape'
export function* windowStarts(length: number, period: number, stride: number) {
  const final = length - period
  if (final < 0) return
  for (let start = 0; start <= final; start += stride) yield start
  if (final % stride !== 0) yield final
}
export function createWindowSampler(period: number) {
  // Interpolation positions are identical for every window of this period.
  const positions = Array.from({ length: 64 }, (_, i) => {
    const position = (i / 63) * (period - 1),
      lo = Math.floor(position)
    return { lo, hi: Math.ceil(position), weight: position - lo }
  })
  return (stock: StockSeries, start: number): number[] | null => {
    // Strictly increasing session IDs make this endpoint check sufficient for internal gaps.
    if (stock.sessions[start + period - 1]! - stock.sessions[start]! !== period - 1) return null
    const values = new Array<number>(64)
    for (let i = 0; i < 64; i++) {
      const { lo, hi, weight } = positions[i]!
      values[i] = stock.close[start + lo]! * (1 - weight) + stock.close[start + hi]! * weight
    }
    return normalize(values)
  }
}
