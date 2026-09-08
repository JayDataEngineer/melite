/**
 * REAL-BROWSER proof of the per-card loading bar (2026-08-08; rewritten
 * 2026-10-02 to the CURRENT bar contract).
 *
 * The user's demand: USE PLAYWRIGHT AND SEE THE LOADING BAR GO. This spec
 * drives a real Chromium against the harness page (fixed CardTile states +
 * a live-progress card whose {value, max} frame lands mid-run).
 *
 * THE CONTRACT CHANGED (CardActivity.tsx, 2026-08-15): the bar renders ONLY
 * on a real streamed frame — "No progress data = no bar (NOT a shimmer or
 * spinner — those lie about what's happening)". The old indeterminate mode
 * is gone BY DESIGN; this spec now pins:
 *   • running + frame        → determinate bar, `step v/max`, `%` readout
 *   • running, no frame yet  → NO bar (no fake animation)
 *   • not running            → NO bar
 *   • a frame landing mid-run→ the bar APPEARS determinate with real numbers
 *
 * Run:
 *   BASE_URL=http://localhost:5173 npx playwright test \
 *     --config=playwright.local.config.ts e2e/loading-bar.spec.ts
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { artifactRoot } from './helpers/artifactRoot'

test.describe('Per-card loading bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor/loading-bar-harness.html', { waitUntil: 'domcontentloaded' })
    // Wait for React to mount the harness cards before asserting — avoids
    // a race with Vite's first-paint / HMR recompile after a harness edit.
    await page.locator('[data-harness="running-with-progress"]').waitFor({ state: 'visible' })
  })

  test('determinate bar renders with step readout while running + progress', async ({ page }) => {
    const card = page.locator('[data-harness="running-with-progress"]')
    const bar = card.locator('[data-card-progress]')
    await expect(bar).toBeVisible()
    await expect(card.getByText('step 5/20')).toBeVisible()
    await expect(card.getByText('25%')).toBeVisible()
  })

  test('NO bar while running before the first frame — never a fake animation', async ({ page }) => {
    // The 2026-08-15 doctrine: a running card with no streamed frame renders
    // NO bar at all. A shimmer here would be lying about what is happening.
    const card = page.locator('[data-harness="running-no-progress"]')
    await expect(card).toBeVisible()
    await expect(card.locator('[data-card-progress]')).toHaveCount(0)
  })

  test('no bar at all when not running', async ({ page }) => {
    const card = page.locator('[data-harness="not-running"]')
    await expect(card).toBeVisible()
    await expect(card.locator('[data-card-progress]')).toHaveCount(0)
  })

  test('bar APPEARS determinate the moment a real frame lands mid-run', async ({ page }) => {
    // THIS is the receive-and-show proof: start with no frame (no bar), wait
    // for the simulated frame to land (~1.5s in the harness), then assert
    // the bar fills with the REAL numbers (step 14/20 = 70%). This is
    // exactly what happens when the backend poll delivers brick.progress.
    const card = page.locator('[data-harness="live-progress"]')
    const bar = card.locator('[data-card-progress]')

    // Initially: no frame → no bar (the doctrine holds mid-run too).
    await expect(card).toBeVisible()
    await expect(bar).toHaveCount(0)

    // Wait for the frame to arrive — the bar appears determinate.
    await expect(card.getByText('step 14/20')).toBeVisible({ timeout: 5000 })
    await expect(card.getByText('70%')).toBeVisible()
    await expect(bar).toBeVisible()
  })

  test('screenshot — visual proof (determinate bars with real numbers)', async ({ page }) => {
    // Wait for the live card to fill so the screenshot shows all states.
    await page.locator('[data-harness="live-progress"]').getByText('step 14/20').waitFor({ timeout: 5000 })
    await page.screenshot({ path: path.join(artifactRoot('manual'), 'loading-bar-states.png'), fullPage: true })
  })
})
