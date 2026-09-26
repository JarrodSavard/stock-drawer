import type { Point, Period, Snapshot } from '../../shared/types'
import { sample } from './shape'
export function captureSnapshot(points: readonly Point[], period: Period): Snapshot {
  sample(points)
  const copy = Object.freeze(points.map((p) => Object.freeze({ x: p.x, y: p.y })))
  const line = copy.map((p) => `${p.x * 100},${(1 - p.y) * 100}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 106 106" preserveAspectRatio="none"><polyline points="${line}" fill="none" stroke="#b14d32" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return Object.freeze({
    points: copy,
    image: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    period,
  })
}
export function appendPoint(points: readonly Point[], point: Point): Point[] {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return [...points]
  const next = { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) }
  if (points.length && next.x <= points[points.length - 1]!.x) return [...points]
  return [...points, next]
}
