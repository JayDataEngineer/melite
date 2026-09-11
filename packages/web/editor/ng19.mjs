import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const out = await page.evaluate(async () => {
  const res = {}
  for (const card of ['image-gen', 'tagger', 'input-prep', 'img-to-mesh']) {
    const r = await fetch(`/v1/form-spec?model=${card}`)
    const doc = await r.json().catch(() => ({ fields: [] }))
    res[card] = (doc.fields ?? []).map(f => `${f.name}:${f.type}`)
  }
  return res
})
console.log(JSON.stringify(out))
await browser.close()
