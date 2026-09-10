/**
 * E2E: Kimodo FBX — the ONE TOOL flow.
 *
 * Verifies both modes of kimodo_export_fbx:
 *
 *   STANDALONE (no NPZ):
 *     raw GLB → SkinToken rig (use_transfer=False) → GPU weight transfer
 *     (AABB-aligned torch.cdist on RTX 4090) → rigged textured GLB
 *     - Output GLB must have: skins ≥ 1, mixamorig bones ≥ 20, materials ≥ 1
 *
 *   RETARGET (with NPZ):
 *     rigged GLB + SOMA-77 NPZ → Blender retarget → animated GLB
 *     - Output GLB must have: animations ≥ 1, skins ≥ 1, mixamorig bones ≥ 20
 *     - Must be FAST (no SkinToken re-rig)
 *
 * Also verifies the ONE run protocol contract (POST /v1/flows/start
 * flat shape → run_id → poll status → artifact URL):
 *   - Data URL params are uploaded and resolved correctly
 *   - The GLB arrives as a run artifact (downloaded from the status URL)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/kimodo-fbx-flow.spec.ts
 */
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// The owning DSH (the estate doors serve /v1 same-origin here).
// Env override is the config channel; no port pins in code. The
// session token rides the query (claims sit behind the trust fence).
const DSH = process.env.DSH_URL || 'http://127.0.0.1:3088'
const TOKEN = process.env.DSH_TOKEN || ''
const url = (p: string): string => TOKEN === '' ? DSH + p : DSH + p + (p.includes('?') ? '&' : '?') + 'token=' + TOKEN

// ── Helpers ──────────────────────────────────────────────────────────────

/** Submit a kimodo_export_fbx job via /v1/flows/start (flat shape —
 *  the ONE run-start door) and poll the ONE status channel to terminal.
 *  Returns the artifact URLs (primary first). Throws on error terminals. */
async function runKimodoFBX(
  request: import('@playwright/test').APIRequestContext,
  params: Record<string, unknown>,
  timeoutMs = 600_000,
): Promise<string[]> {
  const r = await request.post(url(`/v1/flows/start`), {
    data: { model: 'kimodo_export_fbx', ...params },
    timeout: timeoutMs,
  })
  expect(r.status(), `POST /v1/flows/start`).toBe(200)
  const body = await r.json() as { run_id?: string; error?: string }
  if (body.error) throw new Error(`kimodo_export_fbx failed: ${body.error}`)
  const runId = String(body.run_id || '')
  expect(runId, 'start response must carry run_id').toBeTruthy()

  interface StatusStage {
    url?: string
    gallery?: Array<{ url: string }>
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const s = await request.get(url(`/v1/flows/status/${runId}?include_log=false`))
    const st = await s.json() as {
      status?: string
      error?: string
      stages?: StatusStage[]
    }
    const status = String(st.status || '')
    if (status === 'completed' || status === 'done') {
      const urls: string[] = []
      for (const stage of st.stages ?? []) {
        if (stage.url) urls.push(stage.url)
        for (const g of stage.gallery ?? []) {
          if (g && typeof g.url === 'string') urls.push(g.url)
        }
      }
      expect(urls.length, 'completed run must surface ≥1 artifact URL').toBeGreaterThan(0)
      return urls
    }
    if (status === 'error' || status === 'failed' || status === 'interrupted' || status === 'stopped') {
      throw new Error(
        `kimodo_export_fbx run ${runId} terminal ${status}: ` +
        `${String(st.error || JSON.stringify(st)).slice(0, 800)}`,
      )
    }
    await new Promise((res) => setTimeout(res, 5000))
  }
  throw new Error(`kimodo_export_fbx run ${runId} not terminal within ${timeoutMs}ms`)
}

/** POST a kimodo_export_fbx job and poll to a terminal state, asserting the
 *  run FAILED with a clear error. Returns the terminal body for assertion. */
async function runKimodoFBXExpectError(
  request: import('@playwright/test').APIRequestContext,
  params: Record<string, unknown>,
  timeoutMs = 120_000,
): Promise<{ status: string; error?: string }> {
  const r = await request.post(url(`/v1/flows/start`), {
    data: { model: 'kimodo_export_fbx', ...params },
    timeout: timeoutMs,
  })
  expect(r.status(), `POST /v1/flows/start`).toBe(200)
  const body = await r.json() as { run_id?: string; error?: string }
  // Compile-time contract violations (e.g. empty rigged_path) fail the POST
  // itself with 400 {error} — a hard error, not a silent drop.
  if (body.error) {
    expect(String(body.error).toLowerCase()).toMatch(/armature|bone|skeleton|rigged/)
    return { status: 'error', error: body.error }
  }
  const runId = String(body.run_id || '')
  expect(runId, 'start response must carry run_id').toBeTruthy()

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const s = await request.get(url(`/v1/flows/status/${runId}?include_log=false`))
    const st = await s.json() as { status?: string; error?: string }
    const status = String(st.status || '')
    if (status === 'error' || status === 'failed' || status === 'interrupted' || status === 'stopped') {
      expect(String(st.error || '').toLowerCase()).toMatch(/armature|bone|skeleton|rigged/)
      return { status, error: st.error }
    }
    if (status === 'completed' || status === 'done') {
      throw new Error(`kimodo_export_fbx run ${runId} COMPLETED unexpectedly`)
    }
    await new Promise((res) => setTimeout(res, 5000))
  }
  throw new Error(`kimodo_export_fbx run ${runId} not terminal within ${timeoutMs}ms`)
}

/** Download a run artifact (relative URL served on the gateway) as bytes. */
async function fetchArtifact(
  request: import('@playwright/test').APIRequestContext,
  url: string,
): Promise<Buffer> {
  const art = await request.get(url(`${url}`))
  expect(art.ok(), `artifact fetch must succeed: ${url}`).toBeTruthy()
  return await art.body()
}

/** Parse a GLB buffer's JSON chunk to inspect structure. */
function parseGLB(buf: Buffer) {
  // GLB binary format: header (12 bytes) + JSON chunk
  const magic = buf.readUInt32LE(0)
  expect(magic, 'GLB magic 0x46546C67').toBe(0x46546C67)
  const jsonLen = buf.readUInt32LE(12)
  const jsonStr = buf.toString('utf-8', 20, 20 + jsonLen)
  const gltf = JSON.parse(jsonStr)
  return {
    meshes: gltf.meshes?.length ?? 0,
    skins: gltf.skins?.length ?? 0,
    nodes: gltf.nodes?.length ?? 0,
    animations: gltf.animations?.length ?? 0,
    materials: gltf.materials?.length ?? 0,
    images: gltf.images?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    mixamoBones: (gltf.nodes ?? []).filter(
      (n: { name?: string }) => n.name?.startsWith('mixamorig'),
    ).length,
    animChannels: gltf.animations?.[0]?.channels?.length ?? 0,
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW — serial: standalone rig first, then retarget on its output
// ════════════════════════════════════════════════════════════════════════

// Shared state: the rigged GLB produced by the standalone test, consumed
// by the retarget tests. Set in test 1, read in tests 2+3.
let riggedGlbSubpath = ''

test.describe.serial('Kimodo FBX — full flow', () => {
  test.skip(
    !fs.existsSync('/mnt/data/models/skintoken/experiments/articulation_xl_quantization_256_token_4/grpo_1400.ckpt'),
    'SkinToken checkpoint not available',
  )

  // ═════════════════════════════════════════════════════════════════════
  // 1. STANDALONE MODE — rig a raw GLB with SkinToken + GPU weight transfer
  //    Verifies: Mixamo skeleton + skin weights + PRESERVED TEXTURES
  // ═════════════════════════════════════════════════════════════════════
  test('1. rigs raw GLB → Mixamo bones + skin + textures', async ({ request }) => {
    const urls = await runKimodoFBX(request, {
      rigged_path: 'kimodo_character.glb',
      source_glb: 'kimodo_character.glb',
      file_format: 'glb',
      npz_path: '',
    }, 300_000)  // 5 min — GPU transfer is ~30s; allow headroom

    const glbUrl = urls[0]
    const buf = await fetchArtifact(request, glbUrl)
    expect(buf.length, 'GLB data must be substantial (>100KB)').toBeGreaterThan(100_000)

    // Parse the GLB
    const info = parseGLB(buf)

    // ── Must have Mixamo skeleton ──
    expect(info.skins, 'Must have skin weights').toBeGreaterThanOrEqual(1)
    expect(info.mixamoBones, 'Must have Mixamo bones').toBeGreaterThanOrEqual(20)

    // ── CRITICAL: textures must be preserved (GPU transfer keeps source) ──
    expect(info.materials, 'Must have materials (textures preserved)').toBeGreaterThanOrEqual(1)
    expect(info.images, 'Must have texture images').toBeGreaterThanOrEqual(1)

    console.log('Standalone rig output:', JSON.stringify(info, null, 2))

    // Stash for retarget tests — extract the run-relative output path
    // from the artifact URL: "/v1/assets/runs/<run_id>/3D/KimodoAnimated_<ts>.glb"
    // → "3D/KimodoAnimated_<ts>.glb" (the path the retarget run re-uploads).
    riggedGlbSubpath = glbUrl.replace(/^\/v1\/assets\/runs\/[^/]+\//, '')
    console.log(`Stashed rigged GLB for retarget: ${riggedGlbSubpath}`)
  })

  // ═════════════════════════════════════════════════════════════════════
  // 2. RETARGET MODE — animate the rigged GLB with SOMA-77 motion
  //    Verifies: animations + Mixamo bones + skin (fast, no SkinToken)
  // ═════════════════════════════════════════════════════════════════════
  test('2. retargets motion onto rigged GLB → animated GLB', async ({ request }) => {
    test.skip(!riggedGlbSubpath, 'Depends on standalone rig test producing a GLB')

    const urls = await runKimodoFBX(request, {
      rigged_path: riggedGlbSubpath,
      npz_path: 'pose_studio_motion.npz',
      file_format: 'glb',
    }, 120_000)  // 2 min — retarget is fast (Blender only)

    const buf = await fetchArtifact(request, urls[0])
    const info = parseGLB(buf)

    // ── Must have animations ──
    expect(info.animations, 'Must have at least 1 animation').toBeGreaterThanOrEqual(1)
    expect(info.animChannels, 'Animation must have channels').toBeGreaterThanOrEqual(10)

    // ── Must have Mixamo skeleton + skin ──
    expect(info.skins, 'Must have skin weights').toBeGreaterThanOrEqual(1)
    expect(info.mixamoBones, 'Must have Mixamo bones').toBeGreaterThanOrEqual(20)

    // ── Textures must survive retargeting (if source had them) ──
    // The retarget uses Blender's glTF exporter which preserves materials.
    if (info.materials > 0) {
      expect(info.images, 'Texture images must survive retarget').toBeGreaterThanOrEqual(1)
    }

    console.log('Retarget output:', JSON.stringify(info, null, 2))
  })

  // ═════════════════════════════════════════════════════════════════════
  // 3. RETARGET is FAST — no SkinToken, no GPU transfer (Blender only)
  // ═════════════════════════════════════════════════════════════════════
  test('3. retarget mode is fast — no SkinToken', async ({ request }) => {
    test.skip(!riggedGlbSubpath, 'Depends on standalone rig test producing a GLB')

    const t0 = Date.now()
    const urls = await runKimodoFBX(request, {
      rigged_path: riggedGlbSubpath,
      npz_path: 'pose_studio_motion.npz',
      file_format: 'glb',
    }, 120_000)
    const elapsed = (Date.now() - t0) / 1000

    expect(urls.length, 'retarget must produce output').toBeGreaterThan(0)
    // Retarget should complete in under 60s (Blender only, no GPU inference)
    expect(elapsed, 'Retarget must be fast (< 60s)').toBeLessThan(60)
    console.log(`Retarget completed in ${elapsed.toFixed(1)}s`)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 3. API CONTRACT — error handling
// ════════════════════════════════════════════════════════════════════════

test.describe('Kimodo FBX — error handling', () => {
  test('rejects empty rigged_path', async ({ request }) => {
    // Compile-time contract violation → the start POST itself hard-fails
    // (400 {error}), never a silent drop.
    const r = await request.post(url(`/v1/flows/start`), {
      data: {
        model: 'kimodo_export_fbx',
        rigged_path: '',
        file_format: 'glb',
      },
      timeout: 10_000,
    })
    expect(r.status(), 'empty rigged_path must 400 at compile time').toBe(400)
    const body = await r.json()
    expect(body.error?.toLowerCase()).toContain('rigged_path')
  })

  test('clear error when GLB has no armature (retarget on raw mesh)', async ({ request }) => {
    // The raw mesh has no skeleton — the run must fail with a clear
    // armature error, never a silent success.
    const body = await runKimodoFBXExpectError(request, {
      rigged_path: 'kimodo_character.glb',  // raw mesh, no bones
      npz_path: 'pose_studio_motion.npz',
      file_format: 'glb',
    }, 60_000)
    expect(body.status).toBe('error')
    console.log(`  ✓ No-armature retarget failed clearly: ${String(body.error).slice(0, 200)}`)
  })
})
