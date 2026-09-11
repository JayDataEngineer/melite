import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
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
await page.evaluate(() => {
  window.__evts = []
  const ol = document.querySelector('[data-drop-surface="cards"]')
  if (ol) {
    ol.addEventListener('dragover', e => window.__evts.push('over:' + e.dataTransfer.types.join('|')))
    ol.addEventListener('drop', e => window.__evts.push('drop:' + e.dataTransfer.types.join('|')))
    ol.addEventListener('dragenter', e => window.__evts.push('enter'))
  }
  const d = document.createElement('div')
  d.id = 'probe-drag-src'
  d.draggable = true
  d.style.cssText = 'position:fixed;top:12px;right:12px;width:80px;height:40px;background:#c33;z-index:99999;cursor:grab'
  d.addEventListener('dragstart', e => {
    e.dataTransfer.setData('application/tech-noir-capability', JSON.stringify({ service: 'tagger', title: 'T (probe)' }))
    e.dataTransfer.effectAllowed = 'copy'
    window.__evts.push('start')
  })
  document.body.appendChild(d)
})
const olBox = await page.locator('[data-drop-surface="cards"]').boundingBox()
console.log('OL-BOX:', JSON.stringify(olBox))
try {
  await page.locator('#probe-drag-src').dragTo(page.locator('[data-drop-surface="cards"]'), { timeout: 12000, targetPosition: { x: 5, y: 5 } })
  console.log('dragTo ok')
} catch (e) { console.log('dragTo timeout:', String(e).split('\n')[1]?.slice(0, 90)) }
await page.waitForTimeout(1200)
console.log('EVTS:', JSON.stringify(await page.evaluate(() => window.__evts?.slice(0, 8))))
await browser.close()
