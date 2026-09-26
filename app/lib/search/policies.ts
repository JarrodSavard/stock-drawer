import type { SearchMode } from '../../../shared/types'
interface SearchPolicy {
  readonly stride: number
  readonly shortlistSize: number
  readonly retainBaseline: boolean
}
const policies: Readonly<Record<SearchMode, SearchPolicy>> = {
  quick: { stride: 5, shortlistSize: 200, retainBaseline: false },
  deep: { stride: 1, shortlistSize: 1000, retainBaseline: true },
}
export function searchPolicy(mode: SearchMode): SearchPolicy {
  if (!Object.hasOwn(policies, mode)) throw new Error('Choose a supported search mode.')
  return policies[mode]
}
