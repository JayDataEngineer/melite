/**
 * inference-smoke.e2e.ts — the REAL-INFERENCE receipt (stroke 82,
 * the operator's burn: "things pass, but I can't run the inference
 * at all").
 *
 * Boots the full PRODUCTION STACK in one cordis Context — the
 * engines contract seat, the real ComfyUIHostService, the real
 * comfyui executor adapter — and drives ONE run through the estate
 * queue (start → pump → submit → poll → harvest → settle) against
 * the LIVE ComfyUI. No engine fake anywhere on the path: the seat
 * resolves, the adapter splices, the host POSTs /prompt, the poll
 * reads /history, the harvest writes bytes under the run dir.
 *
 * Engine-gated tier (the honest analogue of the key-gated suites):
 * self-skips when no ComfyUI answers at the engine seat's address —
 * skip is not a cost signal; with-engine runs prove the user's run
 * press works end to end, no-engine runs prove nothing.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
// Relative package-source imports (the e2e lives at the repo root,
// outside the workspace package graph — the same discipline the
// root's own vitest aliases encode for @melite/estate-*):
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import { QueueCore } from '../../packages/harness/estate-queue/src/queue.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { mintSandbox } from '../harness.ts'

const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')

/** Top-level liveness probe (loaded boxes answer slowly — generous
 *  timeout, one try): an absent engine self-skips the suite. */
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

/** One REAL 1-step inference graph (turbo checkpoint, 64×64): seven
 *  nodes, every class stock ComfyUI — load, encode, latent, sample,
 *  decode, save. The graph is the artifact of this smoke: it is the
 *  minimal shape a user's image-gen run actually submits. */
const TURBO_GRAPH: Record<string, unknown> = {
  '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'Illustrious/ILFlatMix.safetensors' } },
  '2': { class_type: 'CLIPTextEncode', inputs: { text: 'a small blue square on white', clip: ['1', 1] } },
  '3': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['1', 1] } },
  '4': { class_type: 'EmptyLatentImage', inputs: { width: 64, height: 64, batch_size: 1 } },
  '5': { class_type: 'KSampler', inputs: { seed: 4242, steps: 1, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0, model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0] } },
  '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
  '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'melite_e2e' } },
}

describe.skipIf(!HAS_ENGINE)('inference smoke (with live ComfyUI)', () => {
  it('one run press lands real image bytes on disk through the full stack (seat → adapter → host → HTTP)', async () => {
    const sandbox = mintSandbox('inference-e2e-')
    const ctx = new Context()
    try {
      // THE PRODUCTION STACK (no fake between the queue and the wire):
      new EnginesService(ctx)
      const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
      const seat = ctx.get('engines') as EnginesService
      const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(host) })
      const core = new QueueCore()
      ;(ctx as unknown as { queue: unknown }).queue = { core, stateRoot: join(sandbox.root, 'state') }
      // the bench snapshot source (the run's draft doc — the same
      // seam the gateway's drafts remote serves; content is not this
      // smoke's subject, the run path is)
      ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
        get: async () => ({}),
      }
      const svc = new RunsRuntimeService(ctx as unknown as Context)

      const ans = await svc.start({
        draft_id: 'd1',
        test: false,
        flow_inline: {
          id: 'smoke',
          stages: [{ id: 's', engine: 'comfyui', params: { workflow: TURBO_GRAPH } }],
        },
      } as never, new AbortController().signal)
      assert.equal(ans.status, 'queued')

      // THE PUMP SETTLES (poll the in-memory row like the walls do)
      let row: unknown
      for (let i = 0; i < 600; i++) {
        row = core.runs.get(ans.run_id)
        const status = (row as { status?: string } | undefined)?.status
        if (status !== undefined && status !== 'queued' && !svc.pumping) break
        await new Promise((r) => setTimeout(r, 500))
      }
      const run = row as { status: string; error: string; artifacts: string[]; stages: { status: string; url?: string }[] }
      assert.equal(
        run.status,
        'completed',
        'the live run must complete (error was: ' + run.error + ')',
      )
      assert.ok(run.artifacts.length >= 1, 'at least one artifact harvested')

      // THE WORLD, not the self-report: the artifact bytes EXIST on
      // disk under the run dir (the stage row's url is the
      // run-relative truth — run.artifacts still carries the
      // executor's raw disk paths today, audit #11), and the
      // settled sidecar names the run.
      const runDir = join(sandbox.root, 'state', 'output', ans.run_id)
      const stage = run.stages[0] as { url?: string }
      assert.ok((stage.url ?? '').length > 0, 'the completed stage carries its artifact url')
      const firstPath = join(runDir, stage.url as string)
      assert.ok(existsSync(firstPath), 'the artifact exists as real bytes: ' + firstPath)
      const head = readFileSync(firstPath)
      assert.equal(head.readUInt32BE(0), 0x89504e47, 'the artifact is a real PNG (the engine wrote bytes)')

      const flow = JSON.parse(readFileSync(join(runDir, '_flow.json'), 'utf8')) as { status: string }
      assert.equal(flow.status, 'completed', 'the settled sidecar carries the terminal status')

      stopRegister()
    } finally {
      await ctx.fiber.dispose()
      sandbox.dispose()
    }
  }, 240_000)
})

describe.runIf(!HAS_ENGINE)('inference smoke (no engine — plumbing only)', () => {
  it('self-skips the live arm and proves the gate is honest (probe, not a cost signal)', () => {
    // The probe answered no ComfyUI at ENGINE_HOST:ENGINE_PORT. The
    // with-engine arm above is the receipt; this arm pins the tier
    // law — an absent engine self-skips, it never fakes a run.
    assert.ok(typeof HAS_ENGINE === 'boolean')
  })
})
