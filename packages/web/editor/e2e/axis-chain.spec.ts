/**
 * axis-chain.spec.ts — LIVE proof of the axis hierarchy (Cut 0, 2026-08-17).
 *
 * "MODEL FILTERS VARIANT. VARIANT FILTERS QUANT. IT IS A HIERARCHY." —
 * the Model→Variant→Quant chain, driven against the REAL frontend + REAL
 * specContractStore + REAL catalog (no mocks, no intercepts):
 *
 *   1. The served form-specs declare the chain
 *      (features.variant_groups[*].filters_on — a field ONLY the current
 *      backend emits; its presence proves the gateway serves the current
 *      tree, not a stale process).
 *   2. The qwen edit card: the Variant row = the model's variant FOLDER
 *      set, byte-identical before and after switching Quant (the
 *      quant-invariance criterion — the old leak filtered Variant rows
 *      through the active quant's cells).
 *   3. The ace-step music card: the SPARSE family. The ace-step-xl route
 *      is a family-override cell whose matrix has NO Base/SFT XL cells —
 *      the old code silently DROPPED Base/SFT from the Variant dropdown
 *      there. The folder set must survive on that route, and the Quant
 *      row must narrow to the XL tier (BF16 only — variant filters
 *      quant, ONE direction).
 *
 * Every option list is asserted against the SERVED spec (the dropdown
 * mirrors the catalog, nothing else — the modifiers-schema-driven idiom)
 * AND logged for the record. The one wrinkle: the served spec emits the
 * FULL quant tier (every folder's cells); the UI Quant row shows only
 * the ACTIVE VARIANT's owned cells (`owner` on the served rows) — that
 * owner-scoping IS the variant-filters-quant direction.
 *
 * NOTE (2026-08-17): the plan's "playwright.check.config.ts + e2e/check/"
 * assumption was wrong for this tree — the house pattern is plain
 * e2e/*.spec.ts under playwright.local.config.ts. Run against the FRESH
 * bundle (vite preview :4173 proxies /v1 + /health to the gateway on
 * :33081 — preview.proxy is declared in vite.config.ts):
 *
 *   npm run build && npx vite preview &   # fresh bundle on :4173
 *   BASE_URL=http://127.0.0.1:4173 npx playwright test \
 *     --config=playwright.local.config.ts e2e/axis-chain.spec.ts
 *
 * Requires: gateway on :33081 (task up:server) serving the CURRENT tree.
 */
import { test, expect, type Locator, type APIRequestContext } from '@playwright/test'
import { gotoLibrary, openPicker, switchCardModel, waitCardDetail } from './helpers/r1Card'

type Row = { id: string; label: string; group: string; owner?: string }

/** The served spec's axis rows for one group, in served order. */
async function servedAxisRows(
  request: APIRequestContext,
  model: string,
  group: string,
): Promise<Row[]> {
  const resp = await request.get(`/v1/form-spec?model=${model}`)
  expect(resp.status(), `/v1/form-spec?model=${model} must return 200`).toBe(200)
  const spec = await resp.json()
  return (spec.features?.variants ?? [])
    .filter((v: Row) => v.group === group)
    .map((v: Row) => ({ id: v.id, label: v.label, group: v.group, owner: v.owner }))
}

/** The UI Quant row = the ACTIVE VARIANT's cells — the served spec emits
 * the full tier (every folder's quants), the card shows only the cells
 * the active variant folder owns (`owner`), never another folder's. */
function ownedQuants(servedQuants: Row[], activeVariantId: string): Row[] {
  return servedQuants.filter((q) => q.owner === activeVariantId)
}

/**
 * The axis select whose options contain `text` — the vitest idiom, live:
 * axis rows have no stable aria-name, the Model select has one, so a row
 * is found by its OPTION CONTENT (Turbo / Standard (20-step) / …).
 */
async function axisSelectWithOption(detail: Locator, text: string): Promise<Locator> {
  const selects = detail.locator('select')
  for (let i = 0; i < (await selects.count()); i++) {
    const sel = selects.nth(i)
    const texts = (await sel.locator('option').allInnerTexts()).map((t) => t.trim())
    if (texts.includes(text)) return sel
  }
  throw new Error(`no axis select offers "${text}"`)
}

/** Wait for the ParamEditor's axis rows to render (spec fetch is async). */
async function waitForAxis(detail: Locator, optionText: string): Promise<Locator> {
  await expect(async () => {
    await axisSelectWithOption(detail, optionText)
  }).toPass({ timeout: 30_000 })
  return axisSelectWithOption(detail, optionText)
}

async function optionTexts(sel: Locator): Promise<string[]> {
  return (await sel.locator('option').allInnerTexts()).map((t) => t.trim())
}

/** Log every select inside the card detail (the "log both served lists" record). */
async function logAxisLists(tag: string, detail: Locator): Promise<void> {
  const selects = detail.locator('select')
  const lines: string[] = []
  for (let i = 0; i < (await selects.count()); i++) {
    lines.push(`    select[${i}]: ${(await optionTexts(selects.nth(i))).join(' | ')}`)
  }
  console.log(`  ${tag}:\n${lines.join('\n')}`)
}

test('served form-specs declare the chain (backend currency, fresh-origin proof)', async ({ request }) => {
  const health = await request.get('/health')
  expect(health.status(), "the fresh bundle's proxy must reach the gateway").toBe(200)

  for (const model of ['qwen-img-edit-2511', 'ace-step']) {
    const resp = await request.get(`/v1/form-spec?model=${model}`)
    expect(resp.status(), `/v1/form-spec?model=${model} must return 200`).toBe(200)
    const vg = (await resp.json()).features.variant_groups
    expect(vg.Variant?.filters_on, `${model}: Variant must filter nothing`).toBeNull()
    expect(vg.Quant?.filters_on, `${model}: Quant must filter on Variant`).toBe('Variant')
    console.log(
      `  ✓ ${model}: Variant.filters_on=${JSON.stringify(vg.Variant?.filters_on)} ` +
        `Quant.filters_on=${vg.Quant?.filters_on}`,
    )
  }
})

test('qwen edit card: Quant picks NEVER shift the Variant row — the folder set', async ({ page, request }) => {
  await gotoLibrary(page)
  const dialog = await openPicker(page)
  await dialog.getByRole('button', { name: /^Edit Image/ }).first().click()
  const detail = await waitCardDetail(page, 'qwen-img-edit-2511')

  // The served truth — the dropdown mirrors the catalog, nothing else.
  const servedVariants = await servedAxisRows(request, 'qwen-img-edit-2511', 'Variant')
  const servedQuants = await servedAxisRows(request, 'qwen-img-edit-2511', 'Quant')
  // The head route's active variant is standard — the owner chain: the
  // served defaults resolve the INT8 cell, whose owner IS standard (the
  // same pin quant-model-independence.test.tsx asserts: the head renders
  // standard because int8's owner IS standard).
  const owned = ownedQuants(servedQuants, 'standard')
  const expectedQuants = owned.map((q) => q.label)
  expect(servedVariants.length).toBe(2)
  expect(owned.length).toBeGreaterThan(1)

  const variantRow = await waitForAxis(detail, servedVariants[0].label)
  const quantRow = await waitForAxis(detail, expectedQuants[0])

  const variantsBefore = await optionTexts(variantRow)
  expect(variantsBefore, 'Variant row must mirror the served folder set').toEqual(
    servedVariants.map((v) => v.label),
  )
  expect(await optionTexts(quantRow), 'Quant row = the ACTIVE VARIANT\'s owned cells').toEqual(
    expectedQuants,
  )

  // Switch Quant (to the NEXT owned cell) → the Variant row must be
  // BYTE-IDENTICAL (quant-invariance — the acceptance criterion: variant
  // folders never depend on the active quant).
  await quantRow.selectOption(owned[1].id)
  await expect(async () => {
    const again = await axisSelectWithOption(detail, servedVariants[0].label)
    expect(await optionTexts(again)).toEqual(variantsBefore)
  }).toPass({ timeout: 15_000 })

  await logAxisLists('qwen edit card (after Quant switch to Q8)', detail)
})

test('ace-step music card: the SPARSE family keeps the FULL folder set (the leak-proof)', async ({ page, request }) => {
  await gotoLibrary(page)
  const dialog = await openPicker(page)
  // Models are not entries (2026-09-04): land the Music capability, then
  // switch the card's Model select to ace-step.
  await dialog.getByRole('button', { name: 'Music', exact: true }).click()
  const detail = page.locator('[data-card-detail]')
  await detail.waitFor({ state: 'visible', timeout: 15_000 })
  await switchCardModel(detail, 'ace-step')
  await waitCardDetail(page, 'ace-step')

  const servedVariants = await servedAxisRows(request, 'ace-step', 'Variant')
  expect(servedVariants.map((v) => v.label), 'the served folder set').toEqual([
    'Turbo',
    'Base',
    'SFT',
    'XL Turbo',
  ])
  // On the head route the active variant is turbo (its route IS
  // "ace-step") — its owned cells are the served Quant rows.
  const servedQuants = await servedAxisRows(request, 'ace-step', 'Quant')
  const owned = ownedQuants(servedQuants, 'turbo')
  const expectedQuants = owned.map((q) => q.label)

  const variantRow = await waitForAxis(detail, 'Turbo')
  const quantRow = await waitForAxis(detail, expectedQuants[0])

  const folderSet = await optionTexts(variantRow)
  expect(folderSet).toEqual(['Turbo', 'Base', 'SFT', 'XL Turbo'])
  expect(await optionTexts(quantRow), 'the active variant (turbo) owns Q8+BF16').toEqual(
    expectedQuants,
  )

  // Quant pick (Q8 → BF16) leaves the folder set untouched.
  await quantRow.selectOption(owned[1].id)
  await expect(async () => {
    expect(await optionTexts(await axisSelectWithOption(detail, 'Turbo'))).toEqual(folderSet)
  }).toPass({ timeout: 15_000 })

  // THE leak-proof: switch Variant to XL Turbo → route ace-step-xl, the
  // family-override cell whose matrix has NO Base/SFT XL cells. The old
  // VariantSelect filter dropped Base/SFT from THIS dropdown; the folder
  // set must survive, and the Quant row must narrow to the XL tier
  // (BF16 only — variant filters quant, ONE direction).
  await (await axisSelectWithOption(detail, 'Turbo')).selectOption('xl')
  await expect(async () => {
    const xlQuant = await axisSelectWithOption(detail, 'BF16')
    expect(await optionTexts(xlQuant), 'on the XL route only the BF16 tier exists').toEqual([
      'BF16',
    ])
  }).toPass({ timeout: 20_000 })
  const variantAfter = await optionTexts(await axisSelectWithOption(detail, 'XL Turbo'))
  expect(variantAfter, 'the folder set survives the sparse route').toEqual(folderSet)

  await logAxisLists('ace-step card (on the ace-step-xl route)', detail)
})
