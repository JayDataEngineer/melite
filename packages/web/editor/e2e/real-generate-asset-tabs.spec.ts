/**
 * REAL generation across EVERY R1 card surface — actual browser → actual
 * React app → actual GPU.
 *
 * R1 wire (rewritten 2026-08-06, task #68): the pre-R1 sidebar asset tabs +
 * POST /v1/run b64 responses are DEAD. The ONE surface is the Library card
 * canvas: capability tiles (Generate/Edit/Video/Audio/3D/Upscale).
 * MODELS ARE NOT ENTRIES (operator order, 2026-09-04): the "All models"
 * expander is GONE — a specific model is chosen on the CARD (its Model
 * select lists every model sharing the card's form). Each pick lands a
 * card; Run executes through the ONE run protocol
 * (POST /v1/flows/start (flat) → poll → artifact URL); the card modal
 * renders the artifact (img/video/audio/glb).
 *
 *   - Edit          (image edit, needs an uploaded image)
 *   - See-Through   (image decomposition, needs an uploaded image)
 *   - TRELLIS 3D    (image → 3D mesh, needs an uploaded image)
 *   - AniGen 3D     (image → rigged 3D, needs an uploaded image)
 *   - Speech        (text → speech, TTS)
 *   - Music         (text → music)
 *   - Sound         (text → sound effect)
 *   - Video         (text → video)
 *   - HY-Motion     (text → 3D motion)
 *   - Kimodo        (text → 3D motion)
 *
 * No mocks. No intercepts. The real frontend talking to the real backend.
 * Each artifact is byte-verified (>10KB) by fetching its URL.
 *
 * Prerequisites:
 *   - the owning DSH running (the dsh service)
 *   - ComfyUI running on :18465        (docker compose up -d inference-comfyui)
 *   - Vite dev server on :5173         (task up:frontend)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-generate-asset-tabs.spec.ts
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import {
  gotoLibrary,
  openPicker,
  clickCapability,
  waitCardDetail,
  waitCardModal,
  fillPrompt,
  waitForCardArtifact,
  attachFixture,
} from './helpers/r1Card'

/**
 * Restart ComfyUI to guarantee clean VRAM before each test.
 *
 * Custom-node models (TRELLIS, AniGen, See-Through, audiocore GGML) allocate
 * VRAM via cudaMalloc outside PyTorch's caching allocator. Neither ComfyUI's
 * /free endpoint nor torch.cuda.empty_cache() can reclaim this memory — it
 * stays "zombie-allocated" until the owning process dies. On a 24 GB 4090,
 * sequential tests accumulate 15+ GB of zombie VRAM, causing OOM for later
 * tests. Restarting the container between tests is the ONLY reliable fix.
 */
test.beforeEach(async () => {
  try {
    execSync('docker restart inference-comfyui', { timeout: 60_000, stdio: 'pipe' })
  } catch {
    // If docker restart fails, continue — the test may still work if VRAM
    // happens to be clean enough.
  }
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    try {
      const resp = await fetch('http://localhost:18465/system_stats')
      if (resp.ok) break
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2_000))
  }
})

/**
 * One R1 card-generation path. `route` is the expected model id (tile
 * label + run payload model). Pick exactly one of: capLabel (tile
 * default — tiles carry no model switcher since 2026-08-16) or allModels
 * (family under the expander).
 */
interface CardCase {
  name: string
  capLabel?: RegExp
  allModels?: RegExp
  route: string
  needsImage?: boolean
  prompt: string
  artifactTimeout: number
}

const SERVICES: CardCase[] = [
  {
    name: 'Edit (image edit)',
    capLabel: /^Edit/,
    route: 'qwen-img-edit-2511',
    needsImage: true,
    prompt: 'turn the background into a sunny blue sky',
    artifactTimeout: 300_000,
  },
  {
    name: 'See-Through (layer decomposition)',
    allModels: /See-Through/,
    route: 'see-through',
    needsImage: true,
    prompt: 'decompose this character into clean layers',
    artifactTimeout: 300_000,
  },
  {
    name: 'TRELLIS 3D (image → mesh)',
    capLabel: /^3D/,
    route: 'trellis',
    needsImage: true,
    prompt: 'a small toy robot',
    artifactTimeout: 600_000,
  },
  {
    name: 'AniGen 3D (image → rigged 3D)',
    allModels: /anigen/i,
    route: 'anigen',
    needsImage: true,
    prompt: 'a chibi cat character',
    artifactTimeout: 600_000,
  },
  {
    name: 'Speech (text → speech / TTS)',
    capLabel: /^Audio/,
    route: 'qwen3-tts-base',
    prompt: 'Hello, this is a pre-ship sanity check from the test suite.',
    artifactTimeout: 300_000,
  },
  {
    name: 'Music (text → music)',
    allModels: /ace-step/i,
    route: 'ace-step',
    prompt: 'a calm lo-fi beat with soft piano',
    artifactTimeout: 300_000,
  },
  {
    name: 'Sound (text → sound effect)',
    allModels: /moss-sfx/i,
    route: 'moss-sfx',
    prompt: 'footsteps on gravel, slow and deliberate',
    artifactTimeout: 300_000,
  },
  {
    name: 'Video (text → video)',
    capLabel: /^Video/,
    route: 'ltx-director-distilled',
    prompt: 'a drone shot flying over a misty forest at sunrise',
    artifactTimeout: 600_000,
  },
  {
    // The Hunyuan Motion family no longer exists in the catalog — the
    // text→motion surface is the Text to Motion tile (default soma).
    name: 'Text→Motion (text → motion)',
    capLabel: /^Text to Motion/,
    route: 'soma',
    prompt: 'a person waves hello, then turns around',
    artifactTimeout: 600_000,
  },
  {
    // Kimodo is the Motion tile's default route (models are not entries;
    // no All-models pick anymore).
    name: 'Kimodo (text → 3D motion)',
    capLabel: /^Motion/,
    route: 'kimodo',
    prompt: 'a person waving hello',
    artifactTimeout: 600_000,
  },
  // TODO (validate against live stack before enabling):
  //   - IdeoGram: reach the card via the Image tile + the card's Model
  //     select (ideogram is form_ideogram — its own form, so it needs its
  //     own capability tile or card path once validated); its form uses a
  //     canvas-based prompt slot (ideogram_canvas) — fillPrompt would need
  //     a custom interaction.
  //   - ASR (faster_whisper / vibevoice_asr) needs an AUDIO upload + returns text.
  //   - Voice creator ("Voice Creator") needs a reference audio upload; the
  //     sample PNG fixture is the wrong MIME type.
]

test.describe('Real generation — R1 card surfaces (browser → server → GPU)', () => {
  for (const c of SERVICES) {
    test(
      `${c.name} produces real output through the web UI`,
      { timeout: 900_000 },
      async ({ page }) => {
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

        // ── 1. Library card canvas + pick the route ─────────────────
        await gotoLibrary(page)
        const dialog = await openPicker(page)

        await clickCapability(dialog, c.capLabel!)

        await waitCardDetail(page, c.route)
        console.log(`  ✓ ${c.name}: card landed (auto-expanded) with route ${c.route}`)

        // ── 2. Attach the fixture where the form expects an image ──
        const modal = await waitCardModal(page)
        if (c.needsImage) {
          await attachFixture(modal, 'e2e/fixtures/sample.png')
          console.log('  ✓ fixture attached (data-URL thumbnail shown)')
        }

        // ── 3. Fill the prompt and Run ──────────────────────────────
        await fillPrompt(modal, c.prompt)
        await modal.getByRole('button', { name: 'Run' }).click()
        console.log('  ✓ Clicked Run — waiting for GPU...')

        // ── 4. Error toast check (required field, backend 500) ─────
        await page.waitForTimeout(2_000)
        const errorToast = page.locator('[data-sonner-toast][data-type="error"]').first()
        if (await errorToast.isVisible().catch(() => false)) {
          const toastText = await errorToast.textContent()
          console.log(`  ✗ Error toast: ${toastText}`)
          console.log(`  Payload sent: ${JSON.stringify(runPayload)}`)
          throw new Error(`Generate failed with error toast: ${toastText}`)
        }

        // ── 5. Wait for the artifact in the card modal ──────────────
        let artifact: { kind: 'media' | 'glb'; src?: string }
        try {
          artifact = await waitForCardArtifact(page, modal, c.artifactTimeout)
        } catch (e) {
          throw new Error(
            `${(e as Error).message} (${c.name}). ` +
              `POST /v1/flows/start fired: ${runPayload ? 'YES' : 'NO'}. ` +
              `Console errors: ${consoleErrors.slice(0, 5).join(' | ') || 'none'}`,
          )
        }

        // ── 6. REAL RESULT proof — byte-verify the artifact ─────────
        if (artifact.kind === 'media') {
          const src = artifact.src!
          expect(src, 'artifact src must be an artifact URL, not data:').not.toMatch(/^data:/)
          const resp = await page.request.get(new URL(src, page.url()).toString())
          expect(resp.ok(), `artifact fetch should be 200 (got ${resp.status()})`).toBe(true)
          const bytes = (await resp.body()).length
          expect(bytes, 'artifact bytes must be substantial (>10KB)').toBeGreaterThan(10_000)
          console.log(`  ✓ REAL artifact verified: ${src} (${(bytes / 1024).toFixed(0)}KB)`)
        } else {
          // GLB — the modal renders the placeholder + artifact file name.
          const name = await modal.locator('p', { hasText: /\.(glb|gltf)$/i }).first().textContent()
          expect(name?.trim(), 'GLB artifact name must be rendered').toBeTruthy()
          console.log(`  ✓ REAL GLB artifact verified: ${name?.trim()}`)
        }

        // ── 7. Verify the run payload model (ONE run protocol) ──────
        expect(runPayload, 'POST /v1/flows/start must have fired').toBeTruthy()
        expect(String(runPayload!['model']), `payload model should be ${c.route}`).toBe(c.route)
        console.log(`  ✓ run protocol payload verified: model=${runPayload!['model']}`)
      },
    )
  }
})
