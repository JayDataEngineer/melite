// melite_view's DELEGATED EYE (vitest, keyless — the charter's
// vision-capable route for the maker lane, dev_docs/ROADMAP.md):
// vision-route.ts units (preference parsing, named-vs-enumerated
// resolution, the one streaming verification call) plus the three
// arms' tool-level behavior through the exported arms (still, film, mesh
// poster) on a blind chat route. The runs tree is REAL in a tmp dir;
// the llm seat, the attachment store, and the sheet render are
// structural fakes. Env MELITE_VIEW_ROUTE is set per test and always
// restored (no lane may inherit another test's eye).
//
// THE CONTRACT: a blind chat route with a seeing route on the lane
// gets a VISUAL VERIFICATION observation naming its via; with no eye
// it gets the byte-identical TEXT-ONLY measurements (the old walls
// never grew an enumeration seam); a named-but-blind route refuses
// LOUD (explicit means explicit); a capable chat route never spends
// a vision call.

import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import {
  VIEW_ROUTE_ENV,
  VISION_QUESTIONS,
  resolveVisionRoute,
  verifyVisual,
  viewRoutePreference,
} from '../src/tools/vision-route.ts'
import type { VisionLlmSeam, VisionStreamChunk } from '../src/tools/vision-route.ts'
import { delegatedVisual, viewFilmArtifact, viewModelArtifact, viewStillArtifact } from '../src/tools/melite-view.ts'
import type { MediaSheetRender } from '../src/tools/melite-view.ts'
import type { MediaListRow } from '@melite/estate-media'

// ── the fake eye ───────────────────────────────────────────────────

const VERDICT = 'a red cube on a table, nothing else in frame'

interface FakeEyeOpts {
  /** models that see, as "provider/model" strings */
  sees?: string[]
  /** providers with their models in list order */
  providers?: Array<{ id: string, models: string[] }>
  chunks?: VisionStreamChunk[]
  explodes?: boolean
  /** resolveModelInfo throws a non-Error (a seat that fails unstructured) */
  throwNonError?: boolean
  /** routes resolving with NO inputModalities key (unknown capability refuses) */
  muteModalities?: string[]
}

interface FakeEye extends VisionLlmSeam {
  calls: { listModels: number, stream: number }
  sent: GenerateOptions[]
}

function fakeEye(opts: FakeEyeOpts = {}): FakeEye {
  const providers = opts.providers ?? [
    { id: 'chat', models: ['noggin'] },
    { id: 'vp', models: ['sees'] },
  ]
  const sees = new Set(opts.sees ?? ['vp/sees'])
  const chunks: VisionStreamChunk[] = opts.chunks ?? [
    { type: 'text-delta', text: VERDICT },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
  const eye = {
    calls: { listModels: 0, stream: 0 },
    sent: [] as GenerateOptions[],
    listProviders: () => providers.map((p) => ({ id: p.id })),
    listModels: async (provider: string) => {
      eye.calls.listModels++
      if (opts.explodes === true) throw new Error('enumerate blew up')
      return (providers.find((p) => p.id === provider)?.models ?? []).map((id) => ({ id }))
    },
    resolveModelInfo: async (provider: string, model: string) => {
      if (opts.throwNonError === true) throw 'lane is down'
      if (providers.every((p) => p.id !== provider)) {
        throw new Error('unknown provider route "' + provider + '" (this lane resolves no such provider)')
      }
      const muted = opts.muteModalities ?? []
      if (muted.includes(provider + '/' + model)) return {}
      return { inputModalities: sees.has(provider + '/' + model) ? ['text', 'image'] : ['text'] }
    },
    stream: (o: GenerateOptions) => {
      eye.calls.stream++
      eye.sent.push(o)
      async function* gen(): AsyncGenerator<VisionStreamChunk> {
        for (const c of chunks) yield c
      }
      return gen()
    },
  }
  return eye
}

/** The narrow seat the old walls fake (resolveModelInfo only — the
 *  pre-eye shape every existing melite-view wall still uses). */
function narrowSeat(blind: boolean): { get(name: string): unknown } {
  return {
    get: (name: string): unknown => {
      if (name === 'llm') {
        return { resolveModelInfo: async () => ({ inputModalities: blind ? ['text'] : ['text', 'image'] }) }
      }
      return undefined
    },
  }
}

function fakeStore(): { saved: Array<{ mediaType: string }>, attachments: {
  saveImage: (input: { data: Uint8Array, mediaType: ImageMediaType, name?: string }) => Promise<ImageAttachmentRef>,
  imageLimits: { maxImageBytes: number, maxMessageImageBytes: number, maxImageDimension: number, maxImagePixels: number, mediaTypes: ImageMediaType[] },
} } {
  const saved: Array<{ mediaType: string }> = []
  return {
    saved,
    attachments: {
      saveImage: async (input: { data: Uint8Array, mediaType: ImageMediaType, name?: string }): Promise<ImageAttachmentRef> => {
        saved.push({ mediaType: input.mediaType })
        return {
          attachmentId: 'att_1',
          mediaType: input.mediaType,
          bytes: input.data.byteLength,
          width: 8,
          height: 8,
        } as ImageAttachmentRef
      },
      imageLimits: {
        maxImageBytes: 10_000_000,
        maxMessageImageBytes: 10_000_000,
        maxImageDimension: 8000,
        maxImagePixels: 30_000_000,
        mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as ImageMediaType[],
      },
    },
  }
}

// ── vision-route.ts units ──────────────────────────────────────────

describe('the lane eye — preference parsing (pure, pinnable)', () => {
  test('unset parses to enumerate (the zero-config craft law)', () => {
    assert.deepEqual(viewRoutePreference({}), { kind: 'enumerate' })
  })
  test('off and none parse to explicit text-only', () => {
    assert.deepEqual(viewRoutePreference({ [VIEW_ROUTE_ENV]: 'off' }), { kind: 'off' })
    assert.deepEqual(viewRoutePreference({ [VIEW_ROUTE_ENV]: 'NONE' }), { kind: 'off' })
  })
  test('provider/model parses to the named route', () => {
    assert.deepEqual(
      viewRoutePreference({ [VIEW_ROUTE_ENV]: 'vp/sees' }),
      { kind: 'named', route: { provider: 'vp', model: 'sees' } },
    )
  })
  test('a value with no slash is not a route — enumerate, never throw', () => {
    assert.deepEqual(viewRoutePreference({ [VIEW_ROUTE_ENV]: 'justamodel' }), { kind: 'enumerate' })
  })
  test('the verification protocol is fixed: one question per arm', () => {
    assert.deepEqual(Object.keys(VISION_QUESTIONS).sort(), ['film', 'poster', 'still'])
    for (const q of Object.values(VISION_QUESTIONS)) {
      assert.match(q, /Do not infer beyond the pixels/)
    }
  })
})

describe('the lane eye — route resolution', () => {
  test('a named seeing route resolves WITHOUT enumeration', async () => {
    const eye = fakeEye()
    const route = await resolveVisionRoute(eye, { kind: 'named', route: { provider: 'vp', model: 'sees' } })
    assert.deepEqual(route, { provider: 'vp', model: 'sees' })
    assert.equal(eye.calls.listModels, 0)
  })
  test('a named-but-blind route throws LOUD naming the route and the one-line fix (explicit means explicit)', async () => {
    const eye = fakeEye()
    await assert.rejects(
      resolveVisionRoute(eye, { kind: 'named', route: { provider: 'chat', model: 'noggin' } }),
      (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        return /MELITE_VIEW_ROUTE="chat\/noggin"/.test(msg)
          && /no silent substitution/.test(msg)
          && /input: \[text, image\]/.test(msg)
      },
    )
  })
  test('a named-but-unresolvable route throws LOUD (never a silent substitution)', async () => {
    const eye = fakeEye()
    await assert.rejects(
      resolveVisionRoute(eye, { kind: 'named', route: { provider: 'zz', model: 'nope' } }),
      (e: unknown) => /does not resolve/.test(e instanceof Error ? e.message : '') && /zz\/nope/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('enumerate takes the first image-capable route across providers', async () => {
    const eye = fakeEye({
      providers: [
        { id: 'empty', models: [] },
        { id: 'chat', models: ['noggin'] },
        { id: 'vp', models: ['blind-first', 'sees'] },
      ],
      sees: ['vp/sees'],
    })
    assert.deepEqual(await resolveVisionRoute(eye, { kind: 'enumerate' }), { provider: 'vp', model: 'sees' })
  })
  test('enumerate steps past a route with unknown capability (no modalities key is not a yes)', async () => {
    const eye = fakeEye({ muteModalities: ['chat/noggin'] })
    assert.deepEqual(await resolveVisionRoute(eye, { kind: 'enumerate' }), { provider: 'vp', model: 'sees' })
  })
  test('a named route with unknown capability refuses LOUD (unknown refuses, never an adapter failure later)', async () => {
    const eye = fakeEye({ muteModalities: ['chat/noggin'] })
    await assert.rejects(
      resolveVisionRoute(eye, { kind: 'named', route: { provider: 'chat', model: 'noggin' } }),
      (e: unknown) => /resolves with modalities \[\]/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('a named route that fails unstructured still refuses LOUD (String(error) carries the seat failure)', async () => {
    const eye = fakeEye({ throwNonError: true })
    await assert.rejects(
      resolveVisionRoute(eye, { kind: 'named', route: { provider: 'vp', model: 'sees' } }),
      (e: unknown) => /lane is down/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('enumerate with no eye anywhere resolves null (the lane serves measurements)', async () => {
    const eye = fakeEye({ sees: [] })
    assert.equal(await resolveVisionRoute(eye, { kind: 'enumerate' }), null)
  })
  test('enumerate with zero providers resolves null (never throws on an empty seat)', async () => {
    const eye = fakeEye({ providers: [] })
    assert.equal(await resolveVisionRoute(eye, { kind: 'enumerate' }), null)
  })
  test('off resolves null WITHOUT touching the seat', async () => {
    const eye = fakeEye()
    assert.equal(await resolveVisionRoute(eye, { kind: 'off' }), null)
    assert.equal(eye.calls.listModels, 0)
    assert.equal(eye.calls.stream, 0)
  })
})

describe('the lane eye — the one verification call', () => {
  test('text deltas join to the verdict and the serving route echoes as via', async () => {
    const eye = fakeEye()
    const ref = { attachmentId: 'att_1' } as ImageAttachmentRef
    const out = await verifyVisual(eye, { provider: 'vp', model: 'sees' }, ref, 'still')
    assert.deepEqual(out, { verdict: VERDICT, via: 'vp/sees' })
  })
  test('the call carries the fixed question AND the image block (the eye sees the pixels)', async () => {
    const eye = fakeEye()
    const ref = { attachmentId: 'att_9' } as ImageAttachmentRef
    await verifyVisual(eye, { provider: 'vp', model: 'sees' }, ref, 'film')
    assert.equal(eye.sent.length, 1)
    const first = eye.sent[0]!.messages[0]
    assert.ok(first !== undefined && 'content' in first && Array.isArray(first.content))
    const kinds = first.content.map((b) => b.type)
    assert.ok(kinds.includes('text'))
    assert.ok(kinds.includes('image'))
    const image = first.content.find((b) => b.type === 'image')
    // the message factory detaches (structuredClone) — identity does
    // not survive, the attachment id does
    assert.ok(image !== undefined && 'attachment' in image && image.attachment.attachmentId === 'att_9')
    const text = first.content.find((b) => b.type === 'text')
    assert.ok(text !== undefined && 'text' in text && text.text === VISION_QUESTIONS.film)
  })
  test('malformed deltas are ignored (the enhance door teeth)', async () => {
    const eye = fakeEye({
      chunks: [
        { type: 'text-delta' },
        { type: 'text-delta', text: 42 },
        { type: 'text-delta', text: 'hi' },
        { type: 'usage' },
        { type: 'finish', reason: { kind: 'stop' } },
      ],
    })
    const out = await verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'poster')
    assert.equal(out.verdict, 'hi')
  })
  test('a finish-less stream throws (never an empty verdict)', async () => {
    const eye = fakeEye({ chunks: [{ type: 'text-delta', text: 'hi' }] })
    await assert.rejects(
      verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'still'),
      /ended without a terminal finish/,
    )
  })
  test('a non-stop finish names the route and the cause', async () => {
    const eye = fakeEye({
      chunks: [{ type: 'finish', reason: { kind: 'error', failure: { message: 'quota dead', code: 'AUTH' } } }],
    })
    await assert.rejects(
      verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'still'),
      (e: unknown) => /vp\/sees/.test(e instanceof Error ? e.message : '') && /quota dead/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('a codeless failure still names the route (the code falls back to ?)', async () => {
    const eye = fakeEye({
      chunks: [{ type: 'finish', reason: { kind: 'error', failure: { message: 'boom' } } }],
    })
    await assert.rejects(
      verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'still'),
      (e: unknown) => /vp\/sees.*boom.*\[\?\]/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('an unstructured finish kind is stringified, never trusted (merge-extensible taxonomy)', async () => {
    const eye = fakeEye({
      chunks: [{ type: 'finish', reason: { kind: 42 } }],
    })
    await assert.rejects(
      verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'still'),
      (e: unknown) => /vp\/sees.*42/.test(e instanceof Error ? e.message : ''),
    )
  })
  test('a finish with no reason fails naming the route (null is not a stop)', async () => {
    const eye = fakeEye({
      chunks: [{ type: 'finish', reason: undefined }],
    })
    await assert.rejects(
      verifyVisual(eye, { provider: 'vp', model: 'sees' }, { attachmentId: 'a' } as ImageAttachmentRef, 'still'),
      (e: unknown) => /vp\/sees.*failed — null/.test(e instanceof Error ? e.message : ''),
    )
  })
})

// ── the arms (exported, structural ctx — zero casts) ───────────────────

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

/** A GLB with the summarizeMesh-readable shape (one mesh, bounds). */
function glbBytes(): Uint8Array {
  const gltf = {
    asset: { generator: 'vision-wall', version: '2.0' },
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [{ count: 100, min: [-1, 0, -1], max: [1, 2, 1] }, { count: 300 }],
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonPad = (4 - (json.length % 4)) % 4
  const total = 12 + 8 + json.length + jsonPad + 8 + 4
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.set(json, 20)
  const bin = 20 + json.length + jsonPad
  view.setUint32(bin, 4, true)
  view.setUint32(bin + 4, 0x004e4942, true)
  return out
}

let root = ''

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'melite-view-vision-'))
  const still = join(root, 'output', 'run-abc123-still')
  mkdirSync(still, { recursive: true })
  writeFileSync(join(still, 'gen_00001_.png'), PNG_BYTES)
  utimesSync(join(still, 'gen_00001_.png'), new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))
  const film = join(root, 'output', 'run-face001-film')
  mkdirSync(film, { recursive: true })
  copyFileSync(new URL('./fixtures/film-2s.mp4', import.meta.url), join(film, 'film.mp4'))
  const mesh = join(root, 'output', 'run-44c30351b94e-eye')
  mkdirSync(join(mesh, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(mesh, 'img-to-mesh', 'eye_00001.glb'), glbBytes())
  writeFileSync(join(mesh, 'img-to-mesh', 'eye_00001_poster.png'), PNG_BYTES)
  const bad = join(root, 'output', 'run-44c30351b94e-bad')
  mkdirSync(join(bad, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(bad, 'img-to-mesh', 'bad_00001.glb'), glbBytes())
  writeFileSync(join(bad, 'img-to-mesh', 'bad_00001_poster.png'), new TextEncoder().encode('not an image at all'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

let savedEnv: string | undefined

beforeEach(() => {
  savedEnv = process.env[VIEW_ROUTE_ENV]
})

afterEach(() => {
  if (savedEnv === undefined) delete process.env[VIEW_ROUTE_ENV]
  else process.env[VIEW_ROUTE_ENV] = savedEnv
})

/** A tool-level ctx: the tmp runs tree, a store fake, and the FULL
 *  eye seat (the chat route blind, the vp route seeing). Structural
 *  throughout — the arms take `{ get }`, never the cordis Context. */
function eyeCtx(eye: FakeEye): { ctx: { get(name: string): unknown }, store: ReturnType<typeof fakeStore> } {
  const store = fakeStore()
  const ctx = {
    get: (name: string): unknown => {
      if (name === 'attachments') return store.attachments
      if (name === 'queue') return { stateRoot: root }
      if (name === 'llm') return eye
      return undefined
    },
  }
  return { ctx, store }
}

function stillRow(): MediaListRow {
  return { url: 'u', name: 'gen_00001_.png', kind: 'image', runId: 'run-abc123-still', served_from: root }
}

const blindExec = {
  signal: AbortSignal.timeout(15_000),
  agent: {
    session: { requestHeader: () => ({ config: { provider: 'chat', model: 'noggin' } }) },
    options: {},
  },
}

const seeingExec = {
  signal: AbortSignal.timeout(15_000),
  agent: {
    session: { requestHeader: () => ({ config: { provider: 'vp', model: 'sees' } }) },
    options: {},
  },
}

describe('the delegated eye — the still arm', () => {
  test('a blind route with an enumerated eye gets a VISUAL VERIFICATION naming its via', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    const value = await viewStillArtifact(root, stillRow(), 'run-abc123-still', blindExec, ctx, store.attachments)
    const text = String(value.textObservation)
    assert.match(text, /VISUAL VERIFICATION via vp\/sees/)
    assert.match(text, new RegExp(VERDICT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.doesNotMatch(text, /TEXT-ONLY/)
    assert.equal(value.image, undefined)
    assert.equal(store.saved.length, 1)
    assert.equal(eye.calls.stream, 1)
  })
  test('a named eye wins over enumeration (explicit > implicit)', async () => {
    process.env[VIEW_ROUTE_ENV] = 'chat/noggin-plus'
    const eye = fakeEye({ providers: [{ id: 'chat', models: ['noggin-plus'] }], sees: ['chat/noggin-plus'] })
    const { ctx, store } = eyeCtx(eye)
    const value = await viewStillArtifact(root, stillRow(), 'run-abc123-still', blindExec, ctx, store.attachments)
    assert.match(String(value.textObservation), /VISUAL VERIFICATION via chat\/noggin-plus/)
    assert.equal(eye.calls.listModels, 0)
  })
  test('off means TEXT-ONLY and the store is never touched (the old economy)', async () => {
    process.env[VIEW_ROUTE_ENV] = 'off'
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    const value = await viewStillArtifact(root, stillRow(), 'run-abc123-still', blindExec, ctx, store.attachments)
    assert.match(String(value.textObservation), /TEXT-ONLY observation/)
    assert.equal(store.saved.length, 0)
    assert.equal(eye.calls.stream, 0)
  })
  test('a named-but-blind eye refuses LOUD (never a silent measurement pass)', async () => {
    process.env[VIEW_ROUTE_ENV] = 'chat/noggin'
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    await assert.rejects(
      viewStillArtifact(root, stillRow(), 'run-abc123-still', blindExec, ctx, store.attachments),
      /MELITE_VIEW_ROUTE="chat\/noggin"/,
    )
  })
  test('a capable chat route serves the image and never spends a vision call', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    const value = await viewStillArtifact(root, stillRow(), 'run-abc123-still', seeingExec, ctx, store.attachments)
    assert.ok(value.image !== undefined)
    assert.equal(value.textObservation, undefined)
    assert.equal(eye.calls.stream, 0)
    assert.equal(store.saved.length, 1)
  })
  test('a narrow seat (resolveModelInfo only) still serves TEXT-ONLY — the old walls never grew a seam', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const store = fakeStore()
    const ctx = {
      get: (name: string): unknown => {
        if (name === 'attachments') return store.attachments
        if (name === 'queue') return { stateRoot: root }
        if (name === 'llm') return narrowSeat(true).get('llm')
        return undefined
      },
    }
    const value = await viewStillArtifact(root, stillRow(), 'run-abc123-still', blindExec, ctx, store.attachments)
    assert.match(String(value.textObservation), /TEXT-ONLY observation/)
    assert.equal(store.saved.length, 0)
  })
})

describe('the delegated eye — the film arm (Commission 17)', () => {
  test('a blind route with an eye builds the sheet FOR the eye and verifies it', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    let rendered = 0
    const render: MediaSheetRender = async () => {
      rendered++
      return PNG_BYTES
    }
    const value = await viewFilmArtifact({ stateRoot: root }, 'run-face001-film', '', blindExec, ctx, store.attachments, render)
    assert.equal(rendered, 1)
    const text = String(value.textObservation)
    assert.match(text, /melite_view film: film\.mp4/)
    assert.match(text, /contact sheet of \d+/)
    assert.match(text, /VISUAL VERIFICATION via vp\/sees/)
    assert.match(text, new RegExp(VERDICT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  })
  test('a blind route with no eye never builds the sheet (the old economy, pinned)', async () => {
    process.env[VIEW_ROUTE_ENV] = 'off'
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    let rendered = 0
    const render: MediaSheetRender = async () => {
      rendered++
      return PNG_BYTES
    }
    const value = await viewFilmArtifact({ stateRoot: root }, 'run-face001-film', '', blindExec, ctx, store.attachments, render)
    assert.equal(rendered, 0)
    assert.match(String(value.textObservation), /TEXT-ONLY observation/)
    assert.match(String(value.textObservation), /contact sheet was neither built nor attached/)
  })
})

describe('the delegated eye — the mesh poster arm', () => {
  test('a blind route with an eye verifies the poster and keeps the mesh row', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    const value = await viewModelArtifact({ stateRoot: root }, 'run-44c30351b94e-eye', 'eye_00001.glb', blindExec, ctx, store.attachments)
    const text = String(value.textObservation)
    assert.match(text, /melite_view mesh:/)
    assert.match(text, /VISUAL VERIFICATION via vp\/sees/)
    assert.ok(value.mesh !== undefined)
    assert.equal(value.image, undefined)
  })
  test('a blind route with no eye keeps the strict refusal verbatim', async () => {
    process.env[VIEW_ROUTE_ENV] = 'off'
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    await assert.rejects(
      viewModelArtifact({ stateRoot: root }, 'run-44c30351b94e-eye', 'eye_00001.glb', blindExec, ctx, store.attachments),
      /does not declare image input; switch to an image-capable model to view artifacts/,
    )
  })
  test('an oversized poster throws before the eye is spent (the byte cap guards the store)', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx } = eyeCtx(eye)
    const tiny = fakeStore()
    tiny.attachments.imageLimits = { ...tiny.attachments.imageLimits, maxImageBytes: 10, maxMessageImageBytes: 10 }
    await assert.rejects(
      viewModelArtifact({ stateRoot: root }, 'run-44c30351b94e-eye', 'eye_00001.glb', blindExec, ctx, tiny.attachments),
      /exceeds the 10-byte image cap/,
    )
    assert.equal(eye.calls.stream, 0)
  })
  test('a poster that is not image bytes throws (the lane wrote non-image content under the poster name)', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const { ctx, store } = eyeCtx(eye)
    await assert.rejects(
      viewModelArtifact({ stateRoot: root }, 'run-44c30351b94e-bad', 'bad_00001.glb', blindExec, ctx, store.attachments),
      /the bytes are not an image/,
    )
  })
})

describe('the delegated eye — the file-bytes helper', () => {
  test('delegatedVisual resolves, commits, and verifies (null when the seat is narrow)', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const store = fakeStore()
    const ctx = { get: (name: string): unknown => (name === 'llm' ? eye : undefined) }
    const out = await delegatedVisual(
      ctx,
      blindExec,
      { data: PNG_BYTES, mediaType: 'image/png', name: 'gen.png' },
      'still',
      store.attachments,
    )
    assert.deepEqual(out, { verdict: VERDICT, via: 'vp/sees' })
    assert.equal(store.saved.length, 1)
    const nameless = await delegatedVisual(
      ctx,
      blindExec,
      { data: PNG_BYTES, mediaType: 'image/png' },
      'still',
      store.attachments,
    )
    assert.deepEqual(nameless, { verdict: VERDICT, via: 'vp/sees' })
    assert.equal(store.saved.length, 2)
    const narrow = await delegatedVisual(
      narrowSeat(true),
      blindExec,
      { data: PNG_BYTES, mediaType: 'image/png' },
      'still',
      store.attachments,
    )
    assert.equal(narrow, null)
  })
  test('a seat with a stream but no enumeration is no eye (the old walls never grew the seam)', async () => {
    delete process.env[VIEW_ROUTE_ENV]
    const eye = fakeEye()
    const store = fakeStore()
    const partial = { get: (name: string): unknown => (name === 'llm' ? { stream: eye.stream } : undefined) }
    const out = await delegatedVisual(
      partial,
      blindExec,
      { data: PNG_BYTES, mediaType: 'image/png' },
      'still',
      store.attachments,
    )
    assert.equal(out, null)
    assert.equal(eye.calls.stream, 0)
    assert.equal(store.saved.length, 0)
  })
})
