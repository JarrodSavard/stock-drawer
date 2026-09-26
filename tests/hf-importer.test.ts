import { describe, expect, it } from 'vitest'
import { buildHfDataset } from '../shared/hf-importer'

const row = (date: string, source = 'iex', close = 12) => ({
  date,
  source,
  open: 11,
  high: 15,
  low: 10,
  close,
})

describe('HF publication boundary', () => {
  it('retains only explicitly identified IEX history and preserves original OHLC and gaps', () => {
    const { dataset, excluded } = buildHfDataset([
      {
        ticker: 'AAA',
        rows: [
          row('2022-03-09'),
          row('2022-03-08', 'pitrading'),
          row('2022-03-07'),
          row('2022-03-04'),
          row('2022-03-10', 'unknown'),
        ],
      },
      { ticker: 'BBB', rows: [row('2022-03-08')] },
    ])
    expect(excluded).toBe(3)
    expect(dataset.dates).toEqual(['2022-03-07', '2022-03-08', '2022-03-09'])
    expect(dataset.stocks[0]).toEqual({
      ticker: 'AAA',
      sessions: [0, 2],
      close: [12, 12],
      ohlc: [
        { open: 11, high: 15, low: 10, close: 12 },
        { open: 11, high: 15, low: 10, close: 12 },
      ],
    })
  })
  it('fails closed when provenance is missing or no eligible history exists', () => {
    expect(() =>
      buildHfDataset([{ ticker: 'AAA', rows: [{ ...row('2023-01-03'), source: undefined }] }]),
    ).toThrow(/source/)
    expect(() =>
      buildHfDataset([{ ticker: 'AAA', rows: [row('2023-01-03', 'pitrading')] }]),
    ).toThrow(/IEX/)
  })
  it.each([
    { ...row('2023-02-30') },
    { ...row('2023-01-03'), close: 0 },
    { ...row('2023-01-03'), high: 9 },
    { ...row('2023-01-03'), open: null },
  ])('rejects invalid eligible observations: %j', (invalid) => {
    expect(() => buildHfDataset([{ ticker: 'AAA', rows: [invalid] }])).toThrow()
  })
  it('rejects conflicting duplicates and accepts identical observations without filling history', () => {
    expect(() =>
      buildHfDataset([{ ticker: 'AAA', rows: [row('2023-01-03'), row('2023-01-03', 'iex', 13)] }]),
    ).toThrow(/duplicate/)
    const { dataset } = buildHfDataset([
      { ticker: 'AAA', rows: [row('2023-01-03'), row('2023-01-03')] },
    ])
    expect(dataset.stocks[0]?.close).toEqual([12])
  })
})
