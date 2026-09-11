import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(800)
await page.evaluate(() => { document.querySelector('[data-dockkit-add-tab]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
await page.waitForTimeout(2000)
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === 'Cards')
  const t = items[0]?.closest('button,[role="menuitem"],[role="option"],[class*="item"]') ?? items[0]
  t?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForSelector('[data-cards-bench]', { timeout: 20000 }).catch(() => console.log('NO BENCH'))
const audit = await page.evaluate(() => {
  const bench = document.querySelector('[data-cards-bench]')
  const tileBtn = document.querySelector('[data-stage-id] button')
  const tags = [...document.querySelectorAll('style[data-plugin-css]')].map(s => s.getAttribute('data-plugin-css'))
  const hasTileGridRule = [...document.styleSheets].some(ss => {
    try { return [...ss.cssRules].some(r => /tileGrid|tileInner/.test(r.selectorText || '')) } catch { return false }
  })
  return {
    benchClass: bench?.className?.toString().slice(0, 80),
    tileBtnClass: tileBtn?.className?.toString().slice(0, 120),
    tileBtnBorder: tileBtn ? getComputedStyle(tileBtn).borderTopWidth + '/' + getComputedStyle(tileBtn).borderTopStyle : 'n/a',
    cssTags: tags,
    hasTileGridRule,
  }
})
console.log(JSON.stringify(audit, null, 1))
await browser.close()
