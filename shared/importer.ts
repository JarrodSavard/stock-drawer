import type { StockDataset, OhlcBar } from './types'
import { validCandle } from './candles'

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

function fields(line: string): string[] {
  const result: string[] = []
  let field = '',
    quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      result.push(field.trim())
      field = ''
    } else field += char
  }
  if (quoted) throw new Error('Unclosed CSV quote. Use one observation per line.')
  result.push(field.trim())
  return result
}

export function parseStockCsv(csv: string): StockDataset {
  if (csv.length > 100_000_000) throw new Error('CSV is too large. Choose a file under 100 MB.')
  const lines = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
  const headers = fields(lines.shift() ?? '').map((h) => h.toLowerCase())
  const dateColumn = headers.indexOf('date'),
    closeColumn = headers.indexOf('close')
  const tickerColumn = headers.findIndex((h) => ['name', 'ticker', 'symbol'].includes(h))
  if ([dateColumn, closeColumn, tickerColumn].includes(-1))
    throw new Error('CSV needs date, close, and Name (or ticker) columns.')
  const candleColumns = ['open', 'high', 'low'].map((h) => headers.indexOf(h))
  const hasCandles = candleColumns.every((i) => i !== -1)
  const series = new Map<
    string,
    Map<string, { close: number; candle: OhlcBar | null; signature: string }>
  >()
  const calendar = new Set<string>()
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]!.trim()) continue
    const row = fields(lines[i]!)
    if (row.length !== headers.length)
      throw new Error(`Row ${i + 2}: unexpected number of columns.`)
    const date = row[dateColumn]!,
      ticker = row[tickerColumn]!.toUpperCase(),
      close = Number(row[closeColumn])
    if (!validDate(date)) throw new Error(`Row ${i + 2}: invalid date. Use YYYY-MM-DD.`)
    if (!Number.isFinite(close) || close <= 0)
      throw new Error(`Row ${i + 2}: close must be a positive number.`)
    if (!/^[A-Z0-9.^=-]{1,20}$/.test(ticker)) throw new Error(`Row ${i + 2}: invalid ticker.`)
    const values = candleColumns.map((column) => row[column] ?? '')
    const bar = { open: Number(values[0]), high: Number(values[1]), low: Number(values[2]), close }
    const candle = hasCandles && validCandle(bar) ? bar : null
    // Preserve raw invalid values in duplicate checks, even when no candle can be rendered.
    const signature = JSON.stringify([
      close,
      ...values.map((v) => (v !== '' && Number.isFinite(Number(v)) ? Number(v) : v)),
    ])
    let stock = series.get(ticker)
    if (!stock) {
      stock = new Map()
      series.set(ticker, stock)
    }
    if (stock.has(date) && stock.get(date)!.signature !== signature)
      throw new Error(`Row ${i + 2}: conflicting duplicate for ${ticker} on ${date}.`)
    stock.set(date, { close, candle, signature })
    calendar.add(date)
  }
  if (!calendar.size) throw new Error('No price observations found in the CSV.')
  const dates = [...calendar].sort(),
    indices = new Map(dates.map((date, index) => [date, index]))
  const stocks = [...series.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticker, prices]) => {
      const sorted = [...prices.entries()].sort(([a], [b]) => a.localeCompare(b))
      return {
        ticker,
        sessions: sorted.map(([date]) => indices.get(date)!),
        close: sorted.map(([, price]) => price.close),
        ...(hasCandles ? { ohlc: sorted.map(([, price]) => price.candle) } : {}),
      }
    })
  return { version: 1, dates, stocks }
}

export function validateDataset(data: unknown): StockDataset {
  const d = data as StockDataset
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.dates) ||
    !d.dates.length ||
    !Array.isArray(d.stocks) ||
    !d.stocks.length
  )
    throw new Error('Invalid dataset format.')
  if (d.dates.some((v, i) => !validDate(v) || (i > 0 && v <= d.dates[i - 1]!)))
    throw new Error('Dataset dates must be valid, unique and sorted.')
  const tickers = new Set<string>()
  for (const stock of d.stocks) {
    if (
      !stock ||
      typeof stock.ticker !== 'string' ||
      tickers.has(stock.ticker) ||
      !Array.isArray(stock.sessions) ||
      !Array.isArray(stock.close) ||
      !stock.close.length ||
      stock.close.length !== stock.sessions.length
    )
      throw new Error('Invalid stock observations.')
    tickers.add(stock.ticker)
    if (
      stock.ohlc !== undefined &&
      (!Array.isArray(stock.ohlc) ||
        stock.ohlc.length !== stock.close.length ||
        stock.ohlc.some(
          (bar, i) => bar !== null && (!validCandle(bar) || bar.close !== stock.close[i]),
        ))
    )
      throw new Error('Invalid candle observations or alignment.')
    if (
      stock.close.some((v) => !Number.isFinite(v) || v <= 0) ||
      stock.sessions.some(
        (s, i) =>
          !Number.isInteger(s) ||
          s < 0 ||
          s >= d.dates.length ||
          (i > 0 && s <= stock.sessions[i - 1]!),
      )
    )
      throw new Error('Invalid prices or session order.')
  }
  return d
}
