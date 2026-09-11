import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 120)))
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
// open a stage with a switch field (image-gen has turbo switch) — s_probe
const idx = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].findIndex(t => (t.textContent || '').includes('image-gen')))
await page.locator('[data-stage-id]').nth(idx >= 0 ? idx : 0).locator('button[class*="tileInner"]').click({ timeout: 10000 })
await page.waitForTimeout(1800)
const sw = await page.evaluate(() => {
  const sws = [...document.querySelectorAll('[role="switch"], input[type="checkbox"]')]
  return sws.map(s => ({ role: s.getAttribute('role'), label: s.getAttribute('aria-label'), checked: (s.checked ?? undefined) }))
})
console.log('SWITCHES:', JSON.stringify(sw))
await page.screenshot({ path: '/tmp/ng16-switch.png' })
console.log('ERRS:', JSON.stringify(errs.slice(0, 2)))
await browser.close()
