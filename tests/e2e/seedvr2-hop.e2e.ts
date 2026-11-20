// seedvr2-hop.e2e.ts — THE HOP DOUBLING PRESS, live (tier 3,
// with-engine, the engine-gate law). The never-doubles burn's standing
// world judge: the registry image-upscale flow pressed at the
// diet class — the make stage at 512×256 (the size channels the
// flow row declares, stamped through the params overlay bag) and the
// polish card's SeedVR2 at short side 512 — must render the polish
// PNG at 1024×512, the exact 2x. The resolution channel is the
// TARGET SHORT SIDE (the 2026-11-17 battery burn: 512×256 +
// resolution 1024 rendered 2048×1024 — the param aims the short
// edge, it is not an upscale factor). The $image spell rides the
// FromStage wire through planMerge (the card suite's spell-wire
// arms judge the graph faces; this suite judges the world: real
// bytes, real sizes, no NodeNotFoundError, no merge refusal).
// Receipt archive: dev_docs/agents/receipts/seedvr2-hop-2026-11-01/.
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import { ComfyUIHostService } from '../../packages/engines/comfyui-cordis/src/comfyui.ts'
import { comfyuiExecutor } from '../../packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts'
import modelsFamiliesProvider from '../../packages/engines/comfyui-cordis/src/entries/catalog-registry.ts'
import { QueueCore } from '../../packages/harness/estate-queue/src/queue.ts'
import { LifecycleLatch } from '../../packages/harness/estate-queue/src/lifecycleLatch.ts'
import { RunsRuntimeService } from '../../packages/harness/estate-queue/src/runsRegistry.ts'
import { FlowsSeatService } from '../../packages/harness/estate-queue/src/flowsData.ts'
import { CardRegistryService } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { mintSandbox } from '../helpers/harness.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT, GPU_RENDER } from './engine-gate.ts'

const pngSize = (p: string): { w: number; h: number } => {
  const b = readFileSync(p)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

describe.skipIf(!ENGINE_FREE)('the seedvr2 hop live press', () => {
  it.skipIf(!GPU_RENDER)('512×256 make → seedvr2 polish renders 1024×512 (render lane: MELITE_GPU_RENDER=1)', async () => {
    const sandbox = mintSandbox('hop-press-')
    const ctx = new Context()
    try {
      new EnginesService(ctx)
      const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
      const seat = ctx.get('engines') as EnginesService
      const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(ctx, host) })
      await ctx.plugin(modelsFamiliesProvider)
      new FlowsSeatService(ctx as unknown as Context)
      const cardSvc = new CardRegistryService(ctx as unknown as Context)
      await cardSvc.prime()
      ;(ctx as unknown as { cardRegistry: unknown }).cardRegistry = cardSvc
      ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
      const core = new QueueCore()
      ;(ctx as unknown as { queue: unknown }).queue = {
        core,
        lifecycleLatch: new LifecycleLatch(),
        stateRoot: join(sandbox.root, 'state'),
        get stateRoots(): string[] {
          return [join(sandbox.root, 'state')]
        },
      }
      const svc = new RunsRuntimeService(ctx as unknown as Context)

      // (audit 2026-11-14 FL-7) NO top-level image_model here: the flow
      // row pins the generator (make's model: "krea-2") and the runtime
      // has no seat that reads a caller's image_model — it was a silent
      // dead letter this press kept corroborating. prompt is the row's
      // one request initial (initialValidators: {prompt}); the overlay
      // bag carries the size channels.
      const ans = await svc.start({
        draft_id: 'd1',
        test: false,
        flow: 'image-upscale',
        prompt: 'a red lighthouse on a basalt cliff, storm light',
        params: {
          // THE GPU DIET (operator 2026-11-17, audit finding 10): the
          // 2× hop proof is size-agnostic — 512×256 make → 1024×512
          // polish proves the same doubling at ~1/7 the patch area
          // (the unstated default once burned 1344×768→2688×1536,
          // re-rendering krea-2 at max geometry). resolution aims the
          // TARGET SHORT SIDE (256→512), never a multiplier.
          make: { width: 512, height: 256 },
          polish: { resolution: 512 },
        },
      } as never, new AbortController().signal)
      assert.equal(ans.status, 'queued')

      let row: unknown
      for (let i = 0; i < 1800; i++) {
        row = core.runs.get(ans.run_id)
        const status = (row as { status?: string } | undefined)?.status
        if (status !== undefined && status !== 'queued' && !svc.pumping) break
        await new Promise((r) => setTimeout(r, 1000))
      }
      const run = row as { status: string; error: string; artifacts: string[]; stages: { id?: string; status: string; url?: string }[] }
      console.log('RUN', ans.run_id, run.status, run.error)
      assert.equal(run.status, 'completed', 'the live hop must complete (error: ' + run.error + ')')
      assert.doesNotMatch(run.error, /NodeNotFoundError/)
      assert.doesNotMatch(run.error, /names neither a FromStage-wired input nor a request initial/)

      const runDir = join(sandbox.root, 'state', 'output', ans.run_id)
      const receiptDir = '/tmp/hop-receipt'
      mkdirSync(receiptDir, { recursive: true })
      for (const s of run.stages) {
        if (s.status === 'completed' && s.url) {
          const p = join(runDir, s.url)
          if (existsSync(p)) {
            const { w, h } = pngSize(p)
            console.log('STAGE', s.id, s.url, w + 'x' + h)
            copyFileSync(p, join(receiptDir, (s.id ?? 'stage') + '.png'))
          } else {
            console.log('STAGE', s.id, 'MISSING BYTES', s.url)
          }
        } else {
          console.log('STAGE', s.id, s.status)
        }
      }
      const polish = run.stages.find((s) => s.id === 'polish')
      assert.ok(polish && polish.url, 'the polish stage settled with an artifact url')
      const { w, h } = pngSize(join(runDir, polish!.url!))
      assert.equal(w, 1024, 'the polish render is 1024 wide (2x the 512 class)')
      assert.equal(h, 512, 'the polish render is 512 tall (2x the 256 class)')

      const req = JSON.parse(readFileSync(join(runDir, '_request.json'), 'utf8')) as Record<string, { class_type: string; inputs: Record<string, unknown> }>
      const up = Object.values(req).find((n) => n.class_type === 'SeedVR2VideoUpscaler')
      console.log('REQUEST_GRAPH_UPSCALER_IMAGE', JSON.stringify(up?.inputs['image']))
      stopRegister()
    } finally {
      await ctx.fiber.dispose()
      sandbox.dispose()
    }
  }, 1_800_000)
})
