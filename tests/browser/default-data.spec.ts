import { test, expect } from '@playwright/test'
import manifest from '../../public/data/source.json' with { type: 'json' }

test('a fresh visit searches bundled real history without a CSV or provider account', async ({
  page,
}) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:3000')
      externalRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByText(`${manifest.stocks} stocks loaded`)).toBeVisible()
  await page.getByRole('button', { name: 'Try a cup pattern' }).click()
  await page.getByRole('button', { name: 'Find matches', exact: true }).click()
  await expect(page.getByTestId('match-result')).toHaveCount(5)
  await page.getByRole('slider', { name: 'Replay position' }).fill('59')
  await page.getByRole('button', { name: 'Candlestick', exact: true }).click()
  await expect(page.locator('.candle')).toHaveCount(60)
  await page.getByRole('button', { name: 'About this dataset' }).click()
  await page.getByText('Data source & reuse', { exact: true }).click()
  await expect(page.getByRole('link', { name: 'IEX Historical Data Terms of Use' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'CC BY 4.0' })).toBeVisible()
  expect(externalRequests).toEqual([])
})
