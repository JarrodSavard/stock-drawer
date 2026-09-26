import type { Point } from '../../shared/types'

export function normalize(values: readonly number[]): number[] {
  if (!values.length || values.some((v) => !Number.isFinite(v)))
    throw new Error('Invalid shape values.')
  let min = Infinity,
    max = -Infinity
  for (const v of values) {
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  const span = max - min
  return span < 1e-10 ? values.map(() => 0.5) : values.map((v) => (v - min) / span)
}

export function sample(points: readonly Point[], count = 64): number[] {
  if (points.length < 2 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    throw new Error('Draw a line across the canvas.')
  const first = points[0]!,
    last = points[points.length - 1]!
  if (last.x - first.x < 0.5)
    throw new Error('Draw across at least half of the canvas, from left to right.')
  for (let i = 1; i < points.length; i++)
    if (points[i]!.x <= points[i - 1]!.x) throw new Error('Draw from left to right.')
  let segment = 1
  return Array.from({ length: count }, (_, i) => {
    const x = first.x + (i / (count - 1)) * (last.x - first.x)
    while (segment < points.length - 1 && points[segment]!.x < x) segment++
    const left = points[segment - 1]!,
      right = points[segment]!
    return (left.y * (right.x - x) + right.y * (x - left.x)) / (right.x - left.x)
  })
}
