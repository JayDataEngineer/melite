// probe (q3-chat-preview): THE SERVED-BUNDLE VERDICT on the live lane —
// the journey's serve hop (the 2026-10-13 stale-bundle class). The
// render hop rides the keyless snapshot scenario (the full chat card
// through the real projector); the model-loop half stays owed (needs
// engine models). THE HERO BAN AT THE SERVED DEPTH (2026-11-17, the
// battery's first deck-leg run): this probe once asserted the bundle
// CARRIES `data-chat-preview` — a seat the hero-ban cure later
// removed BY LAW (flow-cards-chat-preview.spec.tsx: "NO MEDIA IN THE
// MAIN CHAT", [data-chat-preview] toHaveLength(0)). The probe had
// starved on SWEEP_LANE_URL since, and its inverted assertion rode
// unjudged. It now judges the law's SERVED half: the bytes the
// browser executed carry the ban, and screenshots the healthy shell.
import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// the shared three-pass settle law (the 2026-11-17 deck-leg mask burn)
import { settleLane } from './settle.ts'

test('probe (q3-chat-preview): served card-view bundle carries the hero ban (zero data-chat-preview seats)', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await settleLane(page, LANE_URL)
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
  expect(verdict.seat, 'the served bundle carries the hero ban — zero data-chat-preview seats in the executed bytes').toBe(false)
  await page.screenshot({ path: '/tmp/probe-q3-chat-preview.png', fullPage: false })
})
