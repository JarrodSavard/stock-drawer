import { chromium, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import manifest from '../public/data/source.json' with { type: 'json' }
const baseURL = process.env.STOCK_DRAWER_PREVIEW_URL ?? 'http://127.0.0.1:4173'
if (existsSync('.output/public/data/stocks.json'))
  throw new Error('Restricted prices unexpectedly bundled in the static build.')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors: string[] = []
const uploads: string[] = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('request', (r) => {
  if (r.method() !== 'GET') uploads.push(`${r.method()} ${r.url()}`)
})
try {
  await page.goto(baseURL)
  await expect(page.getByText(`${manifest.stocks} stocks loaded`)).toBeVisible({ timeout: 20_000 })
  const privateResponse = await page.request.get(`${baseURL}/api/local-data`)
  expect(privateResponse.status()).toBe(404)
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(5)
  const quickWindows = Number(
    (await page.getByTestId('windows-searched').textContent())!.replaceAll(',', ''),
  )
  await page.getByRole('button', { name: 'Search deeper', exact: true }).click()
  await expect(page.getByTestId('search-depth')).toHaveText('Deep', { timeout: 20_000 })
  const deepWindows = Number(
    (await page.getByTestId('windows-searched').textContent())!.replaceAll(',', ''),
  )
  expect(deepWindows).toBeGreaterThan(quickWindows * 4)
  const slider = page.getByRole('slider', { name: 'Replay position' })
  await slider.fill('59')
  for (const mode of ['Candlestick', 'Heikin-Ashi']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    await expect(page.locator('.candle')).toHaveCount(60)
    await expect(slider).toHaveValue('59')
  }
  expect(uploads).toEqual([])
  expect(errors).toEqual([])
  console.log(
    'Static build: bundled IEX history loads automatically; no restricted dataset or local API; Quick/Deep search produces five matches; both candle views replay 60 observations; zero uploads and runtime errors.',
  )
} finally {
  await browser.close()
}
