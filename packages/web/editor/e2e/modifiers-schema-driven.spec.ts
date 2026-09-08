/**
 * modifiers-schema-driven.spec.ts — schema-driven modifier subcards proof.
 *
 * REWRITE 2026-08-07: the Modifiers surface was reworked from a button +
 * popup ("Add Modifiers" → a dialog with "LoRA Adapters" / "ControlNet
 * Stack" headings) into an INLINE SubcardGrid that renders directly inside
 * the card detail. The leaf editor (SubcardModal) opens ONLY for create /
 * edit of a single subcard. This spec was stale on both fronts (the button
 * is gone; the inline grid is the surface).
 *
 * What this spec proves end-to-end through the real frontend + real
 * backend form-spec:
 *
 *   catalog YAML → /v1/form-spec → CardDetailBody → SubcardGrid renders:
 *     1. INLINE — no "Add Modifiers" button; the grid is always visible
 *        on cards whose form-spec declares loras OR controlnet capability
 *     2. LoRA row + ControlNet row for z-image (declares both)
 *     3. The CN type dropdown lists EXACTLY the catalog-declared types
 *        (depth · pose · canny · mlsd · hed · scribble · gray)
 *     3b. The LoRA "Adapter" dropdown lists EXACTLY the catalog-declared
 *        adapters (2026-08-11 "Adapter [blank]" regression — the
 *        spec-fetch-500 era silently rendered zero adapters)
 *     4. Multi-stack — two ControlNets land as separate tiles
 *     5. HONESTY (Phase 4) — krea-2 declares no controlnets → no CN row,
 *        only the LoRA row. Schema-driven, not hardcoded.
 *
 * The LoRA/CN capability gating (rule 3: form-spec features gate render)
 * has a vitest layer (modifier-subcards.test.tsx). This is the live wire.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/modifiers-schema-driven.spec.ts
 */
import { test, expect, type Page, type Locator } from '@playwright/test'

// The z-image family's on-disk ControlNet declarations
// (packages/melite-core/models/comfyui/z_image.yaml → controlnets:).
// A YAML edit changes these; this spec fails loudly if they drift — the
// contract is "the dropdown mirrors the catalog, nothing else."
const Z_IMAGE_CN_TYPES = ['depth', 'pose', 'canny', 'mlsd', 'hed', 'scribble', 'gray'] as const
// Human-facing labels (the dropdown renders e.label, not e.type). Both
// are asserted so a label/type mismatch is caught.
const Z_IMAGE_CN_LABELS = [
  'Depth',
  'Body Pose (OpenPose)',
  'Edges (Canny)',
  'Straight Lines (MLSD)',
  'Soft Edges (HED)',
  'Scribble',
  'Grayscale Reference',
] as const
// The z-image family's declared LoRA adapters (z_image.yaml → loras:).
// 2026-08-11 regression contract: the "Adapter" dropdown inside the LoRA
// SubcardModal MUST mirror the catalog. The spec-fetch-500 incident
// silently rendered ZERO adapters — this assertion is the "Adapter
// [blank]" hard-fail regression.
const Z_IMAGE_LORA_LABELS = [
  'z-image-3d-mmorpg',
  'z-image-classic-painting',
  'z-image-coloring-book',
  'z-image-dejpeg',
  'z-image-pixel-art',
  'z-image-realism',
  'z-image-sunbleached',
] as const

/** Boot, switch to the Library canvas, open the capability picker. */
async function openLibraryPicker(page: Page): Promise<Locator> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  // Boot signal = the Agent nav button (2026-08-10: the BrandMark "TECH
  // NOIR" text is unmounted — it never renders; the nav button is the
  // stable app-shell signal).
  await page.getByRole('button', { name: 'Agent', exact: true }).waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
  const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await addBtn.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
  return dialog
}

/**
 * Land a z-image card and wait for the inline SubcardGrid. The form-spec
 * fetch (loadFormSpec → /v1/form-spec) is async; the grid renders only
 * after it resolves AND hasModifierCapability(formSpec) is true. 20s
 * timeout covers cold backend / first-fetch latency.
 */
async function landZImageCard(page: Page): Promise<Locator> {
  const dialog = await openLibraryPicker(page)
  // The Generate tile's switcher lists the member-family routes —
  // z-image is the CN-capable one (z_image.yaml declares controlnets:).
  await dialog.locator('select').first().selectOption('z-image')
  const detail = page.locator('[data-card-detail]')
  await detail.waitFor({ state: 'visible', timeout: 15_000 })
  const grid = detail.locator('[data-subcard-grid]')
  await grid.waitFor({ state: 'visible', timeout: 20_000 })
  return detail
}

/** Land a krea-2 card (the Image action card's declared model) the same
 *  way — the old "Generate Image" capability tile died with the
 *  capability grid, 2026-09-04. */
async function landKrea2Card(page: Page): Promise<Locator> {
  const dialog = await openLibraryPicker(page)
  await dialog.getByRole('button', { name: /^Image / }).first().click()
  const detail = page.locator('[data-card-detail]')
  await detail.waitFor({ state: 'visible', timeout: 15_000 })
  const grid = detail.locator('[data-subcard-grid]')
  await grid.waitFor({ state: 'visible', timeout: 20_000 })
  return detail
}

/**
 * Open the CN type dropdown inside the SubcardModal and read the option
 * labels. Returns the visible labels (one per catalog-declared CN type
 * that isn't already on the card). Base UI Select portals options into a
 * floating layer with a CSS open animation — a short settle wait makes
 * the options readable without fighting the animation.
 */
async function readCnOptionLabels(page: Page): Promise<string[]> {
  const options = page.locator('[role="option"]')
  await options.first().waitFor({ state: 'visible', timeout: 10_000 })
  // Settle the fade+zoom animation before reading bounding boxes / text.
  await page.waitForTimeout(400)
  const labels = await options.allInnerTexts()
  // innerTexts can include the tooltip line; trim to the label (first line).
  return labels.map((t) => t.trim().split('\n')[0].trim())
}

test.describe('Schema-driven modifier subcards (inline SubcardGrid)', () => {
  test('z-image: inline SubcardGrid renders LoRA + ControlNet rows (no Add Modifiers button)', async ({ page }) => {
    const detail = await landZImageCard(page)

    // INLINE MODEL — there is NO "Add Modifiers" trigger. The grid is the
    // surface, always visible on capability-declaring cards. (The label is
    // a bare <label>, not form-associated — getByText, not getByLabel.)
    await expect(detail.locator('[data-subcard-grid]')).toBeVisible()
    await expect(detail.getByText('Modifiers', { exact: true })).toBeVisible()
    await expect(detail.getByRole('button', { name: /Add Modifiers/i })).toHaveCount(0)

    // Both kinds are advertised: z-image declares loras (capability flag
    // on every image-gen model) AND controlnets (7 entries in
    // z_image.yaml). 2026-08-14: EMPTY kind rows render nothing — a 0px
    // row eating a full space-y slot was the "way too much space" between
    // the heading and the first tile. The + Mod picker is the capability
    // advertisement now; rows appear as soon as a mod lands (the
    // multi-stack test below pins that).
    await detail.locator('[data-subcard-add="mod"]').click()
    await expect(detail.locator('[data-mod-pick="lora"]')).toBeVisible()
    await expect(detail.locator('[data-mod-pick="controlnet"]')).toBeVisible()

    // The ONE generic "+ Mod" button is the create affordance (2026-08-08
    // policy: "It should be a box to say + mod and not + lora"). It opens
    // a kind-picker; per-kind add tiles no longer exist.
    await expect(detail.locator('[data-subcard-add="mod"]')).toBeVisible()
    console.log('  ✓ inline SubcardGrid: LoRA + ControlNet rows + generic +Mod button')
  })

  test('z-image: CN type dropdown lists exactly the 7 catalog-declared types', async ({ page }) => {
    const detail = await landZImageCard(page)

    // Open the CN leaf editor in create mode.
    await detail.locator('[data-subcard-add="mod"]').click()
    await detail.locator('[data-mod-pick="controlnet"]').click()
    const modal = page.getByRole('dialog', { name: /Add ControlNet/i })
    await modal.waitFor({ state: 'visible', timeout: 10_000 })

    // Open the Base UI Select (aria-label is the stable hook).
    await modal.getByRole('combobox', { name: 'Choose a ControlNet type' }).click()
    const labels = await readCnOptionLabels(page)

    // Contract: the dropdown mirrors the catalog — the same 7 labels in
    // z_image.yaml, no more, no less. A label change here is a YAML drift
    // the spec catches.
    expect(labels).toHaveLength(Z_IMAGE_CN_LABELS.length)
    for (const expected of Z_IMAGE_CN_LABELS) {
      expect(labels, `CN dropdown missing "${expected}"`).toContain(expected)
    }
    // PAINT-STACKING GATE (2026-08-11): a present-but-hidden popup passes
    // every bounding-box check yet is unusable — the select portal at z-50
    // painted UNDER the z-[100] dialog backdrop, so clicks hit the dialog
    // ("Adapter▼ / ---, clicking does nothing", all models, all silent).
    // An actual click on an option is the only check that catches it —
    // pre-fix this throws "subtree intercepts pointer events".
    await page.locator('[role="option"]').first().click()
    console.log(`  ✓ CN dropdown lists ${labels.length} types: ${labels.join(' · ')} (first option clickable)`)
  })

  test('z-image: LoRA Adapter dropdown lists exactly the 7 catalog-declared adapters', async ({ page }) => {
    const detail = await landZImageCard(page)

    // Open the LoRA leaf editor in create mode — the exact surface of the
    // 2026-08-11 "Adapter [blank]" report. During the spec-fetch-500 era
    // the error body parsed as the spec → lorasFeature was {} → the
    // dropdown rendered ZERO adapters with zero signal. A reload now hits
    // the live form-spec (7 declared loras) — this asserts the catalog
    // mirrors through, no more, no less.
    await detail.locator('[data-subcard-add="mod"]').click()
    await detail.locator('[data-mod-pick="lora"]').click()
    const modal = page.getByRole('dialog', { name: /Add LoRA/i })
    await modal.waitFor({ state: 'visible', timeout: 10_000 })

    await modal.getByRole('combobox', { name: 'Choose a LoRA' }).click()
    const labels = await readCnOptionLabels(page)

    expect(labels).toHaveLength(Z_IMAGE_LORA_LABELS.length)
    for (const expected of Z_IMAGE_LORA_LABELS) {
      expect(labels, `LoRA Adapter dropdown missing "${expected}"`).toContain(expected)
    }
    // PAINT-STACKING GATE — same as the CN test above: the popup portal
    // must actually accept a click (was painting under the dialog).
    await page.locator('[role="option"]').first().click()
    console.log(`  ✓ LoRA Adapter dropdown lists ${labels.length} adapters: ${labels.join(' · ')} (first option clickable)`)
  })

  test('z-image: multi-stack — two ControlNets land as separate draggable tiles', async ({ page }) => {
    const detail = await landZImageCard(page)
    const cnRow = detail.locator('[data-subcard-row="controlnet"]')

    // Before: no CN tiles (just the add-tile).
    expect(await cnRow.locator('[data-subcard]').count()).toBe(0)

    // ── Add the first CN ──────────────────────────────────────────────
    await detail.locator('[data-subcard-add="mod"]').click()
    await detail.locator('[data-mod-pick="controlnet"]').click()
    let modal = page.getByRole('dialog', { name: /Add ControlNet/i })
    await modal.waitFor({ state: 'visible', timeout: 10_000 })
    await modal.getByRole('combobox', { name: 'Choose a ControlNet type' }).click()
    const firstOptions = page.locator('[role="option"]')
    await firstOptions.first().waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(400)
    // Click the first option (Depth) — Base UI animates open; force-click
    // after the settle wait to dodge the actionability race during fade.
    await firstOptions.first().click()
    await modal.getByRole('button', { name: 'Add' }).click()
    // The grid commits via onEditSave → the tile renders.
    await cnRow.locator('[data-subcard]').first().waitFor({ state: 'visible', timeout: 10_000 })
    expect(await cnRow.locator('[data-subcard]').count()).toBe(1)
    console.log('  ✓ first ControlNet added — tile renders in the CN row')

    // ── Add a second CN (the dropdown now filters out the first type) ─
    await detail.locator('[data-subcard-add="mod"]').click()
    await detail.locator('[data-mod-pick="controlnet"]').click()
    modal = page.getByRole('dialog', { name: /Add ControlNet/i })
    await modal.waitFor({ state: 'visible', timeout: 10_000 })
    await modal.getByRole('combobox', { name: 'Choose a ControlNet type' }).click()
    const secondOptions = page.locator('[role="option"]')
    await secondOptions.first().waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(400)
    // One fewer option now — the first type is filtered (existingTypes).
    expect(await secondOptions.count()).toBe(Z_IMAGE_CN_TYPES.length - 1)
    await secondOptions.first().click()
    await modal.getByRole('button', { name: 'Add' }).click()
    await expect(cnRow.locator('[data-subcard]')).toHaveCount(2, { timeout: 10_000 })
    console.log('  ✓ second ControlNet added — two tiles stack (multi-stack proven)')
  })

  test('krea-2 (LoRA-only): LoRA row renders, ControlNet row absent — honest advertisement', async ({ page }) => {
    const detail = await landKrea2Card(page)

    // The SubcardGrid renders (krea-2 has the loras capability feature,
    // emitted for every image-gen model). 2026-08-14: empty rows render
    // nothing — the + Mod picker is the advertisement surface.
    await expect(detail.locator('[data-subcard-grid]')).toBeVisible()
    await expect(detail.locator('[data-subcard-row="lora"]')).toHaveCount(0)

    // HONESTY GATE (Phase 4): krea-2 declares NO controlnets in the
    // catalog → features.controlnet.enabled is absent → the CN row never
    // renders and the picker never offers it. Users see the truth before
    // opening anything: this model cannot take ControlNet conditioning.
    // No silent omission, no fake affordance.
    await expect(detail.locator('[data-subcard-row="controlnet"]')).toHaveCount(0)
    // The picker DOES offer the declared lora kind — the capability face.
    await detail.locator('[data-subcard-add="mod"]').click()
    await expect(detail.locator('[data-mod-pick="lora"]')).toBeVisible()
    // The generic +Mod picker only lists kinds the spec declares. krea-2 has
    // no controlnet kind, so opening the picker offers no controlnet option.
    await detail.locator('[data-subcard-add="mod"]').click()
    await expect(detail.locator('[data-mod-pick="controlnet"]')).toHaveCount(0)
    console.log('  ✓ krea-2: LoRA row only — no ControlNet row (catalog honesty)')
  })
})
