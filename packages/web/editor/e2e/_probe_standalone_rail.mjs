// Standalone regression: TOP-LEVEL editor (parent === window) must KEEP
// its ActivityBar rail — the embed gate only bites inside DSH iframes.
import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
})
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
// vite dev serves the LIVE sources
await page.goto('http://127.0.0.1:5173/editor/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('[data-workspace-content]', { timeout: 30000 })
await page.waitForTimeout(1500)
const rail = await page.evaluate(() => {
  for (const el of document.querySelectorAll('div.w-12.flex-col')) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      display: cs.display,
      w: r.width,
      h: r.height,
      visible: cs.display !== 'none' && r.width > 2 && r.height > 2,
    }
  }
  return null
})
console.log(JSON.stringify({ probe: 'standalone-rail-kept', rail, verdict: rail?.visible ? 'PASS' : 'FAIL' }, null, 2))
await browser.close()
