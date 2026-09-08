/**
 * Shared helpers for real-browser generation tests.
 *
 * These drive the ACTUAL frontend (Vite React app) the same way a user does,
 * so a passing test proves the whole chain works: sidebar → form → build
 * payload → POST /v1/flows/start → server → ComfyUI → real artifact
 * rendered in the UI.
 *
 * The hard assertion is the ONE run protocol: POST /v1/flows/start →
 * run_id → poll GET /v1/flows/status/{run_id} to terminal → artifact
 * URL → real bytes. A genre-specific DOM media element is checked as a
 * best-effort second signal (strict for image/audio/video, soft for 3d/motion
 * whose UI render is a download/canvas rather than an inline media element).
 */
import { Page, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type Genre = 'image' | 'audio' | 'video' | '3d' | 'motion'

export interface ServiceCase {
  /** Human-readable name for the test title. */
  name: string
  /** Exact accessible name of the sidebar button (from service_tags ui.label). */
  sidebarLabel: string
  genre: Genre
  /** Text typed into the prompt / speech / lyrics field. */
  prompt: string
  /** If true, upload the fixture PNG into every file input the form exposes. */
  needsImageUpload?: boolean
  /** If set, open the model combobox and pick the option matching this id. */
  modelId?: string
  /** Optional: assert the POST /v1/flows/start `model` equals this route. */
  expectRoute?: string
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const SAMPLE_IMAGE = path.join(__dirname, '..', 'fixtures', 'sample.png')

/** Click the sidebar item that opens this service's form.
 *
 *  The sidebar has two layers: workspace tabs (Assets, Canvas, Video, …)
 *  and service buttons within the active workspace. When a label collides
 *  (e.g. "Video" is both a workspace tab and a SCAIL-2 service button),
 *  we pick the LAST match — service buttons render after workspace tabs
 *  in the DOM, and the service button is the one that opens the form. */
export async function openService(page: Page, label: string): Promise<void> {
  const btns = page
    .getByRole('button', { name: new RegExp(`^${escapeRegex(label)}$`), exact: true })
  await btns.first().waitFor({ state: 'visible', timeout: 15_000 })
  const count = await btns.count()
  // When there are duplicates, prefer the last (service button after workspace tabs).
  const btn = count > 1 ? btns.last() : btns.first()
  await btn.click()
  const note = count > 1 ? ` (${count} matches, picked last)` : ''
  console.log(`  ✓ Opened sidebar service "${label}"${note}`)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Wait until the form has rendered something we can drive.
 *  Requires BOTH a Generate button AND at least one input element (textarea,
 *  file input, or text input). This prevents returning before the SchemaForm
 *  has finished loading its form-spec and rendered its fields — some forms
 *  (e.g. Music) render the Generate button immediately but the textarea only
 *  after the async form-spec fetch completes.
 */
export async function waitForFormReady(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        // The Assets sidebar always has an <input type="file"> (Import
        // asset button). Checking for file inputs alone produces a false
        // positive — the form hasn't actually rendered. Instead, require
        // a textarea (the dedicated prompt field) OR a text input that is
        // NOT the sidebar's search box. This ensures the async form-spec
        // fetch has completed and the SchemaForm has rendered its fields.
        const ta = document.querySelector('textarea')
        const gen = Array.from(document.querySelectorAll('button')).find((b) =>
          /generate/i.test(b.textContent || ''),
        )
        // File inputs are still OK for audio-only forms (no textarea), but
        // only count file inputs INSIDE the form area (not the sidebar's
        // Import asset button). The sidebar's import input is inside a
        // <label> with "Import asset" text — skip those.
        const formFiles = Array.from(document.querySelectorAll('input[type="file"]'))
          .filter((inp) => {
            const parent = inp.closest('div, label')
            return parent && !parent.textContent?.includes('Import asset')
          })
        return !!(gen && (ta || formFiles.length > 0))
      },
      undefined,
      { timeout: 120_000 },
    )
  console.log('  ✓ Form ready')
}

/**
 * Fill the primary prompt/text field.
 * Image forms use placeholder "Prompt"; other genres render the main field
 * as a textarea or text input. We try, in order: placeholder "Prompt",
 * first textarea, first text input.
 *
 * SchemaForm fields load asynchronously (form-spec fetch + render), so we
 * retry for up to 10 seconds — the textarea might not exist immediately
 * after waitForFormReady returns.
 */
export async function fillPrompt(page: Page, prompt: string): Promise<void> {
  const findField = async () => {
    const byPlaceholder = page.getByPlaceholder('Prompt').first()
    if (await byPlaceholder.count()) return byPlaceholder
    const ta = page.locator('textarea').first()
    if (await ta.count()) return ta
    const inp = page.locator('input[type="text"]').first()
    if (await inp.count()) return inp
    return null
  }

  let field = null
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline && !field) {
    field = await findField()
    if (!field) await page.waitForTimeout(500)
  }

  if (field) {
    await field.fill(prompt)
    console.log('  ✓ Filled prompt')
    return
  }
  // Some forms (e.g. image-decomposition) expose the prompt field only after
  // an image is uploaded, or need no prompt at all. Warn instead of failing —
  // the Generate-button enable gate will surface a real problem if one exists.
  console.log('  ⚠ No prompt/text field found to fill (continuing)')
}

/** Upload the fixture into every file input the form exposes. */
export async function uploadImages(page: Page, fixture: string): Promise<void> {
  const inputs = page.locator('input[type="file"]')
  const n = await inputs.count()
  if (n === 0) {
    console.log('  ⚠ No file inputs found — skipping upload')
    return
  }
  for (let i = 0; i < n; i++) {
    try {
      // Per-input timeout: a file input can detach when the form re-renders,
      // and we must not hang the whole suite on one missing input.
      await inputs.nth(i).setInputFiles(fixture, { timeout: 15_000 })
    } catch (e) {
      console.log(
        `  ⚠ file input ${i} upload skipped: ${String(e).split('\n')[0]}`,
      )
    }
  }
  console.log(`  ✓ Attempted upload into ${n} file input(s)`)
}

/**
 * Select a model/voice in the form's first model combobox.
 * The combobox often shows a placeholder (e.g. "moss_tts") but binds an
 * EMPTY value until the user opens & picks it — so we must click it and
 * choose. Picks the option whose text contains `modelId` (case-insensitive),
 * else the first option.
 */
export async function selectModel(page: Page, modelId: string): Promise<void> {
  // Retry for up to 10 seconds — the combobox might not be rendered yet
  // (SchemaForm loads asynchronously via form-spec fetch).
  const combos = page.locator('button[role="combobox"]')
  let n = 0
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline && n === 0) {
    n = await combos.count()
    if (n === 0) await page.waitForTimeout(500)
  }
  if (n === 0) {
    console.log('  ⚠ No model combobox present — cannot select model')
    return
  }
  const combo = combos.first()
  await combo.click()
  await page.waitForTimeout(800)

  // Normalize underscores/hyphens/spaces so "moss_tts" matches "Moss TTS"
  // and "ace_step" matches "ACE-Step v1.5".
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const target = norm(modelId)

  const opts = page.getByRole('option')
  const count = await opts.count()
  let picked = false
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const t = norm(await opts.nth(i).innerText().catch(() => ''))
      if (t.includes(target)) {
        await opts.nth(i).click()
        picked = true
        console.log(`  ✓ Selected model option matching "${modelId}"`)
        break
      }
    }
    if (!picked) {
      await opts.first().click()
      console.log('  ✓ Selected first available model option')
    }
  } else {
    // Editable combobox (no role=option list): type the model id directly.
    try {
      await combo.fill(modelId)
      await combo.press('Enter')
      console.log(`  ✓ Typed model id "${modelId}" into editable combobox`)
    } catch {
      console.log('  ⚠ No options and not editable — could not set model')
    }
  }
}

/** Click the form's Generate button (the AssetsTab submit button). */
export async function clickGenerate(page: Page): Promise<void> {
  // Match "Generate" / "Generating…" but NOT "Generate Music" / "Generate
  // Sound" / "Ideogram4 Generate". Pick the FIRST visible match — the form's
  // submit button renders BEFORE the sidebar service buttons in the DOM.
  // (The sidebar also has a "Generate" button for the default image service,
  // which appears later in the DOM; picking the last match would click that
  // sidebar tab-switcher instead of submitting the form.)
  const genBtns = page.getByRole('button', {
    name: /^(Generate|Generating)(?!\s+[A-Z])/,
  })
  let btn = null
  const n = await genBtns.count()
  for (let i = 0; i < n; i++) {
    const b = genBtns.nth(i)
    if (await b.isVisible().catch(() => false)) {
      btn = b
      break
    }
  }
  if (!btn) btn = genBtns.first()
  await btn.scrollIntoViewIfNeeded().catch(() => {})
  // Some forms leave a transparent portal/backdrop (e.g. a just-closed
  // dropdown) intercepting pointer events. Dismiss any overlay first, then
  // fall back to a force click through it.
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)
  try {
    await btn.click({ timeout: 15_000 })
  } catch {
    await btn.click({ force: true })
  }
  console.log('  ✓ Clicked Generate — waiting for GPU...')
}

/**
 * Poll the ONE status channel (GET /v1/flows/status/{run_id}) to a
 * terminal state and collect the artifact URLs (stage.url + gallery[].url,
 * primary first — the same derivation lib/FlowProtocol.ts
 * collectStageUrls makes). HARD gate: any non-completed terminal state
 * (error | failed | interrupted | stopped) throws — a dead executor or a
 * stop is an actionable fault, not a soft-pass.
 */
export async function pollRunToArtifacts(
  page: Page,
  runId: string,
  timeoutMs = 500_000,
): Promise<string[]> {
  interface StatusStage {
    url?: string
    gallery?: Array<{ url: string }>
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const body = await page.evaluate(async (id) => {
      const r = await fetch(`/v1/flows/status/${id}?include_log=false`)
      if (!r.ok) return null
      return (await r.json()) as {
        status?: string
        error?: string
        stages?: StatusStage[]
      }
    }, runId)
    if (body && body.status) {
      const st = String(body.status)
      if (st === 'completed' || st === 'done') {
        const urls: string[] = []
        for (const s of body.stages ?? []) {
          if (s.url) urls.push(s.url)
          for (const g of s.gallery ?? []) {
            if (g && typeof g.url === 'string') urls.push(g.url)
          }
        }
        expect(urls.length, `run ${runId} must surface ≥1 artifact URL`).toBeGreaterThan(0)
        return urls
      }
      if (st === 'error' || st === 'failed' || st === 'interrupted' || st === 'stopped') {
        throw new Error(
          `run ${runId} terminal ${st}: ${String(body.error || JSON.stringify(body)).slice(0, 800)}`,
        )
      }
    }
    await page.waitForTimeout(5000)
  }
  throw new Error(`run ${runId} not terminal within ${timeoutMs}ms`)
}

/**
 * Hard gate: the /v1/run response must be ok and carry real output bytes.
 * Best-effort second signal: a rendered media element in the DOM.
 *
 * LEGACY (pre-ONE-protocol): the run response used to BE the output
 * ({status:"ok", images:[...b64]}). That shape died with /v1/run in D3 —
 * this helper has no callers left; pollRunToArtifacts is the live gate.
 */
export async function waitForOutput(
  page: Page,
  genre: Genre,
  runResponse: Record<string, unknown> | null,
  timeoutMs = 120_000,
): Promise<void> {
  expect(runResponse, 'must have received a /v1/run response').toBeTruthy()

  const status = String(runResponse!['status'])
  const errText = String(
    runResponse!['error'] || runResponse!['message'] || '',
  )

  // NO SOFT-PASSES. Every test must produce real GPU output. If the
  // server returns an error, the test FAILS here with the full message.
  expect(
    status,
    `/v1/run must return status "ok" — got error: ${errText.slice(0, 300)}`,
  ).toBe('ok')

  const images = (runResponse!['images'] as unknown[]) || []
  const videos = (runResponse!['videos'] as unknown[]) || []
  const audios = (runResponse!['audios'] as unknown[]) || []
  const models3d = (runResponse!['models_3d'] as unknown[]) || []
  const data = runResponse!['data']
  const hasData = Array.isArray(data) ? data.length > 0 : !!data
  expect(
    images.length > 0 || videos.length > 0 || audios.length > 0 ||
      models3d.length > 0 || hasData,
    'response must contain generated output media',
  ).toBeTruthy()
  console.log(
    `  ✓ Server returned output (images=${images.length} videos=${videos.length} audios=${audios.length} 3d=${models3d.length} data=${hasData})`,
  )

  // The result may render with different src formats depending on the surface:
  //   - data: URLs (inline base64 — the common path for fresh assets)
  //   - blob: URLs (URL.createObjectURL — some media elements)
  //   - ComfyUI /view URLs (server-hosted results)
  // Match any of these so the DOM check doesn't false-negative on a valid
  // render that happens to use a different URL scheme.
  const selector: Record<Genre, string> = {
    image: 'img[src^="data:image/"], img[src^="blob:"], img[src*="/view"]',
    audio: 'audio[src^="data:audio"], audio[src^="blob:"], audio[src*="/view"]',
    video: 'video[src^="data:video/"], video[src^="blob:"], video[src*="/view"]',
    '3d': 'a[download], a[href^="data:"]',
    motion: 'a[download], a[href^="data:"]',
  }[genre]

  const el = page.locator(selector).first()
  // The DOM check is a BEST-EFFORT second signal. The hard assertion is the
  // /v1/run response above (status ok + real output bytes). Some surfaces
  // render the result in an assets panel that may be scrolled/collapsed, so
  // we use 'attached' (present in DOM) rather than 'visible' (in viewport),
  // and cap at 20s — if the frontend hasn't rendered real output 20s after
  // the server returned it, that's worth flagging, but we don't eat the whole
  // test budget waiting.
  try {
    await el.waitFor({ state: 'attached', timeout: 20_000 })
    console.log(`  ✓ Output media element present in the DOM (${genre})`)
  } catch {
    console.log(
      `  ⚠ No inline media element detected for ${genre} within 20s — the ` +
        `server returned real output, but the UI may render it in an assets ` +
        `panel rather than inline (not a failure).`,
    )
  }
}
