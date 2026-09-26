import { it, expect } from 'vitest'
import { captureSnapshot, appendPoint } from '../app/lib/drawing'
it('snapshot owns immutable points and the image preserves the drawn geometry', () => {
  const points = [
    { x: 0, y: 0.2 },
    { x: 1, y: 0.8 },
  ]
  const snapshot = captureSnapshot(points, 60)
  points[0]!.y = 0.9
  expect(snapshot.points[0]!.y).toBe(0.2)
  expect(Object.isFrozen(snapshot.points)).toBe(true)
  expect(Object.isFrozen(snapshot.points[0])).toBe(true)
  expect(decodeURIComponent(snapshot.image)).toContain('0,80 100,19.999999999999996')
})
it('ignores backward and duplicate horizontal points, and clamps the canvas bounds', () => {
  const points = [
    { x: 0.2, y: 0.3 },
    { x: 0.5, y: 0.7 },
  ]
  expect(appendPoint(points, { x: 0.4, y: 0.9 })).toEqual(points)
  expect(appendPoint(points, { x: 0.5, y: 0.2 })).toEqual(points)
  expect(appendPoint(points, { x: 1.2, y: -1 }).at(-1)).toEqual({ x: 1, y: 0 })
})
