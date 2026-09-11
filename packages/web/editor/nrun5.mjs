import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const logs = []
page.on('pageerror', e => logs.push('PAGE: ' + String(e).slice(0, 130)))
const reqs = []
page.on('response', r => { const u = r.url(); if (/\/api\/(bench|runs|drafts)\//.test(u)) reqs.push(`${u.split('/api/')[1]} ${r.status()}`) })
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(800)
// cleanup: remove tagger stages via the bench door (same wire the UI will use)
const clean = await page.evaluate(async () => {
  const call = async (method, args) => {
    const r = await fetch('/api/' + method, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'probe', method, payload: { args } }) })
    return r.json()
  }
  const g = await call('bench/get', { sessionKey: 'main' })
  const v = g?.result?.value ?? {}
  const out = []
  for (const s of (v.stages ?? [])) {
    if (s.card === 'tagger') {
      const rm = await call('bench/remove-stage', { sessionKey: 'main', doc: { stage: s.id, expect_rev: (await call('bench/get', { sessionKey: 'main' }))?.result?.value?.rev } })
      out.push(`${s.id}:${rm?.result?.ok === true ? 'removed' : 'FAIL'}`)
    }
  }
  const g2 = await call('bench/get', { sessionKey: 'main' })
  return { ops: out, stages: (g2?.result?.value?.stages ?? []).map(s => s.id) }
})
console.log('CLEAN:', JSON.stringify(clean))
await page.evaluate(() => { document.querySelector('[data-dockkit-add-tab]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
await page.waitForTimeout(2000)
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === 'Cards')
  const t = items[0]?.closest('button,[role="menuitem"],[role="option"],[class*="item"]') ?? items[0]
  t?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForSelector('[data-cards-bench]', { timeout: 20000 })
await page.waitForTimeout(3000)
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
await page.waitForTimeout(6000)
await page.getByRole('button', { name: 'Run', exact: true }).last().click({ timeout: 8000 })
console.log('OK run-click')
await page.waitForTimeout(15000)
const state = await page.evaluate(() => ({
  bench: document.querySelector('[data-cards-bench]') !== null,
  backToBench: (document.body.textContent || '').includes('Back to bench'),
  errLine: [...document.querySelectorAll('p')].map(p => (p.textContent || '').trim()).filter(t => /fail|refus|error|only \(/i.test(t)).slice(0, 2),
}))
console.log('STATE:', JSON.stringify(state).slice(0, 400))
console.log('WIRE:', JSON.stringify(reqs.slice(-10)))
console.log('LOG:', JSON.stringify(logs.slice(0, 4)))
await page.screenshot({ path: '/tmp/nr5-run.png' })
await browser.close()
