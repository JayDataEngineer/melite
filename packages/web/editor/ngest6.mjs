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
const before = await page.evaluate(() => ({
  rev: document.querySelector('[data-cards-bench]')?.getAttribute('data-cards-bench'),
  tiles: document.querySelectorAll('[data-stage-id]').length,
}))
console.log('BEFORE:', JSON.stringify(before))
// ── open picker, drag a catalog tile onto the grid (real HTML5 drag)
await page.locator('button[aria-label="Add a card"]').click({ timeout: 10000 })
await page.waitForTimeout(1500)
const srcTile = page.locator('button[class*="pickerCard"]').first()
await srcTile.dragTo(page.locator('[data-drop-surface="cards"]'), { timeout: 15000 })
await page.waitForTimeout(2800)
const after = await page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const v = (await r.json())?.result?.value ?? {}
  return { rev: v.rev, stages: (v.stages ?? []).map(s => ({ id: s.id, card: s.card, title: s.title ?? null })) }
})
console.log('AFTER-CAP-DROP:', JSON.stringify(after))
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/ng6-capdrop.png' })
// ── door-level proof of the FILE chain: upload a real 1x1 png through /v1/uploads, then input-prep add-stage
const chain = await page.evaluate(async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const up = await fetch('/v1/uploads', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: 'drop-probe-1px.png', data: png }) })
  const upBody = await up.json()
  const served = await fetch('/v1/assets/inputs/drop-probe-1px.png')
  const cur = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p2', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const rev = (await cur.json())?.result?.value?.rev
  const add = await fetch('/api/bench/add-stage', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p3', method: 'bench/add-stage', payload: { args: { sessionKey: 'main', doc: { card: 'input-prep', title: 'Image Ops', params: { source: 'drop-probe-1px.png' }, expect_rev: rev } } } }) })
  const addBody = await add.json()
  return { upload: { status: up.status, path: upBody.path }, servedStatus: served.status, add: { ok: addBody?.result?.ok ?? false, stage: addBody?.result?.value?.stage ?? addBody?.result?.error ?? null } }
})
console.log('FILE-CHAIN:', JSON.stringify(chain))
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
