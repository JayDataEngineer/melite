// probe (q3-chat-preview): THE SERVED-BUNDLE VERDICT on the live lane —
// the journey's serve hop (the 2026-10-13 stale-bundle class). The
// render hop rides the keyless snapshot scenario (the full chat card
// through the real projector); the model-loop half stays owed (needs
// engine models). This probe asserts the lane's served card-view
// bundle carries the Q3 frozen-preview seat (`data-chat-preview`,
// one hero per settled stage) and screenshots the healthy shell.
import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe (q3-chat-preview): served card-view bundle carries the frozen chat-preview seat', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  // the loader already fetched+executed the card-view bundle (the
  // shell's Cards tab is live) — take the exact URL from the
  // browser's own resource log (no HTML scraping: escaping lies),
  // refetch it in-page (cookies included) and read the bytes the
  // browser itself executed.
  const verdict = await page.evaluate(async () => {
    const entries = performance.getEntriesByType('resource')
      .map((e) => (e as PerformanceResourceTiming).name)
      .filter((name) => name.includes('dsh-card-view/client.js'))
    const url = entries[entries.length - 1] ?? ''
    if (url === '') return { found: false as boolean, status: 0, seat: false, url: '' }
    const res = await fetch(url)
    const text = await res.text()
    return { found: true as boolean, status: res.status, seat: text.includes('data-chat-preview'), url }
  })
  console.log('Q3_SERVED=' + JSON.stringify({ status: verdict.status, seat: verdict.seat, url: String(verdict.url).slice(-80) }))
  expect(verdict.found, 'the shell serves a card-view bundle').toBe(true)
  expect(verdict.status).toBe(200)
  expect(verdict.seat, 'the served bundle carries the Q3 data-chat-preview seat').toBe(true)
  await page.screenshot({ path: '/tmp/probe-q3-chat-preview.png', fullPage: false })
})
