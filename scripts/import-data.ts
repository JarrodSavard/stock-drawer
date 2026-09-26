import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { parseStockCsv } from '../shared/importer'

const input = process.argv[2]
if (!input)
  throw new Error('Usage: npm run data:import -- path/to/stocks.csv. Output remains local-only.')
if (process.argv.includes('--publish'))
  throw new Error(
    'Publication is blocked: upstream redistribution rights are unresolved. See docs/data-provenance.md.',
  )
const raw = await readFile(resolve(input), 'utf8')
const data = parseStockCsv(raw)
await mkdir('.local-data', { recursive: true })
await writeFile('.local-data/stocks.json', JSON.stringify(data))
const manifest = {
  schemaVersion: 1,
  access: 'local-only',
  sourceFile: input,
  sha256: createHash('sha256').update(raw).digest('hex'),
  from: data.dates[0],
  to: data.dates.at(-1),
  tickers: data.stocks.length,
  observations: data.stocks.reduce((n, s) => n + s.close.length, 0),
  candleObservations: data.stocks.reduce((n, s) => n + (s.ohlc?.filter(Boolean).length ?? 0), 0),
  unavailableCandles: data.stocks.reduce(
    (n, s) => n + (s.ohlc?.filter((b) => b === null).length ?? s.close.length),
    0,
  ),
  candles:
    'OHLC retained as supplied when positive and internally consistent. Missing or invalid candles are null; closing-price matching remains available.',
  prices: 'Closing prices as supplied. Adjustment status unverified. USD for the Kaggle dataset.',
  calendar:
    'Union of observed dates; per-stock missing sessions break candidate windows. Globally absent sessions cannot be inferred.',
}
await writeFile('.local-data/manifest.json', JSON.stringify(manifest, null, 2))
console.log(JSON.stringify(manifest, null, 2))
