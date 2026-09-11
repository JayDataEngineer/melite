import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(1000)
const out = await page.evaluate(() => {
  const names = new Set()
  for (const ss of document.styleSheets) {
    let src = ''
    try {
      for (const r of ss.cssRules) src += (r.cssText || '').slice(0, 400) + '\n'
    } catch { continue }
    if (!ss.href || !/assets\//.test(ss.href)) continue
    for (const m of src.matchAll(/--ds[wl]-alias-[a-z-]+/g)) names.add(m[0])
  }
  const cs = getComputedStyle(document.body)
  const resolved = {}
  for (const n of [...names].sort()) {
    if (!/border|fg-|label|interactive-bg|bg-/.test(n)) continue
    resolved[n] = cs.getPropertyValue(n).trim().slice(0, 36) || '(undef)'
  }
  return resolved
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
