/**
 * REAL generation test — actual browser → actual React app → actual GPU.
 *
 * R1 wire (rewritten 2026-08-06, task #68): the pre-R1 sidebar Generate
 * tab + variant picker + POST /v1/run b64 response are DEAD. The ONE
 * surface is the Library card canvas: capability tiles with backend-
 * precomputed routes. The image capability (capabilities/) resolves
 * ONE model per member family — krea-2 (default), z-image, anima-base,
 * ideogram — and the tile's model switcher swaps between them. Member
 * variants (z-image-base, z-image-q8, …) are catalog detail hidden by the
 * capability-first surface: they are NOT picker routes (by design, the
 * user sees "Generate", not model names).
 *
 * Each case drives the REAL frontend, 1:1 with what a user does:
 *   1. Library → add card
 *   2. Generate capability (default krea-2) or switcher route (z-image,
 *      anima-base)
 *   3. Type a prompt in the card modal
 *   4. Run → ONE run protocol (POST /v1/flows/start (flat) → poll)
 *   5. Assert a REAL artifact <img alt={model}> + fetch its bytes (>10KB)
 *   6. Assert the run payload's model matches the picked route
 *
 * No mocks. No intercepts. The real frontend talking to the real backend.
 *
 * Prerequisites:
 *   - Python server running on :33081  (task up:server)
 *   - ComfyUI running on :18465        (docker compose up -d inference-comfyui)
 *   - Vite dev server on :5173         (task up:frontend)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-generate-image-families.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { fillPrompt, switchCardModel } from './helpers/r1Card'

// Each entry is one real-user image-generation path through the R1 card UI.
// `route` is the model id the card carries (tile label + run payload model).
// Every case lands the Image tile (tiles carry no switcher since
// 2026-08-16); a non-default model is chosen via `switchTo` on the CARD's
// Model select — models are not entries (2026-09-04: the All-models
// expander is gone).
const IMAGE_CASES: Array<{
  name: string
  route: string
  switchTo?: string
  prompt: string
}> = [
  {
    name: 'z-image (Turbo)',
    route: 'z-image',
    switchTo: 'z-image',
    prompt: 'a small red cube on a white background, studio lighting',
  },
  {
    name: 'krea-2 (default tile)',
    route: 'krea-2',
    prompt: 'a small green cube on a white background, product photography',
  },
  {
    name: 'anima (card Model select)',
    route: 'anima',
    switchTo: 'anima',
    prompt: 'a small yellow pyramid on a white background, soft lighting',
  },
]

async function gotoLibrary(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('Real generation — browser → server → GPU (image families, R1)', () => {
  for (const c of IMAGE_CASES) {
    test(`${c.name} produces a real image artifact through the web UI`, async ({ page }) => {
      test.setTimeout(420_000)
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

      // ── 1. Library card canvas + pick the route ───────────────────
      await gotoLibrary(page)
      const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
      await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
      await addBtn.click()
      const dialog = page.getByRole('dialog')
      await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })

      // The Image ACTION CARD (image_gen_card → krea-2); the exact:true
      // match died with the capability tiles — the action-card tile's
      // accessible name is "{title} {model}".
      await dialog.getByRole('button', { name: /^Image / }).first().click()

      // The card auto-expands inline ([data-card-detail]) with the seeded form.
      const modal = page.locator('[data-card-detail]')
      await modal.waitFor({ state: 'visible', timeout: 15_000 })
      if (c.switchTo) await switchCardModel(modal, c.switchTo)
      await expect(modal).toContainText(c.route)
      console.log(`  ✓ ${c.name}: card landed (auto-expanded) with route ${c.route}`)

      // ── 2. Type a prompt and Run ──────────────────────────────────
      await fillPrompt(modal, c.prompt)
      console.log('  ✓ Typed prompt')
      await modal.getByRole('button', { name: 'Run' }).click()
      console.log('  ✓ Clicked Run — waiting for GPU...')

      // ── 3. Check for an error toast (required field, backend 500) ─
      await page.waitForTimeout(2_000)
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]').first()
      if (await errorToast.isVisible().catch(() => false)) {
        const toastText = await errorToast.textContent()
        console.log(`  ✗ Error toast: ${toastText}`)
        console.log(`  Payload sent: ${JSON.stringify(runPayload)}`)
        throw new Error(`Generate failed with error toast: ${toastText}`)
      }

      // ── 4. The modal renders the artifact <img alt={model}> when the
      // run completes — artifact URL, not data:.
      const img = modal.locator(`img[alt="${c.route}"]`).first()
      try {
        await img.waitFor({ state: 'visible', timeout: 300_000 })
      } catch {
        const errMsg = [
          `Image did not appear after 300s (${c.name}).`,
          `POST /v1/flows/start fired: ${runPayload ? 'YES' : 'NO'}`,
          `Console errors: ${consoleErrors.length > 0 ? consoleErrors.slice(0, 5).join(' | ') : 'none'}`,
        ].join('\n  ')
        throw new Error(errMsg)
      }

      const src = (await img.getAttribute('src')) ?? ''
      expect(src, 'artifact src must be an artifact URL, not data:').not.toMatch(/^data:/)
      expect(src.length, 'artifact URL must be non-trivial').toBeGreaterThan(10)

      // ── 5. REAL RESULT proof — fetch the artifact bytes (>10KB). ──
      const resp = await page.request.get(new URL(src, page.url()).toString())
      expect(resp.ok(), `artifact fetch should be 200 (got ${resp.status()})`).toBe(true)
      const bytes = (await resp.body()).length
      expect(bytes, 'artifact bytes must be substantial (>10KB)').toBeGreaterThan(10_000)
      console.log(`  ✓ REAL image artifact verified: ${src} (${(bytes / 1024).toFixed(0)}KB)`)

      // ── 6. Verify the wire payload model (ONE run protocol) ───────
      expect(runPayload, 'POST /v1/flows/start must have fired').toBeTruthy()
      expect(String(runPayload!['model']), `payload model should be ${c.route}`).toBe(c.route)
      expect(String(JSON.stringify(runPayload)).toLowerCase()).toContain(
        c.prompt.toLowerCase().split(',')[0].trim(),
      )
      console.log(`  ✓ run protocol payload verified: model=${runPayload!['model']}`)
    })
  }
})
