import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push('PAGE: ' + String(e).slice(0, 140)))
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
await page.waitForTimeout(3000)
const before = await page.evaluate(() => document.querySelectorAll('[data-stage-id]').length)
console.log('stages before:', before)
await page.getByRole('button', { name: 'Add a card' }).click({ timeout: 10000 })
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /^Tagger/i }).first().click({ timeout: 10000 })
await page.waitForTimeout(5000)
await page.screenshot({ path: '/tmp/na-pickform.png' })
try {
  await page.getByRole('button', { name: 'Add card', exact: true }).click({ timeout: 8000 })
  console.log('OK add-click')
} catch (e) { console.log('FAIL add-click ::', String(e).split('\n')[0].slice(0, 120)) }
await page.waitForTimeout(5000)
const after = await page.evaluate(() => ({
  n: document.querySelectorAll('[data-stage-id]').length,
  titles: [...document.querySelectorAll('[data-stage-id]')].map(t => (t.textContent || '').replace(/\s+/g, ' ').slice(0, 40)),
}))
console.log('AFTER:', JSON.stringify(after))
console.log('ERRORS:', JSON.stringify(errors.slice(0, 5)))
await page.screenshot({ path: '/tmp/na-added.png' })
await browser.close()
