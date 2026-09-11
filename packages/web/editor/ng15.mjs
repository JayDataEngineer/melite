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
const dom = await page.evaluate(() => {
  const tile = document.querySelector('[data-stage-id]')
  const zoomLater = null
  const tagClass = [...document.querySelectorAll('[class*="tag"]')].length
  const tags = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /^(⟵|done|running|queued)$/.test((e.textContent || '').trim())).length
  const inner = tile?.querySelector('button[class*="tileInner"]')
  return {
    tileBorder: inner ? getComputedStyle(inner).borderTopWidth : null,
    tagsFound: tags, tagish: tagClass,
    meta: tile?.querySelector('[class*="tileMeta"]')?.textContent ?? null,
  }
})
console.log('DOM:', JSON.stringify(dom))
await page.screenshot({ path: '/tmp/ng15-chrome.png' })
await page.locator('[data-stage-id] button[class*="tileInner"]').first().click({ timeout: 10000 })
await page.waitForTimeout(1800)
const zoom = await page.evaluate(() => {
  const card = [...document.querySelectorAll('div')].find(d => (d.className || '').toString().includes('zoomCard'))
  if (!card) return null
  const cs = getComputedStyle(card)
  return { border: cs.borderTopWidth, shadow: cs.boxShadow.slice(0, 60), w: Math.round(card.getBoundingClientRect().width) }
})
console.log('ZOOM:', JSON.stringify(zoom))
await page.screenshot({ path: '/tmp/ng15-zoom.png' })
await browser.close()
