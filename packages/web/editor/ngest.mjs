import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push('PAGE: ' + String(e).slice(0, 160)))
page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text().slice(0, 160)) })
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
const order0 = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => t.getAttribute('data-stage-id')))
console.log('ORDER-BEFORE:', JSON.stringify(order0))
// ── REAL POINTER DRAG: dnd-kit reorder (drag first tile onto third)
const a = await page.locator('[data-stage-id]').first().boundingBox()
const b = await page.locator('[data-stage-id]').nth(2).boundingBox()
if (a && b) {
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(a.x + a.width / 2 + (b.x - a.x) * i / 12, a.y + a.height / 2 + (b.y - a.y) * i / 12)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(250)
  await page.mouse.up()
}
await page.waitForTimeout(2500)
const order1 = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => t.getAttribute('data-stage-id')))
const rev1 = await page.evaluate(() => document.querySelector('[data-cards-bench]')?.getAttribute('data-cards-bench'))
console.log('ORDER-AFTER-DRAG:', JSON.stringify(order1), 'rev', rev1)
await page.screenshot({ path: '/tmp/ng-reorder.png' })
// ── HTML5 WIRE DRAG: caption strip of tile[0] onto tile[1]
const s0 = page.locator('[data-stage-id]').first().locator('.tileCaption, [class*="tileCaption"]').first()
const t1 = page.locator('[data-stage-id]').nth(1)
try {
  await s0.dragTo(t1, { timeout: 8000 })
  console.log('OK wire-drag')
} catch (e) { console.log('FAIL wire-drag ::', String(e).split('\n')[0].slice(0, 100)) }
await page.waitForTimeout(2500)
const wireState = await page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const stages = (await r.json())?.result?.value?.stages ?? []
  return stages.map(s => ({ id: s.id, inputs: s.inputs ?? null }))
})
console.log('WIRE-STATE:', JSON.stringify(wireState))
const marker = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => (t.textContent || '').includes('⛓')))
console.log('MARKERS:', JSON.stringify(marker))
await page.screenshot({ path: '/tmp/ng-wired.png' })
// ── ZOOM regression: still morphs with sortable tiles
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
await page.waitForTimeout(1500)
const zoom = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  const wire = [...document.querySelectorAll('select')].some(s => (s.getAttribute('aria-label') || '').includes('Wire source'))
  return { zoomCard: card !== null, wireDropdown: wire, w: card ? Math.round(card.getBoundingClientRect().width) : 0 }
})
console.log('ZOOM:', JSON.stringify(zoom))
await page.screenshot({ path: '/tmp/ng-zoom-wire.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(1200)
console.log('CLOSED:', await page.evaluate(() => ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay'))))
console.log('ERRS:', JSON.stringify(errs.slice(0, 5)))
await browser.close()
