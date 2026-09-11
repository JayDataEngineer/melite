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
const bench = async () => page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const v = (await r.json())?.result?.value ?? {}
  return { rev: v.rev, stages: (v.stages ?? []).map(s => ({ card: s.card, title: s.title ?? null, source: s.params?.source ?? null })) }
})
console.log('BEFORE:', JSON.stringify(await bench()))
// FIXTURE drag source (disclosed test instrument — a probe tile speaking
// the old sidebar's MIME; real HTML5 events, our real drop handler).
const mountFixture = async (mime, payload) => page.evaluate(({ mime, payload }) => {
  const d = document.createElement('div')
  d.id = 'probe-drag-src'
  d.draggable = true
  d.textContent = 'probe'
  d.style.cssText = 'position:fixed;top:12px;right:12px;width:80px;height:40px;background:#c33;z-index:99999;cursor:grab'
  d.addEventListener('dragstart', e => { e.dataTransfer.setData(mime, payload); e.dataTransfer.effectAllowed = 'copy' })
  document.body.appendChild(d)
}, { mime, payload })
// 1. capability MIME → a generation card
await mountFixture('application/tech-noir-capability', JSON.stringify({ service: 'tagger', title: 'Tagger (probe)' }))
await page.locator('#probe-drag-src').dragTo(page.locator('[data-drop-surface="cards"]'), { timeout: 15000 })
await page.waitForTimeout(2600)
console.log('AFTER-CAP:', JSON.stringify(await bench()))
await page.evaluate(() => document.getElementById('probe-drag-src')?.remove())
await page.screenshot({ path: '/tmp/ng7-capdrop.png' })
// 2. asset MIME → input-prep with the estate-served URL
await mountFixture('application/tech-noir-asset', JSON.stringify({ url: '/v1/assets/inputs/drop-probe-1px.png', type: 'image/png' }))
await page.locator('#probe-drag-src').dragTo(page.locator('[data-drop-surface="cards"]'), { timeout: 15000 })
await page.waitForTimeout(2600)
console.log('AFTER-ASSET:', JSON.stringify(await bench()))
await page.evaluate(() => document.getElementById('probe-drag-src')?.remove())
await page.screenshot({ path: '/tmp/ng7-assetdrop.png' })
// 3. upload door chain (the OS-file branch's doors, direct)
const chain = await page.evaluate(async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const up = await fetch('/v1/uploads', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: 'drop-probe-2px.png', data: png }) })
  const served = await fetch('/v1/assets/inputs/drop-probe-2px.png')
  return { upload: up.status, body: await up.json(), served: served.status }
})
console.log('UPLOAD-DOOR:', JSON.stringify(chain))
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
