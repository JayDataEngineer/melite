import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://127.0.0.1:3088/?token=' + process.env.LIVE_TOKEN, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(8_000)
for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(async () => {
    const post = async (m, args) => {
      const r = await fetch('/api/' + m, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'w', method: m, payload: { args } }) })
      return await r.json().catch(() => null)
    }
    const run = await post('runs/status', { runId: 'run-e72d2b5c0660-97bd736c' })
    const bench = await post('bench/get', { sessionKey: 'default' })
    const s = bench?.result?.value?.stages?.[0]
    return {
      run: run?.result?.value ? { status: run.result.value.status, keys: Object.keys(run.result.value).slice(0, 8) } : (run?.result?.error?.code ?? 'no-value'),
      row: s ? { runStatus: s.runStatus ?? null, result: s.result ? JSON.stringify(s.result).slice(0, 220) : null } : null,
    }
  })
  console.log('t+', i * 15, 's:', JSON.stringify(st).slice(0, 320))
  const rowDone = st.row && st.row.result
  if (rowDone) break
  await page.waitForTimeout(15_000)
}
await browser.close()
