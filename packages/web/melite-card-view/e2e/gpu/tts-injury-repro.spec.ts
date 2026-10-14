/**
 * E2E GPU — THE OPERATOR'S LIVE INJURY, reproduced (2026-10-12
 * ~20:40): "ALL [REDACTED 2026-11-05] GREEN WHEN THE BASIC VARIANT SWITCHING DOES
 * NOT WORK" — their tts stage (build 09-20 18:47, pre-model-era)
 * carries `voice` + Variant=VoiceDesign and the banner refuses on
 * every open; the wall suite is green the whole time.
 *
 * THE SUSPECT (cardsRegistry.laneMigrate): the migration bails
 * when the STORED doc's params lack a resolvable `model` — a
 * pre-model doc (authored before the model-cell era) NEVER
 * migrates, so the switch refuses forever on its stale carry.
 * The wall drove only modern docs (model cell route stated).
 *
 * This spec seeds the injury-shaped doc verbatim (variant
 * voicedesign + voice stated, NO model key) on a fresh bench and
 * walks the HUMAN path: open the drill → see the operator's exact
 * banner → toggle Variant CustomVoice → assert it LANDS → toggle
 * back VoiceDesign → assert the stale `voice` is DROPPED (banner
 * clear, params carry no voice). If any leg refuses, this spec is
 * the firing red the green suites owe.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from '../tour.ts'

test.skip(
  !STUDIO_URL || process.env.E2E_GPU !== '1',
  'the injury repro needs E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh)',
)

/** Seed a fresh conversation's bench with the injury-shaped stage
 *  through the estate's own ensure door (births at rev 0 — the
 *  historical doc is written whole, exactly as 09-20 left it). */
async function seedInjuryBench(page: Page, sessionKey: string): Promise<void> {
  await callBench(page, 'bench/ensure', {
    doc: {
      session: sessionKey,
      stages: [{
        id: 's_0',
        card: 'tts',
        author: 'user',
        params: {
          // THE 09-20 SHAPE: variant stated, voice stated, NO model
          // key (the model-cell axis did not exist on 09-20).
          variant: 'voicedesign',
          voice: 'Chelsie',
          text: 'the operator\u2019s injury stage, seeded verbatim',
          temperature: 0.05,
        },
      }],
    },
  })
}

test('the pre-model injury stage: the banner fires, and BOTH variant toggles land (the stale voice drops)', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await settle(page)
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  await seedInjuryBench(page, mint.sessionKey)

  // open the cards tab and the tts drill — the operator's exact face
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Media Flow/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(5_000)
  const tile = page.locator('button[class*="tileInner"]:not([aria-label="Add a card"])').first()
  await tile.click({ timeout: 15_000, force: true })
  await expect(page.locator('div[class*="zoomCard"]').first(), 'the drill opens').toBeVisible({ timeout: 30_000 })

  // THE OPERATOR'S BANNER, verbatim class: the lane strip over the form
  const banner = page.getByText("field 'voice' fires nothing on this lane", { exact: false })
  await expect(banner, 'the injury doc re-fires the operator\u2019s banner on open').toBeVisible({ timeout: 20_000 })

  // LEG 1: Variant → CustomVoice must LAND (voice is legal there)
  // THE MENU AXES (S7e): the Variant select is a DSH Menu — open the
  // trigger, click the row.
  const variantBox = page.getByRole('button', { name: 'Variant', exact: true })
  await variantBox.click()
  await page.getByRole('menuitem', { name: 'CustomVoice', exact: true }).click()
  await page.waitForTimeout(4_000)
  // the banner must clear: voice is on CustomVoice\u2019s surface
  await expect(banner, 'LEG 1 lands: voice is legal on CustomVoice — the banner clears').toHaveCount(0, { timeout: 20_000 })

  // LEG 2: Variant → VoiceDesign must LAND and DROP the stale voice
  await variantBox.click()
  await page.getByRole('menuitem', { name: 'VoiceDesign', exact: true }).click()
  await page.waitForTimeout(4_000)
  await expect(banner, 'LEG 2 lands: the migration DROPS the stale voice — the banner never returns').toHaveCount(0, { timeout: 20_000 })

  // the bench doc itself carries no voice key (the drop is in the
  // STORED state, not just the paint). NOTE: the GUI's cards tab
  // composes on the lane's own bench session — mint.sessionKey is
  // the conversation key, a different seat; the drill's paint (the
  // axes the operator reads) is this proof's stored-state face.
  await expect(
    page.getByRole('combobox', { name: 'Variant' }),
    'the paint agrees: VoiceDesign selected, no voice banner, Run unblocked',
  ).toHaveValue(/voicedesign/i)
  const bannerStill = await page.getByText("field 'voice' fires nothing on this lane", { exact: false }).count()
  expect(bannerStill, 'the banner is gone for good').toBe(0)

  await page.screenshot({ path: 'e2e/gpu/tts-injury-cured-proof.png', fullPage: false })
  await expectNoPageErrors(page, errors)
})
