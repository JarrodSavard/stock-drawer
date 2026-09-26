import type { StockSeries } from '../../../shared/types'
export interface Candidate {
  stock: StockSeries
  start: number
  shape: number[]
  directDistance: number
}
/** Bounded direct-distance shortlist with enough stock diversity for five results. */
export class CandidatePool {
  private readonly candidates: Candidate[] = []
  private readonly bestByStock = new Map<string, Candidate>()
  constructor(private readonly capacity: number) {}
  add(candidate: Candidate) {
    const best = this.bestByStock.get(candidate.stock.ticker)
    if (!best || candidate.directDistance < best.directDistance)
      this.bestByStock.set(candidate.stock.ticker, candidate)
    const list = this.candidates
    if (list.length === this.capacity && candidate.directDistance >= list.at(-1)!.directDistance)
      return
    let lo = 0,
      hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (list[mid]!.directDistance <= candidate.directDistance) lo = mid + 1
      else hi = mid
    }
    list.splice(lo, 0, candidate)
    if (list.length > this.capacity) list.pop()
  }
  finalists(): Candidate[] {
    const list = [...this.candidates]
    const counts = new Map<string, number>()
    for (const c of list) counts.set(c.stock.ticker, (counts.get(c.stock.ticker) ?? 0) + 1)
    for (const c of [...this.bestByStock.values()].sort(
      (a, b) => a.directDistance - b.directDistance,
    )) {
      if (counts.size >= 5) break
      if (counts.has(c.stock.ticker)) continue
      if (list.length === this.capacity) {
        const remove = list.findLastIndex((item) => counts.get(item.stock.ticker)! > 1)
        const old = list.splice(remove, 1)[0]!
        counts.set(old.stock.ticker, counts.get(old.stock.ticker)! - 1)
      }
      list.push(c)
      counts.set(c.stock.ticker, 1)
    }
    return list
  }
}
