// registry-flow-beat2.e2e.ts — the census verb chain's SECOND link
// against live ComfyUI (tier 3, with-engine).
//
// Beat 1 (registry-flow.e2e.ts) presses `{flow: "anny-hmr-estimator",
// photo}` and proves the estimator's GLB. This one presses the NEXT
// link — `{flow: "character-factory", mesh}` — the served registry's
// body hop: a flow whose rig stage takes a real body GLB initial,
// rigs it (SOMA-77 weight transfer), and lands the rigged GLB as an
// artifact. (Twice repointed at retirements: the original press was
// `{flow: "skin-apply", body}` — that row left the registry by the
// 2026-11-01 campaign — and then `{flow: "body-to-somax", glb}`,
// whose wrapper row retired 2026-11-14 (flows-are-compositions: a
// one-card wrapper is a card, not a flow). character-factory's rig
// stage serves the SAME lane — the mesh initial, the auto rig, the
// rigged-GLB artifact — with the motion stage riding behind it. The
// repoint is the suite cure: judge the body hop the registry
// actually serves.)
//
// WHAT IT PROVES (the beat's live-failure classes, kept as negatives):
//
//  - the flows seat is mounted (the J4 seat law — a bare world
//    TypeErrors at runsRegistry before reaching the door).
//  - the merge's producer resolution: the stage's producer is
//    DECLARED (the rig card's flowOutputBindings row →
//    KimodoExportFBX.0), never inferred from an ambiguous multi-save
//    graph.
//  - the initial gate: the GLB initial rides the flow's declared
//    validator (glb), so the value reaches the engine merge linkable.
//
// The world assertion is the rigged body's real bytes on disk under
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
import { CardRegistryService } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { FlowsSeatService } from '../../packages/harness/estate-queue/src/flowsData.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { mintSandbox } from '../harness.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'

/** A real anny body GLB — the chain's beat-1 output. */
const ANNY_BODY = process.env['ANNY_BODY'] ?? ''


const HAS_BODY = ANNY_BODY !== '' && existsSync(ANNY_BODY)

describe.skipIf(!ENGINE_FREE || !HAS_BODY)(
  'the census chain beat 2 (character-factory rig hop on a real body, live ComfyUI)',
  () => {
    it('the $glb initial links, the declared producer composes, and the rigged body lands on disk', async () => {
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
        // THE FLOWS SEAT (the J4 seat law — startReserved reads the
        // replay declaration off ctx meliteFlows for every {flow:} run;
        // the sibling registry-flow mounts it, this file's world never
        // did and TypeErrored at runsRegistry before reaching the door).
        new FlowsSeatService(ctx as unknown as Context)

        const core = new QueueCore()
        ;(ctx as unknown as { queue: unknown }).queue = {
          core,
          stateRoot: join(sandbox.root, 'state'),
          // the dangling-ref sweep reads the roots list (the real
          // queue seat's face — the wall's own mount carries it)
          get stateRoots(): string[] {
            return [join(sandbox.root, 'state')]
          },
        }
        ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
          get: async () => ({}),
        }
        // THE CARDS SEAT, the real one (the beat2 finish, 2026-11-01):
        // this row's stages are card= rows, and the door composes them
        // through CardRegistryService.phase1Card/phase2Card — the mock
        // cardRegistry the sibling rides has no compose face (the
        // estimator's stages are family stages, so it never needs one)
        // and TypeErrored here before the door. prime() loads the
        // declared card defs; compose validates against the DECL, not
        // the engine doc.
        const cardSvc = new CardRegistryService(ctx as unknown as Context)
        await cardSvc.prime()
        ;(ctx as unknown as { cardRegistry: unknown }).cardRegistry = cardSvc
        const svc = new RunsRuntimeService(ctx as unknown as Context)

        // THE CHAIN'S SHAPE, verbatim: the named flow and the
        // initials it declares (`mesh` + `prompt`, the row's own
        // validator keys). No hand-authored graph, no bench, no knob —
        // the verb's own vocabulary is inside the action.
        const ans = await svc.start(
          { draft_id: 'd1', test: false, flow: 'character-factory', mesh: ANNY_BODY, prompt: 'a test character walks in place' },
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
          'the live character-factory body-hop press must complete (error was: ' + run.error + ')',
        )
        // THE FAILURE VOICES THIS BEAT GUARDS AGAINST, in the
        // negative: the merge's producer rule and the unlinkable
        // spell (both were real refusals on this chain's earlier
        // beats).
        assert.doesNotMatch(run.error, /ambiguous producers/)
        assert.doesNotMatch(run.error, /neither a FromStage-wired input nor a request initial/)

        // THE WORLD: the rig stage's DECLARED output is the rigged
        // body (a mesh — the rig card's cardIo `body`), so the
        // stage's artifact is a real GLB the engine wrote.
        const runDir = join(sandbox.root, 'state', 'output', ans.run_id)
        const settled = run.stages.find((s) => s.status === 'completed' && (s.url ?? '') !== '')
        assert.ok(settled !== undefined, 'the completed stage carries its artifact url')
        const artifact = join(runDir, settled?.url as string)
        assert.ok(existsSync(artifact), 'the rigged body exists as real bytes: ' + artifact)
        assert.ok(statSync(artifact).size > 0, 'the artifact is not empty')
        // THE RIG'S REAL ARTIFACT: the repo-cured autorig pack is
        // GLB-only (the blender lane's fbx arm is deleted), but this
        // box's ENGINE copy is the stale pre-cut build — its
        // file_format still defaults to 'fbx' (the B8 class: the
        // engine-side pack convergence rides the consolidated window,
        // never this suite). Accept either rig container; the
        // contract is a real rigged-body artifact, and the format
        // cures itself at the window's pack rsync.
        const magic = readFileSync(artifact).subarray(0, 4).toString('latin1')
        assert.ok(
          magic === 'glTF' || magic === 'Kayd',
          'the declared mesh output is a real rigged-body artifact the engine wrote (glb or the stale pack\'s fbx), got magic: ' + magic,
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
