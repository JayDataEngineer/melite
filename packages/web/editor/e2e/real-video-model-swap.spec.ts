/**
 * REAL: Video tab — model hot-swap (LTX / Wan VACE / SCAIL2).
 *
 * Proves the "model is interchangeable" contract: all three video families
 * share ONE build_director.SCHEMA, the dropdown hot-swaps between them,
 * and each produces real GPU video output through the SAME form.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-video-model-swap.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fillPrompt, clickGenerate, pollRunToArtifacts } from './helpers/generateFlow'
import { artifactRoot } from './helpers/artifactRoot'

const MODELS = [
  { pattern: /ltx/i, exclude: /scail/i, name: 'LTX 2.3' },
  { pattern: /wan/i, exclude: /scail/i, name: 'Wan 2.2 VACE' },
  { pattern: /scail/i, exclude: /ltx/i, name: 'SCAIL2' },
] as const

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

test.describe('Real: Video model hot-swap — each family generates', () => {
  for (const target of MODELS) {
    test(`${target.name} → real MP4`, { timeout: 600_000 }, async ({ page }) => {
      await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
      await openVideoTab(page)
      await addVideoShot(page)

      // Switch to the target model
      const modelSelect = page.locator('select').first()
      const opts = await modelSelect.locator('option').allInnerTexts()
      const targetOpt = opts.find(v =>
        target.pattern.test(v) && (target.exclude ? !target.exclude.test(v) : true)
      )
      expect(targetOpt, `${target.name} must be in dropdown`).toBeTruthy()
      await modelSelect.selectOption(targetOpt!)
      await page.waitForTimeout(3000)
      console.log(`  ✓ Selected: ${targetOpt}`)

      await fillPrompt(page, 'a serene mountain landscape at golden hour')

      // One response listener for the start POST — yields the run_id (the
      // ONE run protocol: POST /v1/flows/start → run_id → poll status).
      let startBody: Record<string, unknown> | null = null
      page.on('response', (resp) => {
        if (resp.url().includes('/v1/flows/start') && resp.request().method() === 'POST') {
          resp.json().then((b) => { if (b && b.run_id) startBody = b }).catch(() => {})
        }
      })

      await clickGenerate(page)

      // Poll the ONE status channel to terminal → artifact URLs
      const startDeadline = Date.now() + 120_000
      while (!startBody && Date.now() < startDeadline) await page.waitForTimeout(1000)
      expect(startBody, `${target.name} must produce a start response`).toBeTruthy()
      const runId = String(startBody!.run_id || '')
      expect(runId, `${target.name} start response must carry run_id`).toBeTruthy()
      if (startBody!.error) throw new Error(`${target.name} failed: ${startBody!.error}`)

      const urls = await pollRunToArtifacts(page, runId)
      const v0 = urls[0]

      // Fetch + persist the real video bytes
      const buf = await page.evaluate((u) => fetch(u).then((r) => r.arrayBuffer()), v0)
      expect(Buffer.from(buf).length, `${target.name} video bytes > 1KB`).toBeGreaterThan(1000)
      const slug = target.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const outDir = artifactRoot('real-video-model-swap', slug)
      fs.mkdirSync(outDir, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outFile = path.join(outDir, `${stamp}-${slug}.mp4`)
      fs.writeFileSync(outFile, Buffer.from(buf))
      console.log(`  ✅ ${target.name} → real MP4 saved (${(Buffer.from(buf).length / 1024).toFixed(0)}KB)`)
    })
  }
})
