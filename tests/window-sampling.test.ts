import { expect, it } from 'vitest'
import { createWindowSampler } from '../app/lib/search/windows'

it('reuses a period-specific sampler without leaking values between stocks or windows', () => {
  const sample = createWindowSampler(20)
  const stock = {
    ticker: 'UP',
    sessions: Array.from({ length: 21 }, (_, i) => i),
    close: Array.from({ length: 21 }, (_, i) => 10 + i),
  }
  const first = sample(stock, 0)!
  const last = sample(stock, 1)!
  const down = sample({ ...stock, close: [...stock.close].reverse() }, 0)!
  expect(first).toHaveLength(64)
  expect(first[0]).toBe(0)
  expect(first[32]).toBeCloseTo(32 / 63, 12)
  expect(first[63]).toBe(1)
  expect(last[32]).toBeCloseTo(32 / 63, 12)
  expect(down[32]).toBeCloseTo(31 / 63, 12)
  expect(first[0]).toBe(0)
  expect(
    sample({ ...stock, sessions: stock.sessions.map((s, i) => (i < 10 ? s : s + 1)) }, 0),
  ).toBeNull()
})
