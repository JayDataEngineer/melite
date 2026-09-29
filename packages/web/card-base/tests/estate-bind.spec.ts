/**
 * estate-bind.spec — THE BUNDLE-SPLIT BIND (2026-09-29, the
 * from-media outage's second layer): the client-bundle preset inlines
 * card-base into every consumer bundle, so the estate singleton
 * (`bound` in estate-remote.ts) exists PER BUNDLE. The mounts and one
 * bind landed in card-view's copy; every studio bundle's copy stayed
 * undefined and its picker answered "estate remote not mounted" with
 * zero console errors. These specs pin the bind that closes the split
 * — and the FIVE lane receipts that killed every cordis-fiber binder
 * before it:
 *
 *   1. dotted-only injects — the proxy refuses `child.remote` itself;
 *   2. parent-only — the fiber starts INACTIVE;
 *   3. both levels — the runner's own inspect sync breaks;
 *   4. a dormant fiber never wakes (the picker died with a clean
 *      console);
 *   5. a studio's STATIC estate injects park it forever (studios load
 *      BEFORE the mounter in the plugin URL; the wait is on the
 *      mounter's own $mount).
 *
 * The surviving shape is PLAIN JS over cordis' inject-free reflect
 * seam (ctx.get — cordis' own type doc: "Read a service from the
 * store without the inject requirement"): the mounter binds directly
 * after its mounts; the studios arm a lazy getter the FIRST VERB
 * pulls. No fiber, no inject list, no epoch, no loader wait.
 */
import { afterEach, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  armEstateRemoteLazyBind,
  bindEstateRemoteFromRemote,
  estateRemote,
  unbindEstateRemote,
  type EstateNamespaces,
} from '../src/estate-remote.ts'
import { defineStageViewRegistration } from '../src/slots.ts'

const here = dirname(fileURLToPath(import.meta.url))

function namespaces(): EstateNamespaces {
  // Honest-shape fakes via the namespace casts (the real namespaces
  // are TypertRemoteNamespaces — typed method faces; the singleton
  // law under test is identity, not method shape).
  return {
    bench: { list: (): null => null } as unknown as EstateNamespaces['bench'],
    drafts: { get: (): null => null } as unknown as EstateNamespaces['drafts'],
    runs: { list: (): null => null } as unknown as EstateNamespaces['runs'],
    media: { list: (): null => null } as unknown as EstateNamespaces['media'],
  }
}

/** An honest fake of the reflect seam the factory reads: the store a
 *  studio's ctx.get consults, empty until mount() lands the
 *  namespaces — the lane's exact physics (studio loads first). */
function fakeStore(): { get: (name: string) => unknown; mount: () => void } {
  const store = new Map<string, unknown>()
  return {
    get: (name: string): unknown => store.get(name),
    mount: () => {
      const ns = namespaces()
      store.set('remote.bench', ns.bench)
      store.set('remote.drafts', ns.drafts)
      store.set('remote.runs', ns.runs)
      store.set('remote.media', ns.media)
    },
  }
}

afterEach(() => {
  unbindEstateRemote()
})

test('bindEstateRemoteFromRemote binds THIS bundle copy to the shared services, sync', () => {
  const ns = namespaces()
  const returned = bindEstateRemoteFromRemote(ns)
  // THIS copy's singleton is bound to the SHARED service objects —
  // the whole point of the split fix.
  expect(estateRemote().bench).toBe(ns.bench)
  expect(estateRemote().media).toBe(ns.media)
  expect(returned.media).toBe(ns.media)
})

test('THE ABSENT-NAMESPACE GUARD: a partial read refuses LOUDLY, never binds a hole', () => {
  // A wiring bug (the mounter's $mount failed, a namespace never
  // landed) surfaces as the loud estate refusal — never a silent
  // partial bind that dies later at some verb.
  expect(() => bindEstateRemoteFromRemote({})).toThrow('estate remote not mounted')
  expect(() => estateRemote()).toThrow('estate remote not mounted')
})

test('defineStageViewRegistration arms the lazy bind — registration NEVER waits or throws', () => {
  const store = fakeStore() // namespaces NOT mounted yet (studio loads first)
  const apply = defineStageViewRegistration('h3-timeline', (): null => null)
  let pending: (() => void) | null = null
  expect(() =>
    apply({
      slots: {
        inject: (_seam, callback) => { pending = callback },
        register: () => undefined,
      },
      get: store.get,
    }),
  ).not.toThrow()
  // registration rode the slots seam (the factory's own contract)…
  expect(pending).not.toBeNull()
  // …and a verb BEFORE the mounts meets the loud refusal.
  expect(() => estateRemote()).toThrow('estate remote not mounted')
  // THE FIRST VERB AFTER THE MOUNTS binds this bundle's copy.
  store.mount()
  expect(estateRemote().media).toBe((store.get('remote.media') as object))
  expect(() => estateRemote()).not.toThrow()
})

test('THE RETRY LAW: a verb before the mounts refuses, a later verb still binds (getter stays armed)', () => {
  const store = fakeStore()
  armEstateRemoteLazyBind(() => ({
    bench: store.get('remote.bench') as EstateNamespaces['bench'] | undefined,
    drafts: store.get('remote.drafts') as EstateNamespaces['drafts'] | undefined,
    runs: store.get('remote.runs') as EstateNamespaces['runs'] | undefined,
    media: store.get('remote.media') as EstateNamespaces['media'] | undefined,
  }))
  expect(() => estateRemote()).toThrow('estate remote not mounted')
  store.mount() // the mounter lands the namespaces between two verbs
  expect(() => estateRemote()).not.toThrow()
})

test('THE HONEST-HOST LAW: no lazy source armed, no bind — the refusal names the wiring', () => {
  expect(() => estateRemote()).toThrow('TYPERT_REMOTE contributions must mount')
})

test('SOURCE LAW: the runtime child-fiber binder stays dead — no ctx.plugin escape hatch regrows', () => {
  // THE FIVE RECEIPTS (2026-09-29): every runtime-fiber spelling
  // died on cordis' own machinery. The wall pins the inject-free
  // seam; this spec pins that the fiber seam itself cannot return.
  const source = readFileSync(join(here, '../src/estate-remote.ts'), 'utf8')
  expect(source.includes('bindEstateRemoteFor'), 'the runtime fiber binder must not return').toBe(false)
  expect(source.includes('ensureEstateRemote'), 'the fiber-based lazy kick must not return').toBe(false)
  expect(source.includes('ctx.plugin'), 'estate-remote must not touch the cordis plugin primitive').toBe(false)
})

test('SOURCE LAW: slots.ts arms the lazy getter over ctx.get, never a fiber or a static inject', () => {
  const source = readFileSync(join(here, '../src/slots.ts'), 'utf8')
  expect(source.includes('armEstateRemoteLazyBind'), 'the factory must arm the lazy bind').toBe(true)
  expect(source.includes("ctx.get('remote.bench')"), 'the getter reads the inject-free reflect seam').toBe(true)
  expect(source.includes('bindEstateRemoteFor'), 'no runtime fiber binder may fire from registration').toBe(false)
})
