/**
 * REAL: Canvas (Inpaint Studio) — GPU generation through melite's ONE run
 * protocol.
 *
 * The Canvas tab drives POST /v1/flows/start (flat shape — the ONE
 * run-start door) with Krea 2 + LanPaint as the inpaint sampler, via
 * unicanvasClient.draw → runCompiledGeneration. The legacy
 * POST /comfyui/vnccs/unicanvas/draw endpoint 405'd in the field (upstream
 * custom node's route registration broke across ComfyUI PromptServer
 * upgrades). The remaining VNCCS routes (checkpoints, presets, segment,
 * progress) are still reachable and used.
 *
 *   POST /v1/flows/start (flat)             → run_id → status → PNG
 *   GET  /comfyui/vnccs/unicanvas/checkpoints   → model list (unchanged)
 *   GET  /comfyui/vnccs/unicanvas/presets       → generation presets (unchanged)
 *
 * The Vite dev server proxies:
 *   /v1/*       → melite gateway (:7860)
 *   /comfyui/*  → ComfyUI (:18465), stripping the /comfyui prefix
 *
 * This test exercises the FULL GPU flow:
 *   1. Create a transparent 512×512 PNG (the "blank canvas")
 *   2. POST /v1/flows/start with txt2img + Krea 2 + prompt
 *   3. Poll /v1/flows/status/{run_id} → artifact URL → real PNG bytes
 *   4. Save to test-outputs/real-canvas-gpu/
 *   5. Verify it's a real, non-blank image
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-canvas-gpu.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { artifactRoot } from './helpers/artifactRoot'
import { pollRunToArtifacts } from './helpers/generateFlow'
import zlib from 'node:zlib'

// ── Pure-Node PNG encoder (no external deps) ───────────────────────────────

/** Create a PNG from raw RGBA pixel data using only Node.js built-ins. */
function encodePng(width: number, height: number, rgba: Buffer): string {
  function chunk(type: Buffer, data: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeAndData = Buffer.concat([type, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeAndData) >>> 0, 0)
    return Buffer.concat([len, typeAndData, crc])
  }
  function crc32(buf: Buffer): number {
    // PNG CRC — standard polynomial 0xEDB88320, table-driven.
    let table = (crc32 as any)._t as number[] | undefined
    if (!table) {
      table = []
      for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        table[n] = c
      }
      (crc32 as any)._t = table
    }
    let crc = 0xffffffff
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type: RGBA
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // IDAT — prepend filter byte (0=None) per scanline, then zlib-compress.
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const compressed = zlib.deflateSync(raw)

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    chunk(Buffer.from('IHDR'), ihdr),
    chunk(Buffer.from('IDAT'), compressed),
    chunk(Buffer.from('IEND'), Buffer.alloc(0)),
  ]).toString('base64')
}

/** Create a transparent RGBA PNG (all zeros = fully transparent). */
function createTransparentPng(w: number, h: number): string {
  return encodePng(w, h, Buffer.alloc(w * h * 4))
}

/** Create a white-background RGBA PNG. */
function createWhitePng(w: number, h: number): string {
  const rgba = Buffer.alloc(w * h * 4, 255)
  return encodePng(w, h, rgba)
}

/** Create a mask PNG: white (opaque) inside a centered circle, transparent out. */
function createCircleMaskPng(w: number, h: number, radius: number): string {
  const rgba = Buffer.alloc(w * h * 4, 0)
  const cx = w / 2, cy = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy < radius * radius) {
        const i = (y * w + x) * 4
        rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255
      }
    }
  }
  return encodePng(w, h, rgba)
}

const COMFYUI = '/comfyui' // Vite-proxied → :18465
const RUN_START = '/v1/flows/start' // Vite-proxied → melite gateway (ONE door)

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Canvas GPU — /v1/flows/start flow (Krea 2 + LanPaint)', () => {
  test('checkpoints endpoint returns models', async ({ request }) => {
    const r = await request.get(`${COMFYUI}/vnccs/unicanvas/checkpoints`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.checkpoints, 'checkpoints array').toBeInstanceOf(Array)
    expect(d.checkpoints.length, 'at least one checkpoint').toBeGreaterThan(0)
    console.log(`  ✓ ${d.checkpoints.length} checkpoints available`)
    for (const c of d.checkpoints.slice(0, 5)) console.log(`    ${c}`)
  })

  test('presets endpoint returns generation presets', async ({ request }) => {
    const r = await request.get(`${COMFYUI}/vnccs/unicanvas/presets`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    const presets = Array.isArray(d) ? d : (d.presets ?? d.result ?? [])
    expect(presets.length, 'at least one preset').toBeGreaterThan(0)
    console.log(`  ✓ ${presets.length} presets: ${presets.map((p: any) => p.id ?? p.name ?? '?').join(', ')}`)
  })

  test('txt2img POST /v1/flows/start produces a real GPU image (Krea 2 Turbo)', async ({ page, request }) => {
    test.setTimeout(300_000) // 5 min — model load + sampling

    console.log('  → POST /v1/flows/start (txt2img, krea-2, 8 steps)...')
    const r = await request.post(RUN_START, {
      data: {
        model: 'krea-2',
        prompt: 'a small red cube on a white background, studio lighting',
        negative_prompt: '',
        seed: 42,
        steps: 8,
        cfg: 1.0,
        sampler: 'euler',
        scheduler: 'normal',
        width: 512,
        height: 512,
      },
      timeout: 300_000,
    })

    expect(r.status(), `POST /v1/flows/start should return 200`).toBe(200)
    const d = await r.json()
    const runId = String(d.run_id || '')
    expect(runId, 'start response must carry run_id').toBeTruthy()
    if (d.error) throw new Error(`Generation failed: ${d.error}`)

    // ONE status channel: poll to terminal → artifact URL → real bytes.
    const urls = await pollRunToArtifacts(page, runId)
    const art = await request.get(urls[0])
    expect(art.ok(), 'artifact fetch must succeed').toBeTruthy()
    const imgBuffer = await art.body()

    // Save to disk.
    const outDir = artifactRoot('real-canvas-gpu')
    fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outFile = path.join(outDir, `${stamp}-krea2-txt2img.png`)
    fs.writeFileSync(outFile, imgBuffer)
    console.log(`  ✓ Saved: ${outFile} (${(imgBuffer.length / 1024).toFixed(0)}KB)`)

    // Verify it's a real PNG (magic bytes) with non-trivial size.
    expect(imgBuffer[0]).toBe(0x89) // PNG magic
    expect(imgBuffer[1]).toBe(0x50) // 'P'
    expect(imgBuffer.length, 'real image > 50KB').toBeGreaterThan(50_000)
  })

  test('inpaint POST /v1/flows/start with circular mask produces a real GPU image (LanPaint)', async ({ page, request }) => {
    test.setTimeout(300_000)

    const srcB64 = createWhitePng(512, 512)
    const maskB64 = createCircleMaskPng(512, 512, 100)

    console.log('  → POST /v1/flows/start (inpaint with circular mask, krea-2, LanPaint, 8 steps)...')
    const r = await request.post(RUN_START, {
      data: {
        model: 'krea-2',
        prompt: 'a red rose flower',
        negative_prompt: '',
        seed: 99,
        steps: 8,
        cfg: 1.0,
        sampler: 'euler',
        scheduler: 'normal',
        width: 512,
        height: 512,
        // Inpaint mode: input_image + lanpaint_mask present → backend builder
        // auto-detects inpaint, VAE-encodes the init image, and routes
        // through LanPaintKSampler with this mask.
        input_image: `data:image/png;base64,${srcB64}`,
        lanpaint_mask: `data:image/png;base64,${maskB64}`,
        lanpaint_enabled: true,
        lanpaint_num_steps: 5,
        lanpaint_step_size: 0.2,
        lanpaint_lambda: 16,
        lanpaint_beta: 1,
        lanpaint_friction: 15,
        lanpaint_prompt_mode: 'Image First',
      },
      timeout: 300_000,
    })

    expect(r.status(), `POST /v1/flows/start inpaint should return 200`).toBe(200)
    const d = await r.json()
    const runId = String(d.run_id || '')
    expect(runId, 'start response must carry run_id').toBeTruthy()
    if (d.error) throw new Error(`Generation failed: ${d.error}`)

    // ONE status channel: poll to terminal → artifact URL → real bytes.
    const urls = await pollRunToArtifacts(page, runId)
    const art = await request.get(urls[0])
    expect(art.ok(), 'artifact fetch must succeed').toBeTruthy()
    const imgBuffer = await art.body()

    const outDir = artifactRoot('real-canvas-gpu')
    fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outFile = path.join(outDir, `${stamp}-krea2-inpaint.png`)
    fs.writeFileSync(outFile, imgBuffer)
    console.log(`  ✓ Saved: ${outFile} (${(imgBuffer.length / 1024).toFixed(0)}KB)`)

    expect(imgBuffer[0]).toBe(0x89) // PNG magic
    expect(imgBuffer.length, 'real inpaint > 50KB').toBeGreaterThan(50_000)
  })
})

test.describe('Canvas UI — tab boots + VNCCS proxy reachable from browser', () => {
  test('Canvas tab mounts and browser can fetch VNCCS endpoints', async ({ page }) => {
    test.setTimeout(60_000)
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })

    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })

    const btn = page.getByRole('button', { name: /^Canvas$/ }).first()
    await btn.waitFor({ state: 'visible', timeout: 15_000 })
    await btn.click()

    // Wait for the 2D canvas to mount.
    await page.waitForFunction(
      () => {
        for (const c of document.querySelectorAll('canvas')) {
          if ((c as HTMLCanvasElement).getContext('2d') && c.width > 0 && c.height > 0)
            return true
        }
        return false
      },
      undefined,
      { timeout: 30_000 },
    )
    console.log('  ✓ Canvas tab mounted')

    // The frontend can now reach VNCCS endpoints through the Vite proxy.
    const checkpointCount = await page.evaluate(async () => {
      const r = await fetch('/comfyui/vnccs/unicanvas/checkpoints')
      if (!r.ok) return null
      const d = await r.json()
      return (d.checkpoints as string[])?.length ?? 0
    })
    expect(checkpointCount, 'browser can reach VNCCS checkpoints').not.toBeNull()
    expect(checkpointCount!, 'at least 1 checkpoint from browser').toBeGreaterThan(0)
    console.log(`  ✓ Browser fetched ${checkpointCount} checkpoints via Vite proxy`)

    // Filter benign errors.
    const critical = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('chrome-extension') &&
        !e.includes('Download the React DevTools') &&
        !e.includes('/v1/llm/keys') &&
        !e.includes('[enhancement]') &&
        !e.includes('Failed to load resource') &&
        !e.includes('React does not recognize') &&
        !e.includes('asChild') &&
        !e.includes('/sam/') &&
        !e.includes('Failed to fetch'),
    )
    expect(critical, `Critical errors: ${critical.join('; ')}`).toHaveLength(0)
  })
})
