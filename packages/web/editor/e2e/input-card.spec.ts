/**
 * E2E: the picker's ONE surface (law pin, 2026-09-04).
 *
 * Operator order: "I see this twice, repeated in different forms" — the
 * picker listed the operator's action cards AND a capability grid over
 * the same lanes. The capability grid (including the old
 * "Input / Media Prep" tile, pinned at the top since 2026-08-07) is
 * GONE. This spec pins the new shape:
 *   • the picker lists ACTION CARDS only (/v1/card-tools)
 *   • no capability section, no Input tile, no "What do you want to make?"
 *
 * The Input CARD itself did not die — only its picker path did. Input
 * cards are born from MEDIA DROPS on the canvas (a file or sidebar asset
 * dropped on the background lands a kind:"input" Ops card; see
 * FlowCanvas onCanvasDrop). The InputCardEditor's behavior (source
 * gating, media-type field groups, detected-type indicator) is pinned at
 * unit level: src/__tests__/input-card-editor.test.tsx,
 * inputCardContract.test.ts, card-detail-input-slots.test.tsx.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/input-card.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
}

// The app boots to the AGENT tab (startup default). The Library card
// canvas is a header tab, not the landing surface.
async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('ServicePicker — one surface (no Input tile)', () => {
  test('the picker lists action cards ONLY — no capability grid, no Input tile', async ({ page }) => {
    await gotoLibrary(page)

    const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await addBtn.click()

    const dialog = page.getByRole('dialog')
    await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })

    // Action-card tiles render (one per /v1/card-tools manifest).
    await expect(dialog.locator('[data-action-cards]')).toBeVisible()
    expect(await dialog.locator('button[data-action-card]').count()).toBeGreaterThan(0)

    // The second list is GONE.
    await expect(dialog.getByText('What do you want to make?')).toHaveCount(0)
    await expect(dialog.locator('[data-capability-category]')).toHaveCount(0)
    await expect(dialog.locator('[data-tile-input]')).toHaveCount(0)
    await expect(dialog.getByText('Input / Media Prep')).toHaveCount(0)
    console.log('  ✓ picker is action-cards-only; no capability grid, no Input tile')
  })
})
