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
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { QueueCore } from '../../packages/harness/estate-queue/src/queue.ts'
import { mintSandbox } from '../harness.ts'

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
  const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(host) })
  const stateRoot = join(sandbox.root, 'state')
  const core = new QueueCore()
  ;(ctx as unknown as { queue: unknown }).queue = { core, stateRoot }
  ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
  await ctx.plugin(cardRegistryProvider as never)
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

describe.skipIf(!HAS_ENGINE)('the recipe law on the GPU (with live ComfyUI)', () => {
  it('krea-2 turbo_distill: the pill payload composes the rank-64 adapter at 1.0 and RUNS', async () => {
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

  it('krea-2 realism: the strength-less pill rides the flavor default 0.7 on silicon', async () => {
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

  it('z-image realism: the pill payload composes the adapter at its declared 0.7 and RUNS', async () => {
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

  it('h3-timeline turbo_lightx2v: the pill payload composes the LTX lora stack (str 0.6, steps 8) and RUNS', async () => {
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
        model: 'h3-timeline',
        prompt: 'a red cube slides slowly across a white table',
        image: anchor, width: 768, height: 448,
        // THE PILL PAYLOAD VERBATIM (turbo_lightx2v): the bag row the
        // family's Recipe row stamps — strength 0.6, steps 8 married
        loras: [{ id: 'h3_lightx2v_turbo', strength: 0.6, steps: 8 }],
      }, 'h3 turbo_lightx2v')
      const ltx = nodesWith(s, /LTX_lora_loader/)
      assert.ok(ltx.length >= 1, 'the RUN workflow carries the LTX lora loader')
      const inputs = (ltx[0]![1] as { inputs: Record<string, unknown> }).inputs
      const stack = JSON.parse(String(inputs['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const row = stack.find((r) => r['on'] === true && String(r['lora'] ?? '').includes('lightx2v_turbo'))
      assert.ok(row !== undefined, 'the stack carries the resolved turbo adapter ON')
      assert.equal(row!['str'], 0.6, 'the strength is the recipe-declared 0.6')
      assert.equal(firstBytes(s).length > 1024, true, 'the video artifact is real bytes')
    } finally {
      w.stop()
      await w.ctx.fiber.dispose()
    }
  }, 600_000)

  it('motion (kimodo): the Rule B panel-path writes (steps/seed/duration) compose and RUN', async () => {
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

  it('music3 short_sting: the pill payload composes duration 5 (the schema floor) and RUNS', async () => {
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

  it('moss-sfx one_shot: the pill payload composes duration 0.5 (the schema floor) and RUNS', async () => {
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

  it('qwen3-tts steady_read: the pill payload composes temperature 0.05 (the engine-true floor) and RUNS', async () => {
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
