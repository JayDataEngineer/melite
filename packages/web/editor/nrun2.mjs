import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(1000)
try {
  await page.locator('[data-dockkit-add-tab]').click({ timeout: 8000 })
  console.log('OK real +')
} catch (e) { console.log('FAIL + ::', String(e).split('\n')[0].slice(0, 100)) }
await page.waitForTimeout(2000)
await page.screenshot({ path: '/tmp/nr2-menu.png' })
const menu = await page.evaluate(() => [...document.querySelectorAll('*')]
  .filter(e => e.children.length === 0 && /cards/i.test(e.textContent || ''))
  .map(e => `${e.tagName}.${((e.className.baseVal ?? e.className ?? '').toString()).slice(0, 30)}:${(e.textContent || '').trim().slice(0, 20)}`).slice(0, 6))
console.log('MENU:', JSON.stringify(menu))
await browser.close()
