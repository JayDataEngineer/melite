/**
 * from-media.spec — THE LIVE REPRODUCTION (#41 report: "the 'From
 * media' on input cards is BROKEN"), reshaped 2026-09-21 from an
 * exploratory repro into a real wall: it rides the SAME fresh-host
 * spine as studio-render (tour.ts — mint a conversation, birth its
 * bench, seed the h3 stage, open the estate's guide tab), zooms the
 * studio, opens an input square's source menu, and picks From media.
 * The modal must serve the runs library — the card-base picker
 * contract: title 'From media', description 'The runs library', and
 * either pick rows (source-pick-row) or the honest empty state, with
 * zero page errors across the whole flow.
 */
import { expect, test } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('From media on an input card: menu opens, modal lists the runs library, a pick lands', async ({ page }) => {
  // THE LEDGER IS THE SPINE'S (tour.ts), not a third hand-rolled copy:
  // only the shared collector knows the cold host's boot-race 503s and
  // the wall's own readiness probe are transport, not page errors — a
  // local listener re-records both and fails every cold-lane run.
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the source menu lives inside the studio)').toBe(true)
  await openCardsWithBench(page, sessionKey)

  // the h3-timeline tile (seeded by the spine) — the studio door
  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })
  await tile.click({ timeout: 10_000 })
  // the studio must claim the view before its input squares exist
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })

  // an input square (card-base's SourceRow grammar: aria-label
  // '<seat> source'). The FirstFrameSlot squares live INSIDE the
  // call editor — open the seeded call's block on the timeline
  // (the professional-names stroke renamed the '#0' call button:
  // the timeline names calls 'C1 · 7.3s — …'). The CLICK SEAT is
  // the clip BLOCK, never its title span — the span resolves but
  // sits unclickable (clipped by the block's own layout, drive-11's
  // two-round stability wait); the block carries the 'click a call
  // = edit it in the left panel' contract.
  const callRow = page.locator('[class*="clip"]').filter({ hasText: /^C1 ·/ }).first()
  await callRow.click({ timeout: 10_000 })
  await page.waitForTimeout(1_500)
  const square = page.locator('[aria-label*="source"i]').locator('visible=true').first()
  await expect(square, 'an input source square in the studio').toBeVisible({ timeout: 20_000 })
  await square.click({ timeout: 10_000 })
  await page.waitForTimeout(1_000)
  await page.getByText('From media', { exact: true }).first().click({ timeout: 10_000 })

  // THE PICKER CONTRACT (card-base square-provider): the modal is
  // titled 'From media', described 'The runs library', and serves
  // either pick rows or the honest empty state — never a dead pane.
  // The pane's first verb fires the lazy estate bind (the order-proof
  // law: the studio's singleton binds at first use), so the branch
  // decision WAITS for the pane to settle — rows OR the empty state
  // — before counting (a count raced against the load reads 0 with
  // no empty text yet: the dead-pane false positive). The locator
  // NAMES its dialog: the bench carries the h3 studio's stage overlay
  // (role=dialog, 'Stage h3-timeline') on the seeded stage, and a
  // bare [role=dialog] strict-violates against it — the lane's first
  // served-plane green run exposed it, 2026-10-13.
  await expect(page.getByRole('dialog', { name: 'From media' }), 'the picker modal opens').toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('The runs library').first()).toBeVisible({ timeout: 10_000 })
  const rows = page.locator('[data-testid="source-pick-row"]')
  await expect(
    rows.first().or(page.getByText('nothing to pick yet')),
    'the pane settles: pick rows or the honest empty state',
  ).toBeVisible({ timeout: 15_000 })
  const rowCount = await rows.count()
  if (rowCount === 0) {
    await expect(page.getByText('nothing to pick yet'), 'the honest empty state when the runs library is empty').toBeVisible()
  } else {
    // a pick lands: clicking a row closes the modal and writes the
    // source. The studio answers with EITHER face — the detach
    // affordance (the seat accepted the source) or its own vocabulary
    // law (h3's first-frame seat only accepts timeline-vocabulary
    // sources: "that source is not in this timeline's vocabulary").
    // Both are the pick LANDING; a dead pane or a swallowed click is
    // the #41 outage.
    await rows.first().click({ timeout: 5_000 })
    await expect(page.getByRole('dialog', { name: 'From media' }), 'the modal closes on pick').toBeHidden({ timeout: 10_000 })
    await expect(
      page.locator('[aria-label*="detach"i]').first()
        .or(page.getByText("that source is not in this timeline’s vocabulary").or(page.getByText("that source is not in this timeline's vocabulary"))),
      'the picked source lands: detach affordance or the seat\'s honest vocabulary law',
    ).toBeVisible({ timeout: 10_000 })
  }

  await expectNoPageErrors(page, errors)
})
