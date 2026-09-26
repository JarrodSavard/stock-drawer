import { chromium, devices, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import manifest from '../public/data/source.json' with { type: 'json' }
await mkdir('output/playwright', { recursive: true })
const browser = await chromium.launch()
const errors: string[] = []
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await desktopContext.newPage()
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://127.0.0.1:3000/')
await page.getByText(`${manifest.stocks} stocks loaded`).waitFor()
await page.screenshot({ path: 'output/playwright/desktop.png', fullPage: true })
await expect(
  page.getByText('Created by', { exact: false }).filter({ hasText: 'Jarrod Savard' }),
).toBeVisible()
await expect(page.getByRole('link', { name: 'Explore my work' })).toHaveAttribute(
  'href',
  'https://www.jarrodsavard.com/',
)
await page.getByText('A look under the hood').click()
expect(
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations,
).toEqual([])
await page.getByText('A look under the hood').click()
console.log('canvas bounds', await page.getByTestId('drawing-canvas').boundingBox())
await page.getByRole('button', { name: 'Try a cup pattern' }).click()
await page.getByRole('button', { name: 'Find matches', exact: true }).click()
await page.getByTestId('match-result').first().waitFor()
await page.getByRole('button', { name: 'Pause replay' }).click()
await page.getByRole('slider', { name: 'Replay position' }).fill('59')
await page.screenshot({ path: 'output/playwright/results.png', fullPage: true })
for (const mode of ['Candlestick', 'Heikin-Ashi']) {
  await page.getByRole('button', { name: mode, exact: true }).click()
  await page.screenshot({ path: `output/playwright/${mode.toLowerCase()}.png`, fullPage: true })
  if ((await page.locator('.candle').count()) !== 60)
    throw new Error(`Incorrect candle count for ${mode}`)
}
console.log('Browser real-data search:', await page.locator('.detail-row').allTextContents())
await page.getByRole('button', { name: 'Search deeper', exact: true }).click()
await expect(page.getByTestId('search-depth')).toHaveText('Deep', { timeout: 20_000 })
await page.getByRole('slider', { name: 'Replay position' }).fill('59')
await page.getByRole('button', { name: 'Heikin-Ashi', exact: true }).click()
await page.screenshot({ path: 'output/playwright/deep-search.png', fullPage: true })
console.log('Browser deep search:', await page.locator('.detail-row').allTextContents())
const context = await browser.newContext({ ...devices['Pixel 7'] })
const mobile = await context.newPage()
mobile.on('pageerror', (e) => errors.push(e.message))
await mobile.goto('http://127.0.0.1:3000/')
await mobile.getByText(`${manifest.stocks} stocks loaded`).waitFor()
await mobile.screenshot({ path: 'output/playwright/mobile.png', fullPage: true })
await mobile.getByRole('button', { name: 'Try a cup pattern' }).click()
await mobile.getByRole('button', { name: 'Find matches', exact: true }).click()
await mobile.getByTestId('match-result').first().waitFor()
await mobile.getByRole('slider', { name: 'Replay position' }).fill('59')
await mobile.getByRole('button', { name: 'Heikin-Ashi', exact: true }).click()
await mobile.screenshot({ path: 'output/playwright/mobile-candles.png', fullPage: true })
console.log(
  'Mobile overflow:',
  await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
)
await writeFile('output/playwright/browser-errors.json', JSON.stringify(errors, null, 2))
console.log('Runtime errors:', errors)
await mobile.setViewportSize({ width: 320, height: 740 })
expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
expect(errors).toEqual([])
await browser.close()
