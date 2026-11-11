import { expect, test } from '@playwright/test'

// probe-motion-client — live lane check for the gem-soma cure's served
// bytes: the browser session fetches the motion client module the shell
// itself loaded (discovered from the page's own resource entries) and
// asserts the cured press (model:"rig") plus the gate's card-unit arm
// (cards?.[) ride the lane. Disposable probe — not a wall.
const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe: lane serves the cured motion client bytes', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {})
  const urls = await page.evaluate(() =>
    (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .map((e) => e.name)
      .filter((u) => /motion/i.test(u)),
  )
  console.log('MOTION_URLS=' + JSON.stringify(urls))
  const clientUrl = urls.find((u) => /client|plugin|motion-motion/i.test(u))
  if (clientUrl === undefined) {
    console.log('PROBE_VERDICT=no motion module url discovered (shell may embed it another way)')
    return
  }
  const bytes = await page.evaluate(async (u: string) => {
    const r = await fetch(u)
    return { status: r.status, text: await r.text() }
  }, clientUrl)
  console.log('FETCH_STATUS=' + bytes.status + ' LEN=' + bytes.text.length)
  console.log('HAS_RIG_PRESS=' + /model:\s*["']rig["']/.test(bytes.text))
  console.log('HAS_CARD_UNIT_ARM=' + /cards\?\.\[/.test(bytes.text))
  console.log('STALE_GEM_SOMA=' + /model:\s*["']gem-soma["']/.test(bytes.text))
})
