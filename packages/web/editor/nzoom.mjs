import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errs = []
page.on('pageerror', e => errs.push('PAGE: ' + String(e).slice(0, 160)))
page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text().slice(0, 160)) })
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
// REAL CLICK on the first tile
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
console.log('OK tile-click')
// catch the morph EARLY (skeleton should be holding the box)
await page.waitForTimeout(180)
const early = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  const sk = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomSkeleton'))
  return { zoomCard: card !== null, skeleton: sk !== null, pos: card ? getComputedStyle(card).position : 'n/a' }
})
await page.screenshot({ path: '/tmp/nz-morph-early.png' })
console.log('EARLY:', JSON.stringify(early))
await page.waitForTimeout(1400)
const settled = await page.evaluate(() => {
  const ov = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomOverlay'))
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  const detail = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomDetail'))
  const labels = [...document.querySelectorAll('label')].map(l => (l.textContent || '').trim().slice(0, 18)).filter(Boolean).slice(0, 5)
  return {
    overlay: ov !== null, overlayPos: ov ? getComputedStyle(ov).position : 'n/a', zIndex: ov ? getComputedStyle(ov).zIndex : 'n/a',
    cardW: card ? Math.round(card.getBoundingClientRect().width) : 0,
    detail, labels,
    skeletonGone: ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomSkeleton')),
  }
})
await page.screenshot({ path: '/tmp/nz-zoom-settled.png' })
console.log('SETTLED:', JSON.stringify(settled).slice(0, 400))
// Escape close — the morph must reverse, then unmount
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.screenshot({ path: '/tmp/nz-morph-exit.png' })
await page.waitForTimeout(1200)
const closed = await page.evaluate(() => ({
  overlayGone: ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay')),
  benchBack: document.querySelector('[data-cards-bench]') !== null,
}))
console.log('CLOSED:', JSON.stringify(closed))
console.log('ERRS:', JSON.stringify(errs.slice(0, 6)))
await browser.close()
