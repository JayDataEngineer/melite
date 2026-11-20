/**
 * gpu-harness.ts — THE SHARED LIVE-SILICON HARNESS (2026-10-31, the
 * weight-suite fleshing: every card earns a GPU receipt row).
 *
 * recipes-gpu.e2e.ts hand-carried this whole harness inline
 * (engineAlive / weightsPresent / bootWorld / runCard / the assert
 * helpers). The engine half has since moved to its own home:
 * ./engine-gate.ts owns presence, busy-defer, and pins for every
 * engine suite (operator order 2026-11-06); this harness keeps the
 * weights gate, the world mirror, and the run helpers, importing
 * the engine address from the gate.
 *
 * Engine-gated throughout (the inference-smoke precedent): no
 * ComfyUI at the seat's address = self-skip, and a busy engine
 * (the operator's own render on the GPU) defers unless
 * MELITE_E2E_FORCE=1 — a skip is not a cost signal. Every row
 * additionally gates on its family's lane weights via
 * weightsPresent().
 */
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { QueueService } from '../../packages/harness/estate-queue/src/service.ts'
import { partitionQueue, queueEntryPromptId } from './queue-ownership.ts'
import { lanePresenceMiss } from '../../packages/harness/estate-queue/src/cardsLanes.ts'
import { mintSandbox } from '../helpers/harness.ts'

/** The engine gate lives in ONE home now (operator order 2026-11-06):
 *  presence, busy-defer, and pins ride ./engine-gate.ts — this
 *  harness re-exports the address the world-mirror fixture stamps.
 *  HAS_ENGINE is retired: suites gate on ENGINE_FREE (presence AND
 *  deferral), never presence alone. */
export { ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'
import { ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'
import { ANCHOR_PNG_B64, uploadAnchorPng as uploadAnchorPngAt } from './anchor-upload.ts'

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

/** THE ENGINE-OWNED FREE DOOR + THE ESTATE-OWNED RESTART DOOR moved
 * to their own leaf (./engine-doors.ts) when the VRAM-admission
 * seat needed them above this harness (engine-gate seats before
 * the harness boots worlds; the doors re-export keeps every row
 * caller's import unchanged). */
export { freeEngineResidency, restartEngineResidency } from './engine-doors.ts'

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
 * 1200 × 500ms — row budgets above 600s (music full-length,
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
  // THE SIDECAR SETTLE (2026-11-16, full-lanes round 4): the queue row
  // flips terminal FIRST; the _flow.json sidecar write lags it under a
  // loaded engine (arena-warmup burned here: queue completed, sidecar
  // still 'running' at the assert). Poll the sidecar to terminal on
  // its OWN budget before judging it.
  type FlowSidecar = { status: string, graph: Array<{ params?: { workflow?: Record<string, unknown> } }> }
  let flow: FlowSidecar | undefined
  for (let i = 0; i < 240; i++) {
    const read = JSON.parse(readFileSync(join(runDir, '_flow.json'), 'utf8')) as FlowSidecar
    flow = read
    if (read.status !== 'queued' && read.status !== 'running') break
    await new Promise((r) => setTimeout(r, 500))
  }
  assert.equal(flow?.status, 'completed', tag + ': the sidecar carries the terminal status')
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

export interface Queued {
  runId: string
  workflow: Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
}

/** THE GPU DIET (operator order 2026-11-17: FIX THE PIPELINE NOW):
 * submit through the SAME start door, wait only for the composed
 * workflow to land in the run's own sidecar (written at queue time —
 * the graph receipts law, runsRegistry's registration), answer it,
 * and STOP the run through the estate's own stop door. A row that
 * asserts the SERIALIZED GRAPH (pill stamps, loader classes, wiring)
 * proves everything it asserts the moment the graph composes; the
 * render proves nothing further for those rows — and on one shared
 * engine, each skipped render is real GPU-minutes back. Rows that
 * read RENDERED TRUTHS (bytes served, durations, decode-time
 * refusals like the audio-grid conform) stay on runCard: those are
 * the per-family and per-frame-math renders the diet keeps.
 *
 * A run that settles (success OR refusal) before the stop lands is
 * fine — the graph is what we asked for, never the render's exit. */
export async function queueCard(w: World, body: Record<string, unknown>, tag: string): Promise<Queued> {
  const ans = await w.svc.start(
    { draft_id: 'd1', test: false, ...body } as never,
    new AbortController().signal,
  )
  assert.equal(ans.status, 'queued', tag + ': the card run must queue')
  const sidecar = join(w.stateRoot, 'output', ans.run_id, '_flow.json')
  for (let i = 0; i < 120; i++) {
    let wf: Record<string, unknown> | undefined
    try {
      const flow = JSON.parse(readFileSync(sidecar, 'utf8')) as {
        graph?: Array<{ params?: { workflow?: Record<string, unknown> } }>
      }
      wf = flow.graph?.[0]?.params?.workflow
    } catch { /* not yet written — the compose is still running */ }
    if (wf !== undefined && Object.keys(wf).length > 0) {
      await w.svc.stop(ans.run_id, new AbortController().signal).catch(() => { /* already settled — the graph is ours */ })
      // THE SETTLE GATE (run 6, 2026-11-17): the stop is flag +
      // return — the WORKER is the authority, and it may hold one
      // more segment submit past our stop (the h3 final row
      // composes in segments; the clear raced the worker's next
      // submit and the queue never emptied). A settled run row can
      // submit nothing more; only then is the engine queue's
      // content OURS to judge. Never clear a queue a worker still
      // awaits — a deleted prompt never reports completion, the
      // worker never reaches its flag check, the stop never
      // converges (today's red, verbatim).
      //
      // THE COLD-STOP BUDGET (2026-11-16, the render-lane gate): the
      // 90s ceiling was calibrated on render-warmed engines — the
      // render rows preloaded the film weights before any stamp
      // stopped. With the render lane manual-gated, a stamp's stop
      // lands while the engine still COLD-LOADS tens of GB of
      // weights; there is no node boundary for the flag check until
      // the load completes, so the honest ceiling is the load, not
      // the warm settle. 240s — both h3-timeline stamp rows held
      // 'running' past 90s on the first cold battery with the
      // compose itself green (verdict=complete, nodes=55).
      let settled = ''
      for (let i = 0; i < 240; i++) {
        const row = await w.svc.status(ans.run_id, new AbortController().signal).catch(() => undefined as Record<string, unknown> | undefined)
        settled = typeof row?.['status'] === 'string' ? row['status'] : ''
        if (settled !== '' && settled !== 'queued' && settled !== 'running' && settled !== 'stopping') break
        if (i === 239) throw new Error(tag + ': the run never settled after the stop (status ' + JSON.stringify(settled) + ' after 240s) — the worker never reached its flag check (a cold engine may hold the model load past this ceiling; MELITE_GPU_RENDER=1 re-warms the lane)')
        await new Promise((r) => setTimeout(r, 1000))
      }
      console.log(`[${tag}] drain: run settled (${settled}) — judging the engine queue`)
      // THE DRAIN PROOF (the anny burn, 2026-11-17): on the serial
      // battery (one row in flight at a time) an empty engine queue
      // is the proof OUR prompt settled; a stop that leaves the
      // engine grinding is a defect, never a pass. /interrupt kills
      // only the EXECUTING item and an estate-clear can starve a
      // live worker — but a SETTLED run owns nothing pending, so a
      // leftover item is a true orphan: clear it (serial battery —
      // our row is the queue's content), re-interrupt, and keep the
      // assert's teeth: anything surviving both still reds.
      //
      // THE QUEUE OWNERSHIP LAW (the operator's-bench burn,
      // 2026-11-20): the blind `clear: true` + interrupt wiped the
      // OPERATOR'S pending bench items and killed their running
      // render the night their bench shared the engine — the serial
      // assumption licensed a whole-queue wipe. The settled run's
      // sidecar receipt carries the ENGINE-SIDE prompt_id
      // (graph_receipt.prompt_id — minted at POST /prompt), so
      // ownership is exact: partition by id, clear only OURS,
      // interrupt only while the RUNNING item is ours, and name
      // foreign work without touching it — the anny teeth narrow to
      // our own prompt and survive it.
      const flowOwned = JSON.parse(readFileSync(sidecar, 'utf8')) as {
        graph_receipt?: { prompt_id?: string }
      }
      const oursId = typeof flowOwned.graph_receipt?.prompt_id === 'string'
        ? flowOwned.graph_receipt.prompt_id
        : ''
      if (oursId === '') {
        // THE NEVER-SUBMITTED FACE (the receipt's own law: prompt_id
        // is "absent until the run has submitted"): a GPU-diet row
        // whose stop wins the race against the engine POST settles
        // with no id — nothing of ours is on the queue BY
        // CONSTRUCTION (we sent nothing), so the serial proof is
        // satisfied by the absence itself. The queue content is
        // foreign-only; name it, never touch it.
        const probe = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/queue`).then((r) => r.json() as Promise<{ queue_running?: unknown[], queue_pending?: unknown[] }>).catch(() => null as { queue_running?: unknown[], queue_pending?: unknown[] } | null)
        const foreign = (probe?.queue_running?.length ?? 0) + (probe?.queue_pending?.length ?? 0)
        console.log(`[${tag}] drain: our run settled without ever submitting (no prompt_id) — nothing of ours can be on the queue; ${foreign} foreign item(s) live, untouched`)
        return { runId: ans.run_id, workflow: wf as Queued['workflow'] }
      }
      let cleared = 0
      for (let i = 0; i < 60; i++) {
        const queue = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/queue`).then((r) => r.json() as Promise<{ queue_running?: unknown[], queue_pending?: unknown[] }>).catch(() => null)
        if (queue !== null) {
          const running = partitionQueue(queue.queue_running ?? [], oursId)
          const pending = partitionQueue(queue.queue_pending ?? [], oursId)
          const oursLeft = running.ours.length + pending.ours.length
          if (oursLeft === 0) {
            const foreign = running.foreign + pending.foreign
            if (foreign > 0) {
              console.log(`[${tag}] drain: ${foreign} foreign queue item(s) live — the operator\u2019s work, never touched; our prompt ${oursId} owns none`)
            }
            break
          }
          if (i === 15) {
            // delete names OUR prompt ids (the engine drops pending
            // ones; a running id is a server-side no-op) and the
            // interrupt flies ONLY while the executing item is ours
            cleared = oursLeft
            const ids = [...running.ours, ...pending.ours].map((e) => JSON.stringify(queueEntryPromptId(e)))
            await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/queue`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: `{"delete":[${ids.join(',')}]}` }).catch(() => { /* the assert below owns the failure */ })
            if (running.ours.length > 0) {
              await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/interrupt`, { method: 'POST' }).catch(() => { /* same */ })
            }
            console.log(`[${tag}] drain: cleared ${cleared} of OUR queue item(s) left behind by the settled run (prompt ${oursId})`)
          }
          if (i === 59) throw new Error(tag + ': our prompt ' + oursId + ' survived the owned clear + interrupt — an orphaned render would eat the next rows\u2019 VRAM budgets (the anny burn class)')
        }
        await new Promise((r) => setTimeout(r, 1000))
      }
      if (cleared > 0) console.log(`[${tag}] drain: queue clear of our items after clearing ${cleared} orphan(s)`)
      return { runId: ans.run_id, workflow: wf as Queued['workflow'] }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  await w.svc.stop(ans.run_id, new AbortController().signal).catch(() => { /* nothing to stop */ })
  throw new Error(tag + ': the composed workflow never landed in the sidecar (60s) — the compose door refused or hung')
}

/** Find the composed node rows whose JSON carries the needle (the
 * lora wiring proof — resolved file + strength VERBATIM). */
/** The workflow-carrying answer of either door (runCard's Settled or
 * queueCard's Queued — the graph readers only read the workflow). */
export interface WorkflowBearer {
  workflow: Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
}

export function nodesWith(s: WorkflowBearer, needle: RegExp): Array<[string, unknown]> {
  return Object.entries(s.workflow).filter(([, r]) => needle.test(JSON.stringify(r)))
}

/** The composed node rows of EXACTLY one class (nodesWith greps the
 * whole row JSON — reference edges match too; this counts REAL
 * nodes). */
export function byClass(s: WorkflowBearer, cls: string): Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]> {
  return Object.entries(s.workflow)
    .filter(([, r]) => (r as { class_type?: string }).class_type === cls) as Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]>
}

/** A real upload through ComfyUI's own upload door — returns the
 * staged file name the lane's image slots address. The law itself
 * (overwrite stated, answer judged) lives in anchor-upload.ts so the
 * keyless wall can judge it; this binding supplies the live lane's
 * door. */
export async function uploadAnchorPng(tag: string): Promise<string> {
  return uploadAnchorPngAt({ engineUrl: `http://${ENGINE_HOST}:${ENGINE_PORT}` }, tag)
}

/** Stage the h3 reshoot/extend rows' source clip (the swap film)
 * as an ESTATE-SIDE absolute path — the estate stages local paths
 * into the engine input dir itself (the q21-crop + synthRefWav
 * precedents; the engine has NO /upload/video door, only image and
 * mask — a video upload answers 405, the round-7 proof). THE
 * ROUND-7 BURN: the rows named 'swap_film_v1.mp4' as a bare engine
 * name without staging anything, leaning on some earlier session's
 * leftover — on this box the extend row timed out at the compose
 * gate (the source leaf never existed). The row now copies the
 * repo's own 2s fixture (swap-film-2s.mp4 — H264 + an AAC track:
 * the estate's admission gate REFUSES a silent source, "a silent
 * source dies mid-render inside the video loader") into the
 * WORLD's input dir under the name the rows address and hands the
 * absolute path. */
export function stageSwapFilm(w: World, tag: string): string {
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
  const dir = join(w.stateRoot, 'input')
  mkdirSync(dir, { recursive: true })
  const dest = join(dir, `swap_film_${tag}.mp4`)
  copyFileSync(join(repoRoot, 'tests', 'fixtures', 'swap-film-2s.mp4'), dest)
  return dest
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
