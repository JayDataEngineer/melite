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
// ADD a card → tile-pop must land on the NEW tile only
await page.getByRole('button', { name: 'Add a card' }).click({ timeout: 10000 })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: /^Tagger/i }).first().click({ timeout: 10000 })
await page.waitForTimeout(4000)
await page.getByRole('button', { name: 'Add card', exact: true }).click({ timeout: 8000 })
await page.waitForTimeout(400)
const pop = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('[data-stage-id]')]
  return tiles.map(t => {
    const cls = (t.className || '').toString()
    const anim = getComputedStyle(t).animationName
    return { id: t.getAttribute('data-stage-id'), popped: /tileEnter/.test(cls), anim: anim.slice(0, 30) }
  })
})
console.log('POP:', JSON.stringify(pop))
await page.waitForTimeout(4000)
// zoom + mid-morph transform evidence
await page.locator('[data-stage-id] button').first().click({ timeout: 10000 })
await page.waitForTimeout(150)
const morph = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  if (!card) return { card: false }
  const t = getComputedStyle(card).transform
  const r = card.getBoundingClientRect()
  return { card: true, transform: t === 'none' ? 'none(settled?)' : t.slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) }
})
console.log('MORPH@150ms:', JSON.stringify(morph))
await page.waitForTimeout(1500)
const settled = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  const r = card ? card.getBoundingClientRect() : null
  return { w: r ? Math.round(r.width) : 0, transform: card ? getComputedStyle(card).transform.slice(0, 30) : 'gone' }
})
console.log('SETTLED:', JSON.stringify(settled))
await page.screenshot({ path: '/tmp/nz2-zoom.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(1500)
console.log('CLOSED:', await page.evaluate(() => ![...document.querySelectorAll('div')].some(d => (d.className || '').toString().includes('zoomOverlay'))))
console.log('ERRS:', JSON.stringify(errs.slice(0, 5)))
await browser.close()
