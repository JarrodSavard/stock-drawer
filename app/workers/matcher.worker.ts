import { validateDataset } from '../../shared/importer'
import type { WorkerRequest } from '../../shared/types'
import { createSearchService } from './search-service'

const service = createSearchService({
  publish: (message) => self.postMessage(message),
  loadDataset: async (url, signal) => {
    const response = await fetch(url, { signal })
    if (!response.ok)
      throw new Error('The historical dataset could not load. Retry, or choose a stock CSV.')
    return validateDataset(await response.json())
  },
})
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void service.handle(event.data)
}
