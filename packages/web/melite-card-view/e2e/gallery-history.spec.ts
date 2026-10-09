// gallery-history.spec — THE HISTORY PANEL IS A RECEIPT, NEVER A
// RUMOR (the browser plane, 2026-10-19). The operator's law for this
// loop: the Media panel lists EXACTLY what the estate serves — every
// served run aboard exactly once (no drops), nothing else rendered
// (no ghost cards), and the boot race never faces as a terminal
// banner (the history-contract cure's own proof in a real browser:
// the feed stays `loading runs…` through the wait voices, never
// `failed to load runs`).
//
// The agreement is three-way and all three name the same number:
// the served `/infer-gallery/runs` records, the Artifacts pill's
// count, and the wands in the grid (one wand rides every tile by
// construction — decode drops id-less rows, so a wand IS a served
// record made visible). The drafts face pins the honest empty state
// on a lane with no composed cards.
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the gallery wall needs a live host')

/** The served runs feed, read in-page (the shell's auth rides the
 *  fetch) past the boot-race pending answer — the same poll grammar
 *  tour.ts waits the estate out with: the wait voices are transport,
 *  and a single early read would call them a contract failure. */
async function readRunsFeed(page: Page): Promise<{ runs: Array<{ run_id: string }> }> {
  const body = await page.evaluate(async () => {
    const deadline = Date.now() + 150_000
    for (;;) {
      const res = await fetch('/infer-gallery/runs?limit=50', { headers: { accept: 'application/json' } })
      const text = await res.text().catch(() => '')
      if (!text.includes('estate/pending')) return text
      if (Date.now() > deadline) return text
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  })
  expect(body, 'the runs door stops answering the boot race').not.toContain('estate/pending')
  return JSON.parse(body) as { runs: Array<{ run_id: string }> }
}

async function openMediaPanel(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
  await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })
}

test('the artifacts face lists exactly the served runs — no banner, no ghosts, no drops', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  await openAConversation(page)
  await openMediaPanel(page)

  // THE CURE'S PROOF, FIRST: the terminal banner must never face on
  // a seated lane — absence, so the assertion is immediate (no wait
  // that could outlive the banner's own flash).
  await expect(page.getByText('failed to load runs'), 'no terminal banner on a seated lane').toHaveCount(0)

  // THE THREE-WAY AGREEMENT: the door, the pill, the wands.
  const feed = await readRunsFeed(page)
  expect(feed.runs.length, 'the lane seed run is served').toBeGreaterThan(0)
  await expect(
    page.getByRole('button', { name: new RegExp(`^Artifacts ${feed.runs.length}$`) }),
    'the Artifacts pill names the served count',
  ).toBeVisible({ timeout: 30_000 })
  const wands = page.locator('span[aria-label="Open as cards — this run"]')
  await expect(wands, 'one wand per served run — a wand IS a served record made visible').toHaveCount(feed.runs.length)
  await expect(
    page.getByText(`${feed.runs.length} runs`, { exact: false }),
    'the Stat line agrees with the door',
  ).toBeVisible({ timeout: 30_000 })

  // EVERY served record aboard: each run_id's tile carries the wand's
  // tile (the caption names the run's file/prompt — the seed's prompt
  // is the receipt that THIS record rendered, not a same-count
  // stranger).
  await expect(page.getByText('the lane seed image run'), 'the seed record renders its own caption').toBeVisible({ timeout: 30_000 })

  await expectNoPageErrors(page, errors)
})

test('the drafts face lists exactly the served drafts — the lane seed bench aboard', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  await openAConversation(page)
  await openMediaPanel(page)

  await page.getByRole('button', { name: /^Flows \d+$/ }).first().click({ timeout: 10_000 })
  // THE SERVED DRAFT, read off the panel's OWN door (the gallery
  // host route /infer-gallery/drafts — not the flows door the
  // bench-load path rides): the lane seed's bench/ensure surfaces
  // one draft row (bench-main) — the face must render exactly the
  // door's rows, never an empty-state lie.
  const body = await page.evaluate(async () => {
    const deadline = Date.now() + 150_000
    for (;;) {
      const res = await fetch('/infer-gallery/drafts', { headers: { accept: 'application/json' } })
      const text = await res.text().catch(() => '')
      if (!text.includes('estate/pending')) return text
      if (Date.now() > deadline) return text
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  })
  expect(body, 'the drafts door stops answering the boot race').not.toContain('estate/pending')
  const drafts = (JSON.parse(body) as { drafts?: Array<{ draft_id: string }> }).drafts ?? []
  expect(drafts.length, 'the lane seed bench is served as a draft').toBeGreaterThan(0)
  await expect(
    page.getByRole('button', { name: new RegExp(`^Flows ${drafts.length}$`) }),
    'the Flows pill names the served count',
  ).toBeVisible({ timeout: 30_000 })
  const rows = page.locator('div[data-infer-media-drafts] button[data-draft]')
  await expect(rows, 'one row per served draft — never a phantom').toHaveCount(drafts.length)
  for (const d of drafts) {
    await expect(rows.filter({ hasText: d.draft_id }), `the served draft ${d.draft_id} renders its own row`).toHaveCount(1)
  }

  await expectNoPageErrors(page, errors)
})
