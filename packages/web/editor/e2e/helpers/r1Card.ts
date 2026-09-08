/**
 * R1 Library card-flow helpers (2026-08-06, task #68) — the ONE navigation
 * idiom for the capability-first picker (docs/design/capability-layer.md).
 *
 * The picker is ONE list: the operator's ACTION CARDS (/v1/card-tools —
 * one tile per packages/*/cards/*/tool.json manifest; titles like
 * "Image", "TTS", "Music"). Operator order, 2026-09-04 ("I see this
 * twice, repeated in different forms"): the capability grid that
 * duplicated this list is GONE, as is the "All models" expander
 * (earlier the same day — models are not entries). A SPECIFIC model is
 * chosen ON THE CARD after picking (`switchCardModel` below): the card
 * form's model switcher.
 * Picking closes the dialog and lands a card that AUTO-EXPANDS inline
 * (`[data-card-detail]` — the focused card renders its detail via
 * CardDetailInline; a collapsed `[data-card-tile]` only renders for
 * NON-focused siblings). Run → ONE run protocol → the detail renders the
 * artifact (img/video/audio/glb).
 */
import { expect, type Locator, type Page } from '@playwright/test'

export async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  // Wait for the app shell — the ActivityBar Library button is the reliable
  // boot marker (BrandMark "TECH NOIR" text is occluded when Chat History
  // sidebar opens on load).
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
}

/** The app boots to the Library canvas (STARTUP_TAB, 2026-08-19) — the
 * click is idempotent; it stays for explicitness across future boot flips. */
export async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

export async function openPicker(page: Page): Promise<Locator> {
  const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await addBtn.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
  return dialog
}

/** Pick an ACTION-CARD tile (its manifest's declared model + defaults).
 * The tile's accessible name is "{stage_title} {model}" — anchor the
 * regex on the title with trailing whitespace so sibling titles that
 * share a prefix (Image / Image Edit) never cross-match. */
export async function clickActionCard(dialog: Locator, cardTitle: RegExp): Promise<void> {
  await dialog.getByRole('button', { name: cardTitle }).first().click()
}

/** Switch the LANDED CARD's model — the card form's Model select
 * (aria-label "Model", native <select>). Since the All-models grid was
 * removed (operator order, 2026-09-04: models are not entries), THIS is
 * the ONLY model-choice surface: pick the capability, then switch the
 * model on the card. selectOption matches by value (model key) or label. */
export async function switchCardModel(modal: Locator, model: string): Promise<void> {
  await modal.getByLabel('Model').selectOption(model)
}

/**
 * Wait for a card to land after picking. The picked card AUTO-EXPANDS
 * inline (focusStageId → the new card), so the surface is the
 * CardDetailInline ([data-card-detail]) — NOT a collapsed [data-card-tile],
 * which only renders for non-focused siblings. The detail carries the
 * service badge + title, so the route assertion works against it.
 *
 * (2026-08-07: renamed from waitCardTile — the surface is the detail, not
 *  a tile. The old name waited for [data-card-tile] which never renders
 *  for a newly-picked card under the inline-expand model.)
 */
export async function waitCardDetail(page: Page, route: string | RegExp): Promise<Locator> {
  const detail = page.locator('[data-card-detail]')
  await detail.waitFor({ state: 'visible', timeout: 15_000 })
  await expect(detail).toContainText(route)
  return detail
}

export async function waitCardModal(page: Page): Promise<Locator> {
  const modal = page.locator('[data-card-detail]')
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  await expect(modal.getByText(/failed to load/i)).toHaveCount(0)
  return modal
}

/**
 * The card modal's prompt textarea. ParamEditor (FlowCard.tsx) renders
 * the prompt as a `<label>` block wrapping BOTH the "Prompt" heading AND
 * the textarea (no htmlFor/id pair) — so getByLabel can never associate it
 * (the form-spec's own label — "Text", "Description", "Motion Description",
 * … — is irrelevant; the card editor is params-driven, not schema-driven).
 * Since 2026-08-09 the label's text is NOT exactly "Prompt": models whose
 * form-spec carries an enhance_prompt (krea-2, …) render the Enhance button
 * inside the same label ("PromptEnhance"). `text-is` broke on those, and a
 * substring `has-text` also caught the "Negative Prompt" field on models
 * that have one. The accessible name of the MAIN prompt textarea is the
 * wrapping label's text, which ALWAYS starts with "Prompt" — and never the
 * negative-prompt field's ("Negative Prompt"). Match the textbox role by
 * anchored accessible name.
 */
export function promptField(modal: Locator): Locator {
  return modal.getByRole('textbox', { name: /^Prompt/ })
}

/** Fill the card modal's prompt textarea. */
export async function fillPrompt(modal: Locator, prompt: string): Promise<void> {
  await promptField(modal).fill(prompt)
}

/**
 * Wait for the card modal to render its artifact when the run completes.
 * The preview is a media element (img[alt={service}] / video[src] /
 * audio[src] with an artifact URL — never data:) or, for GLB output, the
 * "3D model output" placeholder. Returns the artifact URL when fetchable.
 */
export async function waitForCardArtifact(
  page: Page,
  modal: Locator,
  timeoutMs: number,
): Promise<{ kind: 'media' | 'glb'; src?: string }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await modal.getByText('3D model output').isVisible().catch(() => false)) {
      return { kind: 'glb' }
    }
    const media = modal.locator('img[src], video[src], audio[src]')
    const n = await media.count()
    for (let i = 0; i < n; i++) {
      const src = await media.nth(i).getAttribute('src')
      if (src && !src.startsWith('data:')) return { kind: 'media', src }
    }
    await page.waitForTimeout(2_000)
  }
  throw new Error(`No card artifact appeared within ${timeoutMs}ms`)
}

/**
 * Attach the sample fixture where the card expects an image slot. The
 * shared AttachControl (Phase 3c, 2026-08-07) renders a hidden
 * `<input type="file" data-attach-input>` — there is no <label>Attach</label>
 * association (the old in-ParamEditor attach UI was removed; rule 4 — ONE
 * attach surface). The data-URL thumbnail proves the FileReader round-trip
 * into the params.
 */
export async function attachFixture(modal: Locator, fixture: string): Promise<void> {
  const input = modal.locator('input[data-attach-input]').first()
  await input.waitFor({ state: 'attached', timeout: 15_000 })
  await input.setInputFiles(fixture)
  // The data-URL thumbnail proves the FileReader round-trip into the params.
  await modal.locator('img[alt][src^="data:image/"]').first().waitFor({ state: 'visible', timeout: 15_000 })
}
