/**
 * chain-run-picker-transport.spec — THE CHAIN-RUN PICKER'S TRANSPORT
 * WALL (2026-11-01, the operator's burn: the Add Upscale mod form's
 * "Chain run" seat was a FREE-TEXT field demanding the engine-side
 * h3_chains store name, explained by a wall of tooltip prose).
 *
 * The invariant: the picker's source (fetchChainRunCandidates)
 * enumerates the estate's REAL runs surface — runs/list names the
 * runs, and each candidate's runs/status doc is READ for the chain
 * stamp (stages[].result_outputs.chain_store) — the same read the
 * F35 execute door performs before it binds. A run whose row carries
 * no stamp is never a candidate (no fabricated list); a refused
 * status (the gone run) skips that row; a transport failure throws
 * (the caller decides). The picker binds the ESTATE RUN ID — the
 * door's run-id grammar resolves it to the store — never a
 * hand-typed store spelling.
 *
 * The arms ride the real doors, hermetically: a real cordis root,
 * the real api-gateway client, the REAL generated estate-runs
 * contribution (the lib artifact the served bundle inlines) beside
 * the three sibling contributions the bind completes over, and the
 * real bind seam. Only the transport carrier (connection) and the
 * typert registry are honest doubles — the same fakes-not-mocks law
 * every estate spec rides.
 */
import { afterEach, expect, test } from 'vitest'
import * as cordis from '@deepseek-ai/cordis'
import * as gateway from '@deepseek-ai/dsh-api-gateway/client'
import { TYPERT_REMOTE as MEDIA_TYPERT_REMOTE } from '@melite/estate-media/remote'
import { TYPERT_REMOTE as DRAFTS_TYPERT_REMOTE } from '@melite/estate-drafts/remote'
import { TYPERT_REMOTE as RUNS_TYPERT_REMOTE } from '@melite/estate-runs/remote'
import { TYPERT_REMOTE as MANAGE_TYPERT_REMOTE } from '@melite/estate-manage/remote'
import { fetchChainRunCandidates } from '../../../../packages/web/card-base/src/runs-policy.ts'
import {
  armEstateRemoteLazyBind,
  bindEstateRemote,
  unbindEstateRemote,
  type EstateNamespaces,
} from '../../../../packages/web/card-base/src/estate-remote.ts'

interface WireCall {
  endpoint: string
  payload: Record<string, unknown>
}

/** One served runs/list row (the RunRow gate's own schema — every
 *  field required, the ids inside the run-id grammar). */
function listedRow(runId: string, createdAt: number): Record<string, unknown> {
  return {
    run_id: runId,
    name: 'the film',
    flow: 'h3-timeline',
    status: 'completed',
    created_at: createdAt,
    prompt: '',
    seed: 0,
    thumbnail: '',
    artifacts: [],
    params: {},
    draft_id: '',
  }
}

/** The chain stamp one chain-complete stage carries (the registrar's
 *  own payload — run_name, scenes, end_clip). */
function chainStamp(store: string, scenes: number): Record<string, unknown> {
  return { run_name: store, scenes, end_clip: scenes }
}

/** The served status doc per run: the two chain runs carry the stamp
 *  (and the lane variant); the film carries stages WITHOUT one — the
 *  store check must answer "no" for it. */
function statusDocs(): Record<string, Record<string, unknown>> {
  return {
    'run-5d9e144a4667': {
      run_id: 'run-5d9e144a4667',
      status: 'completed',
      variant: 'repair',
      flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { chain_store: chainStamp('swap_1111', 4) } }],
    },
    'run-2aa2bb2cc333': {
      run_id: 'run-2aa2bb2cc333',
      status: 'completed',
      variant: 'swap',
      flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { chain_store: chainStamp('swap_2222', 2) } }],
    },
    'run-plain-film-1': {
      run_id: 'run-plain-film-1',
      status: 'completed',
      variant: 'film',
      flow: 'h3-timeline',
      stages: [{ id: 's_1', status: 'success', result_outputs: { url: '/melite-media/runs/run-plain-film-1/out.mp4' } }],
    },
  }
}

/** The transport carrier double: records every rpc call and answers
 *  runs/list once + runs/status per run. Fresh per case so arms read
 *  their own wire. */
function connectionDouble(): {
  connection: Record<string, unknown>
  calls: WireCall[]
} {
  const calls: WireCall[] = []
  const docs = statusDocs()
  const connection = {
    interactions: 'none',
    rpc: {
      call: async (_path: string, endpoint: string, payload: Record<string, unknown>) => {
        calls.push({ endpoint, payload })
        if (endpoint === 'runs/list') {
          const runs = [
            listedRow('run-plain-film-1', 500),
            listedRow('run-5d9e144a4667', 900),
            listedRow('run-2aa2bb2cc333', 700),
          ]
          return { ok: true, value: { count: runs.length, runs } }
        }
        if (endpoint === 'runs/status') {
          const runId = (payload as { args: { runId: string } }).args.runId
          return { ok: true, value: docs[runId] }
        }
        throw new Error('unexpected endpoint in this wall: ' + endpoint)
      },
      open: undefined,
    },
    isLoopback: true,
    generation: { getSnapshot: (): undefined => undefined },
    start: (): { stop: () => void } => ({ stop: () => {} }),
  }
  return { connection, calls }
}

/** Boot one client root with the real gateway client applied (the
 *  typert registry is the honest double — no contribution registers
 *  through it in this arm). */
async function bootRoot(): Promise<{ root: cordis.Context; calls: WireCall[] }> {
  const root = new cordis.Context()
  const { connection, calls } = connectionDouble()
  root.provide('connection', connection)
  root.provide('typert', { remotes: { register: (): (() => void) => () => {} }, contexts: { getClient: (): undefined => undefined } })
  await root.plugin({ name: 'gateway-client', apply: gateway.apply, inject: gateway.inject })
  return { root, calls }
}

/** The card-view mounter's shape, all four estate contributions in
 *  the mounter's own order — the bind seam completes only over the
 *  full four-namespace read, so the wall mounts exactly what the
 *  production mounter mounts. */
async function mountEstateContributions(root: cordis.Context): Promise<() => Promise<void>> {
  const disposers: Array<() => void | Promise<void>> = []
  await root.plugin({
    name: 'estate-remote-mounter',
    inject: ['remote'],
    apply: async (ctx) => {
      const dispose = await ctx.remote.$mount(DRAFTS_TYPERT_REMOTE)
      ctx.effect(() => dispose, 'chain-run-picker-transport: drafts remote contribution')
      const disposeRuns = await ctx.remote.$mount(RUNS_TYPERT_REMOTE)
      ctx.effect(() => disposeRuns, 'chain-run-picker-transport: runs remote contribution')
      const disposeMedia = await ctx.remote.$mount(MEDIA_TYPERT_REMOTE)
      ctx.effect(() => disposeMedia, 'chain-run-picker-transport: media remote contribution')
      const disposeManage = await ctx.remote.$mount(MANAGE_TYPERT_REMOTE)
      ctx.effect(() => disposeManage, 'chain-run-picker-transport: manage remote contribution')
      disposers.push(dispose, disposeRuns, disposeMedia, disposeManage)
    },
  })
  return async () => {
    for (const dispose of disposers) await dispose()
  }
}

/** Arm the studio-shaped lazy bind over the root's inject-free
 *  reflect seam — the exact getter slots.ts arms for every studio. */
function armLazyBindOver(root: cordis.Context): void {
  armEstateRemoteLazyBind(() => ({
    bench: root.get('remote.bench') as EstateNamespaces['bench'] | undefined,
    drafts: root.get('remote.drafts') as EstateNamespaces['drafts'] | undefined,
    runs: root.get('remote.runs') as EstateNamespaces['runs'] | undefined,
    media: root.get('remote.media') as EstateNamespaces['media'] | undefined,
  }))
}

afterEach(() => {
  unbindEstateRemote()
})

test('THE WIRE LAW: the picker enumerates the runs surface and reads the chain stamp per run', async () => {
  const { root, calls } = await bootRoot()
  await mountEstateContributions(root)
  armLazyBindOver(root)
  const candidates = await fetchChainRunCandidates()
  // THE HONEST LIST: only the runs whose status doc carries the
  // chain stamp — the plain film proves nothing and stays out. The
  // picker binds the ESTATE RUN ID (the door resolves it); the store
  // the run left rides beside it; the label facts (variant, scenes)
  // come off the SERVED rows, never a hand list.
  expect(candidates).toEqual([
    { runId: 'run-5d9e144a4667', store: 'swap_1111', variant: 'repair', scenes: 4, created: 900 },
    { runId: 'run-2aa2bb2cc333', store: 'swap_2222', variant: 'swap', scenes: 2, created: 700 },
  ])
  // THE WIRE: one runs/list (the runs library's own surface) and ONE
  // runs/status PER LISTED RUN — the store check is wired, not
  // guessed (a list built without reading the rows would fabricate).
  expect(calls[0]?.endpoint).toBe('runs/list')
  expect(calls[0]?.payload).toEqual({ args: { rawLimit: '500' } })
  const statusCalls = calls.filter((c) => c.endpoint === 'runs/status')
  expect(statusCalls).toHaveLength(3)
  expect(statusCalls.map((c) => (c.payload as { args: { runId: string } }).args.runId).sort())
    .toEqual(['run-2aa2bb2cc333', 'run-5d9e144a4667', 'run-plain-film-1'])
})

test('THE HONEST SKIP: a refused status skips its row; a dead lane is never the honest empty', async () => {
  const docs = statusDocs()
  const calls: WireCall[] = []
  const root = new cordis.Context()
  root.provide('connection', {
    interactions: 'none',
    rpc: {
      call: async (_path: string, endpoint: string, payload: Record<string, unknown>) => {
        calls.push({ endpoint, payload })
        if (endpoint === 'runs/list') {
          const runs = [listedRow('run-plain-film-1', 500), listedRow('run-5d9e144a4667', 900), listedRow('run-2aa2bb2cc333', 700)]
          return { ok: true, value: { count: runs.length, runs } }
        }
        if (endpoint === 'runs/status') {
          const runId = (payload as { args: { runId: string } }).args.runId
          if (runId === 'run-2aa2bb2cc333') {
            // The gone run: the registry refuses (runs/unknown-run —
            // the estate restart wiped the live map and the disk row
            // is gone).
            return { ok: false, error: { message: 'unknown run_id "run-2aa2bb2cc333"', code: 'runs/unknown-run' } }
          }
          return { ok: true, value: docs[runId] }
        }
        throw new Error('unexpected endpoint in this wall: ' + endpoint)
      },
      open: undefined,
    },
    isLoopback: true,
    generation: { getSnapshot: (): undefined => undefined },
    start: (): { stop: () => void } => ({ stop: () => {} }),
  })
  root.provide('typert', { remotes: { register: (): (() => void) => () => {} }, contexts: { getClient: (): undefined => undefined } })
  await root.plugin({ name: 'gateway-client', apply: gateway.apply, inject: gateway.inject })
  await mountEstateContributions(root)
  armLazyBindOver(root)
  // The refused row is SKIPPED — no evidence, no candidate; the
  // remaining chain run still serves (the picker never blocks the
  // seat on one dead row, never fabricates the dead one back).
  const candidates = await fetchChainRunCandidates()
  expect(candidates).toEqual([
    { runId: 'run-5d9e144a4667', store: 'swap_1111', variant: 'repair', scenes: 4, created: 900 },
  ])
  expect(calls.filter((c) => c.endpoint === 'runs/status')).toHaveLength(3)

  // THE DEAD-LANE HALF: a carrier failure folds into the gateway's
  // gateway/internal branch — the picker RETHROWS it. A silent empty
  // list here would render "no chain runs yet" beside an unreachable
  // estate and lie the operator into a hand-typed store name — the
  // exact burn this wall closes.
  unbindEstateRemote()
  const broken = new cordis.Context()
  broken.provide('connection', {
    interactions: 'none',
    rpc: {
      call: async () => { throw new Error('connection reset') },
      open: undefined,
    },
    isLoopback: true,
    generation: { getSnapshot: (): undefined => undefined },
    start: (): { stop: () => void } => ({ stop: () => {} }),
  })
  broken.provide('typert', { remotes: { register: (): (() => void) => () => {} }, contexts: { getClient: (): undefined => undefined } })
  await broken.plugin({ name: 'gateway-client', apply: gateway.apply, inject: gateway.inject })
  await mountEstateContributions(broken)
  armLazyBindOver(broken)
  await expect(fetchChainRunCandidates()).rejects.toThrow(/connection reset/)
})
