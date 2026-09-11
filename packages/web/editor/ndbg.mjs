import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const token = readFileSync('/tmp/mint-token.txt', 'utf8').trim()
const browser = await chromium.launch()
const page = await browser.newPage()
const msgs = []
page.on('console', m => { if (m.type() === 'error') msgs.push(m.text().slice(0, 200)) })
page.on('pageerror', e => msgs.push('PAGE: ' + String(e).slice(0, 200)))
await page.goto(`https://cloud.tailb1e597.ts.net:3088/?token=${token}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
await page.getByRole('button', { name: 'Continue' }).click({ timeout: 8000 }).catch(() => console.log('no continue'))
await page.waitForTimeout(1000)
await page.evaluate(() => { document.querySelector('[data-dockkit-add-tab]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
await page.waitForTimeout(2000)
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === 'Cards')
  console.log('menu items:', items.length)
  const t = items[0]?.closest('button,[role="menuitem"],[role="option"],[class*="item"]') ?? items[0]
  t?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await page.waitForTimeout(6000)
const st = await page.evaluate(() => ({
  bench: !!document.querySelector('[data-cards-bench]'),
  tabs: [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === 'Cards').length,
  bodyTail: (document.body.textContent || '').replace(/\s+/g, ' ').slice(-200),
}))
console.log(JSON.stringify(st))
console.log('CONSOLE:', JSON.stringify(msgs.slice(0, 6)))
await browser.close()
