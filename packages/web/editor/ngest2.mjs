import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push('PAGE: ' + String(e).slice(0, 150)))
page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text().slice(0, 150)) })
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
const get = async () => page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const v = (await r.json())?.result?.value ?? {}
  return { rev: v.rev, order: (v.stages ?? []).map(s => s.id), wires: (v.stages ?? []).map(s => ({ id: s.id, inputs: s.inputs ?? null })) }
})
const before = await get()
console.log('BEFORE:', JSON.stringify(before))
// ── 1. REAL POINTER DRAG: reorder tile[2] onto tile[0]
const a = await page.locator('[data-stage-id]').nth(2).boundingBox()
const b = await page.locator('[data-stage-id]').nth(0).boundingBox()
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
await page.mouse.down()
for (let i = 1; i <= 14; i++) {
  await page.mouse.move(a.x + a.width / 2 + (b.x - a.x) * i / 14, a.y + a.height / 2 + (b.y - a.y) * i / 14)
  await page.waitForTimeout(16)
}
await page.waitForTimeout(250)
await page.mouse.up()
await page.waitForTimeout(2500)
const afterDrag = await get()
console.log('AFTER-DRAG:', JSON.stringify(afterDrag.order), 'rev', afterDrag.rev)
await page.screenshot({ path: '/tmp/ng2-reorder.png' })
// ── 2. CLICK-TO-WIRE: arm ⛓ on tile[0], click tile[1]
const arm = page.locator('[data-stage-id]').first().locator('button[aria-label="Wire from this stage"]')
await arm.click({ timeout: 10000 })
await page.waitForTimeout(400)
const armed = await page.evaluate(() => [...document.querySelectorAll('[data-wiring]')].map(t => t.getAttribute('data-wiring') + ':' + t.getAttribute('data-stage-id')))
console.log('ARMED:', JSON.stringify(armed))
await page.screenshot({ path: '/tmp/ng2-armed.png' })
await page.locator('[data-stage-id]').nth(1).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(2500)
const afterWire = await get()
console.log('AFTER-WIRE:', JSON.stringify(afterWire.wires), 'rev', afterWire.rev)
const marker = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => (t.textContent || '').includes('⛓')))
const wiringCleared = await page.evaluate(() => document.querySelectorAll('[data-wiring]').length)
console.log('MARKERS:', JSON.stringify(marker), 'wiringAttrs:', wiringCleared)
await page.screenshot({ path: '/tmp/ng2-wired.png' })
// ── 3. ZOOM + dropdown wire + clear
await page.locator('[data-stage-id]').nth(1).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1600)
const sel = page.locator('select[aria-label="Wire source input from stage"]')
const cur = await sel.inputValue()
await sel.selectIndex({ index: 2 }).catch(async () => { const opts = await sel.locator('option').allTextContents(); console.log('OPTS:', JSON.stringify(opts)); })
await page.waitForTimeout(2200)
const afterDD = await get()
console.log('DROPDOWN-WIRE: was', JSON.stringify(cur), 'now', JSON.stringify(afterDD.wires))
await page.screenshot({ path: '/tmp/ng2-dd.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(1000)
console.log('CLOSED:', await page.evaluate(() => ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay'))))
console.log('ERRS:', JSON.stringify(errs.slice(0, 4)))
await browser.close()
