import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { cpus } from 'node:os'
import { validateDataset } from '../shared/importer'
import { search } from '../app/lib/matching'
const dataset = validateDataset(JSON.parse(await readFile('public/data/history.json', 'utf8')))
const patterns = {
  cup: [0.8, 0.61, 0.3, 0.12, 0.07, 0.16, 0.34, 0.65, 0.88],
  rise: [0.08, 0.22, 0.19, 0.4, 0.34, 0.63, 0.6, 0.75, 0.9],
  doublePeak: [0.1, 0.5, 0.9, 0.65, 0.35, 0.6, 0.88, 0.48, 0.15],
}
const measurements = []
for (const [pattern, values] of Object.entries(patterns)) {
  const points = values.map((y, i) => ({ x: i / (values.length - 1), y }))
  for (const period of [20, 60, 120] as const) {
    const modes = {} as Record<
      'quick' | 'deep',
      {
        medianMs: number
        windows: number
        candidatesRanked: number
        distances: number[]
        tickers: string[]
      }
    >
    for (const mode of ['quick', 'deep'] as const) {
      search(dataset, points, period, mode) // warm-up, excluded from median
      const runs = Array.from({ length: 3 }, () => search(dataset, points, period, mode))
      modes[mode] = {
        medianMs: Math.round(runs.map((r) => r.elapsedMs).sort((a, b) => a - b)[1]!),
        windows: runs[0]!.windows,
        candidatesRanked: runs[0]!.candidatesRanked,
        distances: runs[0]!.matches.map((m) => m.distance),
        tickers: runs[0]!.matches.map((m) => m.ticker),
      }
    }
    if (modes.deep.distances.some((d, i) => d > modes.quick.distances[i]! + 1e-12))
      throw new Error('Deep search lost baseline quality.')
    const quickBest = modes.quick.distances[0]!,
      deepBest = modes.deep.distances[0]!
    const row = {
      pattern,
      period,
      ...modes,
      bestDistanceReductionPercent: quickBest
        ? Math.round((1 - deepBest / quickBest) * 1000) / 10
        : 0,
    }
    measurements.push(row)
    console.log(JSON.stringify(row))
  }
}
const report = {
  measuredAt: new Date().toISOString(),
  cpu: cpus()[0]?.model,
  node: process.version,
  stocks: dataset.stocks.length,
  runs: 3,
  methodology:
    'One warm-up per mode/query, then median of three synchronous CPU searches. Data load excluded; browser scheduling measured separately. Shape distance is not predictive accuracy.',
  measurements,
}
await mkdir('output', { recursive: true })
await writeFile('output/search-benchmark.json', JSON.stringify(report, null, 2))
console.log('Benchmark report: output/search-benchmark.json')
