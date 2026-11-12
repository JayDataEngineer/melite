/**
 * THE H3 VELOCITY ARENA (P3 — the accelerator decision; plan
 * dev_docs/design/h3-sota-execution-plan-2026-11-10.md §5).
 *
 * SELF-GATED: runs only under H3_ARENA=1 on an ENGINE_FREE lane —
 * the normal e2e pass never pays these GPU minutes. The arena is a
 * BENCH, not a wall: its receipt (the wall-clock table + the
 * settled defaults) is what P0's walls re-aim on; no invariant
 * lives here.
 *
 * THE LAW THIS SESSION SERVES (the standing BENCH row): no new
 * attention arm and no default change lands without the arena
 * receipt. Arms, fixed seed, same prompt clip (90 frames at the
 * schema's own 1344×768 floor — NO geometry stamps):
 *
 *   warmup    turbo8 (cache warm, timing discarded)
 *   turbo8    the served default      — SLA 0.85 / msl 12288 / dls 2
 *   sla090    SLA 0.90 (the old speed preset)
 *   dls0      dense_last_steps 0      (the distillation-exact tail)
 *   dls1      dense_last_steps 1      (the three-way spread's mid)
 *   msl8192   min_seq_len 8192        (the node-shipped guard)
 *   dmad4     the DMAD 4-step lora    (steps marry to 4)
 *   slaoff    SLA bypass              (the like-for-like denominator
 *             the node's own enabled=false bypass provides)
 *
 * ASSERTS BAKED IN (debug before the operator feels it):
 *   - the SPEEDUP IS REAL only if sparsity REACHES the patch node:
 *     each SLA arm's settled workflow must carry H3SLAAttention
 *     with enabled:true and the arm's own sparsity/msl/dls inputs —
 *     an enabled=false passthrough masquerading as a speedup is the
 *     failure this catches (the pack logs nothing on success, so
 *     the composed graph is the truth, not the journal).
 *   - ZERO `adaln_proj` dropped-key ERROR lines in the engine
 *     journal per arm (audit-009's 51-key watch — the
 *     unconditional-mount question retires on this evidence, not
 *     on an argument).
 *   - wall-clock is the table's own column, measured warm (the
 *     warmup arm pays the unet load), sequential on an idle engine.
 *
 * Run: H3_ARENA=1 TMPDIR=/var/tmp/melite-arena ./node_modules/.bin/vitest run \
 *        --config vitest.e2e.config.ts tests/e2e/h3-velocity-arena.e2e.ts
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootWorld, stopWorld, runCard, nodesWith, firstBytes, type World, type Settled } from './gpu-harness.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'
import { bootModels } from '../../packages/engines/comfyui-cordis/src/models/models.ts'
import { lanePresenceMiss } from '../../packages/harness/estate-queue/src/cardsLanes.ts'

const ARENA = process.env['H3_ARENA'] === '1'
/** Fixed across every arm — the A in A/B. */
const SEED = 8675309
const CLIP = [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90 }]

interface Arm {
  tag: string
  body: Record<string, unknown>
  /** null = the SLA node must be ABSENT (bypass arm). */
  sla: { sparsity: number, msl: number, dls: number } | null
}

const ARMS: Arm[] = [
  { tag: 'warmup', body: { loras: [{ id: 'h3_turbo8_v1' }] }, sla: { sparsity: 0.85, msl: 12288, dls: 2 } },
  { tag: 'turbo8', body: { loras: [{ id: 'h3_turbo8_v1' }] }, sla: { sparsity: 0.85, msl: 12288, dls: 2 } },
  { tag: 'sla090', body: { loras: [{ id: 'h3_turbo8_v1' }], sla_sparsity: 0.9 }, sla: { sparsity: 0.9, msl: 12288, dls: 2 } },
  { tag: 'dls0', body: { loras: [{ id: 'h3_turbo8_v1' }], sla_dense_last_steps: 0 }, sla: { sparsity: 0.85, msl: 12288, dls: 0 } },
  { tag: 'dls1', body: { loras: [{ id: 'h3_turbo8_v1' }], sla_dense_last_steps: 1 }, sla: { sparsity: 0.85, msl: 12288, dls: 1 } },
  { tag: 'msl8192', body: { loras: [{ id: 'h3_turbo8_v1' }], sla_min_seq_len: 8192 }, sla: { sparsity: 0.85, msl: 8192, dls: 2 } },
  { tag: 'dmad4', body: { loras: [{ id: 'h3_dmad_4step' }] }, sla: { sparsity: 0.85, msl: 12288, dls: 2 } },
  { tag: 'slaoff', body: { loras: [{ id: 'h3_turbo8_v1' }], sla_enabled: false }, sla: null },
]

/** The adaln watch: ERROR lora lines naming adaln_proj since an
 *  instant (the engine journal is the only place the loader drops
 *  them; --since bounds the arm, -o cat strips the journal chrome). */
function adalnErrorsSince(iso: string): number {
  const out = execFileSync('journalctl', [
    '--user', '-u', 'melite-comfyui.service', '--since', iso, '-o', 'cat',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return out.split('\n').filter((l) => l.includes('adaln_proj') && l.includes('ERROR')).length
}

function slaInputs(s: Settled): Record<string, unknown> | null {
  const rows = nodesWith(s, /H3SLAAttention/)
  if (rows.length === 0) return null
  return (rows[0]![1] as { inputs?: Record<string, unknown> }).inputs ?? {}
}

describe.skipIf(!ARENA || !ENGINE_FREE)('the h3 velocity arena', () => {
  it('prices the arms and settles the NEEDS-LIVE-RUN trio', async () => {
    // LANE PRESENCE, BOOTED (weightsPresent's skipIf-time cold call
    // reads an unbooted models table and answers false for a family
    // whose weights ARE on the store — the h3 lane verifies clean
    // once the table is booted under the endpoint fixture, so the
    // arena states its own gate: boot, then judge the miss LOUD.)
    const fixture = join(tmpdir(), 'cards-gpu-weights-probe.json')
    writeFileSync(fixture, JSON.stringify({ url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }) + '\n')
    process.env.INFERENCE_TEST_SANDBOX = '1'
    process.env.COMFYUI_ENDPOINT_CONFIG = fixture
    await bootModels()
    const miss = lanePresenceMiss('h3')
    expect(miss === null, `h3 lane presence: ${miss === null ? '' : miss.message.slice(0, 200)}`).toBe(true)

    const w: World = await bootWorld('h3-arena-')
    const table: Array<Record<string, unknown>> = []
    try {
      for (const arm of ARMS) {
        const since = new Date().toISOString()
        const t0 = Date.now()
        const s = await runCard(w, { model: 'h3', calls: CLIP, seed: SEED, ...arm.body }, `arena-${arm.tag}`)
        const wall = (Date.now() - t0) / 1000

        // THE ARTIFACT IS REAL BYTES (every arm, before any verdict)
        expect(firstBytes(s).length > 1024, `${arm.tag}: real artifact bytes`).toBe(true)

        // SPARSITY REACHED THE PATCH NODE — and the bypass arm rides
        // the node's OWN enabled:false (the 2026-11-12 live catch:
        // the estate once hardcoded enabled:true and let the flag
        // flip only the downstream switch, so both arms ran the
        // sparsity patch; the node's pass-through input is the
        // designed like-for-like baseline, ARM 15c owns the law)
        const inputs = slaInputs(s)
        if (arm.sla === null) {
          expect(inputs, `${arm.tag}: the bypass arm still composes H3SLAAttention (the shared model chain)`).not.toBeNull()
          expect(inputs!['enabled'], `${arm.tag}: the bypass arm rides the node's OWN pass-through (enabled:false — a true like-for-like dense baseline)`).toBe(false)
        } else {
          expect(inputs, `${arm.tag}: the settled graph carries H3SLAAttention`).not.toBeNull()
          expect(Number(inputs!['sparsity_ratio']), `${arm.tag}: sparsity reached the node`).toBe(arm.sla.sparsity)
          expect(Number(inputs!['min_seq_len']), `${arm.tag}: min_seq_len reached the node`).toBe(arm.sla.msl)
          expect(Number(inputs!['dense_last_steps']), `${arm.tag}: dense_last_steps reached the node`).toBe(arm.sla.dls)
          expect(inputs!['enabled'], `${arm.tag}: the node is ENABLED (a bypass masquerade is the failure)`).toBe(true)
        }

        // THE FIXED SEED rode the sampler (same-latent A/B honesty)
        const ks = nodesWith(s, /KSampler|SamplerCustom/)
        expect(ks.length, `${arm.tag}: a sampler composed`).toBeGreaterThan(0)

        // THE ADALN WATCH (audit-009): zero dropped-key ERRORs
        const adaln = adalnErrorsSince(since)
        expect(adaln, `${arm.tag}: ZERO adaln_proj dropped-key ERROR lines in the engine journal`).toBe(0)

        table.push({ arm: arm.tag, wall_s: Math.round(wall), adaln_errors: adaln,
          sla: arm.sla === null ? 'bypass' : `${arm.sla.sparsity}/${arm.sla.msl}/${arm.sla.dls}`,
          artifact_bytes: firstBytes(s).length, run: s.runDir })
        // eslint-disable-next-line no-console -- THE ARENA TABLE (the receipt's own column)
        console.log(`[arena] ${arm.tag.padEnd(8)} wall=${String(Math.round(wall)).padStart(4)}s  sla=${arm.sla === null ? 'bypass' : `${arm.sla.sparsity}/${arm.sla.msl}/${arm.sla.dls}`}  adaln=${adaln}`)
      }

      // THE TABLE PERSISTS (the receipt reads this JSON verbatim)
      const dir = join(tmpdir(), 'h3-arena')
      mkdirSync(dir, { recursive: true })
      const out = join(dir, 'table.json')
      writeFileSync(out, JSON.stringify({ seed: SEED, clip: CLIP, arms: table }, null, 2) + '\n')
      // eslint-disable-next-line no-console -- the receipt's input path
      console.log(`[arena] table → ${out}`)
      expect(table.length, 'every arm ran').toBe(ARMS.length)
    } finally {
      await stopWorld(w)
    }
  }, 3_600_000)
})
