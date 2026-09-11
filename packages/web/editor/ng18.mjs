import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const raw = await page.evaluate(async () => {
  const r = await fetch('/v1/form-spec?model=image-gen')
  const doc = await r.json()
  const f = doc.fields ?? []
  return { status: r.status, n: f.length, first: f.slice(0, 3), keys: f[0] ? Object.keys(f[0]) : [] }
})
console.log('RAW:', JSON.stringify(raw))
await browser.close()
