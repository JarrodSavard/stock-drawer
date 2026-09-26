import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev)
    throw createError({
      statusCode: 404,
      statusMessage: 'Local dataset is only available in development.',
    })
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    return JSON.parse(await readFile(resolve('.local-data/stocks.json'), 'utf8'))
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Import a local CSV to begin.' })
  }
})
