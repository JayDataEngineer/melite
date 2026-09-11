import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push('PAGE: ' + String(e).slice(0, 150)))
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
// after the failed run: the failed chip on the run stage (s_1)
const chips = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'),
  chip: t.querySelector('[class*="statusChip"]')?.textContent ?? null,
  chipStatus: t.querySelector('[class*="statusChip"]')?.getAttribute('data-status') ?? null,
})))
console.log('CHIPS:', JSON.stringify(chips))
await page.screenshot({ path: '/tmp/ng10-chips.png' })
// run the input-prep stage (a live-able run) then cancel
const ip = chips.findIndex(t => t.id === 's_3' || t.id === 's_4')
const target = ip >= 0 ? ip : chips.length - 1
await page.locator('[data-stage-id]').nth(target).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1700)
await page.locator('div[class*="zoomCard"] button', { hasText: 'Run' }).first().click({ timeout: 10000 })
await page.waitForTimeout(1800)
const live = await page.evaluate(() => {
  const rv = document.querySelector('[class*="runView"]')
  return rv === null ? null : { status: rv.getAttribute('data-run-status'), hasCancel: rv.textContent.includes('Cancel run') }
})
console.log('LIVE:', JSON.stringify(live))
if (live !== null && live.hasCancel && ['queued', 'pending', 'running'].includes(live.status)) {
  await page.locator('button', { hasText: 'Cancel run' }).click({ timeout: 8000 })
  await page.waitForTimeout(2500)
  console.log('POST-CANCEL:', await page.evaluate(() => document.querySelector('[class*="runView"]')?.getAttribute('data-run-status')))
  await page.screenshot({ path: '/tmp/ng10-cancelled.png' })
}
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
