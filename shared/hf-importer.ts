import type { StockDataset } from './types'
import { parseStockCsv } from './importer'
import { validCandle } from './candles'

export interface HfFile {
  ticker: string
  rows: Record<string, unknown>[]
}

export function buildHfDataset(
  files: readonly HfFile[],
  through = '2026-09-24',
): { dataset: StockDataset; excluded: number } {
  const csv = ['date,open,high,low,close,ticker']
  let excluded = 0
  for (const file of files) {
    if (!/^[A-Z]{1,5}$/.test(file.ticker) || !Array.isArray(file.rows))
      throw new Error('Invalid HF ticker or rows.')
    let eligible = 0
    for (const row of file.rows) {
      if (typeof row.source !== 'string')
        throw new Error(`${file.ticker}: missing source provenance.`)
      const date = row.date
      if (
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        throw new Error(`${file.ticker}: invalid date.`)
      if (row.source !== 'iex' || date < '2022-03-07' || date > through) {
        excluded++
        continue
      }
      const { open, high, low, close } = row
      if (
        typeof open !== 'number' ||
        typeof high !== 'number' ||
        typeof low !== 'number' ||
        typeof close !== 'number'
      )
        throw new Error(`${file.ticker} ${date}: invalid OHLC prices.`)
      const bar = { open, high, low, close }
      if (!validCandle(bar)) throw new Error(`${file.ticker} ${date}: invalid OHLC prices.`)
      csv.push([date, bar.open, bar.high, bar.low, bar.close, file.ticker].join(','))
      eligible++
    }
    if (!eligible) throw new Error(`${file.ticker}: no eligible IEX history.`)
  }
  return { dataset: parseStockCsv(csv.join('\n')), excluded }
}
