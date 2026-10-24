// gallery-draft-open.spec — THE FLOWS FACE'S ONE JOB, PROVEN AT THE
// BROWSER (2026-10-19): clicking a served draft row loads its stages
// onto THIS conversation's shared bench and routes the shell to the
// cards tab so the operator watches it land (the media compose
// contract's own receipt — the draft is the persisted half of "the
// flow lands on THE SHARED BENCH, live in the user's cards tab").
//
// The wall pins the full chain door-to-DOM: the drafts door serves
// the row → the click reads /v1/flows/drafts/{id} → the loader
// ensures the bench for the ACTIVE session (never a stranger's) →
// openResource(dsh-resource://cards/bench/<session>) activates the
// cards tab → the rail renders the stage. A break anywhere in that
// chain is one of: no stage on the bench (silent no-op), the stage
// on the WRONG session (a stranger's bench), the tab never routing
// (the stage lands invisible), or a refusal toast the row swallowed.
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the gallery wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

async function openMediaPanel(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
  await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })
}

/** The bench doc's stage count for a session — the shared-bench
 *  receipt read at the door (a fresh conversation owns an empty
 *  shell; the loader's ensure is what fills it). */
async function stageCount(page: Page, sessionKey: string): Promise<number> {
  const doc = (await callBench(page, 'bench/get', { sessionKey }).catch(() => null)) as
    | { stages?: unknown }
    | null
  if (doc === null || !Array.isArray(doc.stages)) return 0
  return doc.stages.length
}

test('clicking a served draft loads its stages onto THIS conversation\'s bench and routes to the cards tab', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  // A fresh conversation owns NO bench doc yet — bench/get refuses
  // unknown sessions (honesty, not an error), so the pre-flight rides
  // the client's own idempotent ensure first: the same verb the
  // draft loader runs before it fills the bench.
  await callBench(page, 'bench/ensure', { doc: { session: mint.sessionKey } })
  expect(await stageCount(page, mint.sessionKey), 'a fresh conversation owns an empty bench').toBe(0)

  await openMediaPanel(page)
  await page.getByRole('button', { name: /^Flows \d+$/ }).first().click({ timeout: 10_000 })

  // THE ROW IS THE DOOR'S OWN: read the served drafts live, then click
  // the lane seed's bench row by its served id — never a baked name
  // (sibling specs board cards; the set only grows).
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
  const drafts = ((JSON.parse(body) as { drafts?: Array<{ draft_id: string }> }).drafts ?? [])
  const target = drafts.find((d) => d.draft_id === 'bench-main') ?? drafts[0]
  expect(target, 'the lane seed bench is served as a draft').toBeDefined()

  await page.locator(`div[data-infer-media-drafts] button[data-draft="${target.draft_id}"]`).click({ timeout: 10_000 })

  // THE SHARED-BENCH RECEIPT: the stage arrives on the ACTIVE
  // conversation's bench (the loader's ensure names this session —
  // a stage on a stranger's bench is the silent no-op's twin).
  // THE POLL RIDES THE DOORS' OWN GRACE (drive-14's #7 red): the
  // restore chain is fetchUntilSeated end to end, and the estate's
  // own law (E2-3, "pending is a wait, not a deadline") lets a
  // 503 estate/pending voice ride past 120s under drive load — a
  // 45s poll reds a door the operator's own law calls lawful.
  // 150s = the doors' ESTATE_WAIT_GRACE_MS (120s) + margin.
  await expect
    .poll(async () => stageCount(page, mint.sessionKey), { timeout: 150_000, message: 'the draft stages land on the conversation bench' })
    .toBeGreaterThan(0)

  // THE ROUTE: openResource activated the cards tab — the rail's own
  // tiles are the visible proof (the Add-a-card affordance is not a
  // stage; the pinned selector excludes it by its aria-label).
  const rail = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
  await expect(rail.first(), 'the cards tab owns the pane and renders the landed stage').toBeVisible({ timeout: 60_000 })
  await expect
    .poll(async () => await rail.count(), { timeout: 30_000, message: 'at least one stage tile on the rail' })
    .toBeGreaterThan(0)

  // THE SWALLOWED REFUSALS never face: the row's own failure voices.
  await expect(page.getByText('could not read that card')).toHaveCount(0)
  await expect(page.getByText(/bench load failed/i)).toHaveCount(0)
  await expect(page.getByText(/the bench refused the load/i)).toHaveCount(0)

  await expectNoPageErrors(page, errors)
})
