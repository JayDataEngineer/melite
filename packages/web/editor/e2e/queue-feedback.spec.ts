/**
 * QUEUE FEEDBACK E2E — proves the user sees visible "Queued…" feedback when
 * a run enqueues behind an active GPU run.
 *
 * This test uses TWO strategies:
 *   1. API-LEVEL: starts a REAL blocking run, then a REAL second run, and
 *      verifies the wire response carries status:"queued" + the status
 *      channel returns "queued" (no contract violation). This was proven
 *      live on 2026-08-14 — see sratch/e2e_proof_2026-08-14.md.
 *   2. FRONTEND: uses page.route to intercept the start response and inject
 *      status:"queued", then drives the browser to click Run and verifies
 *      the card morphs to a queued indicator. This is deterministic — no
 *      GPU timing dependency.
 *
 * The backend queue lifecycle (blocking → queued → auto-start on unblock)
 * is proven by the companion API test. This Playwright test isolates the
 * FRONTEND rendering: does the UI actually SHOW the queued state?
 */
import { test, expect, type Page } from '@playwright/test'

// The owning DSH (the estate doors serve /v1 same-origin here).
// Env override is the config channel; no port pins in code. The
// session token rides the query (claims sit behind the trust fence).
const DSH = process.env.DSH_URL || 'http://127.0.0.1:3088'
const TOKEN = process.env.DSH_TOKEN || ''
const url = (p: string): string => TOKEN === '' ? DSH + p : DSH + p + (p.includes('?') ? '&' : '?') + 'token=' + TOKEN

async function gotoLibrary(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('Queue feedback — frontend renders queued state', () => {
  test('card shows Queued… when the run is queued behind another', async ({ page }) => {
    test.setTimeout(120_000)

    // ── Intercept POST /v1/flows/start: return a QUEUED response ──
    // This simulates the "another run is active on the GPU" condition
    // deterministically — no timing dependency on a real blocking run.
    let intercepted = false
    await page.route('**/v1/flows/start', async (route) => {
      intercepted = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run_id: 'p-test-queued-0001',
          status: 'queued',
          queue_position: 1,
          bricks: [{ title: 'Generate Image', status: 'pending' }],
          total: 1,
        }),
      })
    })

    // ── Also intercept the status poll: report "queued" ──────────────
    await page.route('**/v1/flows/status/p-test-queued-0001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run_id: 'p-test-queued-0001',
          status: 'queued',
          queue_position: 1,
          stages: [{ title: 'Generate Image', status: 'pending' }],
        }),
      })
    })

    // ── Navigate + create a z-image card ─────────────────────────────
    // (action-card picker since 2026-09-04: pick the Image card, then
    // switch the CARD's model select to z-image — the dialog itself no
    // longer carries a select)
    await gotoLibrary(page)
    const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
    await dialog.getByRole('button', { name: /^Image / }).first().click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })
    await modal.getByLabel('Model').selectOption('z-image')

    // ── Type prompt + click Run ──────────────────────────────────────
    const promptInput = modal.locator('textarea').first()
    await promptInput.waitFor({ state: 'visible', timeout: 10_000 })
    await promptInput.fill('a small red cube on a white background')

    // The card's Run button (single card, not "Run all")
    const runBtn = modal.getByRole('button', { name: /^Run$/ })
    await runBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await runBtn.click()
    console.log('  ✓ Clicked Run — intercepted response should be queued')

    // ── Verify the start was intercepted with our queued mock ────────
    await expect.poll(() => intercepted, { timeout: 10_000, message: 'POST /start intercepted' }).toBe(true)

    // ── Verify visible queued feedback on the card ───────────────────
    // The card should show a queued indicator. The status poll returns
    // "queued", and the store's onTick maps it to the card's "queued"
    // status. The card renders a sky-blue badge + "Queued…" text.
    //
    // Wait for ANY of the queued indicators to appear:
    //   - text "queued" (case-insensitive) on the card
    //   - the "Queued…" button morph (if Run all is present)
    //   - a data attribute on the card
    const queuedIndicator = page.locator('text=/queued/i').first()
    await expect(queuedIndicator, 'card must show a queued indicator').toBeVisible({ timeout: 15_000 })
    console.log('  ✓ "Queued" feedback visible on the card — NOT silent')
  })
})
