/**
 * E2E: the card HARNESS page — ONE card design pinned in isolation (2026-10-02).
 *
 * The harness (src/__e2e__/card-harness.tsx) mounts the SAME card surface the
 * app and the DSH embed render (InlineFlowCards → FlowTileGrid →
 * CardTile) over a DETERMINISTIC store fixture: makeDraft (the wire stand-in
 * for POST /v1/flows/drafts) with the done stage stamped the way the
 * estate queue's write-back does. No app shell, no Library tab, no boot
 * waits — and NO inference door is ever touched (INFERENCE LAW): the only
 * wire call the add-flow can make is the READ-ONLY model catalog, and the
 * artifact rides an SVG data URL with EXACT natural dimensions.
 *
 * This spec pins:
 *   • resting anatomy — the done card's artifact decodes (natural size EXACT)
 *     and nothing renders a progress bar at rest
 *   • click-to-zoom — the CardZoomOverlay opens from the tile, Escape closes
 *   • the + add flow — ServicePicker opens, the Input tile is pinned in it,
 *     picking it APPENDS a card to the shared store's grid
 *
 * Run:
 *   BASE_URL=http://localhost:5173 npx playwright test \
 *     --config=playwright.local.config.ts e2e/card-harness.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

/** Every test asserts the page stayed error-free — a harness page that
 * throws in boot or interaction is a RED lane, not a soft warning. */
function collectPageErrors(page: Page, sink: string[]): void {
  page.on('pageerror', (err) => sink.push(String(err)))
}

// The ServicePicker dialog renders its capability tiles below the fold at
// the stock 720px viewport and its content area cannot scroll to them
// ("element is outside of the viewport", click retries forever). The
// harness is a rig — the pick FLOW is under test, not 720p layout — so
// this lane runs tall.
test.use({ viewport: { width: 1280, height: 1400 } })

test.describe('card harness — resting anatomy (scenario=chain)', () => {
  const errors: string[] = []

  test.beforeEach(async ({ page }) => {
    errors.length = 0
    collectPageErrors(page, errors)
    await page.goto('/editor/card-harness.html?scenario=chain', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-harness-root][data-harness-scenario="chain"]').waitFor({ state: 'visible' })
  })

  test.afterEach(() => {
    // Contained console noise is the app's business; an UNCAUGHT page error
    // on the harness page is always a bug.
    expect(errors, `pageerrors: ${errors.join(' | ')}`).toEqual([])
  })

  test('renders the two fixture cards; the done artifact decodes at EXACT natural size', async ({ page }) => {
    await expect(page.locator('[data-card-tile="s_1"]')).toBeVisible()
    await expect(page.locator('[data-card-tile="s_2"]')).toBeVisible()

    // The done stage's artifact is an SVG data URL (320×240) — a real
    // decodable <img>, exact natural dimensions, nothing on disk.
    const img = page.locator('[data-card-tile="s_1"] img').first()
    await img.waitFor({ state: 'visible', timeout: 30_000 })
    const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)
    expect(naturalWidth).toBe(320)

    // Resting anatomy: nothing is running → CardProgressBar renders on real
    // frames only (2026-08-15 doctrine) → NO bar anywhere on the page.
    await expect(page.locator('[data-card-progress]')).toHaveCount(0)
  })

  test('click-to-zoom opens the CardZoomOverlay; Escape closes it', async ({ page }) => {
    await page.locator('[data-card-tile="s_1"]').click()
    await expect(page.locator('[data-card-zoom-overlay]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-card-zoom-overlay]')).toHaveCount(0)
  })

  test('the + tile opens the ServicePicker; picking an action card appends a card', async ({ page }) => {
    // The SAME affordance the Library canvas renders (ONE design). The
    // picker's ONE surface since 2026-09-04 is the ACTION CARDS
    // ([data-action-card], fetched from /v1/card-tools) — the capability
    // grid ([data-capability-tile]) duplicated the same lanes and was
    // removed; this pick walked the stale grid until 2026-09-05. Picking
    // an action card lands a card in the grid through the SAME
    // handlePick → addStage path the Library canvas uses.
    await page.getByRole('button', { name: /add a card|add your first card/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible', timeout: 15_000 })
    const tile = dialog.locator('[data-action-card]').first()
    await tile.waitFor({ state: 'visible', timeout: 15_000 })

    await tile.click()
    // The pick appends a stage to the SHARED store — the grid gains a tile.
    await expect(page.locator('[data-card-tile]')).toHaveCount(3, { timeout: 15_000 })
  })
})

test.describe('card harness — empty (scenario=empty)', () => {
  const errors: string[] = []

  test.beforeEach(async ({ page }) => {
    errors.length = 0
    collectPageErrors(page, errors)
    await page.goto('/editor/card-harness.html?scenario=empty', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-harness-root][data-harness-scenario="empty"]').waitFor({ state: 'visible' })
  })

  test.afterEach(() => {
    expect(errors, `pageerrors: ${errors.join(' | ')}`).toEqual([])
  })

  test('no cards, only the + add affordance', async ({ page }) => {
    await expect(page.locator('[data-card-tile]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /add a card|add your first card/i }).first(),
    ).toBeVisible()
  })
})
