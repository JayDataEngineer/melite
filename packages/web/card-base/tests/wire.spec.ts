// @vitest-environment happy-dom
// wire.spec.ts — THE SAME-ORIGIN /v1 WIRE FACTS: the constructor's
// verbs ride these doors; refusals are LOUD and named (the door's
// own text when present, the door path + HTTP status otherwise).
// The fetch double is a FAKE door (canned Responses per path), never
// a module mock — the wire math (frames, envelopes, sanitizing) runs
// for real.
import { afterEach, expect, test } from 'vitest'

import {
  fetchCardCatalog,
  fetchFormsTable,
  fetchFormSpec,
  postManageAction,
  uploadInputFile,
} from '../src/wire.ts'

/** One canned door: method + path → Response. Records every call. */
function installFetchFake(routes: Record<string, (init?: RequestInit) => Response>): {
  calls: Array<{ url: string; init?: RequestInit }>
  restore: () => void
} {
  const realFetch = globalThis.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const key = String(url)
    calls.push({ url: key, init })
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
  // sorted by label (Krea < min), signal omitted
  expect(calls[0]!.init).toEqual({})
})

test('fetchCardCatalog: a missing cards table walks to no cards; the abort signal forwards', async () => {
  const calls = useFake({ '/v1/model-catalog': () => json({}) })
  const ctl = new AbortController()
  expect(await fetchCardCatalog(ctl.signal)).toEqual([])
  expect(calls[0]!.init).toEqual({ signal: ctl.signal })
})

test('THE LOUD REFUSAL: a non-200 door throws its own error text', async () => {
  useFake({ '/v1/model-catalog': () => json({ error: 'catalog is rebuilding' }, 503) })
  await expect(fetchCardCatalog()).rejects.toThrow(/catalog is rebuilding/)
})

test('THE LOUD REFUSAL: a textless non-200 names the door + status (never an empty throw)', async () => {
  useFake({ '/v1/model-catalog': () => new Response('boom', { status: 500 }) })
  await expect(fetchCardCatalog()).rejects.toThrow(/\/v1\/model-catalog: HTTP 500/)
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
  expect(calls[0]!.init).toEqual({ signal: ctl.signal })
})

test('fetchFormSpec: a schema-less envelope REFUSES (never a silent empty form)', async () => {
  for (const schema of [{ uid: 'x', refs: {} }, { uid: 0, refs: 7 }, 'nope']) {
    useFake({ '/v1/form-spec?model=m': () => json({ form: 'x', schema }) })
    await expect(fetchFormSpec('m')).rejects.toThrow(/form-spec: no schema envelope/)
    restoreFetch?.()
    restoreFetch = null
  }
})

test('fetchFormsTable: the meta table rides verbatim (the picker kind-matches off it)', async () => {
  useFake({ '/v1/forms': () => json({ txt2img: { label: 'T', genre: 'image', order: 1 } }) })
  expect(await fetchFormsTable()).toEqual({ txt2img: { label: 'T', genre: 'image', order: 1 } })
})

test('postManageAction: the client-request frame rides the manage door (action + payload verbatim)', async () => {
  const calls = useFake({
    '/api/manage/act': () => json({ result: { ok: true, value: { detail: 'queued', data: { id: 1 } } } }),
  })
  const reply = await postManageAction('provision_model', { model: 'krea-2' })
  expect(reply).toEqual({ ok: true, detail: 'queued', data: { id: 1 } })
  const sent = JSON.parse(String(calls[0]!.init?.body)) as Record<string, unknown>
  expect(sent).toMatchObject({
    type: 'client-request',
    method: 'manage/act',
    payload: { args: { doc: { action: 'provision_model', model: 'krea-2' } } },
  })
  expect(typeof sent['rpcId']).toBe('string')
  expect((sent['rpcId'] as string).length).toBeGreaterThan(0)
})

test('postManageAction: a bare ok rides detail-less (never an invented detail)', async () => {
  useFake({ '/api/manage/act': () => json({ result: { ok: true, value: {} } }) })
  expect(await postManageAction('a', {})).toEqual({ ok: true, detail: undefined, data: undefined })
})

test('postManageAction: an HTTP refusal is a DOMAIN outcome (ok:false + the door text)', async () => {
  useFake({ '/api/manage/act': () => json({ result: { message: 'engine is down' } }, 500) })
  expect(await postManageAction('provision_model', {})).toEqual({ ok: false, detail: 'engine is down' })
})

test('postManageAction: a textless HTTP refusal names the action + status', async () => {
  useFake({ '/api/manage/act': () => json({ result: {} }, 500) })
  expect(await postManageAction('provision_model', {})).toEqual({
    ok: false, detail: 'manage/provision_model: HTTP 500',
  })
})

test('postManageAction: a typert refusal rides its message; a messageless one names the action', async () => {
  useFake({ '/api/manage/act': () => json({ result: { ok: false, error: { message: 'pack refused' } } }) })
  expect(await postManageAction('install_pack', {})).toEqual({ ok: false, detail: 'pack refused' })
  resetFake()
  useFake({ '/api/manage/act': () => json({ result: { ok: false, error: {} } }) })
  expect(await postManageAction('install_pack', {})).toEqual({ ok: false, detail: 'manage/install_pack refused' })
})

test('postManageAction: a bodyless ok still resolves ok (never a throw on an empty door)', async () => {
  useFake({ '/api/manage/act': () => new Response('not json', { status: 200 }) })
  expect(await postManageAction('a', {})).toEqual({ ok: true, detail: undefined, data: undefined })
})
test('postManageAction: the signal forwards past the surface', async () => {
  const calls = useFake({ '/api/manage/act': () => json({ result: { ok: true } }) })
  const ctl = new AbortController()
  await postManageAction('a', {}, ctl.signal)
  expect((calls[0]!.init as RequestInit).signal).toBe(ctl.signal)
})

test('THE RPC ID: without randomUUID the frame still correlates (the rpc- backstop)', async () => {
  const calls = useFake({ '/api/manage/act': () => json({ result: { ok: true } }) })
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true })
  try {
    await postManageAction('a', {})
  } finally {
    if (descriptor !== undefined) Object.defineProperty(globalThis, 'crypto', descriptor)
  }
  const sent = JSON.parse(String(calls[0]!.init?.body)) as Record<string, unknown>
  expect(String(sent['rpcId']).startsWith('rpc-')).toBe(true)
})

test('uploadInputFile: the estate path rides the param (never the bare name)', async () => {
  const calls = useFake({ '/v1/uploads': () => json({ path: 'data/input/x.png' }) })
  const file = new File(['bytes'], 'my photo(1).png', { type: 'image/png' })
  expect(await uploadInputFile(file)).toEqual({ name: 'data/input/x.png', file: 'x.png' })
  const sent = JSON.parse(String(calls[0]!.init?.body)) as Record<string, unknown>
  expect(sent['filename']).toBe('my_photo_1_.png')
  expect(String(sent['data']).startsWith('data:')).toBe(true)
})

test('uploadInputFile: foreign types REFUSE naming themselves (empty type = that file)', async () => {
  useFake({})
  await expect(uploadInputFile(new File(['x'], 'a.pdf', { type: 'application/pdf' })))
    .rejects.toThrow(/Input cards don’t accept application\/pdf — drop an image, audio, or \.glb\/\.gltf file/)
  await expect(uploadInputFile(new File(['x'], 'a.bin', { type: '' })))
    .rejects.toThrow(/Input cards don’t accept that file — drop an image, audio, or \.glb\/\.gltf file/)
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

test('uploadInputFile: audio names its missing door (never a silent image-path lie)', async () => {
  useFake({})
  await expect(uploadInputFile(new File(['x'], 'a.mp3', { type: 'audio/mpeg' })))
    .rejects.toThrow(/audio uploads have no door yet/)
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
      .rejects.toThrow(/could not read the dropped file/)
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('uploadInputFile: a refusing door + a pathless answer both REFUSE loud', async () => {
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
