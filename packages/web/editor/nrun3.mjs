import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const cerr = []
page.on('pageerror', e => cerr.push('PAGE: ' + String(e).slice(0, 160)))
page.on('console', m => { if (m.type() === 'error') cerr.push('C: ' + m.text().slice(0, 160)) })
const reqs = []
page.on('response', r => { const u = r.url(); if (/\/api\/(bench|runs|drafts)\//.test(u)) reqs.push(`${u.split('/api/')[1]} ${r.status()}`) })
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
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
await page.waitForTimeout(6000)
await page.getByRole('button', { name: 'Run', exact: true }).last().click({ timeout: 8000 })
await page.waitForTimeout(12000)
const state = await page.evaluate(() => {
  const benchEl = document.querySelector('[data-cards-bench]')
  const runBtns = [...document.querySelectorAll('button')].filter(b => (b.textContent || '').trim() === 'Run' || (b.textContent || '').trim() === 'running…').map(b => (b.textContent || '').trim() + (b.disabled ? '[dis]' : ''))
  return {
    bench: benchEl !== null,
    backToBench: (document.body.textContent || '').includes('Back to bench'),
    runBtns: runBtns.slice(0, 4),
    errLine: [...document.querySelectorAll('p')].map(p => (p.textContent || '').trim()).filter(t => /fail|refus|error/i.test(t)).slice(0, 3),
  }
})
console.log('STATE:', JSON.stringify(state).slice(0, 600))
console.log('WIRE:', JSON.stringify(reqs.slice(-10)))
console.log('CERR:', JSON.stringify(cerr.slice(0, 6)))
await page.screenshot({ path: '/tmp/nr3-run.png' })
await browser.close()
