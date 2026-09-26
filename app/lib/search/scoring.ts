/** Squared-error DTW; the fixed denominator keeps window distances comparable. */
export function dtw(a: readonly number[], b: readonly number[], band = 6): number {
  let previous = new Float64Array(b.length + 1).fill(Infinity)
  let current = new Float64Array(b.length + 1)
  previous[0] = 0
  for (let i = 1; i <= a.length; i++) {
    current.fill(Infinity)
    for (let j = Math.max(1, i - band); j <= Math.min(b.length, i + band); j++) {
      const cost = (a[i - 1]! - b[j - 1]!) ** 2
      current[j] = cost + Math.min(previous[j]!, current[j - 1]!, previous[j - 1]!)
    }
    ;[previous, current] = [current, previous]
  }
  return Math.sqrt(previous[b.length]! / Math.max(a.length, b.length))
}
export function directDistance(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2
  return sum
}
