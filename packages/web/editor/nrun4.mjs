import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const logs = []
page.on('console', m => logs.push(`${m.type()}: ${m.text().slice(0, 130)}`))
page.on('pageerror', e => logs.push('PAGE: ' + String(e).slice(0, 130)))
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
await page.waitForTimeout(3000)
const benchGet = () => page.evaluate(async () => {
  const r = await fetch('/api/bench/get', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'probe', method: 'bench/get', payload: { args: { sessionKey: 'main' } } }) })
  const j = await r.json()
  const v = j?.result?.value ?? {}
  return { rev: v.rev, stages: (v.stages ?? []).length, log: (v.log ?? []).length }
})
console.log('BEFORE:', JSON.stringify(await benchGet()))
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
await page.waitForTimeout(6000)
await page.getByRole('button', { name: 'Run', exact: true }).last().click({ timeout: 8000 })
await page.waitForTimeout(12000)
console.log('AFTER:', JSON.stringify(await benchGet()))
console.log('LOG:', JSON.stringify(logs.filter(l => /^\w+: \[cards\]|PAGE|error/i.test(l)).slice(0, 8)))
await page.screenshot({ path: '/tmp/nr4-run.png' })
await browser.close()
