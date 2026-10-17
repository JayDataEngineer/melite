// gallery-models.spec — EVERY MODEL THE UI NAMES, THE DOOR SERVES
// (the browser plane, 2026-10-19). The operator's model law: no
// phantom models (a UI that offers what the estate never seated)
// and no model gaps (a door serving families the UI never offers).
// The gallery panel fetches NO catalog itself — its only model
// surface is the draft rows' `{model || card} · {draft_id}` sub-copy
// — so this wall pins the door's shape, the rows' honesty, and the
// hook a lane with card families runs to prove presence.
//
// THE AGENT-PLANE DISTINCTION: muse-spark and its opencode-go kin
// are AGENT models (the estate's agentRoute brain), not card
// families — they ride the estate config and the seating law, never
// /v1/model-catalog. E2E_EXPECT_FAMILY names a CARD family substring
// (a comfyui-served id); against a lane that seats it, the catalog
// must carry it. It is unset on the throwaway lane, where the wall
// pins shape + honesty only.
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the model wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

const EXPECT_FAMILY = process.env.E2E_EXPECT_FAMILY ?? ''

/** The served catalog, read in-page past the boot race (the shell's
 *  auth rides the fetch; the wait voices are transport). */
async function readCatalog(page: Page): Promise<{ models?: unknown; families?: Record<string, { label?: string }> }> {
  const body = await page.evaluate(async () => {
    const deadline = Date.now() + 150_000
    for (;;) {
      const res = await fetch('/v1/model-catalog', { headers: { accept: 'application/json' } })
      const text = await res.text().catch(() => '')
      if (!text.includes('estate/pending')) return text
      if (Date.now() > deadline) return text
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  })
  expect(body, 'the catalog door stops answering the boot race').not.toContain('estate/pending')
  return JSON.parse(body) as { models?: unknown; families?: Record<string, { label?: string }> }
}

test('the catalog door serves well-formed families — never a phantom, never a gap at the door', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  await openAConversation(page)

  const catalog = await readCatalog(page)
  expect(typeof catalog, 'the catalog answers JSON').toBe('object')
  const families = catalog.families ?? {}
  expect(Object.keys(families).length, 'a booted lane seats at least one card family').toBeGreaterThan(0)
  for (const [id, fam] of Object.entries(families)) {
    expect(typeof fam.label === 'string' && fam.label.length > 0, `family ${id} carries a human label`).toBe(true)
  }

  // THE HOOK: a lane that seats card families proves the named one
  // present — run with E2E_EXPECT_FAMILY against a family-seating
  // lane; unset where no family is promised (the throwaway lane).
  if (EXPECT_FAMILY !== '') {
    const ids = [...Object.keys(families), ...Object.keys((catalog.models ?? {}) as Record<string, unknown>)]
    expect(ids.some((id) => id.includes(EXPECT_FAMILY)), `the catalog carries the promised family ${EXPECT_FAMILY}`).toBe(true)
  }

  await expectNoPageErrors(page, errors)
})

test('the drafts face names model-or-card honestly — never a blank, never a phantom', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  await openAConversation(page)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
  await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /^Flows \d+$/ }).first().click({ timeout: 10_000 })

  // The lane seed bench rides model "" — its row must fall back to
  // the honest 'card' word (MediaPanel's `{model || card}` law), and
  // every row's sub-copy must name SOMETHING (a blank model cell is
  // a gap the eye reads as a missing model). The count is NEVER
  // baked: sibling specs board cards onto this lane, so the wall
  // reads the door and asserts agreement with the living state.
  const draftsBody = await page.evaluate(async () => {
    const deadline = Date.now() + 150_000
    for (;;) {
      const res = await fetch('/infer-gallery/drafts', { headers: { accept: 'application/json' } })
      const text = await res.text().catch(() => '')
      if (!text.includes('estate/pending')) return text
      if (Date.now() > deadline) return text
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  })
  expect(draftsBody, 'the drafts door stops answering the boot race').not.toContain('estate/pending')
  const servedIds = ((JSON.parse(draftsBody) as { drafts?: Array<{ draft_id: string }> }).drafts ?? [])
    .map((d) => d.draft_id)
    .filter((id) => id !== '')
  const rows = page.locator('div[data-infer-media-drafts] button[data-draft]')
  await expect(rows, 'one row per served draft — never a phantom').toHaveCount(servedIds.length, { timeout: 30_000 })
  for (const id of servedIds) {
    const row = rows.filter({ hasText: id })
    await expect(row, `the served draft ${id} renders its own row`).toHaveCount(1)
    await expect(row, `the row for ${id} names model-or-card, never a blank`).toContainText('·')
  }
  await expect(
    rows.filter({ hasText: 'bench-main' }),
    'the model-less seed names card honestly',
  ).toContainText('card · bench-main')

  await expectNoPageErrors(page, errors)
})
