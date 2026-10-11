/**
 * recipes-gpu.e2e.ts — THE RECIPE LAW'S GPU RECEIPT (2026-09-18,
 * the operator's order: "test it out on the GPU for these cards").
 *
 * RULE A (every card rides its family's recipes — LORAs included)
 * and RULE B (the params ride the schema-protected form) both land
 * on real silicon here: for every migrated card the suite composes
 * the EXACT payload the recipe pill stamps, asserts the composed
 * graph carries the lora bag resolved against the family's flavor
 * catalog (file + strength VERBATIM), then RUNS it through the full
 * production stack (card registry → phase-2 compose → queue → live
 * ComfyUI on the GPU box) and asserts the run settles with real
 * bytes. The motion arm carries the Rule B panel-path writes (the
 * generic form's own keys — steps/seed/duration — through the same
 * {model:} door the run press rides).
 *
 * Engine-gated (the inference-smoke precedent): no ComfyUI at the
 * seat's address = self-skip (a skip is not a cost signal).
 */
import '../helpers/boot-models.ts'
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { QueueService } from '../../packages/harness/estate-queue/src/service.ts'
import { mintSandbox } from '../harness.ts'
import { lanePresenceMiss } from '../../packages/harness/estate-queue/src/cardsLanes.ts'

const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')

async function engineAlive(): Promise<boolean> {
  try {
    const res = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/system_stats`, {
      signal: AbortSignal.timeout(30_000),
    })
    return res.ok
  } catch {
    return false
  }
}
const HAS_ENGINE = await engineAlive()

/** THE WEIGHTS GATE (roadmap §10's e2e debt, 2026-09-21): a GPU
 *  receipt row needs BOTH the engine and the family's lane weights —
 *  the same walk the lane-presence gate serves, env-deferral
 *  stripped. A missing encoder self-skips the row (the engine gate's
 *  own law: a skip is not a cost signal); before this gate the rows
 *  FAILED mid-flight on any box without the weights.
 *
 *  THE WORLD MIRROR: the probe runs under the SAME env the row's
 *  mintSandbox world will run under (sandbox flag + a bare-url
 *  endpoint fixture, no machine statement) — probed bare at module
 *  scope, checkModelPresent's mount leg would resolve the HOST's
 *  real configured store and the probe would lie about the world
 *  the row actually runs in. */
function weightsPresent(fam: string): boolean {
  const fixture = join(tmpdir(), 'recipes-gpu-weights-probe.json')
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
interface World {
  ctx: Context
  svc: RunsRuntimeService
  stateRoot: string
  stop(): void
}

async function bootWorld(tag: string): Promise<World> {
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

interface Settled {
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
 * workflow + the harvested artifacts. */
async function runCard(w: World, body: Record<string, unknown>, tag: string): Promise<Settled> {
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
function firstBytes(s: Settled): Buffer {
  assert.ok(s.stageUrl !== '', 'the completed stage carries its artifact url')
  const p = join(s.runDir, s.stageUrl)
  assert.ok(existsSync(p), 'the artifact exists as real bytes: ' + p)
  return readFileSync(p)
}

/** Find the composed node rows whose JSON carries the needle (the
 * lora wiring proof — resolved file + strength verbatim). */
function nodesWith(s: Settled, needle: RegExp): Array<[string, unknown]> {
  return Object.entries(s.workflow).filter(([, r]) => needle.test(JSON.stringify(r)))
}

/** The composed node rows of EXACTLY one class (nodesWith greps the
 * whole row JSON — reference edges match too; this counts REAL
 * nodes: the refine-rider receipt needs pass A + pass B, not their
 * referencing neighbors). */
function byClass(s: Settled, cls: string): Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]> {
  return Object.entries(s.workflow)
    .filter(([, r]) => (r as { class_type?: string }).class_type === cls) as Array<[string, { class_type?: string, inputs?: Record<string, unknown> }]>
}

describe.skipIf(!HAS_ENGINE)('the recipe law on the GPU (with live ComfyUI)', () => {
  it.skipIf(!HAS_ENGINE || !weightsPresent('krea-2'))('krea-2 turbo_distill: the pill payload composes the rank-64 adapter at 1.0 and RUNS', async () => {
    const w = await bootWorld('recipes-krea-')
    try {
      // compose FIRST (a refusal names its field before any GPU time)
      const cards = (w.ctx as unknown as { cardRegistry: { phase1Card: (b: Record<string, unknown>, m: string) => Promise<{ params: Record<string, unknown> }>, phase2Card: (p1: unknown, runId: string) => Promise<{ graph: Record<string, unknown> }> } }).cardRegistry
      const p1 = await cards.phase1Card({
        model: 'krea-2', prompt: 'a small red cube on a white field',
        width: 512, height: 512,
        loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
      }, 'krea-2')
      const graph = (await cards.phase2Card(p1, 'compose-check')).graph as Record<string, { class_type?: string }>
      const loraNode = Object.entries(graph).find(([, r]) => r.class_type === 'LoraLoaderModelOnly')
      assert.ok(loraNode !== undefined, 'the composed graph carries the lora loader')
      const inputs = (loraNode![1] as { inputs: Record<string, unknown> }).inputs
      assert.equal(inputs['lora_name'], 'krea-2/krea2_turbo_lora_rank_64_bf16.safetensors')
      assert.equal(inputs['strength_model'], 1.0)

      const s = await runCard(w, {
        model: 'krea-2', prompt: 'a small red cube on a white field',
        width: 512, height: 512,
        loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
      }, 'krea-2 turbo_distill')
      assert.ok(nodesWith(s, /krea2_turbo_lora_rank_64_bf16\.safetensors/).length >= 1,
        'the RUN workflow carries the resolved lora file')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 240_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('krea-2'))('krea-2 realism: the strength-less pill rides the flavor default 0.7 on silicon', async () => {
    const w = await bootWorld('recipes-krea-r-')
    try {
      const s = await runCard(w, {
        model: 'krea-2', prompt: 'a weathered wooden door, natural light',
        width: 512, height: 512,
        // THE STRENGTH-LESS IDIOM (the pre-existing realism row — one
        // preset per fact): the bag names the adapter, the resolver
        // applies the flavor's own default_strength
        loras: [{ id: 'krea2_realism_lora' }],
      }, 'krea-2 realism')
      const hit = nodesWith(s, /krea2_realism_lora\.safetensors/)
      assert.ok(hit.length >= 1, 'the RUN workflow carries the resolved realism file')
      assert.ok(JSON.stringify(hit[0]![1]).includes('"strength_model":0.7'),
        'the strength is the flavor default 0.7 (no strength on the row)')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 240_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('z-image'))('z-image realism: the pill payload composes the adapter at its declared 0.7 and RUNS', async () => {
    const w = await bootWorld('recipes-zimage-')
    try {
      const s = await runCard(w, {
        model: 'z-image', prompt: 'a serene mountain lake at dawn, soft light',
        width: 512, height: 512,
        loras: [{ id: 'zimage_realism', strength: 0.7 }],
      }, 'z-image realism')
      const hit = nodesWith(s, /z-image-realism\.safetensors/)
      assert.ok(hit.length >= 1, 'the RUN workflow carries the resolved realism file')
      assert.ok(JSON.stringify(hit[0]![1]).includes('"strength_model":0.7'), 'the strength is the flavor-declared 0.7')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 240_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('h3-timeline'))('h3-timeline turbo_lightx2v: the pill payload composes the LTX lora stack (str 0.6, steps 8) and RUNS', async () => {
    const w = await bootWorld('recipes-h3-')
    try {
      // THE ANCHOR: a real upload through ComfyUI's own upload door
      // (the same door the lane's input slots ride) — a 64×64 PNG.
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQACAIAAB8t0tHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAEUlEQVR4nGP8z0AswMKAAcAFAA8F5xk4AAAAAElFTkSuQmCC',
        'base64',
      )
      const fd = new FormData()
      fd.append('image', new Blob([png], { type: 'image/png' }), 'e2e_anchor.png')
      const up = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/upload/image`, {
        method: 'POST', body: fd,
        signal: AbortSignal.timeout(30_000),
      })
      assert.ok(up.ok, 'the anchor upload lands: ' + up.status)
      const upBody = await up.json() as { name?: string }
      const anchor = upBody['name'] ?? 'e2e_anchor.png'

      const s = await runCard(w, {
        model: 'h3',
        prompt: 'a red cube slides slowly across a white table',
        image: anchor, width: 768, height: 448,
        // THE PILL PAYLOAD VERBATIM (turbo_lightx2v, #36): the
        // recipe stamps the SELECTION ONLY — the id. Strength 0.6
        // and the married 8 steps ride from the catalog row at
        // compose (unknown ids refuse loud).
        loras: [{ id: 'h3_lightx2v_turbo' }],
      }, 'h3 turbo_lightx2v')
      const ltx = nodesWith(s, /LTX_lora_loader/)
      assert.ok(ltx.length >= 1, 'the RUN workflow carries the LTX lora loader')
      const inputs = (ltx[0]![1] as { inputs: Record<string, unknown> }).inputs
      const stack = JSON.parse(String(inputs['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const row = stack.find((r) => r['on'] === true && String(r['lora'] ?? '').includes('lightx2v_turbo'))
      assert.ok(row !== undefined, 'the stack carries the resolved turbo adapter ON')
      assert.equal(row!['str'], 0.6, 'the strength is the catalog-declared 0.6')
      assert.equal(firstBytes(s).length > 1024, true, 'the video artifact is real bytes')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('h3-timeline'))('h3-timeline dmad_draft: the birth payload composes the ByteDance DMAD 4-step (str 1, married 4) and RUNS', async () => {
    const w = await bootWorld('recipes-h3-dmad-')
    try {
      // THE ANCHOR: a real upload through ComfyUI's own upload door
      // (the same door the lane's input slots ride) — a 64×64 PNG.
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQACAIAAB8t0tHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAEUlEQVR4nGP8z0AswMKAAcAFAA8F5xk4AAAAAElFTkSuQmCC',
        'base64',
      )
      const fd = new FormData()
      fd.append('image', new Blob([png], { type: 'image/png' }), 'e2e_anchor.png')
      const up = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/upload/image`, {
        method: 'POST', body: fd,
        signal: AbortSignal.timeout(30_000),
      })
      assert.ok(up.ok, 'the anchor upload lands: ' + up.status)
      const upBody = await up.json() as { name?: string }
      const anchor = upBody['name'] ?? 'e2e_anchor.png'

      const s = await runCard(w, {
        model: 'h3',
        prompt: 'a red cube slides slowly across a white table',
        image: anchor, width: 768, height: 448,
        // THE BIRTH PAYLOAD VERBATIM (dmad_draft, D12): the recipe
        // stamps the SELECTION ONLY — the id. Strength 1 and the
        // married 4 steps ride from the catalog row at compose
        // (unknown ids refuse loud).
        loras: [{ id: 'h3_dmad_4step' }],
      }, 'h3 dmad_draft')
      const ltx = nodesWith(s, /LTX_lora_loader/)
      assert.ok(ltx.length >= 1, 'the RUN workflow carries the LTX lora loader')
      const inputs = (ltx[0]![1] as { inputs: Record<string, unknown> }).inputs
      const stack = JSON.parse(String(inputs['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const row = stack.find((r) => r['on'] === true && String(r['lora'] ?? '').includes('dmad_minimax_h3_4step'))
      assert.ok(row !== undefined, 'the stack carries the resolved ByteDance DMAD 4-step ON')
      assert.equal(row!['str'], 1, 'the strength is the catalog-declared 1')
      assert.equal(firstBytes(s).length > 1024, true, 'the video artifact is real bytes')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  // ── THE VOID RECEIPT (the h3-timeline void, 2026-10-11): the
  // operator's typed prompt + reference image reached the estate
  // (~88 params:calls patches) but the Run flush nulled them (rev
  // 138) and the generation composed seed-only placeholders — the
  // run's _request.json carried NO calls. With the flush + re-hydrate
  // cures in, estate-held calls MUST ride into the composed workflow
  // and the run. This row stages the post-cure estate position
  // directly (a one-call timeline doc, the studio's own wire shape)
  // and asserts the prompt text reaches the composed graph, the
  // turbo4 stack mounts, the request sidecar carries the calls, and
  // the film settles with real bytes. ──
  it.skipIf(!HAS_ENGINE || !weightsPresent('h3-timeline'))('h3-timeline void receipt: estate-held calls compose into the workflow and RUN', async () => {
    const w = await bootWorld('recipes-h3-void-')
    try {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQACAIAAB8t0tHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAEUlEQVR4nGP8z0AswMKAAcAFAA8F5xk4AAAAAElFTkSuQmCC',
        'base64',
      )
      const fd = new FormData()
      fd.append('image', new Blob([png], { type: 'image/png' }), 'e2e_anchor.png')
      const up = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/upload/image`, {
        method: 'POST', body: fd,
        signal: AbortSignal.timeout(30_000),
      })
      assert.ok(up.ok, 'the anchor upload lands: ' + up.status)
      const upBody = await up.json() as { name?: string }
      const anchor = upBody['name'] ?? 'e2e_anchor.png'

      const promptText = 'a red cube slides slowly across a white table'
      const s = await runCard(w, {
        model: 'h3',
        // THE STUDIO'S WIRE SHAPE (serializeCalls): the one-call doc
        // lifts its text/image into the run (card.ts single-call lift).
        calls: [{ text: promptText, start_frame: 0, end_frame: 22, image: anchor }],
        width: 768, height: 448,
        loras: [{ id: 'h3_turbo4_v1' }],
      }, 'h3 void receipt')
      // THE SMOKING GUN, now loaded: the request sidecar carries the calls.
      const req = JSON.parse(readFileSync(join(s.runDir, '_request.json'), 'utf8')) as {
        calls?: Array<{ text?: string }>
      }
      assert.ok(Array.isArray(req.calls) && req.calls.length === 1, 'the request carries the one-call doc')
      assert.equal(req.calls[0]?.text, promptText, 'the request carries the typed prompt verbatim')
      // the composed graph carries the lifted prompt text.
      assert.ok(
        JSON.stringify(s.workflow).includes(promptText),
        'the RUN workflow carries the lifted prompt text',
      )
      const ltx = nodesWith(s, /LTX_lora_loader/)
      assert.ok(ltx.length >= 1, 'the RUN workflow carries the LTX lora loader')
      const inputs = (ltx[0]![1] as { inputs: Record<string, unknown> }).inputs
      const stack = JSON.parse(String(inputs['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const row = stack.find((r) => r['on'] === true && String(r['lora'] ?? '').includes('turbo_4step_v1'))
      assert.ok(row !== undefined, 'the stack carries the resolved official 4-step turbo ON')
      assert.equal(firstBytes(s).length > 1024, true, 'the video artifact is real bytes')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  // ── THE T3 REFINE RIDER'S GPU RECEIPT (roadmap item 2 — the
  // crowd's third tier on real silicon): pass A rides the official
  // 8-step turbo (the marriage), pass B is the RIDER — taomate
  // from the served catalog at the ROW's own 0.7 @ 3 (no explicit
  // overrides: the row is the truth). Asserts the closing pass
  // MOUNTS on the run workflow (two samplers, the rider's own
  // loader, the row-declared schedule) and the film settles with
  // real bytes. ──
  it.skipIf(!HAS_ENGINE || !weightsPresent('h3-timeline'))('h3-timeline T3 refine rider: the taomate closing pass mounts (own loader @ 0.7/3) and RUNS', async () => {
    const w = await bootWorld('recipes-h3-refine-')
    try {
      const s = await runCard(w, {
        model: 'h3',
        prompt: 'a red cube slides slowly across a white table',
        width: 768, height: 448, steps: 8, second_pass_enabled: true,
        loras: [{ id: 'h3_turbo8_v1' }],
        refine_lora: 'h3_taomate_3step',
      }, 'h3 refine rider')
      const passes = byClass(s, 'SamplerCustomAdvanced')
      assert.equal(passes.length, 2, 'pass A + the closing pass B')
      const ltx = byClass(s, 'LTX_lora_loader')
      const refineLoader = ltx.filter(([, n]) =>
        String((n.inputs?.['stack_data'] ?? '')).includes('taomate'))
      assert.equal(refineLoader.length, 1, 'the rider rides its OWN loader (the primary stack untouched)')
      const rows = JSON.parse(String(refineLoader[0]![1].inputs!['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const row = rows.find((r) => r['on'] === true)
      assert.ok(row !== undefined && String(row['lora']).includes('taomate'), 'the refiner row is ON')
      assert.equal(row!['str'], 0.7, 'the strength is the row-declared 0.7')
      const scheds = byClass(s, 'BasicScheduler')
      assert.ok(scheds.some(([, n]) => n.inputs?.['steps'] === 3 && n.inputs?.['denoise'] === 1.0), "the closing schedule: the row's 3 steps at full denoise")
      assert.equal(firstBytes(s).length > 1024, true, 'the refined video artifact is real bytes')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('kimodo'))('motion (kimodo): the Rule B panel-path writes (steps/seed/duration) compose and RUN', async () => {
    const w = await bootWorld('recipes-motion-')
    try {
      const s = await runCard(w, {
        model: 'kimodo',
        prompt: 'a person walks forward slowly',
        // RULE B: exactly the keys the studio rail's SpecPanel
        // writes through onSave (the generic form's own vocabulary)
        diffusion_steps: 25, seed: 4242, duration_sec: 2,
      }, 'motion panel writes')
      const bytes = firstBytes(s)
      assert.ok(bytes.length > 256, 'the motion artifact is real bytes (' + bytes.length + ')')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 480_000)

  // ── the audio receipt (hour 15, the audio recipe rows landing:
  //    bound-anchored stamps proven on silicon — the schema's own
  //    floors/ceilings, values 1:1 with the cards' declared keys) ──

  it.skipIf(!HAS_ENGINE || !weightsPresent('music3'))('music3 short_sting: the pill payload composes duration 5 (the schema floor) and RUNS', async () => {
    const w = await bootWorld('recipes-music3-')
    try {
      const s = await runCard(w, {
        model: 'music3',
        prompt: 'funk, pop, soul, guitar, 105 BPM',
        // THE PILL PAYLOAD VERBATIM (short_sting): duration 5 — the
        // card schema's own declared floor (min 5)
        duration: 5,
      }, 'music3 short_sting')
      const latent = nodesWith(s, /EmptyMiniMaxMusic3LatentAudio/)
      assert.ok(latent.length >= 1, 'the RUN workflow carries the music latent node')
      const seconds = (latent[0]![1] as { inputs: Record<string, unknown> }).inputs['seconds']
      assert.equal(seconds, 5, 'the latent seconds is the recipe-stamped 5')
      const enc = nodesWith(s, /MiniMaxMusic3TextEncode/)
      assert.equal((enc[0]![1] as { inputs: Record<string, unknown> }).inputs['max_duration'], 5,
        'the text-encode max_duration is the recipe-stamped 5')
      const bytes = firstBytes(s)
      assert.ok(bytes.length > 1024, 'the music artifact is real bytes (' + bytes.length + ')')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 480_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('moss-sfx'))('moss-sfx one_shot: the pill payload composes duration 0.5 (the schema floor) and RUNS', async () => {
    const w = await bootWorld('recipes-mosssfx-')
    try {
      const s = await runCard(w, {
        model: 'moss-sfx',
        prompt: 'sharp metallic clang with long decay',
        // THE PILL PAYLOAD VERBATIM (one_shot): duration 0.5 — the
        // card schema's own declared floor (min 0.5)
        duration: 0.5,
      }, 'moss-sfx one_shot')
      const synth = nodesWith(s, /AudiocoreTTS/)
      assert.ok(synth.length >= 1, 'the RUN workflow carries the audiocore synth node')
      const inputs = (synth[0]![1] as { inputs: Record<string, unknown> }).inputs
      assert.equal(inputs['duration_seconds'], 0.5, 'the synth duration is the recipe-stamped 0.5')
      const bytes = firstBytes(s)
      assert.ok(bytes.length > 1024, 'the sfx artifact is real bytes (' + bytes.length + ')')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 300_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('qwen3-tts'))('qwen3-tts steady_read: the pill payload composes temperature 0.05 (the engine-true floor) and RUNS', async () => {
    const w = await bootWorld('recipes-qwen3tts-')
    try {
      const s = await runCard(w, {
        model: 'qwen3-tts',
        text: 'The steadiest read lands at the floor of the dial.',
        // THE PILL PAYLOAD VERBATIM (steady_read): temperature 0.05 —
        // the engine's positive-sampling minimum (the native node
        // refuses 0; the GPU receipt exposed the lying bound, the
        // schema + row now declare the engine's truth)
        temperature: 0.05,
      }, 'qwen3-tts steady_read')
      const synth = nodesWith(s, /AudiocoreTTS/)
      assert.ok(synth.length >= 1, 'the RUN workflow carries the audiocore synth node')
      const inputs = (synth[0]![1] as { inputs: Record<string, unknown> }).inputs
      assert.equal(inputs['temperature'], 0.05, 'the synth temperature is the recipe-stamped 0.05')
      const bytes = firstBytes(s)
      assert.ok(bytes.length > 512, 'the tts artifact is real bytes (' + bytes.length + ')')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 300_000)
})

// ── THE QWEN 2.1 PAIR (2026-09-21, the Comfy-Org release; the naming
// law: qwen-img-21 = the t2i lane, qwen-img-edit-21 = the cached-
// reference edit lane over the SAME base weights) ──────────────────
describe.skipIf(!HAS_ENGINE)('the qwen 2.1 pair on the GPU (with live ComfyUI)', () => {
  it.skipIf(!HAS_ENGINE || !weightsPresent('qwen-img-21'))('qwen-img-21 upstream_solvers: the pill payload composes the ONE TextEncodeQwenImage21 node (pos out 0, neg out 1) and RUNS', async () => {
    const w = await bootWorld('recipes-q21-')
    try {
      const cards = (w.ctx as unknown as { cardRegistry: { phase1Card: (b: Record<string, unknown>, m: string) => Promise<{ params: Record<string, unknown> }>, phase2Card: (p1: unknown, runId: string) => Promise<{ graph: Record<string, unknown> }> } }).cardRegistry
      // the pill payload: what the upstream_solvers recipe stamps (euler/simple)
      const p1 = await cards.phase1Card({
        model: 'qwen-img-21', prompt: 'a small red cube on a white field',
        width: 512, height: 512, sampler: 'euler', scheduler: 'simple',
      }, 'qwen-img-21')
      const graph = (await cards.phase2Card(p1, 'compose-check')).graph as Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
      const enc = Object.entries(graph).find(([, r]) => r.class_type === 'TextEncodeQwenImage21')
      assert.ok(enc !== undefined, 'the composed graph carries the 2.1 encoder node')
      const sampler = Object.entries(graph).find(([, r]) => r.class_type === 'KSampler')
      assert.ok(sampler !== undefined)
      const encId = enc![0]
      assert.equal((sampler![1].inputs?.positive as string[])[0], encId, 'positive wires the 2.1 encoder')
      assert.equal((sampler![1].inputs?.positive as string[])[1], 0, 'positive rides output 0')
      assert.equal((sampler![1].inputs?.negative as string[])[0], encId, 'negative wires the SAME node (one encoder, two outputs)')
      assert.equal((sampler![1].inputs?.negative as string[])[1], 1, 'negative rides output 1 — the node\'s second CONDITIONING')
      assert.equal(sampler![1].inputs?.sampler_name, 'euler')
      assert.equal(sampler![1].inputs?.scheduler, 'simple')

      const s = await runCard(w, {
        model: 'qwen-img-21', prompt: 'a small red cube on a white field',
        width: 512, height: 512, sampler: 'euler', scheduler: 'simple',
      }, 'qwen-img-21 t2i')
      assert.ok(byClass(s, 'TextEncodeQwenImage21').length === 1, 'the RUN workflow carries exactly ONE 2.1 encoder')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the artifact is a real PNG')
      // the t2i artifact feeds the edit receipt (a real chain)
      const chainInput = join(s.runDir, s.stageUrl)
      const w2 = await bootWorld('recipes-q21e-')
      try {
        const s2 = await runCard(w2, {
          model: 'qwen-img-edit-21', prompt: 'make the cube blue',
          image1: chainInput, width: 512, height: 512,
        }, 'qwen-img-edit-21 edit')
        assert.ok(byClass(s2, 'QwenImage21Cache').length === 1, 'the RUN workflow wraps the unet in the 2.1 cache')
        assert.ok(byClass(s2, 'TextEncodeQwenImage21').length === 1)
        assert.equal(byClass(s2, 'VAEEncode').length, 0, 'the 2.1 edit NEVER VAEEncodes the source (the 2511 lane\'s move)')
        assert.equal(firstBytes(s2).readUInt32BE(0), 0x89504e47, 'the edit artifact is a real PNG')

        // THE OFFICIAL BACKGROUND-REMOVAL ONE-CLICK (roadmap §10's
        // last firing): the Comfy-Org template is THIS lane + the
        // canned prompt — the remove_background pill payload rides
        // the chain (the edit artifact is the anchor image), the
        // wiring asserted verbatim before the run.
        const bgPayload = {
          model: 'qwen-img-edit-21', prompt: 'Remove the background, and output a PNG image',
          image1: join(s2.runDir, s2.stageUrl), width: 512, height: 512,
        }
        const bg1 = await cards.phase1Card(bgPayload, 'qwen-img-edit-21')
        const bgGraph = (await cards.phase2Card(bg1, 'bg-check')).graph as Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
        const bgEnc = Object.values(bgGraph).find((r) => r.class_type === 'TextEncodeQwenImage21')
        assert.ok(bgEnc !== undefined)
        assert.equal(bgEnc!.inputs?.prompt, 'Remove the background, and output a PNG image',
          'the resolved encoder prompt is the official template\'s canned prompt verbatim (the pill\'s only stamp)')
        const bgSampler = Object.values(bgGraph).find((r) => r.class_type === 'KSampler')!
        assert.equal(bgSampler.inputs?.cfg, 1, 'the official path rides cfg 1 (family default)')
        assert.equal(bgSampler.inputs?.sampler_name, 'euler')
        assert.equal(bgSampler.inputs?.scheduler, 'simple')
        const s3 = await runCard(w2, bgPayload, 'qwen-img-edit-21 remove_background')
        assert.ok(byClass(s3, 'QwenImage21Cache').length === 1, 'the one-click rides the same cached-reference lane')
        assert.equal(firstBytes(s3).readUInt32BE(0), 0x89504e47, 'the background-removal artifact is a real PNG')
      } finally {
        w2.stop()
        await w2.ctx.fiber.dispose()
      }
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 900_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('qwen-img-21'))('qwen-img-21 turbo-int8: the route address composes the distilled unet at 8 steps and RUNS', async () => {
    const w = await bootWorld('recipes-q21-turbo-')
    try {
      const cards = (w.ctx as unknown as { cardRegistry: { phase1Card: (b: Record<string, unknown>, m: string) => Promise<{ params: Record<string, unknown> }>, phase2Card: (p1: unknown, runId: string) => Promise<{ graph: Record<string, unknown> }> } }).cardRegistry
      // the route address selects the turbo variant; the 8-step
      // marriage rides the route's resolver_defaults into the form
      const p1 = await cards.phase1Card({
        model: 'qwen-img-21', variant: 'turbo-int8', prompt: 'a small red cube on a white field',
        width: 512, height: 512,
      }, 'qwen-img-21')
      assert.equal(p1.params?.steps, 8, 'the turbo route stamps steps 8 (upstream: Turbo uses 8 steps)')
      const graph = (await cards.phase2Card(p1, 'turbo-check')).graph as Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
      const loader = Object.entries(graph).find(([, r]) => r.class_type === 'UNETLoader')
      assert.ok(loader !== undefined, 'the composed graph carries the unet loader')
      assert.equal(loader![1].inputs?.unet_name, 'qwen_image_2.1_turbo_int8_convrot.safetensors',
        'the loader loads the TURBO unet (the recipe↔weights law on real silicon)')
      const sampler = Object.entries(graph).find(([, r]) => r.class_type === 'KSampler')
      assert.ok(sampler !== undefined)
      assert.equal(sampler![1].inputs?.steps, 8, 'the composed KSampler rides 8 steps')
      assert.equal(sampler![1].inputs?.cfg, 1, 'cfg 1 inherits the family default')

      const s = await runCard(w, {
        model: 'qwen-img-21', variant: 'turbo-int8', prompt: 'a small red cube on a white field',
        width: 512, height: 512,
      }, 'qwen-img-21 turbo-int8')
      assert.ok(byClass(s, 'UNETLoader').length === 1, 'the RUN workflow loads the turbo weights')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the turbo artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 900_000)

  // ── THE GENERIC REGION DETAILER'S GPU RECEIPT (2026-09-22, the
  // operator's ask: "test the mods on the GPU" + "2.1 is the new
  // Qwen edit model"): crop_stitch on the 2.1 lane — region → SEGS →
  // DetailerForEach riding the lane's OWN cache-wrapped model and
  // encoder conditioning. Two region sources, one row each: the
  // painted mask (synthetic alpha fixture, deterministic) and the
  // face detector (a real detection off a generated portrait). ──

  it.skipIf(!HAS_ENGINE || !weightsPresent('qwen-img-edit-21'))('qwen-img-edit-21 crop_stitch painted mask: MaskToSEGS(combined) → DetailerForEach on the cache model RUNS', async () => {
    const w = await bootWorld('recipes-q21-cropmask-')
    try {
      // THE ANCHOR + THE ALPHA MASK: two local fixture files (the
      // green 2.1 row's own door — the estate stages local paths
      // into the engine's input dir itself). The mask is a 64×64
      // RGBA PNG with a 32×32 opaque center square — alpha IS the
      // region (synthesized with python3 zlib/struct, deterministic).
      const anchor = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAY0lEQVR42u3QQREAAAgDoEVfc83hyYMCpO18FgECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIOC+BYjT8kqKv7OUAAAAAElFTkSuQmCC',
        'base64',
      )
      const region = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAASElEQVR42u3QIQEAAAgDsPcvDQGuUJgtwhIAAACAo3kmQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECAAAAAAoC0Hk8OIVAHFZAAAAAElFTkSuQmCC',
        'base64',
      )
      const fixDir = join(w.stateRoot, 'input')
      mkdirSync(fixDir, { recursive: true })
      const anchorPath = join(fixDir, 'e2e_cs_anchor.png')
      const maskPath = join(fixDir, 'e2e_cs_region.png')
      writeFileSync(anchorPath, anchor)
      writeFileSync(maskPath, region)

      const s = await runCard(w, {
        model: 'qwen-img-edit-21', prompt: 'turn the region a deep teal',
        image1: anchorPath, input_mask: maskPath, mask_mode: 'crop_stitch',
        // zero halo keeps the region the painted square on the tiny
        // fixture (grow 8 + pad 64 would swallow all 64 px)
        mask_grow: 0, mask_context_pad: 0, mask_feather: 0,
        mask_denoise: 0.6,
      }, 'q21 crop_stitch painted mask')
      // THE RUN WORKFLOW (the wiring the unit walls pin, now proven
      // against the live executor): the mask converts, the detailer
      // rides the CACHE model + encoder outs, the IMAGE output saves
      // directly (no decode under it — the bug this receipt hunts).
      assert.equal(byClass(s, 'LoadImageMask').length, 1, 'the alpha mask loads')
      assert.equal(byClass(s, 'MaskToSEGS').length, 1, 'the painted mask converts to SEGS')
      const mts = byClass(s, 'MaskToSEGS')[0]!
      assert.equal(mts[1].inputs?.['combined'], true, 'one combined region')
      assert.equal(byClass(s, 'UltralyticsDetectorProvider').length, 0, 'no detector beside the painted mask')
      const detail = byClass(s, 'DetailerForEach')
      assert.equal(detail.length, 1, 'the region detailer runs')
      const cacheId = Object.keys(s.workflow).find((id) => s.workflow[id]?.class_type === 'QwenImage21Cache')
      const encId = Object.keys(s.workflow).find((id) => s.workflow[id]?.class_type === 'TextEncodeQwenImage21')
      assert.ok(cacheId !== undefined && encId !== undefined, 'the 2.1 cache + encoder ride')
      assert.equal((detail[0]![1].inputs?.model as string[])[0], cacheId, 'the detailer samples the CACHE-WRAPPED model')
      assert.equal((detail[0]![1].inputs?.positive as string[])[0], encId, 'positive rides the 2.1 encoder')
      assert.equal((detail[0]![1].inputs?.denoise as number), 0.6, 'the region denoise rides verbatim')
      const save = byClass(s, 'SaveImage')[0]!
      assert.equal((save[1].inputs?.images as string[])[0], Object.keys(s.workflow).find((id) => s.workflow[id]?.class_type === 'DetailerForEach'), 'the IMAGE output saves directly')
      assert.equal(byClass(s, 'KSampler').length, 0, 'no plain sampler beside the arm')
      assert.equal(byClass(s, 'EmptyLatentImage').length, 0, 'no target latent on the detailer path')
      assert.equal(byClass(s, 'VAEDecode').length, 0, 'no decode under an IMAGE output')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the region-edit artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  it.skipIf(!HAS_ENGINE || !weightsPresent('qwen-img-21'))('qwen-img-edit-21 crop_stitch face detector: the Impact chain proposes the region off a generated portrait and RUNS', async () => {
    const w = await bootWorld('recipes-q21-cropface-')
    try {
      // A REAL FACE TO FIND: the 2.1 t2i lane generates the portrait
      // (the chain precedent — one lane's artifact feeds the next).
      const s0 = await runCard(w, {
        model: 'qwen-img-21', prompt: 'a front-facing portrait of a woman, centered, plain studio background',
        width: 512, height: 512,
      }, 'q21 portrait for detection')
      const portrait = join(s0.runDir, s0.stageUrl)

      const s = await runCard(w, {
        model: 'qwen-img-edit-21', prompt: 'studio regrade of the face, crisp detail',
        image1: portrait, mask_mode: 'crop_stitch', mask_detector: 'face',
        mask_denoise: 0.45, mask_detail_size: 768,
      }, 'q21 crop_stitch face')
      // THE DETECTOR CHAIN (the live-engine pins proven against
      // :8188's own provider list): face rides the bbox slot.
      const prov = byClass(s, 'UltralyticsDetectorProvider')
      assert.equal(prov.length, 1, 'the detector weights load')
      assert.equal(prov[0]![1].inputs?.model_name, 'bbox/face_yolov8m.pt', 'the LIVE-ENGINE face pin rides')
      const bbox = byClass(s, 'BboxDetectorSEGS')
      assert.equal(bbox.length, 1, 'face rides the bbox detector')
      assert.equal((bbox[0]![1].inputs?.bbox_detector as string[])[0], Object.keys(s.workflow).find((id) => s.workflow[id]?.class_type === 'UltralyticsDetectorProvider'), 'the SEGS reads the provider')
      assert.equal(bbox[0]![1].inputs?.dilation, 72, 'grow 8 + context pad 64 compose the halo')
      assert.equal(byClass(s, 'SegmDetectorSEGS').length, 0, 'no segm chain beside a face pick')
      assert.equal(byClass(s, 'LoadImageMask').length, 0, 'no painted mask beside the detector')
      const detail = byClass(s, 'DetailerForEach')
      assert.equal(detail.length, 1, 'the region detailer runs')
      assert.equal(detail[0]![1].inputs?.guide_size, 768, 'the detail size rides verbatim')
      assert.equal(detail[0]![1].inputs?.denoise, 0.45, 'the region denoise rides verbatim')
      assert.equal((detail[0]![1].inputs?.model as string[])[0], Object.keys(s.workflow).find((id) => s.workflow[id]?.class_type === 'QwenImage21Cache'), 'the detailer samples the CACHE-WRAPPED model')
      assert.equal(byClass(s, 'KSampler').length, 0, 'no plain sampler beside the arm')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the face-detail artifact is a real PNG')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 900_000)
})
