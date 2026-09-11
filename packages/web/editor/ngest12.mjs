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
  return { rev: v.rev, stages: (v.stages ?? []).map(s => ({ id: s.id, card: s.card, n: Array.isArray(s.children) ? s.children.length : 0 })) }
})
console.log('BEFORE:', JSON.stringify(await bench()))
// enter the sub-view
await page.locator('button', { hasText: 'Group Cards' }).click({ timeout: 10000 })
await page.waitForTimeout(600)
const mode = await page.evaluate(() => ({
  groupingAttrs: document.querySelectorAll('[data-grouping="on"]').length,
  circles: document.querySelectorAll('[class*="checkCircle"]').length,
  bar: document.querySelector('[class*="groupBar"]')?.textContent ?? null,
}))
console.log('SUBVIEW:', JSON.stringify(mode))
await page.screenshot({ path: '/tmp/ng12-subview.png' })
// select tiles 3 and 4 (s_3 tagger, s_4 input-prep)
await page.locator('[data-stage-id]').nth(3).locator('button').first().click({ timeout: 8000 })
await page.waitForTimeout(300)
await page.locator('[data-stage-id]').nth(4).locator('button').first().click({ timeout: 8000 })
await page.waitForTimeout(500)
const sel = await page.evaluate(() => ({
  selected: [...document.querySelectorAll('[data-selected="on"]')].map(t => t.getAttribute('data-stage-id')),
  bar: document.querySelector('[class*="groupBar"]')?.textContent ?? null,
}))
console.log('SELECTED:', JSON.stringify(sel))
await page.screenshot({ path: '/tmp/ng12-selected.png' })
// group them
await page.locator('button', { hasText: /Group 2 cards/ }).click({ timeout: 10000 })
await page.waitForTimeout(2600)
const after = await bench()
console.log('AFTER-GROUP:', JSON.stringify(after))
const grid = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'),
  title: t.querySelector('[class*="tileTitle"]')?.textContent ?? null,
})))
console.log('GRID:', JSON.stringify(grid))
await page.screenshot({ path: '/tmp/ng12-grouped.png' })
// zoom the compound → members + Ungroup
const gIdx = grid.findIndex(t => (t.id ?? '').startsWith('g_'))
await page.locator('[data-stage-id]').nth(gIdx >= 0 ? gIdx : 0).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1700)
const drill = await page.evaluate(() => {
  const z = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomDetail'))
  return z === undefined ? null : {
    note: z.textContent.includes('compound of 2 stages'),
    members: [...z.querySelectorAll('[class*="memberName"]')].map(m => m.textContent),
    ungroup: z.textContent.includes('Ungroup'),
  }
})
console.log('DRILL:', JSON.stringify(drill))
await page.screenshot({ path: '/tmp/ng12-drill.png' })
await page.locator('div[class*="zoomCard"] button', { hasText: 'Ungroup' }).click({ timeout: 10000 })
await page.waitForTimeout(2600)
console.log('AFTER-UNGROUP:', JSON.stringify(await bench()))
// Esc exits the sub-view (re-enter, then Escape)
await page.locator('button', { hasText: 'Group Cards' }).click({ timeout: 10000 })
await page.waitForTimeout(400)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
console.log('ESCAPED:', await page.evaluate(() => document.querySelectorAll('[data-grouping="on"]').length === 0 && document.querySelectorAll('[class*="groupBar"] button')[0]?.textContent))
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
