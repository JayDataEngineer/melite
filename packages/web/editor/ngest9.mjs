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
// badges + chips state on the bench BEFORE any run
const before = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'),
  badge: t.querySelector('[class*="upstreamBadge"]')?.textContent ?? null,
  chip: t.querySelector('[class*="statusChip"]')?.textContent ?? null,
})))
console.log('TILES:', JSON.stringify(before))
await page.screenshot({ path: '/tmp/ng9-bench.png' })
// zoom the input-prep stage (has source param + upstream-wired target elsewhere)
const idx = before.findIndex(t => t.badge !== null)
const zoomIdx = idx >= 0 ? idx : 0
await page.locator('[data-stage-id]').nth(zoomIdx).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1700)
// per-stage Run (the drill's Run button = THIS stage only)
const runBtn = page.locator('div[class*="zoomCard"] button', { hasText: 'Run' }).first()
await runBtn.click({ timeout: 10000 })
await page.waitForTimeout(3000)
const runView = await page.evaluate(() => {
  const rv = document.querySelector('[class*="runView"]')
  return rv !== null ? {
    status: rv.getAttribute('data-run-status'),
    cancel: rv.textContent.includes('Cancel run'),
    runId: rv.querySelector('[class*="runId"]')?.textContent ?? null,
  } : null
})
console.log('RUN-VIEW:', JSON.stringify(runView))
await page.screenshot({ path: '/tmp/ng9-runview.png' })
// cancel if still live
if (runView && runView.cancel && ['queued', 'pending', 'running'].includes(runView.status)) {
  await page.locator('button', { hasText: 'Cancel run' }).click({ timeout: 8000 })
  await page.waitForTimeout(2500)
  console.log('AFTER-CANCEL-STATUS:', await page.evaluate(() => document.querySelector('[class*="runView"]')?.getAttribute('data-run-status')))
  await page.screenshot({ path: '/tmp/ng9-cancelled.png' })
}
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
