export type Period = 20 | 60 | 120
export type SearchMode = 'quick' | 'deep'
export type Point = Readonly<{ x: number; y: number }>
export type Snapshot = Readonly<{ points: readonly Point[]; image: string; period: Period }>
export interface OhlcBar {
  open: number
  high: number
  low: number
  close: number
}
export interface StockSeries {
  ticker: string
  sessions: number[]
  close: number[]
  ohlc?: (OhlcBar | null)[]
}
export interface StockDataset {
  version: 1
  dates: string[]
  stocks: StockSeries[]
}
export interface Match {
  ticker: string
  dates: string[]
  prices: number[]
  ohlc?: (OhlcBar | null)[]
  heikinAshi?: (OhlcBar | null)[]
  distance: number
  shape: number[]
}
export interface SearchResult {
  mode: SearchMode
  candidatesRanked: number
  matches: Match[]
  windows: number
  elapsedMs: number
}
export interface SearchProgress {
  completedStocks: number
  totalStocks: number
  windows: number
}
export type WorkerRequest =
  | { type: 'load'; id: number; url: string }
  | { type: 'import'; id: number; csv: string }
  | { type: 'search'; id: number; points: readonly Point[]; period: Period; mode: SearchMode }
  | { type: 'cancel'; id: number }
export type WorkerResponse =
  | { type: 'ready'; id: number; stocks: number; from: string; to: string; observations: number }
  | { type: 'result'; id: number; result: SearchResult }
  | { type: 'progress'; id: number; progress: SearchProgress }
  | { type: 'error'; id: number; message: string }
