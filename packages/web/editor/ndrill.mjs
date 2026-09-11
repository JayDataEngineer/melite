import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push('PAGE: ' + String(e).slice(0, 140)))
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
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/nd-bench.png' })
try {
  await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
  console.log('OK drill-open')
} catch (e) { console.log('FAIL drill-open ::', String(e).split('\n')[0].slice(0, 120)) }
await page.waitForTimeout(7000)
const dump = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')].filter(e => e.children.length === 0)
  const hasStage = all.some(e => /^Stage /.test((e.textContent || '').trim()))
  const modal = document.querySelector('[data-cards-bench]')?.parentElement
  const labels = [...document.querySelectorAll('label')].map(l => (l.textContent || '').trim().slice(0, 24)).filter(Boolean).slice(0, 10)
  return { hasStageModal: hasStage, labels }
})
console.log('DRILL:', JSON.stringify(dump))
console.log('ERRORS:', JSON.stringify(errors.slice(0, 5)))
await page.screenshot({ path: '/tmp/nd-drill.png' })
await browser.close()
