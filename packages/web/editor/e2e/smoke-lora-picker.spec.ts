/**
 * SMOKE: LoRA picker — per-model LoRA listing from the browser.
 *
 * Fast (no GPU). Proves the per-model LoRA contract on the LIVE surfaces
 * (rewritten 2026-08-06 for R1): LoRAs are authored on Library CARDS via
 * the detail modal's schema-driven Modifiers panel — the DirectorStudio
 * LoRA slot died with the Phase B generic-video rework, and the
 * sidebar AssetsTab form died with R1. Two card capabilities tested:
 *   - Edit cards (qwen-img-edit-2511): qwen/ folder LoRAs
 *   - Video cards (ltx): ltx2/ folder LoRAs
 *   - Video card switched to scail2 (no lora_dir): NO Modifiers trigger
 *     at all — the schema gate IS the "no loras" contract.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/smoke-lora-picker.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { gotoLibrary, openPicker, switchCardModel } from './helpers/r1Card'
import { getLoraOptions, selectLora, expectLoraSelected } from './helpers/loraFlow'

/**
 * Open the Library card canvas, pick a capability, and open the card's
 * Modifiers modal.
 */
async function openCardModifiers(page: Page, capability: RegExp): Promise<void> {
  await gotoLibrary(page)
  const dialog = await openPicker(page)

  // Pick the capability → the card lands and the detail modal auto-opens
  // in edit mode (no result yet).
  await dialog.getByRole('button', { name: capability }).first().click()
  await page.waitForSelector('[data-card-detail]', { timeout: 15_000 })
  const modal = page.locator('[data-card-detail]')

  // The Modifiers trigger renders once the form-spec fetch resolves and the
  // schema gate (features.loras.capability) passes.
  const trigger = modal.getByRole('button', { name: /Add Modifiers/i })
  await trigger.waitFor({ state: 'visible', timeout: 15_000 })
  await trigger.click()
  await page.getByRole('heading', { name: 'LoRA Adapters' }).waitFor({ state: 'visible', timeout: 10_000 })
}

test.describe('LoRA picker — per-model listing', () => {

  test('Edit card: qwen-img-edit-2511 shows ≥1 LoRA from qwen/ folder', async ({ page }) => {
    await openCardModifiers(page, /^Edit/)

    const options = await getLoraOptions(page)
    console.log(`  Edit LoRA options: ${JSON.stringify(options)}`)
    // Live-disk count — assert ≥1 (was a pinned 2 before the catalog grew).
    expect(options.length, 'qwen-img-edit-2511 should show ≥1 LoRA').toBeGreaterThanOrEqual(1)
    expect(options.join(' ').toLowerCase()).toContain('multiple-angles')
  })

  test('Edit card: LoRA selection appears as a chip', async ({ page }) => {
    await openCardModifiers(page, /^Edit/)

    await selectLora(page, 'multiple-angles')
    await expectLoraSelected(page, 'multiple-angles')
  })

  test('Video card: ltx shows distilled LoRA from ltx2/', async ({ page }) => {
    await openCardModifiers(page, /^Video/)

    const options = await getLoraOptions(page)
    console.log(`  Video ltx LoRA options: ${JSON.stringify(options)}`)
    expect(options.length, 'ltx should show ≥1 LoRA from ltx2/').toBeGreaterThanOrEqual(1)
    expect(options.join(' ').toLowerCase()).toContain('distilled')
  })

  test('Video card: LoRA selection appears in the picker', async ({ page }) => {
    await openCardModifiers(page, /^Video/)

    await selectLora(page, 'distilled')
    await expectLoraSelected(page, 'distilled')
  })

  test('Video card on scail2 (no lora_dir): no Modifiers trigger at all', async ({ page }) => {
    // Switch the Video tile to the scail2 route — its family declares no
    // loras, so the form-spec gate kills the trigger. The schema IS the
    // contract (no loras → no LoRA UI, exactly like the vitest gate).
    await gotoLibrary(page)
    const dialog = await openPicker(page)
    // Models are not entries (2026-09-04): land the Video tile, then
    // switch the card's Model select to scail2's only member model
    // scail2-animate (a form_video_director sibling of the tile default).
    await dialog.getByRole('button', { name: /^Video/, exact: false }).first().click()

    await page.waitForSelector('[data-card-detail]', { timeout: 15_000 })
    const modal = page.locator('[data-card-detail]')
    await switchCardModel(modal, 'scail2-animate')

    // Give the form-spec fetch a beat — the trigger must stay absent.
    await page.waitForTimeout(2000)
    expect(await modal.getByRole('button', { name: /Add Modifiers/i }).count(), 'scail2 has no loras/controlnet → no trigger').toBe(0)
    console.log('  ✓ scail2 card: Modifiers trigger correctly absent (schema gate)')
  })
})
