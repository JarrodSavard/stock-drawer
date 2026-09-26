import type {
  Period,
  Point,
  SearchMode,
  SearchProgress,
  SearchResult,
  WorkerRequest,
  WorkerResponse,
} from '../../shared/types'

export function useStockSearch() {
  const meta = shallowRef<Extract<WorkerResponse, { type: 'ready' }> | null>(null)
  const result = shallowRef<SearchResult | null>(null)
  const progress = shallowRef<SearchProgress | null>(null)
  const loading = ref(true),
    searching = ref(false),
    error = ref(''),
    source = ref('Local historical dataset')
  let worker: Worker | undefined,
    sequence = 0,
    loadId = 0,
    searchId = 0
  let pendingSource = 'Local historical dataset'
  const config = useRuntimeConfig()
  function invalidate() {
    if (searching.value) post({ type: 'cancel', id: searchId })
    searchId = ++sequence
    searching.value = false
    result.value = null
    progress.value = null
  }
  function post(message: WorkerRequest) {
    worker?.postMessage(message)
  }
  function load() {
    if (!worker) return
    invalidate()
    error.value = ''
    loading.value = true
    meta.value = null
    loadId = ++sequence
    pendingSource = import.meta.dev ? 'Local historical dataset' : 'Bundled historical dataset'
    const base = config.app.baseURL
    const url = import.meta.dev ? `${base}api/local-data` : `${base}data/stocks.json`
    post({ type: 'load', id: loadId, url })
  }
  function find(points: readonly Point[], period: Period, mode: SearchMode = 'quick') {
    if (!meta.value || !worker) return
    error.value = ''
    searching.value = true
    result.value = null
    progress.value = null
    searchId = ++sequence
    post({ type: 'search', id: searchId, points: points.map((p) => ({ ...p })), period, mode })
  }
  async function importFile(file: File) {
    if (!worker) {
      error.value = 'Your browser could not start the search worker. Reload to try again.'
      return
    }
    invalidate()
    error.value = ''
    meta.value = null
    loading.value = true
    const id = (loadId = ++sequence)
    if (file.size > 100_000_000) {
      error.value = 'Choose a CSV smaller than 100 MB.'
      loading.value = false
      return
    }
    try {
      const csv = await file.text()
      if (id !== loadId) return
      pendingSource = file.name
      post({ type: 'import', id, csv })
    } catch {
      if (id === loadId) {
        error.value = 'The file could not be read. Choose it again.'
        loading.value = false
      }
    }
  }
  onMounted(() => {
    try {
      worker = new Worker(new URL('../workers/matcher.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data
        if (message.type === 'ready' && message.id === loadId) {
          meta.value = message
          source.value = pendingSource
          loading.value = false
          error.value = ''
        }
        if (message.type === 'result' && message.id === searchId) {
          result.value = message.result
          searching.value = false
          progress.value = null
        }
        if (message.type === 'progress' && message.id === searchId && searching.value)
          progress.value = message.progress
        if (message.type === 'error' && (message.id === loadId || message.id === searchId)) {
          error.value = message.message
          if (message.id === loadId) loading.value = false
          if (message.id === searchId) {
            searching.value = false
            progress.value = null
          }
        }
      }
      worker.onerror = () => {
        loading.value = false
        searching.value = false
        meta.value = null
        error.value = 'The search worker stopped. Reload the page to try again.'
      }
      load()
    } catch {
      loading.value = false
      error.value = 'This browser cannot start the search worker. Try a current browser.'
    }
  })
  onBeforeUnmount(() => worker?.terminate())
  return {
    meta,
    result,
    loading,
    searching,
    progress,
    error,
    source,
    find,
    importFile,
    invalidate,
    load,
  }
}
