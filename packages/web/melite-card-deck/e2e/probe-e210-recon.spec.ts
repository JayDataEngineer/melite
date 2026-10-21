// probe (e2-10-recon): find the video timeline studio face on the live
// lane — which tiles exist, does an h3-timeline studio render a
// motion-timeline-playhead. Read-only recon for the E2-10 red probe.
import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe (e2-10-recon): locate the video timeline face', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Media Flow', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  const tiles = await page.evaluate(() => {
    const texts: string[] = []
    document.querySelectorAll('button, [role="button"], a').forEach((el) => {
      const t = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
      if (t.length > 2 && !texts.includes(t)) texts.push(t)
    })
    return texts.slice(0, 80)
  })
  console.log('TILES=' + JSON.stringify(tiles))
  const playheads = await page.locator('[data-testid="motion-timeline-playhead"]').count()
  console.log('PLAYHEADS_ON_BENCH=' + playheads)
  await page.screenshot({ path: '/tmp/probe-e210-recon.png', fullPage: false })
})
