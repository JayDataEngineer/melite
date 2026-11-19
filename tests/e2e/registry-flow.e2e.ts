// registry-flow.e2e.ts — the CENSUS VERB CHAIN against live
// ComfyUI (tier 3, with-engine).
//
// The inference smoke presses a hand-authored single-stage
// flow_inline. This one presses a REGISTRY flow through the
// `{flow: ...}` door with a request initial, which is the shape the
// 3088 commission drives: `flow: "anny-hmr-estimator"` with
// `photo: <a real portrait>`. That door's stage params are `$spell`s
// over the declared initial — `$photo` — and a `$spell` links only
// against the initials the run carries to the engine merge
// (`extractRequestInitials` at the door, `run.initials` at the
// worker, `rewriteSpells` at planMerge). The break this pins: the
// worker once handed the merge an empty record, so every census
// flow died at planMerge with "$photo names neither a
// FromStage-wired input nor a request initial" AFTER the door had
// already gate-validated the value.
//
// THE RECEIPT is the world: the estimator's GLB bytes exist on disk
// under the run dir, and the settled sidecar carries a terminal
// status. A prompt id or a graph snapshot is not a receipt.
//
// The photo input is the commission's own source artifact
// (`data/input/36039.jpg`); the suite self-skips without an engine
// (the tier-3 law) and without the input.
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import modelsFamiliesProvider from '../../packages/engines/comfyui-cordis/src/entries/catalog-registry.ts'
import { QueueCore } from '../../packages/harness/estate-queue/src/queue.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { FlowsSeatService } from '../../packages/harness/estate-queue/src/flowsData.ts'
import { mintSandbox } from '../helpers/harness.ts'
import { freeEngineResidency, restartEngineResidency } from './gpu-harness.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT, engineVramFits, GPU_RENDER } from './engine-gate.ts'

// fileURLToPath, never URL.pathname (the windows CI doubled-drive
// class, 2026-10-31: '/D:/…' is drive-rooted RELATIVE on win32).
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '')
const PHOTO = join(REPO_ROOT, 'data', 'input', '36039.jpg')

// THE VRAM-DEFER (2026-11-15, the serial-tier burn): the estimator
// stage carries vram_budget_mb 15500 (two OOM burns established it)
// and the execute door REFUSES loud under it — while the serial
// battery's earlier GPU suites leave the h3 film residency loaded
// (the estate never evicts). The defer judges at TEST time (module
// load fires at vitest collection, before the card fills); see the
// it body.


const HAS_PHOTO = existsSync(PHOTO)
// THE ESTIMATOR RUNTIME (the tier-3 key law, ROADMAP :222): the
// anny-hmr-estimator flow's estimator needs the provisioned
// estimator chain (SAM 3D Body venv + SOMA-X checkout at the
// runtime root, or ANNY_ESTIMATOR_ROOT). It is a machine
// prerequisite the same way an API key is — absent, the suite
// self-skips NAMING it (never a pass, never a red herring fail).
const ANNY_ESTIMATOR_ROOT = process.env['ANNY_ESTIMATOR_ROOT'] ??
  // repo-relative default (2026-10-26: the old absolute
  // /home/user/tools/data/runtime/… never existed on this machine —
  // the provisioned runtime lives at data/runtime/anny-estimator)
  join(REPO_ROOT, 'data', 'runtime', 'anny-estimator')
const HAS_ESTIMATOR = existsSync(join(ANNY_ESTIMATOR_ROOT, 'estimator_chain.py'))

describe.skipIf(!ENGINE_FREE || !HAS_PHOTO || !HAS_ESTIMATOR)(
  'registry flow through the {flow:} door (live ComfyUI)',
  () => {
    it.skipIf(!GPU_RENDER)("anny-hmr-estimator on a real portrait: the $photo initial links at planMerge and the estimator's GLB lands on disk (render lane: MELITE_GPU_RENDER=1)", async (t) => {
      // THE VRAM-DEFER AT TEST TIME (attempt 12's lesson): the probe
      // at MODULE load fired at vitest collection — before the
      // serial tier's GPU suites filled the card — so the describe
      // armed and the execute door refused at 955 MiB free hours
      // later. The defer belongs where the budget is judged: here,
      // immediately before the press.
      // THE RENDER LANE'S FREE-FIRST LAW (2026-11-16): in the serial
      // render lane the earlier rows load residency the estate never
      // evicts, and the probe/press race burns (attempt: probed
      // 15500+, pressed at 463 free). Free the card through the
      // estate's own door FIRST, then probe — a still-under probe
      // names the machine's true state.
      await freeEngineResidency({ stateRoot: join(REPO_ROOT, 'data', 'runtime') })
      // THE EVICTION SETTLE (round 8): native /free answers "issued
      // (next worker iteration)" — the eviction LANDS on the worker's
      // next turn, not at the HTTP response. Probing immediately
      // after the free reads the still-loaded card (round 6: 844
      // MiB, refusal). Settle the probe on its own budget before
      // judging — a still-under probe after the settle names the
      // machine's true state.
      for (let i = 0; i < 24 && !(await engineVramFits(15_500)); i++) {
        await new Promise((r) => setTimeout(r, 5_000))
      }
      // THE PRESSURE-LOCKED ESCAPE (round 8): free + settle cannot
      // move a card whose eviction crashes upstream (the IndexError
      // class — scoped: 474 → 1122 MiB, never near 15500). The row
      // restarts through the estate's own door and re-probes on the
      // cold card; a still-under probe names the machine, not the
      // lane.
      if (!(await engineVramFits(15_500)) && process.env['MELITE_E2E_FORCE'] !== '1') {
        await restartEngineResidency({ stateRoot: join(REPO_ROOT, 'data', 'runtime') })
      }
      if (!(await engineVramFits(15_500)) && process.env['MELITE_E2E_FORCE'] !== '1') {
        t.skip('engine VRAM under the estimator stage\u2019s 15500 MiB budget even after the free door (the machine\u2019s true state) — deferring, a skip is not a cost signal')
      }
      const sandbox = mintSandbox('registry-flow-e2e-')
      const ctx = new Context()
      try {
        new EnginesService(ctx)
        const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
        const seat = ctx.get('engines') as EnginesService
        const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(ctx, host) })
        // THE LANE'S SEAT, the estate's own mount (the families
        // provider plus every family plugin — a registry flow's
        // stages compose from ctx.get("models"), and a bare catalog
        // leaves the table empty).
        await ctx.plugin(modelsFamiliesProvider)
        const models = ctx.get('models') as unknown as { allDecls(): { id: string }[] }
        assert.ok(models.allDecls().length > 0, 'the lane seats the families the flow composes from')
        // THE FLOWS SEAT (J4: the module-global table died — flow
        // resolution rides ctx.get("meliteFlows"), mounted on the
        // lane by the estate-queue plugin; the fixture never gained
        // the mount, so every run died TypeError at
        // runsRegistry.ts:1684 before the chain was even pressed).
        new FlowsSeatService(ctx as unknown as Context)

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

        // THE CENSUS BEAT'S EXACT SHAPE: the named flow plus its two
        // declared initials (the photo AND the person picker — both
        // REQUIRED since the GPU lane's first live catch, 2026-11-14:
        // each $spell rides the composed graph, and the door teaches
        // an absent one before the run registers). No hand-authored
        // graph, no bench — the door composes.
        const ans = await svc.start(
          { draft_id: 'd1', test: false, flow: 'anny-hmr-estimator', photo: PHOTO, person_index: 0 },
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
          artifacts: string[]
          stages: { status: string; url?: string }[]
        }
        assert.equal(
          run.status,
          'completed',
          'the live estimate must complete (error was: ' + run.error + ')',
        )
        // THE planMerge PROOF, in the negative: the historical break's
        // exact voice must not be what stopped this run.
        assert.doesNotMatch(
          run.error,
          /names neither a FromStage-wired input nor a request initial/,
          'the $photo initial linked — the merge never refused the spell',
        )

        // THE WORLD: the estimator wrote real GLB bytes under the run
        // dir. A glTF binary starts with "glTF" (0x676c5446).
        const runDir = join(sandbox.root, 'state', 'output', ans.run_id)
        const settled = run.stages.find((s) => s.status === 'completed' && (s.url ?? '') !== '')
        assert.ok(settled !== undefined, 'a completed stage carries its artifact url')
        const artifact = join(runDir, settled?.url as string)
        assert.ok(existsSync(artifact), 'the estimator artifact exists as real bytes: ' + artifact)
        assert.ok(statSync(artifact).size > 0, 'the artifact is not empty')
        const head = readFileSync(artifact)
        assert.equal(
          head.subarray(0, 4).toString('latin1'),
          'glTF',
          'the artifact is a real GLB the engine wrote',
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
