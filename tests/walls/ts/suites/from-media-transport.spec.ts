/**
 * media-library-transport.spec — THE FROM-MEDIA TRANSPORT WALL
 * (2026-11-01, the operator's burn: the runs-library "From media"
 * input answered `media library unavailable — estateRemote(...).media
 * .list is not a function`).
 *
 * The invariant: the picker's source (fetchMediaLibrary) resolves
 * served media through the estate's REAL remote surface — the mounted
 * media namespace's `media/list` method, installed by the generated
 * estate-media contribution over the api-gateway client's $mount —
 * and a bind that has gone stale (a re-applied mounter deletes the
 * old generation's method installs on dispose) can never surface as a
 * programmer TypeError: the bind seam re-pulls the live namespaces and
 * the caller names the wiring fault in the door's voice.
 *
 * The arms ride the real doors, hermetically: a real cordis root, the
 * real api-gateway client, the REAL generated estate-media
 * contribution (the lib artifact the served bundle inlines), and the
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
import { fetchMediaLibrary } from '../../../../packages/web/card-base/src/media-library.ts'
import {
  armEstateRemoteLazyBind,
  bindEstateRemote,
  estateRemote,
  unbindEstateRemote,
  type EstateNamespaces,
} from '../../../../packages/web/card-base/src/estate-remote.ts'

interface WireCall {
  endpoint: string
  payload: Record<string, unknown>
}

/** The served rows one media/list answer carries (the generated
 *  result schema's shape — every field required). */
function servedRows(runId: string): { count: number; items: Array<Record<string, string>> } {
  return {
    count: 1,
    items: [{ url: `/melite-media/runs/${runId}/out.png`, name: 'out.png', kind: 'image', runId, served_from: '/state' }],
  }
}

/** The transport carrier double: records every rpc call and answers
 *  one served-media page. Fresh per case so arms read their own wire. */
function connectionDouble(answer: () => { count: number; items: Array<Record<string, string>> }): {
  connection: Record<string, unknown>
  calls: WireCall[]
} {
  const calls: WireCall[] = []
  const connection = {
    interactions: 'none',
    rpc: {
      call: async (_path: string, endpoint: string, payload: Record<string, unknown>) => {
        calls.push({ endpoint, payload })
        return { ok: true, value: answer() }
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
 *  through it in this arm). Returns the root and the wire recorder. */
async function bootRoot(): Promise<{ root: cordis.Context; calls: WireCall[] }> {
  const root = new cordis.Context()
  const { connection, calls } = connectionDouble(() => servedRows('run-abc1-img'))
  root.provide('connection', connection)
  root.provide('typert', { remotes: { register: (): (() => void) => () => {} }, contexts: { getClient: (): undefined => undefined } })
  await root.plugin({ name: 'gateway-client', apply: gateway.apply, inject: gateway.inject })
  return { root, calls }
}

/** The card-view mounter's shape, all four estate contributions in the
 *  mounter's own order (drafts, runs, media, manage): the bind seam
 *  completes only over the full four-namespace read, so the wall
 *  mounts exactly what the production mounter mounts. Returns the
 *  gateway's own disposer over all four contributions — the production
 *  HMR reload runs this same dispose before re-mounting. */
async function mountEstateContributions(root: cordis.Context): Promise<() => Promise<void>> {
  const disposers: Array<() => void | Promise<void>> = []
  await root.plugin({
    name: 'estate-remote-mounter',
    inject: ['remote'],
    apply: async (ctx) => {
      const dispose = await ctx.remote.$mount(DRAFTS_TYPERT_REMOTE)
      ctx.effect(() => dispose, 'from-media-transport: drafts remote contribution')
      const disposeRuns = await ctx.remote.$mount(RUNS_TYPERT_REMOTE)
      ctx.effect(() => disposeRuns, 'from-media-transport: runs remote contribution')
      const disposeMedia = await ctx.remote.$mount(MEDIA_TYPERT_REMOTE)
      ctx.effect(() => disposeMedia, 'from-media-transport: media remote contribution')
      const disposeManage = await ctx.remote.$mount(MANAGE_TYPERT_REMOTE)
      ctx.effect(() => disposeManage, 'from-media-transport: manage remote contribution')
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

test('THE WIRE LAW: the picker resolves served media through the mounted media/list method', async () => {
  const { root, calls } = await bootRoot()
  await mountEstateContributions(root)
  armLazyBindOver(root)
  // The mount installed the real method on the namespace service —
  // the surface the caller must consume.
  const ns = root.get('remote.media') as { list?: unknown }
  expect(typeof ns.list).toBe('function')
  // The caller consumes it: one wire call, the served rows back
  // (the caller's url/name filter keeps the full served row — the
  // picker's business is the pair, the transport's business is truth).
  const rows = await fetchMediaLibrary('image')
  expect(rows).toEqual([{ url: '/melite-media/runs/run-abc1-img/out.png', name: 'out.png', kind: 'image', runId: 'run-abc1-img', served_from: '/state' }])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.endpoint).toBe('media/list')
  expect(calls[0]?.payload).toEqual({ args: { kind: 'image' } })
})

test('THE STALE-FACADE SELF-HEAL: a re-applied mounter never leaves the picker on a dead generation', async () => {
  const { root, calls } = await bootRoot()
  const disposeEstateContributions = await mountEstateContributions(root)
  armLazyBindOver(root)
  // The first verb binds THIS generation…
  await fetchMediaLibrary('image')
  const deadGeneration = estateRemote().media
  expect(typeof (deadGeneration as { list?: unknown }).list).toBe('function')
  // …then the mounter re-applies — the production HMR sequence: the
  // old contribution's dispose runs the gateway's own disposer (the
  // method install is deleted from the old namespace service) and a
  // NEW generation mounts. This is the burn's exact state: the
  // once-cached bind now holds a namespace object whose `list` is gone.
  await disposeEstateContributions()
  await mountEstateContributions(root)
  expect(typeof (deadGeneration as { list?: unknown }).list).not.toBe('function')
  // THE CURE: the verb re-pulls the live namespaces — the bind follows
  // the new generation and the picker LISTS (the wire call rides the
  // live method, never the dead facade). Identity assert, not expect():
  // the namespace service's method getters refuse vitest's matcher
  // probes, and identity is exactly the invariant this arm owns.
  if (estateRemote().media === deadGeneration) {
    throw new Error('THE STALE FACADE: the picker still rides the dead generation — the bind did not follow the re-mounted media namespace')
  }
  const rows = await fetchMediaLibrary('all')
  expect(rows).toEqual([{ url: '/melite-media/runs/run-abc1-img/out.png', name: 'out.png', kind: 'image', runId: 'run-abc1-img', served_from: '/state' }])
  expect(calls).toHaveLength(2)
  expect(calls[1]?.payload).toEqual({ args: { kind: 'all' } })
})

test('THE PHANTOM REFUSAL: a media namespace without the served method refuses in the door\'s voice', async () => {
  // An honest fake whose media namespace is mounted WITHOUT the list
  // install — the wiring-fault shape. The bind seam is not armed here:
  // a direct bind is the truth (the host genuinely serves no method).
  bindEstateRemote({
    bench: { subscribe: (): never => { throw new Error('not ridden') } } as unknown as EstateNamespaces['bench'],
    drafts: {} as unknown as EstateNamespaces['drafts'],
    runs: {} as unknown as EstateNamespaces['runs'],
    media: {} as unknown as EstateNamespaces['media'],
  })
  await expect(fetchMediaLibrary('image')).rejects.toThrow(/does not serve media\/list/)
  // The burn's face stays dead: never the raw programmer TypeError.
  await expect(fetchMediaLibrary('image')).rejects.not.toThrow(/is not a function/)
})
