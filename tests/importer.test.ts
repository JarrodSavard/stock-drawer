import { describe, it, expect } from 'vitest'
import { parseStockCsv, validateDataset } from '../shared/importer'
describe('CSV import', () => {
  it('sorts dates, accepts the Kaggle schema, deduplicates equal observations and preserves missing sessions', () => {
    const data = parseStockCsv(
      'date,open,high,low,close,volume,Name\n2018-02-07,1,2,1,2,100,AAA\n2018-02-05,1,1,1,1,100,AAA\n2018-02-06,1,2,1,2,100,BBB\n2018-02-05,1,1,1,1,100,AAA',
    )
    expect(data.dates).toEqual(['2018-02-05', '2018-02-06', '2018-02-07'])
    expect(data.stocks[0]).toEqual({
      ticker: 'AAA',
      sessions: [0, 2],
      close: [1, 2],
      ohlc: [
        { open: 1, high: 1, low: 1, close: 1 },
        { open: 1, high: 2, low: 1, close: 2 },
      ],
    })
  })
  it.each(['NaN', '0', '-5', '', 'Infinity'])('rejects invalid close %s', (close) => {
    expect(() => parseStockCsv(`date,close,Name\n2018-02-05,${close},AAA`)).toThrow(/close/i)
  })
  it('rejects impossible dates and conflicting duplicates', () => {
    expect(() => parseStockCsv('date,close,Name\n2018-02-30,1,AAA')).toThrow(/date/i)
    expect(() => parseStockCsv('date,close,Name\n2018-02-05,1,AAA\n2018-02-05,2,AAA')).toThrow(
      /conflicting/i,
    )
  })
  it('accepts quoted fields and CRLF', () => {
    expect(
      parseStockCsv('date,close,Name\r\n"2018-02-05","1.25","AAA"\r\n').stocks[0]?.close,
    ).toEqual([1.25])
  })
  it('keeps close-only files usable and marks missing or inconsistent candles unavailable', () => {
    expect(parseStockCsv('date,close,Name\n2018-02-05,2,AAA').stocks[0]?.ohlc).toBeUndefined()
    const data = parseStockCsv(
      'date,open,high,low,close,Name\n2018-02-05,,3,1,2,AAA\n2018-02-06,2,1,1,2,AAA',
    )
    expect(data.stocks[0]?.ohlc).toEqual([null, null])
    expect(data.stocks[0]?.close).toEqual([2, 2])
  })
  it('rejects conflicting candle duplicates even when closing prices agree', () => {
    expect(() =>
      parseStockCsv(
        'date,open,high,low,close,Name\n2018-02-05,1,3,1,2,AAA\n2018-02-05,2,3,1,2,AAA',
      ),
    ).toThrow(/conflicting/)
  })
  it('validates candle alignment, ranges and actual closing prices in assets', () => {
    const data = parseStockCsv('date,close,Name\n2018-02-05,2,AAA')
    for (const ohlc of [
      [],
      [{ open: 2, high: 1, low: 1, close: 2 }],
      [{ open: 2, high: 3, low: 1, close: 3 }],
    ]) {
      expect(() => validateDataset({ ...data, stocks: [{ ...data.stocks[0], ohlc }] })).toThrow(
        /candle/i,
      )
    }
  })
  it('rejects invalid data assets before search', () => {
    expect(() =>
      validateDataset({
        version: 1,
        dates: ['2018-02-05'],
        stocks: [{ ticker: 'AAA', sessions: [0, 1], close: [1] }],
      }),
    ).toThrow()
    expect(() => parseStockCsv('date,close,Name\n')).toThrow(/observations/i)
  })
})
