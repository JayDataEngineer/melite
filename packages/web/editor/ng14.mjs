import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 140)))
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
await page.waitForSelector('[data-cards-bench]', { timeout: 20000 })
await page.waitForTimeout(2500)
const marks = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'),
  clip: (t.querySelector('[class*="tileTitle"]')?.textContent ?? '').includes('\ud83d\udcce'),
  chain: (t.querySelector('[class*="tileTitle"]')?.textContent ?? '').includes('\u26d3'),
})))
console.log('MARKS:', JSON.stringify(marks))
await page.screenshot({ path: '/tmp/ng14-marks.png' })
console.log('ERRS:', JSON.stringify(errs.slice(0, 2)))
await browser.close()
