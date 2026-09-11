import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 140)))
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
  return { rev: v.rev, stages: (v.stages ?? []).map(s => ({ id: s.id, card: s.card, source: s.params?.source ?? null })) }
})
console.log('BEFORE:', JSON.stringify(await bench()))
// fixture asset-drag source; drop ON the FIRST tile (s_1) — must PATCH its source param, not add a stage
await page.evaluate(() => {
  const d = document.createElement('div')
  d.id = 'probe-asset-src'
  d.draggable = true
  d.style.cssText = 'position:fixed;top:12px;right:12px;width:80px;height:40px;background:#3c3;z-index:99999;cursor:grab'
  d.addEventListener('dragstart', e => {
    e.dataTransfer.setData('application/tech-noir-asset', JSON.stringify({ url: '/v1/assets/inputs/drop-probe-1px.png', type: 'image/png' }))
    e.dataTransfer.effectAllowed = 'copy'
  })
  document.body.appendChild(d)
})
await page.locator('#probe-asset-src').dragTo(page.locator('[data-stage-id]').first(), { timeout: 15000 })
await page.waitForTimeout(2600)
const after = await bench()
console.log('AFTER-ATTACH:', JSON.stringify(after))
const sameCount = (await bench()).stages.length
await page.screenshot({ path: '/tmp/ng13-attach.png' })
console.log('STAGE-COUNT-UNCHANGED:', sameCount === 5)
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
