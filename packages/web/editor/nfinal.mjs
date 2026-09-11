import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 140)))
page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text().slice(0, 140)) })
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
const bench = await page.evaluate(() => ({
  tiles: document.querySelectorAll('[data-stage-id]').length,
  sortable: document.querySelectorAll('[aria-roledescription="sortable"]').length,
  dropSurface: document.querySelector('[data-drop-surface="cards"]') !== null,
  groupBtn: [...document.querySelectorAll('button')].some(b => b.textContent === 'Group Cards'),
  runBtn: [...document.querySelectorAll('button')].some(b => b.textContent === 'Run' && b.className.includes('runBtn')),
  wireBtns: document.querySelectorAll('button[aria-label="Wire from this stage"]').length,
  upstream: [...document.querySelectorAll('[class*="upstreamBadge"]')].map(b => b.textContent),
  chips: [...document.querySelectorAll('[class*="statusChip"]')].map(c => c.textContent),
  addTile: document.querySelector('button[aria-label="Add a card"]') !== null,
  rev: document.querySelector('[data-cards-bench]')?.getAttribute('data-cards-bench'),
}))
console.log('BENCH:', JSON.stringify(bench))
await page.screenshot({ path: '/tmp/nfinal-bench.png' })
// zoom one last time — morph + drill + wire dropdown together
await page.locator('[data-stage-id] button[class*="tileInner"]').first().click({ timeout: 10000 })
await page.waitForTimeout(1800)
const zoom = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  return {
    w: card ? Math.round(card.getBoundingClientRect().width) : 0,
    title: card?.querySelector('[class*="zoomTitle"]')?.textContent ?? null,
    wireDropdown: document.querySelector('select[aria-label="Wire source input from stage"]') !== null,
    runInDrill: [...(card?.querySelectorAll('button') ?? [])].some(b => b.textContent === 'Run'),
    transition: card ? getComputedStyle(card).transitionDuration : null,
  }
})
console.log('ZOOM:', JSON.stringify(zoom))
await page.screenshot({ path: '/tmp/nfinal-zoom.png' })
console.log('ERRS:', JSON.stringify(errs.slice(0, 3)))
await browser.close()
