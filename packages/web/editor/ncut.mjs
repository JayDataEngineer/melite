import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push('PAGE: ' + String(e).slice(0, 160)))
const step = async (name, fn) => {
  try { await fn(); console.log('OK  ', name) }
  catch (e) { console.log('FAIL', name, '::', String(e).split('\n')[0].slice(0, 160)) }
  await page.screenshot({ path: `/tmp/n-${name}.png` })
}
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await step('1-continue', async () => {
  await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 })
  await page.waitForTimeout(800)
})
await page.evaluate(() => {
  const click = (el) => el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  click(document.querySelector('[data-dockkit-add-tab]'))
})
await page.waitForTimeout(2000)
await page.evaluate(() => {
  const click = (el) => el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  const items = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === 'Cards')
  click(items[0]?.closest('button,[role="menuitem"],[role="option"],[class*="item"]') ?? items[0])
})
await page.waitForTimeout(4000)
await step('2-bench', async () => {
  await page.waitForSelector('[data-cards-bench]', { timeout: 20000 })
})
await step('3-picker', async () => {
  await page.getByRole('button', { name: 'Add a card' }).click({ timeout: 10000 })
  await page.waitForTimeout(3000)
})
await step('4-pick', async () => {
  await page.getByRole('button', { name: /Ideogram/i }).first().click({ timeout: 10000 })
  await page.waitForTimeout(6000)
})
await step('5-drill', async () => {
  const tiles = page.locator('[data-stage-id]')
  await tiles.first().click({ timeout: 10000 })
  await page.waitForTimeout(6000)
})
console.log('ERRORS:', JSON.stringify(errors.slice(0, 6)))
await browser.close()
