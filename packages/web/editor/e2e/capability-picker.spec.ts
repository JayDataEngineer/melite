/**
 * E2E: Capability-first picker (docs/design/capability-layer.md).
 *
 * The user authors on the Library card canvas by adding cards. The picker
 * surface is CAPABILITIES — "Generate", not "Anima"/"Krea 2": intent tiles
 * with backend-precomputed resolved defaults (model route + merged params,
 * capabilities.<id>.resolved). MODELS ARE NOT ENTRIES (operator order,
 * 2026-09-04): the "All models" expander is GONE — no family tile exists.
 * A specific model is chosen on the CARD (the card form's Model select)
 * after the capability tile lands it.
 *
 * No GPU: authoring only — picking a capability must land a card tile with
 * the resolved service + auto-open the detail modal, without any generation.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/capability-picker.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
}

// The app boots to the AGENT tab (startup default, user 2026-08-06) — the
// Library card canvas is a header tab, not the landing surface.
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
  await dialog.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('Capability-first picker on the Library canvas', () => {
  test('shows capability tiles, not model names', async ({ page }) => {
    await gotoLibrary(page)
    await openPicker(page)

    const dialog = page.getByRole('dialog')
    // The six intent tiles — the ONLY primary surface.
    for (const label of ['Generate Image', 'Edit Image', 'Video', 'Audio', '3D', 'Enhance Image']) {
      await expect(dialog.getByRole('button', { name: new RegExp(`^${label} `) })).toBeVisible()
    }
    // No model names as primary tiles — the capability hides them.
    await expect(dialog.getByRole('button', { name: /^Krea 2/ })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /^Anima/ })).toHaveCount(0)
    console.log('  ✓ capability tiles (Generate Image/Edit Image/Video/Audio/3D/Enhance Image) shown, no model names')
  })

  test('picking Generate lands a krea-2 card + auto-expands the detail inline', async ({ page }) => {
    await gotoLibrary(page)
    await openPicker(page)

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Generate Image/ }).click()

    // The picker closes and the card auto-expands inline (the focused
    // card renders [data-card-detail] via CardDetailInline — NOT a
    // collapsed [data-card-tile], which only siblings render). The
    // resolved service + capability title are in the detail header.
    const detail = page.locator('[data-card-detail]')
    await detail.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(detail).toContainText('krea-2')
    await expect(detail).toContainText('Generate Image')

    // Resolved defaults are seeded — no output yet, prompt is the first action.
    await expect(detail).toContainText('No output yet')
    await expect(detail.getByRole('button', { name: 'Run' })).toBeVisible()
    console.log('  ✓ Generate → krea-2 card + inline detail with seeded params')
  })

  test('the tile model switcher swaps the model under the same capability', async ({ page }) => {
    await gotoLibrary(page)
    await openPicker(page)

    const dialog = page.getByRole('dialog')
    // The Generate tile's switcher lists the non-default member-family
    // routes (backend-precomputed). Switch to z-image.
    await dialog.locator('select').first().selectOption('z-image')

    // Dialog closes; the new card auto-expands with z-image as its
    // service — same capability title, with z-image's own per-model
    // defaults from the backend. The detail (not a collapsed tile)
    // carries both.
    const detail = page.locator('[data-card-detail]')
    await detail.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(detail).toContainText('z-image')
    await expect(detail).toContainText('Generate Image')
    console.log('  ✓ model switcher: Generate Image → z-image, same capability')
  })

  test('an Edit card exposes the image attach control + previews the file', async ({ page }) => {
    await gotoLibrary(page)
    await openPicker(page)

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Edit Image/ }).click()

    // The card lands with a null input_image slot — the inline detail's
    // Input slots section (CardDetailModal → InputSlotsSection →
    // AttachControl) renders the file picker. No thumbnail yet.
    await page.waitForSelector('[data-card-detail]', { timeout: 15_000 })
    const detail = page.locator('[data-card-detail]')
    const slotsSection = detail.locator('text=Input slots')
    await slotsSection.waitFor({ state: 'visible', timeout: 15_000 })

    // The AttachControl file picker is the hidden input tagged
    // data-attach-input (avoids strict-mode violations — the Modifiers
    // modal also hosts a file input in the same subtree).
    const input = detail.locator('input[data-attach-input]').first()
    await input.setInputFiles('e2e/fixtures/sample.png')
    // The thumbnail carries alt="<slot>" (the AttachControl's label
    // prop = the slot name) — same shape the old in-editor attach used.
    await detail.locator('img[alt="input_image"]').waitFor({ state: 'visible', timeout: 15_000 })
    const thumbSrc = await detail.locator('img[alt="input_image"]').getAttribute('src')
    expect(thumbSrc?.startsWith('data:image/png')).toBe(true)

    // Detach (X) is present — the slot is attached and clearable.
    await expect(detail.getByRole('button', { name: 'Detach' })).toBeVisible()
    console.log('  ✓ Edit card: AttachControl file pick + dataUrl thumbnail (authoring only)')
  })

  test('NO All-models expander — the model level is not an inference surface', async ({ page }) => {
    // Operator order, 2026-09-04: "the only way to actually do inference is
    // through action cards, yet I see the model level as available for
    // inference." The expander is GONE; a model name matches only its
    // hosting capability's tile (route-model search), never a model tile.
    await gotoLibrary(page)
    await openPicker(page)

    const dialog = page.getByRole('dialog')
    const search = dialog.getByPlaceholder('Search cards and capabilities…')

    // No expander control anywhere in the dialog.
    await expect(dialog.getByText(/All models/)).toHaveCount(0)

    // "anima" matches no capability label → the tiles section disappears…
    await search.fill('anima')
    await expect(dialog.getByText('What do you want to make?')).toHaveCount(0)
    // …and NO model tile takes its place.
    await expect(dialog.getByRole('button', { name: /^Anima/ })).toHaveCount(0)

    // A route-model search ("krea-2") surfaces the hosting capability tile.
    await search.fill('krea-2')
    await dialog.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 15_000 })

    // Clearing restores the capability surface.
    await search.fill('')
    await dialog.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 15_000 })
    console.log('  ✓ no model tiles anywhere; route-model search surfaces the capability')
  })
})
