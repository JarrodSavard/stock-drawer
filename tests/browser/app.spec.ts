import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Synthetic observations are restricted to tests. Production never imports this fixture.
const dates = Array.from({ length: 140 }, (_, i) =>
  new Date(Date.UTC(2017, 0, 1 + i)).toISOString().slice(0, 10),
)
const dataset = {
  version: 1,
  dates,
  stocks: ['TESTA', 'TESTB', 'TESTC', 'TESTD', 'TESTE', 'TESTF'].map((ticker, s) => ({
    ticker,
    sessions: dates.map((_, i) => i),
    close: dates.map((_, i) => 100 + s * 5 + Math.sin(i / (8 + s)) * 10 + i / 10),
    ohlc: dates.map((_, i) => {
      const close = 100 + s * 5 + Math.sin(i / (8 + s)) * 10 + i / 10
      return { open: close - 1, high: close + 2, low: close - 2, close }
    }),
  })),
}
test.beforeEach(async ({ page }) => {
  await page.route('**/data/history.json', (route) => route.fulfill({ json: dataset }))
  await page.goto('/')
  await expect(page.getByText('6 stocks loaded')).toBeVisible()
})

test('Deep search scans every start and preserves a frozen sketch when refining Quick results', async ({
  page,
}) => {
  await expect(page.getByRole('button', { name: 'Quick search', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(5)
  const snapshot = await page.getByAltText('Your captured drawing').getAttribute('src')
  await expect(page.getByTestId('windows-searched')).toHaveText('102')
  await page.getByRole('button', { name: 'Search deeper', exact: true }).click()
  await expect(page.getByTestId('search-depth')).toHaveText('Deep')
  await expect(page.getByTestId('windows-searched')).toHaveText('486')
  await expect(page.getByAltText('Your captured drawing')).toHaveAttribute('src', snapshot!)
  await expect(page.getByTestId('match-result')).toHaveCount(5)
  await page.getByRole('slider', { name: 'Replay position' }).fill('30')
  await page.getByRole('button', { name: 'Candlestick', exact: true }).click()
  await expect(page.locator('.candle')).toHaveCount(31)
  await page.getByRole('button', { name: 'Draw again', exact: true }).click()
  const quick = page.getByRole('button', { name: 'Quick search', exact: true })
  await quick.focus()
  await quick.press('Enter')
  await expect(quick).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('search-depth')).toHaveText('Quick')
  await expect(page.getByTestId('windows-searched')).toHaveText('102')
})

test('Deep search stays interactive, cancels and accepts a replacement query', async ({ page }) => {
  // Larger fixture makes real worker progress observable; no fake worker or fixed sleeps.
  const longerDates = Array.from({ length: 4000 }, (_, i) =>
    new Date(Date.UTC(2000, 0, i + 1)).toISOString().slice(0, 10),
  )
  const large = {
    version: 1,
    dates: longerDates,
    stocks: Array.from({ length: 60 }, (_, s) => ({
      ticker: `LARGE${s}`,
      sessions: longerDates.map((_, i) => i),
      close: longerDates.map((_, i) => 100 + i / 100 + Math.sin(i / (8 + s)) * 10),
    })),
  }
  await page.route('**/data/history.json', (route) => route.fulfill({ json: large }))
  await page.reload()
  await expect(page.getByText('60 stocks loaded')).toBeVisible()
  await page.getByRole('button', { name: 'Deep search', exact: true }).click()
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: 'Stocks checked' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel search', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Find matches', exact: true })).toBeEnabled()
  await expect(page.getByTestId('match-result')).toHaveCount(0)
  await page.getByRole('button', { name: 'Quick search', exact: true }).click()
  await page.getByRole('button', { name: 'Try a rise pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(5)
  await expect(page.getByTestId('search-depth')).toHaveText('Quick')
  await expect(page.getByTestId('windows-searched')).toHaveText('47,340')
})
test('example to frozen snapshot, distinct matches, selection and replay', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  const results = page.getByTestId('match-result')
  await expect(results).toHaveCount(5)
  await expect(page.getByAltText('Your captured drawing')).toBeVisible()
  await results.nth(1).click()
  await expect(results.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Pause replay' }).click()
  await page.getByRole('slider', { name: 'Replay position' }).fill('50')
  await expect(page.getByRole('slider', { name: 'Replay position' })).toHaveValue('50')
  await page.getByRole('button', { name: 'Restart replay' }).click()
  await page.getByRole('button', { name: 'Draw again' }).click()
  await expect(page.getByRole('button', { name: 'Find matches', exact: true })).toBeVisible()
})
test('drawing, clearing, short drawing validation and period selection', async ({ page }) => {
  const canvas = page.getByTestId('drawing-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.7)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByText('Draw across at least half')).toBeVisible()
  await page.getByRole('button', { name: 'Clear drawing' }).click()
  await page.getByRole('button', { name: '20 days', exact: true }).click()
  await page.getByRole('button', { name: 'Try a rise pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result').first()).toBeVisible()
  await expect(page.getByText('20 trading days', { exact: true }).first()).toBeVisible()
})
test('a complete freehand stroke becomes searchable', async ({ page }) => {
  const canvas = page.getByTestId('drawing-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.65)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75, { steps: 12 })
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Find matches', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByAltText('Your captured drawing')).toBeVisible()
})
test('failed loading offers local import without invented results', async ({ page }) => {
  await page.route('**/data/history.json', (route) => route.fulfill({ status: 404 }))
  await page.reload()
  await expect(page.getByText('Bring your own history')).toBeVisible()
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(0)
  await page.getByLabel('Load a stock CSV').setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'date,close,Name\n' + dates.map((d, i) => `${d},${100 + i},TEST`).join('\n'),
    ),
  })
  await expect(page.getByText('1 stock loaded')).toBeVisible()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Candlestick', exact: true })).toBeDisabled()
  await expect(page.getByText(/Candle views need/)).toBeVisible()
})

test('chart views preserve the snapshot, selected match and replay position', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  const slider = page.getByRole('slider', { name: 'Replay position' })
  await slider.fill('30')
  const actualClose = await page.locator('.live-price').textContent()
  await page.getByRole('button', { name: 'Candlestick', exact: true }).click()
  await expect(page.locator('.candle')).toHaveCount(31)
  await expect(slider).toHaveValue('30')
  await expect(page.getByRole('button', { name: 'Play replay' })).toBeVisible()
  const heikin = page.getByRole('button', { name: 'Heikin-Ashi', exact: true })
  await heikin.focus()
  await heikin.press('Enter')
  await expect(heikin).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Averaged candles smooth/)).toBeVisible()
  await expect(page.locator('.live-price')).toHaveText(actualClose!)
  await expect(page.getByAltText('Your captured drawing')).toBeVisible()
  await expect(slider).toHaveValue('30')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await slider.fill('59')
  await expect(page.locator('.candle')).toHaveCount(60)
  await page.getByTestId('match-result').nth(1).click()
  await expect(heikin).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await expect(page.locator('.candle')).toHaveCount(0)
})
test('reduced motion waits for explicit playback and the layout fits', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.getByText('6 stocks loaded')).toBeVisible()
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play replay' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
test('all 120 sessions are available to keyboard scrubbing', async ({ page }) => {
  await page.getByRole('button', { name: '120 days', exact: true }).click()
  await page.getByRole('button', { name: 'Try a rise pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  const slider = page.getByRole('slider', { name: 'Replay position' })
  await expect(slider).toHaveAttribute('max', '119')
  await slider.fill('6')
  await expect(page.getByText('7 / 120', { exact: true })).toBeVisible()
  await slider.focus()
  await slider.press('ArrowRight')
  await expect(page.getByText('8 / 120', { exact: true })).toBeVisible()
})
test('retry restores the dataset attribution after an invalid CSV', async ({ page }) => {
  await page.getByRole('button', { name: 'About this dataset' }).click()
  await page.getByLabel('Load a stock CSV').setInputFiles({
    name: 'broken.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('date,close,Name\n2018-01-01,NaN,AAA'),
  })
  await expect(page.getByText(/close must be a positive/)).toBeVisible()
  await page.getByRole('button', { name: 'Retry dataset' }).click()
  await expect(page.getByText(/HF Data Library ·/)).toBeVisible()
})
test('touch drawing captures a searchable stroke without scrolling the page', async ({ page }) => {
  const canvas = page.getByTestId('drawing-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const scrollY = await page.evaluate(() => window.scrollY)
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.1, y: box.y + box.height * 0.6 }],
  })
  for (let i = 1; i <= 20; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: box.x + box.width * (0.1 + i * 0.04), y: box.y + box.height * (0.6 - i * 0.02) },
      ],
    })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('button', { name: 'Find matches', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  await session.detach()
})
test('drawing and results have no automated accessibility violations', async ({ page }) => {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await page.getByRole('button', { name: 'Pause replay' }).click()
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
})
