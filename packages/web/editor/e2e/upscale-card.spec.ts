/**
 * E2E: Upscale card regression — the 2026-08-07 form-spec fix.
 *
 * The upscale card once showed a GENERATION model picker (Anima, Krea 2,
 * every form_generate family) and a REQUIRED prompt field. Root causes
 * (all fixed 2026-08-07, commit 8682ab01):
 *   1. form_spec's catch-all silently served a fake {prompt, seed} form
 *      for any form with no builder → now a loud error (gate test).
 *   2. ParamEditor pinned the model picker to form_generate → now derives
 *      from cat.models[stage.service].form, so a form with no visible
 *      siblings (all upscale models are hide_from_dropdown) yields a
 *      picker with exactly the stage's own model.
 *   3. build_upscale didn't exist → form_upscale → build_upscale now
 *      composes the real graph (pixel SR / SeedVR2 diffusion).
 *
 * This spec proves the USER-VISIBLE contract on the real stack (no GPU —
 * authoring only, same as capability-picker.spec.ts):
 *   - the Upscale tile lands a card whose model is the upscale default
 *   - the detail modal's params show ONLY upscale knobs (resolution,
 *     batch size, downscale first, target scale, seed) — no prompt
 *   - the edit-mode model picker has exactly ONE option (the stage's
 *     own model) — never the generation families
 *   - the empty state never tells a prompt-less card to "type your prompt"
 *   - POSITIVE CONTROL: a Generate card (form_generate) still offers the
 *     full visible sibling set + its prompt textarea — proving the upscale
 *     behavior derives from the schema (prompt_in_form), not a global
 *     collapse of the picker or a global prompt gutting.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/upscale-card.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
}

async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

async function openPicker(page: Page): Promise<void> {
  const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await addBtn.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
}

/** Land an Upscale card from the action-card picker (the operator's
 *  upscale_tools_card manifest — the old "Enhance Image" capability tile
 *  died with the capability grid, 2026-09-04). Returns the auto-expanded
 *  detail locator (the focused card renders [data-card-detail]). */
async function landUpscaleCard(page: Page): Promise<void> {
  await gotoLibrary(page)
  await openPicker(page)
  await page.getByRole('dialog').getByRole('button', { name: /^Upscale / }).first().click()
  const modal = page.locator('[data-card-detail]')
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  return modal
}

test.describe('Upscale card (2026-08-07 regression)', () => {
  test('lands with the upscale default model, not a generation family', async ({ page }) => {
    await landUpscaleCard(page)

    // The card auto-expands — assert against [data-card-detail] (the
    // detail carries the title + service badge).
    const detail = page.locator('[data-card-detail]')
    await expect(detail).toContainText('Enhance Image')
    // The resolved model is the capability's default family → first
    // member (seedvr2_upscale → seedvr2_ema). Never a
    // generation model route (krea-2/anima/…).
    await expect(detail).toContainText('seedvr2')
    console.log('  ✓ Enhance Image card lands with the seedvr2 default model')
  })

  test('detail modal params are ONLY upscale knobs — no prompt field', async ({ page }) => {
    const modal = await landUpscaleCard(page)

    // The params grid (auto-edit mode for result-less cards) shows the
    // real schema keys (lowercased, _ → space).
    for (const key of ['resolution', 'batch size', 'downscale first', 'target scale', 'seed']) {
      await expect(modal.getByText(key, { exact: true })).toBeVisible()
    }
    // The fake {prompt, seed} fallback form is dead — no prompt anywhere
    // in the params area (exact-match: the "No output yet" hint is a
    // different element and must not contain the word either).
    await expect(modal.getByText('prompt', { exact: true })).toHaveCount(0)
    await expect(modal.getByText('negative prompt', { exact: true })).toHaveCount(0)
    console.log('  ✓ params grid = upscale knobs only, no prompt')
  })

  test('edit-mode model picker offers EXACTLY the stage model — no generation families', async ({ page }) => {
    const modal = await landUpscaleCard(page)

    // Result-less cards auto-enter edit mode (CardDetailModal) — the
    // picker is already live; there is no "Edit params" button to click.
    const modelSelect = modal.locator('select')
    await modelSelect.waitFor({ state: 'visible', timeout: 10_000 })

    // The picker derives from the stage's form (form_upscale) — its
    // visible sibling set is empty (all upscale models hide_from_dropdown),
    // so exactly one option: the stage's own model. The pre-fix behavior
    // offered every form_generate family (Anima/Krea 2/…).
    const options = modelSelect.locator('option')
    await expect(options).toHaveCount(1)
    await expect(options.first()).toHaveValue('seedvr2_ema')
    console.log('  ✓ edit-mode model picker = exactly seedvr2_ema')

    // No prompt textarea — upscaling is not generation.
    await expect(modal.locator('textarea')).toHaveCount(0)
    await expect(modal.getByText('Prompt', { exact: true })).toHaveCount(0)
    console.log('  ✓ no prompt textarea in edit mode')
  })

  test('empty state copy is schema-honest — never "type your prompt" for a prompt-less card', async ({ page }) => {
    const modal = await landUpscaleCard(page)

    // The card has no output yet → the empty-state hint shows, but it
    // must not instruct a prompt-less stage to type a prompt.
    const hint = modal.locator('span', { hasText: 'No output yet' })
    await expect(hint).toHaveCount(1)
    await expect(hint).not.toContainText('prompt')
    await expect(hint).toContainText('parameters')
    console.log('  ✓ empty state says "set your parameters", not "type your prompt"')
  })

  test('POSITIVE CONTROL — Generate card picker offers every visible form_generate model + a prompt field', async ({ page }) => {
    // The upscale assertions above could be trivially green if the picker
    // ALWAYS collapsed to one option and the seed ALWAYS dropped the prompt.
    // This control proves the picker derives from the stage's form and the
    // seed follows prompt_in_form: a Generate card (form_generate) must
    // offer MULTIPLE models across families and keep its prompt textarea.
    await gotoLibrary(page)
    await openPicker(page)
    // The tile's accessible name is label + description + resolved route
    // concatenated ("Generate Image Generate images from text prompts.
    // krea-2 · krea-2"), so /^Generate Image$/ can never match — but
    // /^Generate Image/ would also match a future "Generate Image …". Target
    // the tile whose label span is EXACTLY "Generate Image" (the image
    // capability).
    await page.getByRole('dialog').locator('button').filter({
      has: page.getByText('Generate Image', { exact: true }),
    }).click()
    // The Generate card auto-expands inline ([data-card-detail]).
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })

    // Result-less cards auto-enter edit mode (CardDetailModal) — the
    // picker is already live; there is no "Edit params" button to click.
    const modelSelect = modal.locator('select')
    await modelSelect.waitFor({ state: 'visible', timeout: 10_000 })

    // More than one option, spanning distinct families (anima + krea) —
    // the per-form sibling set, not a collapse-to-one fallback.
    const options = modelSelect.locator('option')
    await expect(options.first()).not.toHaveCount(0)
    const values: string[] = await options.evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value))
    expect(values.length).toBeGreaterThan(1)
    expect(values).toContain('anima-base')
    expect(values).toContain('krea-2')
    console.log(`  ✓ Generate model picker = ${values.length} options (${values.join(', ')})`)

    // And the prompt textarea IS present for a prompt-bearing form —
    // prompt_in_form gates the seed, it does not gut generation cards.
    await expect(modal.locator('textarea')).toHaveCount(1)
    await expect(modal.getByText('Prompt', { exact: true })).toBeVisible()
    console.log('  ✓ Generate card keeps its prompt textarea')
  })
})
