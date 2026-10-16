// webhook-fold.e2e.ts — THE LIVE-FOLD WALL (D11, 2026-10-11): the
// operator's "the webhooks are wrong" (a run frozen at "merged
// submit (1 stages, 33 nodes)" with no progress). The fold is the
// engine's websocket tap → report() → the live memory row →
// runs/status → the tile's live patch. This wall samples the LIVE
// status mid-run and requires the fold's voices BEFORE settlement:
// a node/executing activity past the merged-submit stamp AND a
// progress {value, max} with max > 0. A dead tap (the silent-catch
// era) fails here while the run still completes — the wall hears
// the freeze, not the settlement.
import '../helpers/boot-models.ts'
import { it } from 'vitest'
import assert from 'node:assert/strict'
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
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'


function weightsPresent(cardId: string): boolean {
  if (!ENGINE_FREE) return false
  try {
    return lanePresenceMiss(cardId) === null
  } catch {
    return false
  }
}

it.skipIf(!ENGINE_FREE || !weightsPresent('h3-timeline'))('h3-timeline live fold: the running status voices node activity and sample progress before settlement', async () => {
  const sandbox = mintSandbox('webhook-fold-')
  const ctx = new Context()
  try {
    new EnginesService(ctx)
    const host = new ComfyUIHostService(ctx, { host: ENGINE_HOST, port: ENGINE_PORT })
    const seat = ctx.get('engines') as EnginesService
    const stopRegister = seat.register('comfyui', { executor: comfyuiExecutor(ctx, host) })
    const stateRoot = join(sandbox.root, 'state')
    const queueSvc = new QueueService(ctx, { stateRoot })
    ;(ctx as unknown as { queue: unknown }).queue = queueSvc
    ;(ctx as unknown as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
    await ctx.plugin(cardRegistryProvider as { name: string, apply: (c: unknown, cfg?: unknown) => void })
    const svc = new RunsRuntimeService(ctx as unknown as Context)
    const ans = await svc.start(
      // THE NONCE (D11, 2026-10-11): the engine memo's byte-identical
      // graphs and serves the previous film with NO execution (no ws
      // events — the fold stays frozen at "merged submit"). A novel
      // prompt defeats the memo, so the wall always hears a LIVE
      // execution; the replay half is pinned headless in
      // runs-hero.spec.ts, not here (retry: 2 would replay attempt 1
      // on every attempt without it).
      { draft_id: 'd1', test: false, model: 'h3', prompt: `a red cube slides slowly across a white table (fold-wall ${Date.now()})`, width: 768, height: 448 } as never,
      new AbortController().signal,
    )
    assert.equal(ans.status, 'queued', 'the card run must queue')
    console.log('RUN:', ans.run_id, 'stateRoot:', stateRoot)
    const t0 = Date.now()
    let voicedActivity = ''
    let voicedMax = 0
    let terminal = ''
    let finalArtifacts: unknown = undefined
    const heard: string[] = []
    for (let i = 0; i < 400; i++) {
      const st = await svc.status(ans.run_id, new AbortController().signal) as unknown as {
        status: string, stages: Array<{ activity?: unknown, progress?: { value?: unknown, max?: unknown } }>
      }
      const s0 = st.stages[0] ?? {}
      heard.push(`poll${i}: status=${st.status} activity=${JSON.stringify(s0.activity)} progress=${JSON.stringify(s0.progress)}`)
      if (typeof s0.activity === 'string' && !s0.activity.startsWith('merged submit')) {
        voicedActivity = s0.activity
      }
      if (typeof s0.progress?.max === 'number' && s0.progress.max > 0) {
        voicedMax = s0.progress.max
      }
      if (st.status !== 'queued' && st.status !== 'running') {
        terminal = st.status
        finalArtifacts = (st as { artifacts?: unknown }).artifacts
        break
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    console.log('SETTLED in', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'as', terminal, 'artifacts:', JSON.stringify(finalArtifacts))
    assert.equal(terminal, 'completed', 'the live run must complete')
    const settled = await svc.status(ans.run_id, new AbortController().signal) as unknown as Record<string, unknown>
    assert.equal('replay_suspect' in settled, false, 'a live execution is never replay-suspect (the verdict is positive-signal-only)')
    assert.equal(terminal, 'completed', 'the live run must complete')
    assert.ok(voicedActivity !== '', 'the fold voiced a live activity past the merged-submit stamp (heard nothing — the tap is dead). heard:\n' + heard.join('\n'))
    assert.ok(voicedMax > 0, 'the fold voiced a sample progress with max > 0 (heard none — progress never arrived). heard:\n' + heard.join('\n'))
    stopRegister()
  } finally {
    await ctx.fiber.dispose()
  }
}, 900000)
