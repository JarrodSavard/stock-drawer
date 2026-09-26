import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { buildHfDataset, type HfFile } from '../shared/hf-importer'

const settings = JSON.parse(await readFile('scripts/data/hf-universe.json', 'utf8')) as {
  through: string
  tickers: string[]
}
const files = await Promise.all(
  settings.tickers.map(async (ticker) => {
    const file = JSON.parse(await readFile(`.local-data/hf/${ticker}.json`, 'utf8')) as HfFile & {
      sha256: string
    }
    if (file.ticker !== ticker || !/^[a-f0-9]{64}$/.test(file.sha256))
      throw new Error(`Invalid cached file for ${ticker}`)
    const bytes = await readFile(`.local-data/hf/${ticker}.parquet`)
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
      throw new Error(`Source checksum mismatch for ${ticker}`)
    return file
  }),
)
const { dataset, excluded } = buildHfDataset(files, settings.through)
const attribution = {
  title: 'HF Data Library — selected IEX daily history',
  creator: 'Ahmed Elkassabgi (2026)',
  url: 'https://hfdatalibrary.com/',
  citation: 'https://doi.org/10.5281/zenodo.19501605',
  compilationLicense: 'https://creativecommons.org/licenses/by/4.0/',
  upstreamTerms: 'https://www.iex.io/legal/hist-data-terms',
  upstreamNotice:
    'Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.',
  changes:
    'Selected tickers; retained only source=iex from 2022-03-07 through the cutoff; converted daily clean Parquet bars into indexed JSON. No fabricated or interpolated prices.',
}
const payload = JSON.stringify({ ...dataset, attribution })
const manifest = {
  schemaVersion: 1,
  status: 'bundled-iex-history',
  bundledPrices: true,
  ...attribution,
  verifiedOn: new Date().toISOString().slice(0, 10),
  through: settings.through,
  from: dataset.dates[0],
  to: dataset.dates.at(-1),
  stocks: dataset.stocks.length,
  observations: dataset.stocks.reduce((n, s) => n + s.close.length, 0),
  excludedRows: excluded,
  bytes: Buffer.byteLength(payload),
  sha256: createHash('sha256').update(payload).digest('hex'),
  prices:
    'USD, daily clean bars as supplied. IEX-only trading, not consolidated market closes. Adjustment status not independently verified.',
  calendar:
    'Union of retained observed dates. Missing per-stock sessions break windows; globally absent sessions cannot be inferred.',
  limitations:
    'Selected stock sample, not an index or live screening universe. Provider outlier filtering and incomplete trade-correction handling can affect prices. Shape resemblance is not a prediction.',
  sources: files.map((file) => ({
    ticker: file.ticker,
    parquetSha256: file.sha256,
    observations: dataset.stocks.find((s) => s.ticker === file.ticker)!.close.length,
  })),
}
await mkdir('public/data', { recursive: true })
await writeFile('public/data/history.json', payload)
await writeFile('public/data/source.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(
  `Bundled ${manifest.stocks} stocks, ${manifest.observations} observations, ${manifest.from}–${manifest.to}; excluded ${excluded} rows. ${manifest.bytes} bytes.`,
)
