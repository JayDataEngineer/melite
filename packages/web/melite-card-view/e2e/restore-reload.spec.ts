/**
 * E2E: a reload restores the cards tab layout and its bench stage —
 * the tab-restore residue's owed proof (roadmap, 2026-10-13).
 *
 * THE LAW: the sidebar kit persists and restores layouts; the
 * provider seat is cards-resource.ts (the run hydrates from
 * runs/status after their own edits). The obsolete shim is gone.
 * What was never proven: the REAL gesture — the maker has the Media
 * Flow tab open with a bench stage on it, reloads the page (client
 * state dies), and the tab's layout comes back WITHOUT re-opening
 * anything. This wall drives exactly that: seed → open → assert the
 * stage tile → reload → assert the SAME tile is visible again, no
 * sidebar click, no tab click. A hole here names its fix seat
 * (cards-resource.ts, provider-side restore); the wall never
 * re-drives the open gestures after the reload — that would prove
 * nothing.
 *
 * Self-skips without E2E_STUDIO_URL, the same law as the rest of
 * this suite. Run: E2E_STUDIO_URL='http://127.0.0.1:3907/?token=…'
 *   pnpm --filter @melite-plugin/dsh-card-view exec playwright test
 *   e2e/restore-reload.spec.ts
 */
import { expect, test } from '@playwright/test'
import { collectPageErrors, dismissOnboarding, expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the reload wall drives the live host’s own gesture')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('a reload restores the cards tab and its bench stage without re-opening', async ({ page }) => {
  const errors = collectPageErrors(page)
  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the bench lives in the conversation)').toBe(true)
  expect(sessionKey, 'the mint names its conversation').not.toBe('')
  await openCardsWithBench(page, sessionKey)

  // The layout landed BEFORE the reload: the h3 stage's tile on the
  // open Melite Bench tab (the same marker studio-render walls ride).
  const tile = page.locator('button', { hasText: 'h3-timeline' }).first()
  await expect(tile, 'the seeded stage paints before the reload').toBeVisible({ timeout: 20_000 })

  // THE RELOAD — every client-side layout atom dies here. The
  // first-run dialogs return with the fresh context (tour.ts:
  // dismissOnboarding's own law), so they are dismissed again; the
  // OPEN gestures are never repeated — restoration is the subject.
  await page.reload()
  await dismissOnboarding(page)

  await expect(
    tile,
    'the reload restores the tab layout — the stage tile paints again with no re-open gesture',
  ).toBeVisible({ timeout: 30_000 })

  await expectNoPageErrors(page, errors)
})
