import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(1000)
const out = await page.evaluate(() => {
  const cs = getComputedStyle(document.body)
  const toks = ['--dsw-alias-fg-muted', '--dsw-alias-label-secondary', '--dsw-alias-border-subtle', '--dsw-alias-state-business-primary', '--dsw-alias-fg-primary', '--dsw-alias-bg-subtle']
  const vals = {}
  for (const t of toks) vals[t] = cs.getPropertyValue(t).trim().slice(0, 40) || '(undefined)'
  // where is fg-muted defined? scan stylesheets
  let definedIn = []
  for (const ss of document.styleSheets) {
    try {
      for (const r of ss.cssRules) {
        if (r.cssText && r.cssText.includes('--dsw-alias-fg-muted') && r.cssText.length < 3000) { definedIn.push((ss.href || 'inline').slice(-40)); break }
      }
    } catch {}
  }
  return { vals, definedIn: definedIn.slice(0, 4), dark: document.body.getAttribute('data-ds-dark-theme') }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
