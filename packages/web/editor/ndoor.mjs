import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const call = async (method, args) => page.evaluate(async ({ method, args }) => {
  const r = await fetch('/api/' + method, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'probe' + Math.random(), method, payload: { args } }) })
  return { status: r.status, body: await r.json() }
}, { method, args })
const g = await call('bench/get', { sessionKey: 'main' })
const stages = g.body?.result?.value?.stages ?? []
const rev = g.body?.result?.value?.rev
console.log('GET:', JSON.stringify({ rev, ids: stages.map(s => s.id) }))
if (stages.length >= 2) {
  const rm = await call('bench/reorder', { sessionKey: 'main', doc: { stage: stages[0].id, to: 1, expect_rev: rev } })
  console.log('REORDER:', rm.status, JSON.stringify(rm.body?.result?.value ?? rm.body?.result?.error ?? {}).slice(0, 120))
  const g2 = await call('bench/get', { sessionKey: 'main' })
  console.log('AFTER:', JSON.stringify((g2.body?.result?.value?.stages ?? []).map(s => s.id)))
  const rw = await call('bench/rewire', { sessionKey: 'main', doc: { stage: stages[1].id, input: 'source', from: { stage: stages[0].id, output: 'default' }, expect_rev: g2.body?.result?.value?.rev } })
  console.log('REWIRE:', rw.status, JSON.stringify(rw.body?.result?.value ?? rw.body?.result?.error ?? {}).slice(0, 120))
  const g3 = await call('bench/get', { sessionKey: 'main' })
  const st = (g3.body?.result?.value?.stages ?? []).find(s => s.id === stages[1].id)
  console.log('WIRE-STATE:', JSON.stringify(st?.inputs ?? null))
}
await browser.close()
