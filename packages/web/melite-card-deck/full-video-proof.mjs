import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1856, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
await page.goto('http://127.0.0.1:3088/?token=' + process.env.LIVE_TOKEN, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(9_000)
// 1 — author ONE tiny draft call on MY s_0 (bench-default)
const patched = await page.evaluate(async () => {
  const body = { type: 'client-request', rpcId: 'p1', method: 'drafts/patch', payload: { args: {
    draftId: 'bench-default', stageId: 's_0',
    patch: { params: {
      seed: 7, width: 768, height: 448, length: 56, steps: 6,
      variant: 'h3', quant: 'int8', recipe: 'default', model: 'h3-timeline',
      prompt: 'waves rolling on a dark shore, moonlight on the foam',
      calls: [{ text: 'waves rolling on a dark shore, moonlight on the foam', start_frame: 0, end_frame: 56 }],
    } },
  } } }
  const r = await fetch('/api/drafts/patch', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return await r.json()
})
console.log('PATCH:', JSON.stringify(patched).slice(0, 200))
// 2 — start the run (real, engine-side)
const started = await page.evaluate(async () => {
  const bench = await (await fetch('/api/bench/get', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'b', method: 'bench/get', payload: { args: { sessionKey: 'default' } } }) })).json()
  const row = bench?.result?.value?.stages?.[0]
  const body = { ...(row?.params ?? {}), model: 'h3-timeline', draft_id: 'bench-default', test: false }
  const r = await fetch('/v1/flows/start', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { status: r.status, body: await r.text() }
})
console.log('START:', JSON.stringify(started).slice(0, 300))
// 3 — poll for terminal (up to 8 min)
let terminal = null
for (let i = 0; i < 32; i++) {
  await page.waitForTimeout(15_000)
  terminal = await page.evaluate(async () => {
    const r = await (await fetch('/api/bench/get', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'default' } } }) })).json()
    const s = r?.result?.value?.stages?.[0]
    return s ? { runStatus: s.runStatus ?? null, result: s.result ?? null } : null
  })
  console.log('poll', i, JSON.stringify(terminal).slice(0, 200))
  if (terminal && terminal.result && terminal.runStatus !== 'running') break
}
await browser.close()
