import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push('PAGE: ' + String(e).slice(0, 140)))
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
try {
  await page.getByRole('button', { name: 'Run', exact: true }).last().click({ timeout: 8000 })
  console.log('OK run-click')
} catch (e) { console.log('FAIL run-click ::', String(e).split('\n')[0].slice(0, 120)) }
await page.waitForTimeout(15000)
const state = await page.evaluate(() => ({
  url: location.hash.slice(0, 80),
  bench: document.querySelector('[data-cards-bench]') !== null,
  runView: (document.body.textContent || '').includes('Back to bench'),
  body: (document.body.textContent || '').replace(/\s+/g, ' ').slice(0, 300),
}))
console.log('STATE:', JSON.stringify(state).slice(0, 500))
console.log('WIRE:', JSON.stringify(reqs.slice(-8)))
console.log('ERRORS:', JSON.stringify(errors.slice(0, 5)))
await page.screenshot({ path: '/tmp/nr-run.png' })
await browser.close()
