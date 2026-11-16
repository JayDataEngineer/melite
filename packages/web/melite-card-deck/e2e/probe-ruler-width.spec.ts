import { expect, test } from '@playwright/test'
const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// the shared three-pass settle law (the 2026-11-17 deck-leg mask burn)
import { settleLane } from './settle.ts'
test('probe (ruler-width): measure every ruler + content box', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await settleLane(page, LANE_URL)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Melite Bench', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  await page.getByText('Generate Video', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(4_000)
  await page.locator('[data-testid="motion-timeline-playhead"]').first().waitFor({ timeout: 30_000 })
  const geo = await page.evaluate(() => {
    const box = (el: Element | null) => {
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const rulers = [...document.querySelectorAll('[data-testid="motion-timeline-ruler"]')]
    const contents = [...document.querySelectorAll('[data-testid="motion-timeline-content"]')]
    const ruler = rulers[0] as HTMLElement | undefined
    return {
      rulerCount: rulers.length,
      rulerBoxes: rulers.map(box),
      contentCount: contents.length,
      contentBoxes: contents.map(box),
      rulerCssWidth: ruler ? getComputedStyle(ruler).width : null,
      rulerCssDisplay: ruler ? getComputedStyle(ruler).display : null,
      contentCssWidth: contents[0] ? getComputedStyle(contents[0] as Element).width : null,
      tickCount: ruler ? ruler.querySelectorAll(':scope > div').length : 0,
      hitAt300: (() => {
        const el = document.elementFromPoint(300, 428)
        return el ? (el.getAttribute('data-testid') ?? '') + '|' + String(el.className).slice(0, 40) + '|' + el.tagName : 'NONE'
      })(),
    }
  })
  console.log('RULER_GEO=' + JSON.stringify(geo))
  expect(true).toBe(true)
})
