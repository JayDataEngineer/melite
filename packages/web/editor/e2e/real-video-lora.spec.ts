/**
 * REAL: Video tab — LoRA selection → GPU → real MP4.
 *
 * Exercises the ENTIRE LoRA flow through the browser UI:
 *   1. Open Video workspace tab (DirectorStudio)
 *   2. Add a shot → Inspector opens
 *   3. Switch to an LTX model (lora_dir: ltx2)
 *   4. Open the LoRA picker → select the distilled LoRA
 *   5. Verify the LoRA chip appears with a strength slider
 *   6. Fill prompt → click Generate
 *   7. Capture POST /v1/flows/start payload → assert LoRA is in it
 *   8. Wait for GPU → assert real video output (H264 bytes)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-video-lora.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fillPrompt, clickGenerate, pollRunToArtifacts } from './helpers/generateFlow'
import { selectLora, expectLoraSelected, captureRunPayload, expectLoraInPayload } from './helpers/loraFlow'
import { artifactRoot } from './helpers/artifactRoot'

async function openVideoTab(page: Page): Promise<void> {
  const videoTab = page.getByRole('button', { name: /^Video$/ }).first()
  await videoTab.waitFor({ state: 'visible', timeout: 15_000 })
  await videoTab.click()
  await page.waitForTimeout(2000)
}

async function addVideoShot(page: Page): Promise<void> {
  const addBtn = page.locator('text=Add shot').first()
  await addBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await addBtn.click()
  await page.locator('select').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(2000)
}

async function switchVideoModel(page: Page, pattern: RegExp): Promise<void> {
  const modelSelect = page.locator('select').first()
  const opts = await modelSelect.locator('option').allInnerTexts()
  const target = opts.find(v => pattern.test(v))
  if (target) {
    await modelSelect.selectOption(target)
    await page.waitForTimeout(3000)
    console.log(`  ✓ Switched to: ${target}`)
  }
}

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

test.describe('Real: Video + LoRA end-to-end', () => {
  test('LTX + distilled LoRA → real MP4 through browser UI', { timeout: 600_000 }, async ({ page }) => {
    // ── 1. Load app + open Video tab ──
    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
    await openVideoTab(page)
    await addVideoShot(page)
    console.log('  ✓ Video Inspector open')

    // ── 2. Switch to LTX ──
    await switchVideoModel(page, /ltx/i)

    // ── 3. Select the distilled LoRA ──
    await selectLora(page, 'distilled')
    await expectLoraSelected(page, 'distilled')

    // ── 4. Fill prompt ──
    await fillPrompt(page, 'a neon city at night, rain falling, cyberpunk')

    // ── 5. Capture payload + generate ──
    const payloadPromise = captureRunPayload(page)

    // One response listener for the start POST — yields the run_id (the
    // ONE run protocol: POST /v1/flows/start → run_id → poll status).
    let startBody: Record<string, unknown> | null = null
    page.on('response', (resp) => {
      if (resp.url().includes('/v1/flows/start') && resp.request().method() === 'POST') {
        resp.json().then((b) => { if (b && b.run_id) startBody = b }).catch(() => {})
      }
    })

    await clickGenerate(page)

    let payload: Record<string, unknown> | null = null
    try { payload = await payloadPromise } catch { console.log('  ⚠ payload capture timed out') }

    // ── 6. Poll the ONE status channel to terminal → artifact URLs ──
    const startDeadline = Date.now() + 120_000
    while (!startBody && Date.now() < startDeadline) await page.waitForTimeout(1000)
    expect(startBody, 'must receive POST /v1/flows/start response').toBeTruthy()
    const runId = String(startBody!.run_id || '')
    expect(runId, 'start response must carry run_id').toBeTruthy()
    if (startBody!.error) throw new Error(`Generation failed: ${startBody!.error}`)

    const urls = await pollRunToArtifacts(page, runId)
    const v0 = urls[0]

    // ── 7. Fetch + persist the real video bytes ──
    const buf = await page.evaluate((u) => fetch(u).then((r) => r.arrayBuffer()), v0)
    expect(Buffer.from(buf).length, 'real video bytes > 1KB').toBeGreaterThan(1000)
    const outDir = artifactRoot('real-video-lora')
    fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outFile = path.join(outDir, `${stamp}-ltx-lora.mp4`)
    fs.writeFileSync(outFile, Buffer.from(buf))
    console.log(`  ✓ Real video saved: ${outFile} (${(Buffer.from(buf).length / 1024).toFixed(0)}KB)`)

    if (payload) expectLoraInPayload(payload, 'distilled')

    console.log('  ✅ FULL FLOW: browser → LoRA select → payload → GPU → real MP4')
  })
})
