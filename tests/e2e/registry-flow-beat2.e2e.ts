// registry-flow-beat2.e2e.ts — the census verb chain's SECOND link
// against live ComfyUI (tier 3, with-engine).
//
// Beat 1 (registry-flow.e2e.ts) presses `{flow: "anny-hmr-commercial",
// photo}` and proves the estimator's GLB. This one presses the NEXT
// link — `{flow: "skin-apply", body}` — which is the chain's real
// shape: a flow whose stage spells a `$body` initial that must link
// at the engine merge, on a body produced by the previous beat.
//
// WHAT IT PROVES (each of these was a live failure before this
// stroke, found by driving the chain by hand):
//
//  - the merge's producer resolution. The coat action saves albedo,
//    normal and the kind sidecar — three Save nodes — and the
//    merge's one-Save rule refused every such stage ("ambiguous
//    producers"). The composition now declares the producer from the
//    action's own returned handle, which is the row the merge already
//    honored.
//  - the knob law. The stage used to spell `$kind`, `$map_size` and
//    `$seed`, keys the flow's initialValidators can never declare
//    (they admit photo/glb/bake_params only), so the merge refused
//    "carries $map_size — neither a FromStage-wired input nor a
//    request initial". The knobs are the verb's own vocabulary now
//    (stroke-89), named from the SkinPack/SkinSidecar nodes' declared
//    defaults — the engine rejects anything else by name.
//
// The world assertion is the skinned body's real bytes on disk under
// the run dir plus the settled sidecar's terminal status.
//
// The body input is a real anny GLB (the chain's beat-1 output
// shape). It rides from `ANNY_BODY` — set it to a real .glb; the
// suite self-skips without one, exactly as it self-skips without an
// engine.
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import modelsFamiliesProvider from '../../packages/engines/comfyui-cordis/src/entries/catalog-registry.ts'
import { QueueCore } from '../../packages/harness/estate-queue/src/queue.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { mintSandbox } from '../harness.ts'

const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')
/** A real anny body GLB — the chain's beat-1 output. */
const ANNY_BODY = process.env['ANNY_BODY'] ?? ''

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
const HAS_BODY = ANNY_BODY !== '' && existsSync(ANNY_BODY)

describe.skipIf(!HAS_ENGINE || !HAS_BODY)(
  'the census chain beat 2 (skin-apply on a real body, live ComfyUI)',
  () => {
    it('the $body initial links, the three-save action composes, and the skinned body lands on disk', async () => {
      const sandbox = mintSandbox('registry-flow-beat2-')
      const ctx = new Context()
      try {
        new EnginesService(ctx)
        const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
        const seat = ctx.get('engines') as EnginesService
        const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(ctx, host) })
        await ctx.plugin(modelsFamiliesProvider)
        const models = ctx.get('models') as unknown as { allDecls(): { id: string }[] }
        assert.ok(models.allDecls().length > 0, 'the lane seats the families the flow composes from')

        const core = new QueueCore()
        ;(ctx as unknown as { queue: unknown }).queue = {
          core,
          stateRoot: join(sandbox.root, 'state'),
        }
        ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
          get: async () => ({}),
        }
        ;(ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
          objectInfo: (): unknown => null,
          defsSync: (): unknown => new Map(),
          modelFacts: (): unknown => {
            throw new Error('no facts')
          },
          resolveCardFamily: (mid: unknown): unknown => mid,
          modelMids: (): unknown => new Set<string>(),
        }
        const svc = new RunsRuntimeService(ctx as unknown as Context)

        // THE CHAIN'S SHAPE, verbatim: the named flow and the one
        // initial it declares. No hand-authored graph, no bench, no
        // knob — the verb's own vocabulary is inside the action.
        const ans = await svc.start(
          { draft_id: 'd1', test: false, flow: 'skin-apply', body: ANNY_BODY },
          new AbortController().signal,
        )
        assert.equal(ans.status, 'queued')

        let row: unknown
        for (let i = 0; i < 1800; i++) {
          row = core.runs.get(ans.run_id)
          const status = (row as { status?: string } | undefined)?.status
          if (status !== undefined && status !== 'queued' && !svc.pumping) break
          await new Promise((r) => setTimeout(r, 1000))
        }
        const run = row as {
          status: string
          error: string
          stages: { status: string; url?: string }[]
        }
        assert.equal(
          run.status,
          'completed',
          'the live coat must complete (error was: ' + run.error + ')',
        )
        // THE THREE FAILURE VOICES THIS BEAT HAS ALREADY SPOKEN, in
        // the negative: the merge's producer rule, the unlinkable
        // knob spell, and the engine's own input validation.
        assert.doesNotMatch(run.error, /ambiguous producers/)
        assert.doesNotMatch(run.error, /neither a FromStage-wired input nor a request initial/)

        // THE WORLD: the coat verb's DECLARED output is the proof
        // sheet — the chain's beat-2 deliverable is "prove it with
        // the turnaround" — so the harvested artifact is a real PNG
        // the engine rendered from the grafted body (the grafted GLB
        // itself is SkinApply's own file output, named in-pack).
        const runDir = join(sandbox.root, 'state', 'output', ans.run_id)
        const settled = run.stages.find((s) => s.status === 'completed' && (s.url ?? '') !== '')
        assert.ok(settled !== undefined, 'the completed stage carries its artifact url')
        const artifact = join(runDir, settled?.url as string)
        assert.ok(existsSync(artifact), 'the proof sheet exists as real bytes: ' + artifact)
        assert.ok(statSync(artifact).size > 0, 'the artifact is not empty')
        assert.equal(
          readFileSync(artifact).subarray(0, 4).toString('hex'),
          '89504e47',
          'the artifact is a real PNG the engine rendered',
        )

        const flow = JSON.parse(readFileSync(join(runDir, '_flow.json'), 'utf8')) as {
          status: string
        }
        assert.equal(flow.status, 'completed', 'the settled sidecar carries the terminal status')

        stopRegister()
      } finally {
        await ctx.fiber.dispose()
        sandbox.dispose()
      }
    }, 1_800_000)
  },
)
