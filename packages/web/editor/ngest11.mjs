import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
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
await page.waitForTimeout(2000)
const wire = async (method, args) => page.evaluate(async ({ method, args }) => {
  const r = await fetch('/api/' + method, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'p' + Math.random(), method, payload: { args } }) })
  return await r.json()
}, { method, args })
// why did the run fail?
const st = await wire('runs/status', { runId: 'run-9f3616732022-915f08ac' })
const run = st?.result?.value ?? {}
console.log('RUN-STATUS:', JSON.stringify({ status: run.status, error: (run.error ?? run.note ?? null)?.toString?.().slice(0, 140) ?? run.error ?? null }))
// chip proof: bench/patch runStatus=done on s_1 (the estate's own stage-status field)
const g = await wire('bench/get', { sessionKey: 'main' })
const rev = g?.result?.value?.rev
const pt = await wire('bench/patch', { sessionKey: 'main', doc: { stage: 's_1', runStatus: 'done', expect_rev: rev } })
console.log('PATCH:', JSON.stringify(pt?.result?.ok ?? pt?.result?.error ?? null))
await page.reload()
await page.waitForTimeout(9000)
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
const chips = await page.evaluate(() => [...document.querySelectorAll('[data-stage-id]')].map(t => ({
  id: t.getAttribute('data-stage-id'),
  chip: t.querySelector('[class*="statusChip"]')?.textContent ?? null,
  status: t.querySelector('[class*="statusChip"]')?.getAttribute('data-status') ?? null,
})))
console.log('CHIPS:', JSON.stringify(chips))
await page.screenshot({ path: '/tmp/ng11-chip.png' })
// runs/stop door reachability (bogus id → the door's own refusal voice)
const stop = await wire('runs/stop', { runId: 'run-bogus-probe' })
console.log('STOP-DOOR:', JSON.stringify((stop?.result?.error ?? stop?.result?.value ?? null)?.toString?.().slice(0, 100) ?? stop?.result ?? null))
await browser.close()
