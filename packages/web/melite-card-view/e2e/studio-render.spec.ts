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

  // 1 — open the newest listed session (text "<workspace><N>min"; the
  // expand button lives in an open conversation's header, nowhere else)
  const sessions = page.locator('[role="treeitem"]')
  const count = await sessions.count()
  let opened = false
  for (let i = 0; i < count && i < 12; i++) {
    const label = ((await sessions.nth(i).textContent()) ?? '').trim()
    if (/^inference\.cpp\d/.test(label)) {
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

  // 3 — the bench hydrated: the seeded h3-timeline stage row renders
  const row = page.getByText('h3-timeline', { exact: true }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })

  // 4 — open the card: the studio must claim cards.stage.view. The
  // generic-form fallback renders NONE of these markers.
  await row.click({ timeout: 10_000 })
  await expect(page.locator('[data-testid="motion-timeline-bar"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid="motion-timeline-ruler"]')).toBeVisible()
  await expect(page.locator('[data-testid="motion-timeline-playhead"]')).toBeVisible()
  await expect(page.locator('[data-testid="tl-doc-readout"]')).toBeVisible()

  // 5 — the tour stays error-free
  expect(errors, errors.join('\n')).toEqual([])
})
