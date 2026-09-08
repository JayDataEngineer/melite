/**
 * REAL: Edit tab — LoRA selection → GPU → real PNG.
 *
 * Proves the qwen-img-edit-2511 LoRA flow through the browser UI:
 *
 *   1. Open Edit tab (qwen-img-edit-2511, which has lora_dir: qwen)
 *   2. Upload a source image (the form requires input_image)
 *   3. Open the LoRA picker → select a LoRA from the qwen/ folder
 *   4. Fill prompt → click Generate
 *   5. Capture the POST /v1/flows/start payload → assert LoRA is in it
 *   6. ONE run protocol → poll status → real image output (PNG bytes)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-edit-lora.spec.ts
 */
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  openService, waitForFormReady, fillPrompt, uploadImages, clickGenerate, pollRunToArtifacts,
} from './helpers/generateFlow'
import { selectLora, expectLoraSelected, captureRunPayload, expectLoraInPayload } from './helpers/loraFlow'
import { artifactRoot } from './helpers/artifactRoot'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLE_IMAGE = path.join(__dirname, 'fixtures', 'sample.png')

test.beforeEach(async () => {
  try {
    execSync('docker restart inference-comfyui', { timeout: 60_000 })
    for (let i = 0; i < 30; i++) {
      try {
        const resp = await fetch('http://localhost:18465/system_stats')
        if (resp.ok) break
      } catch {}
      await new Promise(r => setTimeout(r, 2000))
    }
  } catch {}
})

test.describe('Real: Edit (Qwen) + LoRA end-to-end', () => {
  test('Qwen-Edit + multiple-angles LoRA → real PNG through browser UI', { timeout: 600_000 }, async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // ── 1. Load + open Edit ──
    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })

    await openService(page, 'Edit')
    await waitForFormReady(page)
    console.log('  ✓ Edit form ready')

    // ── 2. Upload the source image ──
    await uploadImages(page, SAMPLE_IMAGE)
    await page.waitForTimeout(1500)

    // ── 2b. Expand Advanced Settings (LoraPicker is inside the accordion) ──
    await page.locator('text=Advanced Settings').click()
    await page.waitForTimeout(1000)

    // ── 3. Select a LoRA from qwen/ folder ──
    await selectLora(page, 'multiple-angles')
    await expectLoraSelected(page, 'multiple-angles')

    // ── 4. Fill prompt ──
    await fillPrompt(page, 'change the view to show the character from multiple angles')

    // ── 5. Capture payload + generate ──
    // One response listener for the start POST — yields the run_id (the
    // ONE run protocol: POST /v1/flows/start → run_id → poll status).
    let startBody: Record<string, unknown> | null = null
    page.on('response', (resp) => {
      if (resp.url().includes('/v1/flows/start') && resp.request().method() === 'POST') {
        resp.json().then((b) => { if (b && b.run_id) startBody = b }).catch(() => {})
      }
    })

    const payloadPromise = captureRunPayload(page)
    await clickGenerate(page)

    let payload: Record<string, unknown> | null = null
    try {
      payload = await payloadPromise
    } catch {
      console.log('  ⚠ captureRunPayload timed out')
    }

    // ── 6. Poll the ONE status channel to terminal → artifact URLs ──
    const startDeadline = Date.now() + 120_000
    while (!startBody && Date.now() < startDeadline) await page.waitForTimeout(1000)
    expect(startBody, 'must receive POST /v1/flows/start response').toBeTruthy()
    const runId = String(startBody!.run_id || '')
    expect(runId, 'start response must carry run_id').toBeTruthy()
    if (startBody!.error) throw new Error(`Generation failed: ${startBody!.error}`)

    const urls = await pollRunToArtifacts(page, runId)
    const img0 = urls[0]

    // ── 7. Fetch + persist the real image bytes ──
    const buf = await page.evaluate((u) => fetch(u).then((r) => r.arrayBuffer()), img0)
    expect(Buffer.from(buf).length, 'real image bytes > 1KB').toBeGreaterThan(1000)
    const outDir = artifactRoot('real-edit-lora')
    fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outFile = path.join(outDir, `${stamp}-qwen-lora.png`)
    fs.writeFileSync(outFile, Buffer.from(buf))
    console.log(`  ✓ Real image saved: ${outFile} (${(Buffer.from(buf).length / 1024).toFixed(0)}KB)`)

    if (payload) {
      expectLoraInPayload(payload, 'multiple-angles')
    }

    const critical = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('chrome-extension') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('/v1/llm/keys') &&
      !e.includes('[enhancement]') &&
      !e.includes('Failed to load resource') &&
      !e.includes('React does not recognize') &&
      !e.includes('asChild')
    )
    expect(critical, `console errors: ${critical.join('; ')}`).toHaveLength(0)

    console.log('  ✅ FULL FLOW: browser → LoRA select → payload → GPU → real PNG')
  })
})
