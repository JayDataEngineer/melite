/**
 * E2E: a restored run keeps its tile preview — the operator's resume
 * gesture driven end to end on the live host.
 *
 * THE DEFECT (operator, 2026-10-02 — "when I resume historical runs
 * the image preview doesn't auto populate back"): the gallery wand
 * restores a run's workflow onto the bench with a result whose url is
 * the query-carrying artifact route
 * `/infer-gallery/artifact?path=<tail>` — loadable, but its path
 * carries no extension, so the tile's url sniff read null and the
 * NON-ZOOMED tile fell to the kind face while the zoomed drill
 * previewed the very same run. The cure lives in bench-row.ts (the
 * face falls to the artifact-name harvest); this wall drives the
 * REAL gesture (media tab → the wand on an image run's tile) and
 * asserts the tile paints the restored artifact, because only the
 * composed host proves the served bundle carries the cure.
 *
 * Self-skips without E2E_STUDIO_URL, the same law as the rest of
 * this suite. Run: E2E_STUDIO_URL='http://127.0.0.1:3088/?token=…'
 *   pnpm --filter @melite-plugin/dsh-card-view exec playwright test
 *   e2e/restore-preview.spec.ts
 */
import { expect, test } from '@playwright/test'
import { STUDIO_URL, collectPageErrors, expectNoPageErrors, openAConversation, settle } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the restore wall drives the live host’s own gesture')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('the wand-restored image run paints the tile, never the kind face', async ({ page }) => {
  const errors = collectPageErrors(page)
  await settle(page)
  await openAConversation(page)

  // THE GALLERY TAB (the estate plugin's own hard-coded title).
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })

  // An IMAGE run's tile: the wand rides every tile (audio/mesh tiles
  // restore to a kind face BY LAW — not this wall's subject), so the
  // tile button itself must carry an <img> preview. The tile is the
  // wand's button ancestor; :has on a leaf button never climbs.
  const wand = page.locator('button:has(img) span[aria-label="Open as cards — this run"]').first()
  await expect(wand, 'the gallery lists an image run (the lane seed)').toBeVisible({ timeout: 30_000 })
  await wand.click()

  // The wand's own tail opens the cards tab on the restored bench;
  // the media panel unmounts, so the first VISIBLE artifact-route
  // img can only be the tile's own preview. The kind face (the
  // bug's face) renders a span, never an img.
  await expect(
    page.locator('img[src*="infer-gallery/artifact"]').first(),
    'the restored tile paints the artifact route (the non-zoomed preview is back)',
  ).toBeVisible({ timeout: 30_000 })

  await expectNoPageErrors(page, errors)
})
