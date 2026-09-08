/**
 * ACTION CARD RENDER GATE — verifies the action-card webUI renders.
 *
 * Flow: sidebar tile click → card lands on canvas → click tile → detail expands.
 *
 * The form fields ride the kinds lane: GET /v1/kinds must register
 * "generation" with formSpec:true (py/card_kinds.py's TABLE — restored
 * 2026-09-03 after the packages/core deletion darkened the lane) for the
 * spec contract store to fetch the form-spec and the ParamGrid to render.
 *
 * h3-timeline declares layout:"studio" (the notch law) — its params are
 * authored in the studio body, so this test pins its card chrome only.
 *
 * Run:  npx playwright test e2e/card-render-gate.spec.ts --reporter=list
 */
import { test, expect } from '@playwright/test'
import { artifactRoot } from './helpers/artifactRoot'

test.describe('action-card render gate', () => {

  test('image-gen card renders shared form components', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1080 })

    await page.goto('/editor/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.getByRole('button', { name: /^Library$/ }).first()
      .waitFor({ state: 'visible', timeout: 30_000 })

    // Click the sidebar's Image model tile
    const imageTile = page.getByRole('button', { name: 'Image', exact: true })
      .filter({ hasAttribute: 'draggable' }).first()
    await expect(imageTile).toBeVisible({ timeout: 10_000 })
    await imageTile.click()

    // Card tile lands on the canvas
    const cardTile = page.locator('[data-card-tile]').first()
    await cardTile.waitFor({ state: 'visible', timeout: 10_000 })

    // Click the card tile to expand it into detail view
    await cardTile.click()

    // Detail panel appears
    const detail = page.locator('[data-card-detail]').first()
    await detail.waitFor({ state: 'visible', timeout: 15_000 })

    // === CARD CHROME ===
    await expect(detail.getByRole('heading', { name: 'Image' })).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Run' })).toBeVisible()
    await expect(detail.getByRole('button', { name: 'In Library' })).toBeVisible()

    // Model picker (combobox) — krea-2 is the default model
    const modelPicker = detail.getByLabel('Model')
    await expect(modelPicker).toBeVisible({ timeout: 10_000 })
    await expect(modelPicker).toHaveValue(/krea-2/i)

    // === SHARED FORM COMPONENTS (ParamGrid — requires the kinds lane) ===
    // Prompt textarea (shared form kit)
    const prompt = detail.getByRole('textbox', { name: /^Prompt/ }).first()
    await expect(prompt).toBeVisible({ timeout: 20_000 })

    // The typed params render as labeled inputs
    await expect(detail.getByText('Width').first()).toBeVisible({ timeout: 10_000 })
    await expect(detail.getByText('Height').first()).toBeVisible()
    await expect(detail.getByText('Steps').first()).toBeVisible()
    await expect(detail.getByText('Seed').first()).toBeVisible()

    // Sampler + Scheduler are SELECT comboboxes (options from the spec)
    await expect(detail.getByLabel(/^Sampler/).first()).toBeVisible({ timeout: 10_000 })
    await expect(detail.getByLabel(/^Scheduler/).first()).toBeVisible()

    await page.screenshot({
      path: artifactRoot('card-render-image-gen.png'),
      fullPage: false,
    })
  })

  test('h3-timeline video card renders card chrome', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1080 })

    await page.goto('/editor/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.getByRole('button', { name: /^Library$/ }).first()
      .waitFor({ state: 'visible', timeout: 30_000 })

    // H3 Timeline tile in the sidebar
    const h3Tile = page.getByRole('button', { name: 'H3 Timeline', exact: true })
      .filter({ hasAttribute: 'draggable' }).first()
    await expect(h3Tile).toBeVisible({ timeout: 10_000 })
    await h3Tile.click()

    const cardTile = page.locator('[data-card-tile]').first()
    await cardTile.waitFor({ state: 'visible', timeout: 10_000 })
    await cardTile.click()

    const detail = page.locator('[data-card-detail]').first()
    await detail.waitFor({ state: 'visible', timeout: 15_000 })

    // Card chrome (the studio body authors its params — chrome is the
    // render gate here)
    await expect(detail.getByRole('heading', { name: /H3/i })).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Run' })).toBeVisible()

    // No error state — the spec loaded clean
    await expect(detail.getByText(/failed to load/i)).toHaveCount(0)

    await page.screenshot({
      path: artifactRoot('card-render-h3.png'),
      fullPage: false,
    })
  })
})
