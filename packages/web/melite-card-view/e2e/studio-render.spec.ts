/**
 * E2E: the h3-timeline STUDIO in real Chromium — the browser-plane
 * wall born from the 2026-09-12 operator report ("it renders like a
 * [REDACTED 2026-11-05] form"). Root cause then: the lane host booted 14:29 UTC,
 * the studio bundles rebuilt 16:10 — the browser's boot graph never
 * carried @melite/video-h3-timeline, the cards.stage.view slot went
 * unclaimed, and the bench's zoom fell back to the generic card. No
 * in-process wall can see that; only the real browser plane can.
 *
 * The tour (read-only against the seeded bench — never mutates it):
 *   1. Open a listed session (the right sidebar's expand button only
 *      materializes in an open conversation header).
 *   2. Expand the right sidebar (data-sidebar-right-expand), open the
 *      Cards tab through the guide entry.
 *   3. The bench hydrates (bench/get session 'main') and the seeded
 *      h3-timeline stage row renders.
 *   4. Click the row: the card view opens and cards.stage.view must
 *      be CLAIMED by the studio — VideoTimelineStudio's own markers
 *      (timeline bar + ruler + playhead + doc readout), never the
 *      generic form.
 *   5. Zero page errors / console errors across the tour.
 *
 * Self-skips without E2E_STUDIO_URL (the token-authenticated shell
 * URL) — same law as test:e2e's DEEPSEEK_API_KEY gate.
 *
 * Run: E2E_STUDIO_URL='http://127.0.0.1:3907/?token=…' pnpm --filter
 *   @melite-plugin/dsh-card-view exec playwright test
 */
import { expect, test, type Page } from '@playwright/test'

const STUDIO_URL = process.env.E2E_STUDIO_URL ?? ''

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host with the seeded bench')

/** Let the host's own boot noise land before the tour's ledger. */
async function settle(page: Page): Promise<void> {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9_000)
}

test('the h3-timeline bench card opens the VideoTimelineStudio, not the generic form', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })

  await settle(page)

  // 1 — open a listed session. The sessions tree now groups by
  // WORKSPACE (the 2026-09-13 layout: workspace parents, sessions as
  // children with time suffixes "7min/1d/22h"); the old
  // /^inference\.cpp\d/ selector matched the pre-grouping flat list.
  // A session row = any treeitem ending in a time suffix.
  const sessions = page.locator('[role="treeitem"]')
  const count = await sessions.count()
  let opened = false
  for (let i = 0; i < count && i < 16; i++) {
    const label = ((await sessions.nth(i).textContent()) ?? '').trim()
    if (/\d+\s*(min|h|d)\s*$/.test(label)) {
      await sessions.nth(i).click({ timeout: 10_000 })
      opened = true
      break
    }
  }
  // A host without the operator's sessions still carries the seeded
  // bench; the header seat needs SOME open session, so refuse loud here.
  expect.soft(opened, 'a listed session to open (the expand seat needs an open conversation)').toBe(true)
  await page.waitForTimeout(6_000)

  // 2 — expand the right sidebar and open the Cards tab via its guide
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByText('Cards', { exact: true }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)

  // 3 — the bench hydrated: the h3-timeline TILE renders. THE CLICK
  // TARGET LAW (2026-09-13, the hour-6 war): click the TILE BUTTON
  // (the element that owns the onClick), never a bare text node —
  // getByText('h3-timeline') matches the tile's inner label and the
  // click lands on a span whose parent never opens the zoom, and the
  // wall then reports "the form" for a studio that mounted fine.
  const tile = page.locator('button', { hasText: 'h3-timeline' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })

  // 4 — zoom: the studio must claim cards.stage.view. The
  // generic-form fallback renders NONE of these markers. All ten:
  // the full studio surface (tenant + filmstrip + doc readout +
  // timeline bar/ruler/playhead + run panel + audio + route + lora).
  await tile.click({ timeout: 10_000 })
  const markers = [
    'h3-studio-tenant', 'tl-filmstrip', 'tl-doc-readout',
    'motion-timeline-bar', 'motion-timeline-ruler', 'motion-timeline-playhead',
    'tl-run-panel', 'tl-audio-upload', 'tl-route-select', 'tl-lora-panel',
  ]
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })
  for (const m of markers) {
    await expect(page.locator(`[data-testid="${m}"]`), m).toBeVisible()
  }
  // the zoom overlay titles the stage (the CardZoomOverlay shell;
  // exact — a transcript in the chat column can echo the same words)
  await expect(page.getByText('Stage h3-timeline', { exact: true })).toBeVisible({ timeout: 10_000 })

  // 5 — the tour stays error-free
  expect(errors, errors.join('\n')).toEqual([])
})

// NOTE (2026-09-13): the chat-born bench path (estate normalization
// strips stage.card; identity survives on the draft intent) is NOT an
// e2e case — the tab's bench is the host's session-'main' working
// bench, whose contents vary per host, and a read-only tour cannot
// seed a chat-born shape. That law is pinned at BOTH seams in-process:
// readBench's re-attach (tests/cards-resource.spec.ts, three cases)
// and DraftView's consult (tests/draft-view.spec.tsx, the intent-
// cardName pin). The e2e layer owns what only the browser can see:
// the boot graph, the slot claims, and the real-click zoom.
