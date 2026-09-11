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
const get = async () => page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const v = (await r.json())?.result?.value ?? {}
  return { rev: v.rev, wires: (v.stages ?? []).map(s => ({ id: s.id, inputs: s.inputs ?? null })) }
})
// zoom tile[2] (s_2, unwired) and wire via dropdown to s_1
await page.locator('[data-stage-id]').nth(2).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1600)
const sel = page.locator('select[aria-label="Wire source input from stage"]')
const opts = await sel.locator('option').allTextContents()
console.log('OPTIONS:', JSON.stringify(opts))
const optVals = await sel.locator('option').evaluateAll(os => os.map(o => o.value))
const idx = optVals.indexOf('s_1')
await sel.selectOption({ index: idx >= 0 ? idx : 1 })
await page.waitForTimeout(2200)
const afterDD = await get()
console.log('AFTER-DD:', JSON.stringify(afterDD.wires), 'rev', afterDD.rev)
await page.screenshot({ path: '/tmp/ng3-dd.png' })
// clear the wire via the "— clear wire —" option
await sel.selectOption({ index: 0 })
await page.waitForTimeout(2200)
const afterClear = await get()
console.log('AFTER-CLEAR:', JSON.stringify(afterClear.wires.find(w => w.id === 's_2')), 'rev', afterClear.rev)
// distinct wired markers on tiles (class-level, not text)
const marks = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'), wired: t.querySelector('[class*="wiredMark"]') !== null,
})))
console.log('MARKERS:', JSON.stringify(marks))
await page.keyboard.press('Escape')
await page.waitForTimeout(900)
const closed = await page.evaluate(() => ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay')))
console.log('CLOSED:', closed, 'ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
