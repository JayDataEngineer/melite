/**
 * gpu-harness.ts — THE SHARED LIVE-SILICON HARNESS (2026-10-31, the
 * weight-suite fleshing: every card earns a GPU receipt row).
 *
 * recipes-gpu.e2e.ts hand-carried this whole harness inline
 * (engineAlive / weightsPresent / bootWorld / runCard / the assert
 * helpers); four other e2e files hand-copy engineAlive. New receipt
 * suites import it from here — one home per fact. (Migrating the
 * older files onto it is owed, not done here: their landed rows
 * stay byte-untouched.)
 *
 * Engine-gated throughout (the inference-smoke precedent): no
 * ComfyUI at the seat's address = self-skip (a skip is not a cost
 * signal). Every row additionally gates on its family's lane
 * weights via weightsPresent().
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { QueueService } from '../../packages/harness/estate-queue/src/service.ts'
import { lanePresenceMiss } from '../../packages/harness/estate-queue/src/cardsLanes.ts'
import { mintSandbox } from '../harness.ts'

export const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
export const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')

export async function engineAlive(): Promise<boolean> {
  try {
    const res = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/system_stats`, {
      signal: AbortSignal.timeout(30_000),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Module-scope engine presence (top-level await — the recipes-gpu
 *  precedent): suites gate their describe on this. */
export const HAS_ENGINE = await engineAlive()

/** THE WEIGHTS GATE (roadmap §10's e2e debt, 2026-09-21): a GPU
 *  receipt row needs BOTH the engine and the family's lane weights —
 *  the same walk the lane-presence gate serves, env-deferral
 *  stripped. A missing encoder self-skips the row; before this gate
 *  the rows FAILED mid-flight on any box without the weights.
 *
 *  THE WORLD MIRROR: the probe runs under the SAME env the row's
 *  mintSandbox world will run under (sandbox flag + a bare-url
 *  endpoint fixture, no machine statement) — probed bare at module
 *  scope, checkModelPresent's mount leg would resolve the HOST's
 *  real configured store and the probe would lie about the world
 *  the row actually runs in. */
export function weightsPresent(fam: string): boolean {
  const fixture = join(tmpdir(), 'cards-gpu-weights-probe.json')
  const savedSandbox = process.env.INFERENCE_TEST_SANDBOX
  const savedEndpoint = process.env.COMFYUI_ENDPOINT_CONFIG
  try {
    writeFileSync(fixture, JSON.stringify({ url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }) + '\n')
    process.env.INFERENCE_TEST_SANDBOX = '1'
    process.env.COMFYUI_ENDPOINT_CONFIG = fixture
    return lanePresenceMiss(fam) === null
  } catch {
    return false // unknown family — the row cannot receipt it either
  } finally {
    if (savedSandbox === undefined) delete process.env.INFERENCE_TEST_SANDBOX
    else process.env.INFERENCE_TEST_SANDBOX = savedSandbox
    if (savedEndpoint === undefined) delete process.env.COMFYUI_ENDPOINT_CONFIG
    else process.env.COMFYUI_ENDPOINT_CONFIG = savedEndpoint
  }
}

/** One seeded world: the production stack + the card registry (the
 * {model:} door's composer). No engine fake anywhere on the path. */
export interface World {
  ctx: Context
  svc: RunsRuntimeService
  stateRoot: string
  stop(): void
}

export async function bootWorld(tag: string): Promise<World> {
  const sandbox = mintSandbox(tag)
  const ctx = new Context()
  new EnginesService(ctx)
  const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
  const seat = ctx.get('engines') as EnginesService
  const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(ctx, host) })
  const stateRoot = join(sandbox.root, 'state')
  // THE REAL QUEUE SEAT (J12): the registry provider's inject reads
  // the queue seat — a plain {core, stateRoot} object seats NOTHING
  // (ctx.cardRegistry stays undefined and every {model:} start dies
  // reading phase1Card). The service owns its own core.
  const queueSvc = new QueueService(ctx, { stateRoot })
  ;(ctx as unknown as { queue: unknown }).queue = queueSvc
  ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
  await ctx.plugin(cardRegistryProvider as { name: string; apply: (c: unknown, cfg?: unknown) => void })
  const svc = new RunsRuntimeService(ctx as unknown as Context)
  return {
    ctx, svc, stateRoot,
    stop: () => { stopRegister() },
  }
}

/** Dispose a world (the finally-arm idiom every row carries). */
export async function stopWorld(w: World): Promise<void> {
  w.stop()
  await w.ctx.fiber.dispose()
}

export interface Settled {
  status: string
  error: string
  artifacts: string[]
  workflow: Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
  runDir: string
  /** The stage row's artifact url (the in-memory row's — the
   * sidecar's stage rows carry no url today, audit #11 kin). */
  stageUrl: string
}

/** Start one CARD run (the {model:} door — the run press's lane),
 * poll the in-memory row to settlement, read the sidecar's composed
 * workflow + the harvested artifacts.
 *
 * THE 600s CEILING (audit 2026-10-31): the settlement poll runs
 * 1200 × 500ms — row budgets above 600s (music full_length,
 * h3 final_hd) state engine-side patience the harness cannot
 * honor; proven runtimes fit inside (music ~300s), so the ceiling
 * is documented, not hit. */
export async function runCard(w: World, body: Record<string, unknown>, tag: string): Promise<Settled> {
  const ans = await w.svc.start(
    { draft_id: 'd1', test: false, ...body } as never,
    new AbortController().signal,
  )
  assert.equal(ans.status, 'queued', tag + ': the card run must queue')
  let row: { status?: string, error?: string, artifacts?: string[], stages?: Array<{ url?: string }> } | undefined
  for (let i = 0; i < 1200; i++) {
    row = (w.ctx as unknown as { queue: { core: { runs: Map<string, unknown> } } }).queue.core.runs.get(ans.run_id) as typeof row
    const status = row?.status
    if (status !== undefined && status !== 'queued' && status !== 'running') break
    await new Promise((r) => setTimeout(r, 500))
  }
  assert.equal(row?.status, 'completed', tag + ': the live run must complete (error was: ' + (row?.error ?? '') + ')')
  assert.ok((row?.artifacts?.length ?? 0) >= 1, tag + ': at least one artifact harvested')
  const runDir = join(w.stateRoot, 'output', ans.run_id)
  const flow = JSON.parse(readFileSync(join(runDir, '_flow.json'), 'utf8')) as {
    status: string
    graph: Array<{ params?: { workflow?: Record<string, unknown> } }>
  }
  assert.equal(flow.status, 'completed', tag + ': the sidecar carries the terminal status')
  const stageUrl = row!.stages?.[0]?.url ?? ''
  return {
    status: row!.status!,
    error: row!.error ?? '',
    artifacts: row!.artifacts!,
    workflow: (flow.graph[0]?.params?.workflow ?? {}) as Settled['workflow'],
    runDir,
    stageUrl,
  }
}

/** The first artifact's real bytes (the world, not the self-report). */
export function firstBytes(s: Settled): Buffer {
  assert.ok(s.stageUrl !== '', 'the completed stage carries its artifact url')
  const p = join(s.runDir, s.stageUrl)
  assert.ok(existsSync(p), 'the artifact exists as real bytes: ' + p)
  return readFileSync(p)
}

/** Find the composed node rows whose JSON carries the needle (the
 * lora wiring proof — resolved file + strength VERBATIM). */
export function nodesWith(s: Settled, needle: RegExp): Array<[string, unknown]> {
  return Object.entries(s.workflow).filter(([, r]) => needle.test(JSON.stringify(r)))
}

/** The composed node rows of EXACTLY one class (nodesWith greps the
 * whole row JSON — reference edges match too; this counts REAL
 * nodes). */
export function byClass(s: Settled, cls: string): Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]> {
  return Object.entries(s.workflow)
    .filter(([, r]) => (r as { class_type?: string }).class_type === cls) as Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]>
}

// A 64×64 RGBA PNG anchor (checker 200/90 — PIL-verified: the FIRST
// anchor's bytes carried a corrupt IHDR (bit depth 0) that uploaded
// fine and died at LoadImage on every box with an engine, failing
// the established pixal3d row too. These bytes were generated,
// PIL-opened, and embedded — never hand-typed.)
const ANCHOR_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAeElEQVR4nO3SoQ0AMAwEscz5E2erdIiCRqrR0QOu7p4k82trw8TL1oYJAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAi57ACFFIob5MV0aAAAAAElFTkSuQmCC'

/** A real upload through ComfyUI's own upload door — returns the
 * staged file name the lane's image slots address. */
export async function uploadAnchorPng(tag: string): Promise<string> {
  const png = Buffer.from(ANCHOR_PNG_B64, 'base64')
  const fd = new FormData()
  fd.append('image', new Blob([png], { type: 'image/png' }), 'e2e_anchor.png')
  const up = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/upload/image`, {
    method: 'POST', body: fd,
    signal: AbortSignal.timeout(30_000),
  })
  assert.ok(up.ok, tag + ': the anchor upload lands: ' + up.status)
  const upBody = await up.json() as { name?: string }
  return upBody['name'] ?? 'e2e_anchor.png'
}

/** Run one row's world lifecycle (boot → body → dispose) — the
 * try/finally every row carries, in one call. */
export async function withWorld<T>(tag: string, body: (w: World) => Promise<T>): Promise<T> {
  const w = await bootWorld(tag)
  try {
    return await body(w)
  } finally {
    await stopWorld(w)
  }
}

/** The anchor as an ESTATE-SIDE absolute path (written to tmpdir,
 * staged into the engine input dir by the estate itself). Some
 * cards' admission demands a file on the estate (seedvr2's
 * input_image refuses bare engine-side names; the h3 guide
 * derivation reads the estate file to imply the t4r lane) — a bare
 * /upload/image name reaches their lanes as a ghost. Cards whose
 * slots pass names straight to LoadImage ride uploadAnchorPng. */
export function stageAnchorPng(tag: string): string {
  const p = join(tmpdir(), tag + '-anchor.png')
  writeFileSync(p, Buffer.from(ANCHOR_PNG_B64, 'base64'))
  return p
}

/** A 3-second 440Hz PCM16 mono WAV (16kHz) for clone-reference
 * lanes — synthesized in-test, no fixtures, no network. The estate
 * stages local paths into the engine's input dir itself (the
 * q21-crop precedent), so the path rides ref_audio directly. */
export function synthRefWav(tag: string): string {
  const rate = 16000
  const seconds = 3
  const n = rate * seconds
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / rate)), i * 2)
  }
  const head = Buffer.alloc(44)
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8)
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22); head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 2, 28)
  head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  const p = join(tmpdir(), tag + '-ref.wav')
  writeFileSync(p, Buffer.concat([head, data]))
  return p
}
