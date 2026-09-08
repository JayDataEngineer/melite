/**
 * RUN ALL FEEDBACK — proves the "Run all" button gives IMMEDIATE visible
 * feedback (spinner + "Running…") the instant it's clicked. This is the
 * "I GET NO FEEDBACK AT ALL" bug: runAll sets runningStageId=null for
 * chain-backed flows, and the old isRunning check missed it.
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoLibrary(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('Run All feedback — button morphs immediately', () => {
  test('Run all button shows Running… with spinner on click', async ({ page }) => {
    test.setTimeout(60_000)

    // ── Intercept the start response so the run stays "running" ──────
    // (don't let it complete — we want to catch the button in its
    // running state).
    await page.route('**/v1/flows/start', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run_id: 'p-test-runall-0001',
          status: 'running',
          bricks: [{ title: 'Generate', status: 'running' }],
          total: 1,
        }),
      })
    })
    // Keep the status poll reporting "running" (never completes)
    await page.route('**/v1/flows/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run_id: 'p-test-runall-0001',
          status: 'running',
          stages: [{ title: 'Generate', status: 'running', progress: { value: 3, max: 20 } }],
        }),
      })
    })

    // ── Navigate + create a card ─────────────────────────────────────
    await gotoLibrary(page)
    const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
    // Action-card picker (one list since 2026-09-04): the Image card —
    // then switch the CARD's model select to z-image like a user does.
    const createTile = dialog.getByRole('button', { name: /^Image / }).first()
    await createTile.waitFor({ state: 'visible', timeout: 15_000 })
    await createTile.click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })

    // Type prompt so Run is enabled
    const promptInput = modal.locator('textarea').first()
    await promptInput.waitFor({ state: 'visible', timeout: 10_000 })
    await promptInput.fill('a small red cube on white')

    // Close the card detail (back to canvas) so the Run all button is
    // visible. The zoom overlay intercepts pointer events while open and
    // Escape no longer collapses it — use the header's Collapse (X).
    const collapseBtn = modal.getByRole('button', { name: 'Collapse' })
    await collapseBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await collapseBtn.click()
    await page.locator('[data-card-zoom-overlay]').waitFor({ state: 'detached', timeout: 10_000 })

    // ── Find and click "Run all" ════════════════════════════════════
    // The FlowCanvas Run all button (Library surface)
    const runAllBtn = page.getByRole('button', { name: /run all/i }).first()
    await runAllBtn.waitFor({ state: 'visible', timeout: 10_000 })
    console.log('  ✓ Found Run all button')

    await runAllBtn.click()
    console.log('  ✓ Clicked Run all')

    // ── VERIFY: the button morphs to Running… with a spinner ────────
    // This is the fix — old code left it as "Run all" with no feedback.
    const runningBtn = page.getByRole('button', { name: /running/i }).first()
    await expect(runningBtn, 'Run all button must show "Running…" with spinner').toBeVisible({ timeout: 5_000 })
    console.log('  ✓ "Running…" feedback visible — NOT silent')

    // Verify the spinner (animate-spin) is present
    const spinner = runningBtn.locator('.animate-spin')
    await expect(spinner, 'spinner must be animating').toBeVisible({ timeout: 3_000 })
    console.log('  ✓ Spinner animating')
  })
})
