import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** THE MEDIA SIDEBAR WALL (the full port, 2026-09-11): the deleted
 *  @infer-media/dsh-media package's feature set lives again in
 *  @infer-media/dsh-gallery — this wall pins the port's structural
 *  laws so the migrations cannot silently take it back:
 *
 *  1. MEDIA VOCABULARY PARITY — the gallery client's typed
 *     media-kinds.ts and the estate's mediaVocab() SSOT stay equal
 *     (kinds, labels, extensions, gallery flags, classifier key
 *     order) — one vocabulary, two typed copies, zero drift.
 *  2. RUNS-WINDOW LAW — the host pulls the door's hard max (500),
 *     never a smaller window that lets sidecar floods push artifact
 *     rows out of the listing.
 *  3. SERVED-LIB BYTE PROOFS — the built client bundle carries the
 *     ported machinery (the single Media tab id/kind/order, both host
 *     feeds, the bench CAS choreography, the estate-artifact +
 *     cards-run addresses, the modal + wand classes) AND carries no
 *     trace of the deleted package's standalone Flows tab (the
 *     single-tab law: drafts live only behind the Media panel's
 *     segmented toggle) — the BUILT-LIB LAW: src edits reach the host
 *     only after a package build, so the bytes are what ships.
 *  4. FILENAME CONTRACTS SINGLE DEFINITION — the poster/window-film
 *     regex laws live in exactly one file on the client plane (the
 *     Sep-6 audit's F5: restated magic stems drift silently).
 *  5. TOKEN SINGLE-SITE — the DSW token spellings live in one
 *     module; no component restates a raw token literal. */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..', '..')
const GALLERY = join(ROOT, 'packages', 'web', 'infer-gallery')

/* 1. MEDIA VOCABULARY PARITY — the client's typed copy against the
 * estate's SSOT (packages/harness/estate-queue/src/mediaKinds.ts — a
 * FLAT record: per-kind exts, gallery<Kind> listing subsets,
 * maxListedImages). The client bundle cannot import the estate's TS
 * source, so the two copies are pinned equal by assertion — the same
 * law the old media-plugin's media-kinds.json parity wall carried. */
interface EstateVocab {
  image: readonly string[]
  audio: readonly string[]
  video: readonly string[]
  model: readonly string[]
  galleryImage: readonly string[]
  galleryAudio: readonly string[]
  galleryVideo: readonly string[]
  galleryModel: readonly string[]
  maxListedImages: number
}

async function loadEstateVocab(): Promise<EstateVocab> {
  const mod = await import(join('..', '..', '..', '..', 'packages', 'harness', 'estate-queue', 'src', 'mediaKinds.ts'))
  const fn = (mod as unknown as { mediaVocab: () => EstateVocab }).mediaVocab
  return fn()
}

interface ClientKindDef { label: string, exts: readonly string[], gallery: readonly string[] }
interface ClientVocab { kinds: Record<string, ClientKindDef>, policy: { maxListedImages: number } }

async function loadClientKinds(): Promise<ClientVocab> {
  const mod = await import(join('..', '..', '..', '..', 'packages', 'web', 'infer-gallery', 'src', 'client', 'media-kinds.ts'))
  return (mod as unknown as { MEDIA_KINDS: ClientVocab }).MEDIA_KINDS
}

test('media vocabulary parity: the gallery client and the estate carry ONE vocab', async () => {
  const estate = await loadEstateVocab()
  const client = await loadClientKinds()
  const estateShape: Record<string, { exts: readonly string[], gallery: readonly string[] }> = {
    video: { exts: estate.video, gallery: estate.galleryVideo },
    image: { exts: estate.image, gallery: estate.galleryImage },
    audio: { exts: estate.audio, gallery: estate.galleryAudio },
    model: { exts: estate.model, gallery: estate.galleryModel },
  }
  // the four kinds, same set on both planes
  assert.deepEqual(new Set(Object.keys(client.kinds)), new Set(Object.keys(estateShape)),
    'the four media kinds must match the estate SSOT')
  for (const kind of Object.keys(estateShape)) {
    assert.deepEqual(client.kinds[kind]?.exts, estateShape[kind].exts, `${kind} exts (the classifier vocabulary)`)
    assert.deepEqual(client.kinds[kind]?.gallery, estateShape[kind].gallery, `${kind} gallery subset (what lists in the sidebar)`)
  }
  assert.equal(client.policy.maxListedImages, estate.maxListedImages, 'maxListedImages policy')
  // classifier precedence is a CLIENT-side law (key order): video
  // first, so a contradictory row can never list as its image poster.
  assert.equal(Object.keys(client.kinds)[0], 'video', 'classifier precedence: video must classify first')
})

test('the runs-window law: the host pulls the door hard max (500)', async () => {
  const host = readFileSync(join(GALLERY, 'src', 'index.ts'), 'utf8')
  const m = host.match(/const RUNS_LIMIT = '(\d+)'/)
  assert.ok(m !== null, 'RUNS_LIMIT spelling moved — update this wall')
  assert.equal(m[1], '500', 'a smaller window lets sidecar floods push artifact rows out of the listing')
})

test('served-lib byte proofs: the built client carries the ported machinery', () => {
  const bundle = readFileSync(join(GALLERY, 'lib', 'client.js'), 'utf8')
  // THE BUILT-LIB LAW: these bytes are what the DSH loader serves.
  const probes: Array<[string, string]> = [
    ['media tab id', 'infer-media:media'],
    ['media tab kind', 'kind: "media"'],
    ['media guide order', 'order: 51'],
    ['runs feed (own route)', '/infer-gallery/runs'],
    ['drafts feed (own route)', '/infer-gallery/drafts'],
    ['wand sidecar leg (draft resolve)', '/infer-gallery/flow'],
    ['bench draft read', '/v1/flows/drafts/'],
    ['bench CAS read', '/v1/bench/'],
    ['bench CAS write', '/v1/bench/ensure'],
    ['expect_rev rides (the CAS law)', 'expect_rev'],
    ['cards bench address', 'dsh-resource://cards/bench'],
    ['cards run address', 'dsh-resource://cards/run/'],
    ['estate-artifact address prefix', 'dsh-resource://estate-artifact/'],
    ['the modal class rides (lightbox)', 'lightbox'],
    ['the wand class rides', 'wand'],
    ['3D badge', '3D'],
    ['honest 3D absence copy', '3D view unavailable'],
    ['honest media-flow absence copy', 'Media Flow view unavailable'],
  ]
  for (const [name, needle] of probes) {
    assert.ok(bundle.includes(needle), `built lib/client.js lost: ${name} (${needle}) — did the build run after the edit?`)
  }
  // THE SINGLE-TAB LAW: the deleted package's standalone Flows
  // registration must not ship — drafts are reachable only through the
  // Media panel's segmented toggle (the flows face keeps its own feed
  // string above; these spellings belong to the dead tab type alone).
  const absent: Array<[string, string]> = [
    ['dead flows tab id', 'infer-media:flows'],
    ['dead flows tab kind', 'kind: "flows"'],
    ['dead flows guide order', 'order: 52'],
    // THE TAG DEATH (operator order, 2026-09-20: "get rid of the
    // [REDACTED 2026-11-05] FINAL FILM tag"): a tile's preview is its currency —
    // the status ribbon never ships again.
    ['dead FINAL FILM tag', 'FINAL FILM'],
  ]
  for (const [name, needle] of absent) {
    assert.ok(!bundle.includes(needle), `built lib/client.js still ships the standalone Flows tab: ${name} (${needle})`)
  }
})

test('filename contracts live in exactly one client file (poster + window-film + frame-dump)', () => {
  const contracts: RegExp[] = [
    /_last_frame\\\.png/,       // poster sibling stem (escaped in source)
    /_w\\d\+_/,                 // window film suffix
    /FRAME_DUMP/,               // numbered frame dump guard
  ]
  for (const re of contracts) {
    const carriers: string[] = []
    for (const f of ['MediaPanel.tsx']) {
      const src = readFileSync(join(GALLERY, 'src', 'client', f), 'utf8')
      if (re.test(src)) carriers.push(f)
    }
    assert.deepEqual(carriers, ['MediaPanel.tsx'], `contract ${String(re)} must live in exactly MediaPanel.tsx`)
    // and nowhere else on the client plane
    const ui = readFileSync(join(GALLERY, 'src', 'client', 'ui.tsx'), 'utf8')
    const decode = readFileSync(join(GALLERY, 'src', 'client', 'decode.ts'), 'utf8')
    assert.ok(!re.test(ui) && !re.test(decode), 'filename contracts must not leak into shared modules')
  }
})

test('token single-site: DSW token spellings live only in ui.tokens.ts', () => {
  const tokens = readFileSync(join(GALLERY, 'src', 'client', 'ui.tokens.ts'), 'utf8')
  assert.ok(/--dsw-alias/.test(tokens), 'ui.tokens.ts is the token site')
  for (const f of ['MediaPanel.tsx', 'ui.tsx', 'useFeed.ts', 'decode.ts', 'bench-load.ts', 'index.ts']) {
    const src = readFileSync(join(GALLERY, 'src', 'client', f), 'utf8')
    assert.ok(!/--dsw-alias|--dsw-ref/.test(src), `${f} restates raw DSW tokens — import from ui.tokens.ts instead`)
  }
})
