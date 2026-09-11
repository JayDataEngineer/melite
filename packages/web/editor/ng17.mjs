import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const specs = await page.evaluate(async () => {
  const out = {}
  for (const card of ['image-gen', 'tagger', 'input-prep', 'img-to-mesh']) {
    const r = await fetch(`/v1/form-spec?form=${card}`).catch(() => null)
    if (r === null) continue
    const doc = await r.json().catch(() => null)
    if (doc === null) continue
    out[card] = (doc.fields ?? []).map(f => f.type).join(',')
  }
  return out
})
console.log('SPECS:', JSON.stringify(specs))
await browser.close()
