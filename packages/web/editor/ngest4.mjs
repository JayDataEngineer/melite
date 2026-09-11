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
// zoom the WIRED tile s_2 (now wired to s_1 at rev 39)
await page.locator('[data-stage-id]').nth(2).locator('button').first().click({ timeout: 10000 })
await page.waitForTimeout(1600)
const sel = page.locator('select[aria-label="Wire source input from stage"]')
console.log('SELECT-VISIBLE:', await sel.isVisible().catch(() => 'gone'))
console.log('SELECT-VALUE:', await sel.inputValue().catch(() => 'gone'))
const opts = await sel.locator('option').allTextContents().catch(() => [])
console.log('OPTIONS:', JSON.stringify(opts))
// select "— clear wire —" (index 0)
if (opts.length > 0) {
  await sel.selectOption({ index: 0 })
  await page.waitForTimeout(2200)
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'p', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
    const v = (await r.json())?.result?.value ?? {}
    return { rev: v.rev, s2: (v.stages ?? []).find(s => s.id === 's_2')?.inputs ?? null }
  })
  console.log('AFTER-CLEAR:', JSON.stringify(after))
}
await page.screenshot({ path: '/tmp/ng4-clear.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(900)
console.log('CLOSED:', await page.evaluate(() => ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay'))), 'ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
