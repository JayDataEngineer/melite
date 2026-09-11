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
await page.waitForSelector('[data-cards-bench]', { timeout: 20000 })
await page.waitForTimeout(2500)
await page.locator('[data-stage-id]').nth(2).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1600)
const sel = page.locator('select[aria-label="Wire source input from stage"]')
await sel.selectOption({ index: 1 })
await page.waitForTimeout(2400)
const state = await page.evaluate(() => ({
  overlay: [...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay')),
  selectCount: document.querySelectorAll('select[aria-label="Wire source input from stage"]').length,
  selectValue: document.querySelector('select[aria-label="Wire source input from stage"]')?.value ?? null,
}))
console.log('POST-WIRE-OVERLAY:', JSON.stringify(state))
await page.screenshot({ path: '/tmp/ng5-survive.png' })
await browser.close()
