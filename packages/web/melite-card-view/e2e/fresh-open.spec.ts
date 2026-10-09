// fresh-open.spec — THE FRESH CARD'S OPEN IS NEVER AN ERROR (the
// browser plane, 2026-10-18). The operator's live face: opening a
// freshly added image card showed "this lane requires 'prompt' …"
// the instant the drill opened — a refusal for a word the operator
// had not typed YET, replayed from a row the old terminal-failure
// carry poisoned. The unit tier pins the carry seats against the
// fakes; this wall pins the LIVE estate, because the bug's whole
// shape was a seam the fakes cannot see — what the host SERVES for
// a row the operator never ran.
//
// The contract, in two sentences: a fresh card opens CLEAN (no red
// face anywhere in the tab), and a refused Run press NEVER leaves a
// red face that outlives the press — close the drill, open it
// again, the row reads never-ran. The refusal lives exactly as long
// as the claim that voiced it.
import { expect, test } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, openCardsWithBench, readBenchRow, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

/** The tab's red faces, by the STABLE seats only: the zoom strip's
 *  run-error and the drill's write face are testids (the browser
 *  plane hashes class names — a `.runError` selector matches
 *  nothing real), the lane-warn strip is its data attribute, and
 *  the refusal's own voice is matched as TEXT across every
 *  relation the judge speaks (requires, conflicts, together).
 *  Zero on a fresh open; zero again after a refused press retires. */
async function expectNoRedFace(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('[data-testid="drill-run-error"]'), 'no run error on the zoom strip').toHaveCount(0)
  await expect(page.locator('[data-testid="stage-write-face"]'), 'no write face in the drill').toHaveCount(0)
  await expect(page.locator('[data-lane-warn]'), 'no lane-warn strip on a fresh open').toHaveCount(0)
  await expect(page.getByText(/refuses the state|this lane requires|conflict on this lane|ride together on this lane/), 'no lane-refusal voice anywhere').toHaveCount(0)
}

test('a fresh card opens clean, and a refused Run never poisons the next open', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the bench lives in the conversation)').toBe(true)
  expect(sessionKey, 'the mint names its conversation').not.toBe('')
  await openCardsWithBench(page, sessionKey)

  // THE ADD DOOR (the operator's own path): a fresh image card.
  await page.getByRole('button', { name: 'Add a card' }).first().click({ timeout: 20_000 })
  const card = page.getByRole('button', { name: 'Generate Image', exact: true }).first()
  await expect(card, 'the image card offered in the add door').toBeVisible({ timeout: 20_000 })
  await card.click({ timeout: 10_000 })

  // THE DRILL OPENS ON THE FRESH ROW (the open-on-add law) — and
  // THE OPERATOR'S CHECK: the open is CLEAN. No typed prompt yet
  // (the incomplete draft the add door seats), and no face in the
  // tab complains about it.
  const prompt = page.getByLabel('Prompt', { exact: false }).first()
  await expect(prompt, 'the added card opens with its declared form').toBeVisible({ timeout: 30_000 })
  await expectNoRedFace(page)

  // THE REFUSED PRESS: Run without typing. The refusal is the
  // door's own voice, claimed AT THE PRESS — the tab must carry
  // the WHY while the claim is live.
  await page.locator('[data-testid="drill-run"]').first().click({ timeout: 10_000 })
  await expect
    .poll(async () => page.getByText(/this lane requires/).count(), { timeout: 30_000 })
    .toBeGreaterThan(0)

  // …and the CLAIM RETIRES WITH THE DRILL: close, reopen — the row
  // reads never-ran. THE PERSISTED SEATS are the wall: the zoom
  // strip's run-error face (the replay the operator lived) must be
  // gone, and the STORED row must carry no failed face (the tab's
  // own local claim may linger until the next gesture — that is its
  // law, and it dies with the tab, never with the row).
  await page.getByRole('button', { name: 'Collapse card' }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(1_000)
  const tile = page.getByRole('button', { name: /Image Gen Remove stage/ }).first()
  await expect(tile, 'the bench still carries the card').toBeVisible({ timeout: 20_000 })
  await tile.click({ timeout: 10_000 })
  await expect(prompt, 'the drill reopens on the same row').toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid="drill-run-error"]'), 'the replay face is dead').toHaveCount(0)
  await expect(page.locator('[data-testid="stage-write-face"]'), 'no write face on reopen').toHaveCount(0)

  // THE RECEIPT IS THE DOC: the bench row the host serves carries
  // no terminal failure for the refused press — neither a failed
  // status word NOR an error body riding a healed one (the result
  // map's own error key is the carry's other seat).
  const row = await readBenchRow(page, sessionKey)
  expect(row, 'the stored row never carries the refusal as a run outcome').not.toMatch(/"runStatus"\s*:\s*"(failed|error)"/)
  expect(row, 'the stored result map carries no refusal error body').not.toMatch(/"error"\s*:\s*"[^"]*"/)

  await expectNoPageErrors(page, errors)
})
