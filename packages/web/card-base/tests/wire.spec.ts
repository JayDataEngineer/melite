// @vitest-environment happy-dom
// wire.spec.ts — THE SAME-ORIGIN /v1 WIRE FACTS: the constructor's
// verbs ride these doors; refusals are LOUD and named (the door's
// own text when present, the door path + HTTP status otherwise).
// The fetch double is a FAKE door (canned Responses per path), never
// a module mock — the wire math (frames, envelopes, sanitizing) runs
// for real.
import { afterEach, expect, test } from 'vitest'

import {
  assertFormSpecDoc,
  fetchCardCatalog,
  fetchFormsTable,
  fetchFormSpec,
  postManageAction,
  uploadInputFile,
} from '../src/wire.ts'
import { resetCardFamiliesCache } from '@melite-plugin/melite-run-wire'
import { bindEstateRemoteFromRemote, unbindEstateRemote, type EstateNamespaces } from '../src/estate-remote.ts'
import type { ManageActDoc, ManageEnvelopeRow } from '@melite/estate-manage/types'
import { RemoteError, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

/** Bind the singleton with ONLY the manage lane under test live (the
 *  other four namespaces are present for the bind law but never
 *  touched by the manage verbs — same honest-shape casts the
 *  estate-bind spec uses for its identity-law fakes). */
function bindManageLane(
  act: (doc: ManageActDoc, signal?: AbortSignal) => Promise<RemoteResult<ManageEnvelopeRow>>,
): void {
  bindEstateRemoteFromRemote({
    bench: { list: (): null => null } as unknown as EstateNamespaces['bench'],
    drafts: { get: (): null => null } as unknown as EstateNamespaces['drafts'],
    runs: { list: (): null => null } as unknown as EstateNamespaces['runs'],
    media: { list: (): null => null } as unknown as EstateNamespaces['media'],
    manage: { act },
  })
}

/** One canned door: method + path → Response. Records every call. */
function installFetchFake(routes: Record<string, (init?: RequestInit) => Response>): {
  // the recorded init is the one the fetch ran with: a call that
  // passed none ran with the empty one, so the record is never
  // undefined (every assertion below reads it)
  calls: Array<{ url: string; init: RequestInit }>
  restore: () => void
} {
  const realFetch = globalThis.fetch
  const calls: Array<{ url: string; init: RequestInit }> = []
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const key = String(url)
    calls.push({ url: key, init: init ?? {} })
    const route = routes[key]
    if (route === undefined) return new Response('no door', { status: 404 })
    return route(init)
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = realFetch } }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let restoreFetch: (() => void) | null = null
afterEach(() => {
  unbindEstateRemote()
  resetCardFamiliesCache()
  resetFake()
})

function useFake(routes: Record<string, (init?: RequestInit) => Response>) {
  const { calls, restore } = installFetchFake(routes)
  restoreFetch = restore
  return calls
}

function resetFake(): void {
  const restore = restoreFetch
  restoreFetch = null
  restore?.()
}

test('fetchCardCatalog: rows walk — fallbacks fill, family lists filter, junk rows skip', async () => {
  const calls = useFake({
    '/v1/model-catalog': () => json({
      cards: {
        krea: { label: 'Krea', description: 'd', genre: 'image', families: ['krea-2', 7, null] },
        bare: 'not-a-row',
        min: {},
      },
    }),
  })
  const cards = await fetchCardCatalog()
  // the junk row ('bare' is a string, not a row) SKIPS — only row objects walk
  expect(cards).toEqual([
    { id: 'krea', label: 'Krea', description: 'd', genre: 'image', families: ['krea-2'] },
    { id: 'min', label: 'min', description: '', genre: '', families: ['min'] },
  ])
  // sorted by label (Krea < min); the caller omitted the signal, so
  // the DIAL rides alone (audit X-E1: no bare sockets on the /v1 wire)
  expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
})

test('fetchCardCatalog: a missing cards table walks to no cards; the abort signal forwards', async () => {
  const calls = useFake({ '/v1/model-catalog': () => json({}) })
  const ctl = new AbortController()
  expect(await fetchCardCatalog(ctl.signal)).toEqual([])
  // the caller's signal rides ANDed with the dial (AbortSignal.any):
  // the composed signal is its own instance, and the caller's lift
  // lifts the fetch (audit X-E1)
  expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
  expect(calls[0]!.init.signal).not.toBe(ctl.signal)
  ctl.abort()
  expect((calls[0]!.init.signal as AbortSignal).aborted).toBe(true)
})

test('THE LOUD REFUSAL: a non-200 door throws its own error text', async () => {
  useFake({ '/v1/model-catalog': () => json({ error: 'catalog is rebuilding' }, 503) })
  await expect(fetchCardCatalog()).rejects.toThrow(/catalog is rebuilding/)
})

test('THE LOUD REFUSAL: a textless non-200 names the door + status (never an empty throw)', async () => {
  useFake({ '/v1/model-catalog': () => new Response('boom', { status: 500 }) })
  await expect(fetchCardCatalog()).rejects.toThrow(/\/v1\/model-catalog: HTTP 500/)
})

test('THE LOUD REFUSAL: a 200 whose body is not an object refuses (never a silent empty table)', async () => {
  useFake({ '/v1/model-catalog': () => new Response('garbage{{{', { status: 200 }) })
  await expect(fetchCardCatalog()).rejects.toThrow(/\/v1\/model-catalog: unreadable body/)
})

test('THE ONE DOOR LAW: the second read rides the cache — one GET total (D6)', async () => {
  let calls = 0
  useFake({
    '/v1/model-catalog': () => {
      calls += 1
      return json({ cards: { krea: { label: 'Krea' } } })
    },
  })
  const first = await fetchCardCatalog()
  const second = await fetchCardCatalog()
  expect(calls).toBe(1)
  expect(second).toEqual(first)
})

test('fetchFormSpec: a valid envelope rides through (null schema = the unserializable carrier)', async () => {
  useFake({
    '/v1/form-spec?model=krea-2': () => json({ form: 'x', model: 'krea-2', schema: null }),
  })
  expect(await fetchFormSpec('krea-2')).toEqual({ form: 'x', model: 'krea-2', schema: null })
})

test('fetchFormSpec: the model rides URI-encoded; the signal forwards', async () => {
  const calls = useFake({
    '/v1/form-spec?model=a%20b%2Fc': () => json({ form: 'x', schema: null }),
  })
  const ctl = new AbortController()
  await fetchFormSpec('a b/c', ctl.signal)
  expect(calls[0]!.url).toBe('/v1/form-spec?model=a%20b%2Fc')
  // the caller's signal rides ANDed with the dial (audit X-E1): the
  // composed instance lifts when the caller lifts
  expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
  expect(calls[0]!.init.signal).not.toBe(ctl.signal)
  ctl.abort()
  expect((calls[0]!.init.signal as AbortSignal).aborted).toBe(true)
})

test('fetchFormSpec: a schema-less envelope REFUSES (never a silent empty form)', async () => {
  for (const schema of [{ uid: 'x', refs: {} }, { uid: 0, refs: 7 }, 'nope']) {
    useFake({ '/v1/form-spec?model=m': () => json({ form: 'x', schema }) })
    await expect(fetchFormSpec('m')).rejects.toThrow(/form-spec: no schema envelope/)
    restoreFetch?.()
    restoreFetch = null
  }
})

test('fetchFormSpec: a foreign wtype REFUSES at the wire (LAW 8 — never the silent text fallback)', async () => {
  // one schema ref carrying wtype 'slidr' (a typo'd slider): the
  // write-side bag guard never sees a served doc, so the WIRE is
  // the boundary — it names the ref and the set's home.
  const env = (wtype: unknown) => ({
    uid: 0,
    refs: { 1: { type: 'object', dict: { probe: 2 } }, 2: { type: 'string', meta: { extra: { wtype } } } },
  })
  const cases: Array<{ doc: Record<string, unknown>; want: RegExp }> = [
    { doc: { form: 'x', schema: env('slidr') }, want: /schema ref 2: wtype 'slidr' is not in WTYPE_SET/ },
    // mod_schemas walk the same gate, named by pack
    { doc: { form: 'x', schema: env('slider'), mod_schemas: { sam: env('seed') } }, want: /mod:sam ref 2: wtype 'seed' is not in WTYPE_SET/ },
  ]
  for (const { doc, want } of cases) {
    useFake({ '/v1/form-spec?model=m': () => json(doc) })
    await expect(fetchFormSpec('m')).rejects.toThrow(want)
    resetFake()
  }
  // '' is the explicit no-hint spelling — it rides (members ride too)
  useFake({ '/v1/form-spec?model=m': () => json({ form: 'x', schema: env('') }) })
  await expect(await fetchFormSpec('m')).toBeTruthy()
})

test('fetchFormsTable: the meta table rides verbatim (the picker kind-matches off it)', async () => {
  useFake({ '/v1/forms': () => json({ txt2img: { label: 'T', genre: 'image', order: 1 } }) })
  expect(await fetchFormsTable()).toEqual({ txt2img: { label: 'T', genre: 'image', order: 1 } })
})

test('postManageAction: the doc rides the mounted manage namespace (action + payload verbatim)', async () => {
  const docs: ManageActDoc[] = []
  bindManageLane(async (doc) => {
    docs.push(doc)
    return { ok: true, value: { action: doc.action, ok: true, detail: 'queued', data: { id: 1 } } }
  })
  const reply = await postManageAction('provision_model', { model: 'krea-2' })
  expect(reply).toEqual({ ok: true, detail: 'queued', data: { id: 1 } })
  expect(docs).toEqual([{ action: 'provision_model', model: 'krea-2' }])
})

test('postManageAction: detail rides verbatim (an empty detail stays empty, never invented)', async () => {
  bindManageLane(async () => ({ ok: true, value: { action: 'a', ok: true, detail: '' } }))
  expect(await postManageAction('a', {})).toEqual({ ok: true, detail: '', data: undefined })
})

test('postManageAction: an envelope refusal on the resolve branch is a DOMAIN outcome', async () => {
  bindManageLane(async (doc) => ({ ok: true, value: { action: doc.action, ok: false, detail: 'engine is down' } }))
  expect(await postManageAction('provision_model', {})).toEqual({ ok: false, detail: 'engine is down' })
})

test('postManageAction: the RemoteResult error branch rides its message; a messageless one names the action', async () => {
  bindManageLane(async () => ({ ok: false, error: new RemoteError('gateway/bad-request', 'pack refused', {}) }))
  expect(await postManageAction('install_pack', {})).toEqual({ ok: false, detail: 'pack refused' })
  bindManageLane(async () => ({ ok: false, error: new RemoteError('gateway/bad-request', '', {}) }))
  expect(await postManageAction('install_pack', {})).toEqual({ ok: false, detail: 'manage/install_pack refused' })
})

test('postManageAction: the signal forwards past the surface to the namespace', async () => {
  let seen: AbortSignal | undefined
  bindManageLane(async (_doc, signal) => {
    seen = signal
    return { ok: true, value: { action: 'a', ok: true, detail: '' } }
  })
  const ctl = new AbortController()
  await postManageAction('a', {}, ctl.signal)
  expect(seen).toBe(ctl.signal)
})

test('postManageAction: an unmounted lane refuses LOUD (never a silent ok:false)', async () => {
  unbindEstateRemote()
  await expect(postManageAction('a', {})).rejects.toThrow(/estate remote not mounted/)
  bindManageLane(async () => ({ ok: true, value: { action: 'a', ok: true, detail: '' } }))
  unbindEstateRemote()
  bindEstateRemoteFromRemote({
    bench: { list: (): null => null } as unknown as EstateNamespaces['bench'],
    drafts: { get: (): null => null } as unknown as EstateNamespaces['drafts'],
    runs: { list: (): null => null } as unknown as EstateNamespaces['runs'],
    media: { list: (): null => null } as unknown as EstateNamespaces['media'],
  })
  await expect(postManageAction('a', {})).rejects.toThrow(/manage remote not mounted/)
})

test('uploadInputFile: the estate path rides the param (never the bare name)', async () => {
  const calls = useFake({ '/v1/uploads': () => json({ path: 'data/input/x.png' }) })
  const file = new File(['bytes'], 'my photo(1).png', { type: 'image/png' })
  expect(await uploadInputFile(file)).toEqual({ name: 'data/input/x.png', file: 'x.png' })
  const sent = JSON.parse(String(calls[0]!.init?.body)) as Record<string, unknown>
  // THE REAL NAME, NOT A MANGLED ONE (li-aq.5's audit GAP 4: the
  // client must not rewrite the name through a charset the contracts'
  // grammar never declared — the staged name must tell the truth
  // about the local file; the rail judges it with the shared
  // grammar). This assertion predates that law and kept expecting the
  // old `my_photo_1_.png` mangling — invisible while the dom lane's
  // react alias was dangling and every spec file died at load.
  expect(sent['filename']).toBe('my photo(1).png')
  expect(String(sent['data']).startsWith('data:')).toBe(true)
})

test('uploadInputFile: foreign types REFUSE naming themselves (empty type = that file)', async () => {
  useFake({})
  await expect(uploadInputFile(new File(['x'], 'a.pdf', { type: 'application/pdf' })))
    .rejects.toThrow(/Input cards don’t accept application\/pdf — drop an image, video, audio, or \.glb\/\.gltf file/)
  await expect(uploadInputFile(new File(['x'], 'a.bin', { type: '' })))
    .rejects.toThrow(/Input cards don’t accept that file — drop an image, video, audio, or \.glb\/\.gltf file/)
})

test('uploadInputFile: THE MESH ARM — .glb/.gltf rides the gate in both browser spellings', async () => {
  useFake({ '/v1/uploads': () => json({ path: 'data/input/x.glb' }) })
  // the known mime
  await expect(uploadInputFile(new File(['x'], 'a.glb', { type: 'model/gltf-binary' })))
    .resolves.toEqual({ name: 'data/input/x.glb', file: 'x.glb' })
  // the octet-stream fallback (extension-gated)
  await expect(uploadInputFile(new File(['x'], 'a.gltf', { type: 'application/octet-stream' })))
    .resolves.toEqual({ name: 'data/input/x.glb', file: 'x.glb' })
  // a foreign octet-stream WITHOUT the extension still refuses (never a mime bypass)
  await expect(uploadInputFile(new File(['x'], 'a.bin', { type: 'application/octet-stream' })))
    .rejects.toThrow(/Input cards don’t accept/)
})

test('uploadInputFile: ANY MEDIA boards the door (the any-media law, 2026-11-06) — audio and video ride, never a silent image-path lie', async () => {
  // audio + video reach the POST (the door answers the estate path)
  useFake({ '/v1/uploads': () => json({ path: 'data/input/a.mp3' }) })
  const RealReader = globalThis.FileReader
  globalThis.FileReader = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(): void {
      this.result = 'data:audio/mpeg;base64,QUJD'
      queueMicrotask(() => { this.onload?.() })
    }
  } as unknown as typeof FileReader
  try {
    await expect(uploadInputFile(new File(['x'], 'a.mp3', { type: 'audio/mpeg' })))
      .resolves.toEqual({ name: 'data/input/a.mp3', file: 'a.mp3' })
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('uploadInputFile: an unreadable drop REFUSES (never an empty upload)', async () => {
  const RealReader = globalThis.FileReader
  class FailingReader {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(_file: Blob): void {
      queueMicrotask(() => { this.onerror?.() })
    }
  }
  globalThis.FileReader = FailingReader as unknown as typeof RealReader
  try {
    useFake({})
    await expect(uploadInputFile(new File(['x'], 'a.png', { type: 'image/png' })))
      .rejects.toThrow(/read failed/)
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('uploadInputFile: a refusing door + a pathless answer both REFUSE loud', async () => {
  // THE DOOR'S VOICE RIDES (audit X-S2): a refusal body's error field
  // names the gate — the bare status number never did
  useFake({ '/v1/uploads': () => new Response(JSON.stringify({ error: 'too large' }), { status: 413 }) })
  await expect(uploadInputFile(new File(['x'], 'a.png', { type: 'image/png' })))
    .rejects.toThrow(/upload refused: too large/)
  resetFake()
  useFake({ '/v1/uploads': () => new Response('{}', { status: 413 }) })
  await expect(uploadInputFile(new File(['x'], 'a.png', { type: 'image/png' })))
    .rejects.toThrow(/upload refused: HTTP 413/)
  resetFake()
  useFake({ '/v1/uploads': () => json({}) })
  await expect(uploadInputFile(new File(['x'], 'a.png', { type: 'image/png' })))
    .rejects.toThrow(/upload answered without a path/)
  resetFake()
  useFake({ '/v1/uploads': () => json({ path: 7 }) })
  await expect(uploadInputFile(new File(['x'], 'a.png', { type: 'image/png' })))
    .rejects.toThrow(/upload answered without a path/)
})

// THE BOUNDARY JUDGMENT'S OWN SKIPS (assertFormSpecDoc, wire.ts).
// The base envelope's shape is refused by the envelope gate above it,
// but a MOD envelope is judged only by judgeEnvelope — so these two
// skips are live decisions on a served mod row, not dead branches.

test('a mod envelope whose refs is not an object is SKIPPED, not refused', () => {
  // mod_schemas values are typed SchemaEnvelope | null, and the served
  // doc is untrusted: the mod row carries a string where the ref bag
  // belongs. The base gate never sees it (it judges `schema` alone), so
  // judgeEnvelope's own skip is the whole judgment — the doc passes.
  const doc = {
    schema: { uid: 1, refs: {} },
    mod_schemas: { pose: { uid: 2, refs: 'not-a-ref-bag' } },
  }
  expect(assertFormSpecDoc(doc, 'cast-only')).toBe(doc)
})

test('a null refs bag on a mod envelope is the same skip', () => {
  const doc = {
    schema: { uid: 1, refs: {} },
    mod_schemas: { pose: { uid: 2, refs: null } },
  }
  expect(assertFormSpecDoc(doc, 'cast-only')).toBe(doc)
})

test('a non-object node INSIDE a mod refs bag is skipped; its siblings still judge', () => {
  // The walk is per node: a scalar row contributes no wtype, so it
  // retires nothing, and the sibling that DOES carry a foreign wtype
  // still refuses — the skip never swallows the envelope's judgment.
  const doc = {
    schema: { uid: 1, refs: {} },
    mod_schemas: { pose: { uid: 2, refs: { n1: 'scalar-row', n2: null, n3: { meta: { extra: { wtype: 'switch' } } } } } },
  }
  expect(() => assertFormSpecDoc(doc, 'cast-only')).toThrow(
    "mod:pose ref n3: wtype 'switch' is not in WTYPE_SET",
  )
})
