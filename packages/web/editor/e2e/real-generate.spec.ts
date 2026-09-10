/**
 * REAL generation test — actual browser → actual React app → actual GPU.
 *
 * R1 wire (rewritten 2026-08-06, task #68): the pre-R1 sidebar Generate
 * tab + POST /v1/run b64 response are DEAD. The ONE surface is the Library
 * card canvas: picker capability tiles (backend-resolved routes) → card
 * tile + detail modal → Run → ONE run protocol (POST /v1/flows/start
 * → poll → artifact URL). The card modal renders the artifact as
 * <img src={artifactUrl} alt={service}> — no data: URLs anywhere.
 *
 *   1. Playwright launches a real Chromium browser
 *   2. Loads the actual Vite-served React app at localhost:5173
 *   3. The React app fetches capabilities + form specs from the Python server
 *   4. The test drives the UI: Library → Generate tile → z-image route →
 *      type a prompt → Run
 *   5. The React app POSTs to /v1/flows/start → server → ComfyUI →
 *      GPU → real image artifact
 *   6. The test verifies a real artifact URL rendered in the card modal AND
 *      fetches the bytes (proving a substantial image, not a placeholder)
 *
 * No mocks. No intercepts. The real frontend talking to the real backend.
 *
 * Prerequisites:
 *   - the owning DSH running (the dsh service)
 *   - ComfyUI running on :18465        (docker compose up -d inference-comfyui)
 *   - Vite dev server on :5173         (task up:frontend)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-generate.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { clickCapability, fillPrompt, switchCardModel } from './helpers/r1Card'

const PROMPT = 'a small red cube on a white background, studio lighting'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  // Wait for the app shell to mount — the ActivityBar rail with the
  // Agent/Library tab buttons is the reliable boot marker (the BrandMark
  // "TECH NOIR" text is occluded when the Chat History sidebar opens on
  // load). The role=button selector is stable across UI reshuffles.
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
}

// The app boots to the Library canvas (STARTUP_TAB, 2026-08-19) — the
// click is idempotent, kept for explicitness.
async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

async function openPicker(page: Page): Promise<void> {
  const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await addBtn.click()
  await page.getByRole('dialog').getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('Real generation — browser → server → GPU (R1 card UI)', () => {

  test('z-image produces a real image artifact through the web UI', async ({ page }) => {
    test.setTimeout(420_000) // cold model load + GPU gen
    // ── Capture console + network for debugging ─────────────────────
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    let runPayload: Record<string, unknown> | null = null
    page.on('request', (req) => {
      if (req.url().includes('/v1/flows/start') && req.method() === 'POST') {
        try { runPayload = JSON.parse(req.postData() || '{}') } catch { /* ignore */ }
      }
    })

    // ── 1. Library card canvas ──────────────────────────────────────
    await gotoLibrary(page)
    await openPicker(page)

    // ── 2. The Generate Image capability, model switched ON THE CARD ─
    // Models are not entries (operator order, 2026-09-04): the All-models
    // expander is gone. The tile lands the default route (krea-2);
    // z-image (a fast turbo model with weights on disk) is chosen via the
    // card form's Model select — the ONLY model-choice surface.
    const dialog = page.getByRole('dialog')
    await clickCapability(dialog, /generate image/i)
    // The card auto-expands inline ([data-card-detail]) with the seeded form.
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })
    // Switch the card's model to z-image (the card-form Model select).
    await switchCardModel(modal, 'z-image')
    await expect(modal).toContainText(/z-image/i)
    console.log('  ✓ Generate → z-image route (auto-expanded detail)')

    // ── 3. Type a prompt and Run ────────────────────────────────────
    await fillPrompt(modal, PROMPT)
    console.log('  ✓ Typed prompt')
    await modal.getByRole('button', { name: 'Run' }).click()
    console.log('  ✓ Clicked Run — waiting for GPU...')

    // ── 4. Check for an error toast (required field, backend 500) ──
    await page.waitForTimeout(2_000)
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]').first()
    if (await errorToast.isVisible().catch(() => false)) {
      const toastText = await errorToast.textContent()
      console.log(`  ✗ Error toast: ${toastText}`)
      console.log(`  Payload sent: ${JSON.stringify(runPayload)}`)
      throw new Error(`Generate failed with error toast: ${toastText}`)
    }

    // ── 5. The modal renders the artifact image when the run completes.
    // The preview <img> carries alt={stage.service} — for z-image that is
    // "z-image". The src is an artifact URL (runs dir), NOT data:.
    const img = modal.locator('img[alt="z-image"]').first()
    try {
      // 420s = the test timeout: a COLD z-image load (evicting whatever
      // ComfyUI has resident) on the swap-heavy box routinely exceeds 240s
      // (2026-08-09 flake). A warm retry passes in seconds.
      await img.waitFor({ state: 'visible', timeout: 420_000 })
    } catch (e) {
      const errMsg = [
        `Image did not appear after 420s.`,
        `POST /v1/flows/start fired: ${runPayload ? 'YES' : 'NO'}`,
        `Console errors: ${consoleErrors.length > 0 ? consoleErrors.slice(0, 5).join(' | ') : 'none'}`,
      ].join('\n  ')
      throw new Error(errMsg)
    }

    const src = (await img.getAttribute('src')) ?? ''
    expect(src, 'artifact src must be an artifact URL, not data:').not.toMatch(/^data:/)
    expect(src.length, 'artifact URL must be non-trivial').toBeGreaterThan(10)

    // ── 6. REAL RESULT proof — fetch the artifact bytes. A real
    // 1024×1024 PNG is >10KB; a 1×1 placeholder or error page is not.
    const resp = await page.request.get(new URL(src, page.url()).toString())
    expect(resp.ok(), `artifact fetch should be 200 (got ${resp.status()})`).toBe(true)
    const bytes = (await resp.body()).length
    expect(bytes, 'artifact bytes must be substantial (>10KB)').toBeGreaterThan(10_000)
    console.log(`  ✓ REAL image artifact verified: ${src} (${(bytes / 1024).toFixed(0)}KB)`)

    // ── 7. Verify the wire payload shape (ONE run protocol) ─────────
    expect(runPayload, 'POST /v1/flows/start must have fired').toBeTruthy()
    expect(runPayload!['model'], 'payload must include model').toBeTruthy()
    expect(String(JSON.stringify(runPayload)).toLowerCase()).toContain('cube')
    console.log(`  ✓ run protocol payload verified: model=${runPayload!['model']}`)
  })

  test('app loads capabilities and form specs from the backend', async ({ page }) => {
    // If these endpoints fail, the Library picker shows no tiles and the
    // card modal shows "Form fields failed to load".
    await gotoLibrary(page)
    await openPicker(page)

    // The picker surface proves /v1/capabilities — the capability tiles
    // declared by the backend catalog (packages/melite-core/models/
    // capabilities/), NOT model names. The audio suite is four
    // discrete tiles (Speech/Music/Sound Effect/Voice), so the set is
    // 10+ tiles — assert the full current labels (capabilities/).
    // Labels were renamed 2026-08-1x: "Generate Image"→"Create Image",
    // "Video"→"Create Video", "Generate Speech"→"Speech", etc. Since the
    // 2026-08-2x tooltip pivot a tile's accessible name is EXACTLY its
    // label (the CN/route trivia lives in the tooltip) — match exact,
    // never a trailing-space prefix.
    const TILE_LABELS = [
      'Create Image', 'Edit Image', 'Create Video',
      'Speech', 'Music', 'Sound Effects',
      'VoiceID', '3D', 'Upscale Image', 'Motion',
    ]
    for (const label of TILE_LABELS) {
      await expect(page.getByRole('dialog').getByRole('button', { name: label, exact: true })).toBeVisible()
    }
    console.log('  ✓ capability tiles populated — /v1/capabilities works')

    // Picking Create Image lands a card whose modal form proves
    // /v1/form-spec.
    await page.getByRole('dialog').getByRole('button', { name: 'Create Image', exact: true }).click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(modal.getByText(/failed to load/i)).toHaveCount(0)
    await fillPrompt(modal, 'proof of form spec')
    console.log('  ✓ form spec loaded — /v1/form-spec works')
  })
})
