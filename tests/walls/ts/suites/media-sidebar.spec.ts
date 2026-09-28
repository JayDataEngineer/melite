import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
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

test('the runs-window law: the host pulls the door hard max (500), at its USE SITES', async () => {
  const host = readFileSync(join(GALLERY, 'src', 'index.ts'), 'utf8')
  // D-C4 (the wall audit, 2026-09-28): the arm pinned the SPELLING
  // and never the wiring — RUNS_LIMIT could sit unused beside a
  // hand-typed '500' in the fetch and the wall stayed green. The
  // constant's USES are pinned now: the route URL and the seat call
  // both interpolate the constant, and no bare '500' rides the
  // runs path.
  const m = host.match(/const RUNS_LIMIT = '(\d+)'/)
  assert.ok(m !== null, 'RUNS_LIMIT spelling moved — update this wall')
  assert.equal(m[1], '500', 'a smaller window lets sidecar floods push artifact rows out of the listing')
  const uses = host.match(/RUNS_LIMIT/g) ?? []
  assert.ok(uses.length >= 3,
    `RUNS_LIMIT must WIRE its uses (declaration + route + seat call), not just sit declared (saw ${uses.length})`)
  assert.ok(host.includes('limit=${RUNS_LIMIT}'), 'the runs route interpolates RUNS_LIMIT')
  assert.ok(/list\(RUNS_LIMIT/.test(host), 'the seat call passes RUNS_LIMIT')
})

test('served-lib byte proofs: the built client carries the ported machinery', () => {
  const bundle = readFileSync(join(GALLERY, 'lib', 'client.js'), 'utf8')
  // THE BUILT-LIB LAW: these bytes are what the DSH loader serves.
  // D-C1 (the wall audit): three probes were PROSE — '3D' matches
  // ~400 places in any bundle, 'wand'/'lightbox' match the css text
  // and comments — none could fail. The class probes are CODE
  // SHAPES now: the css-module symbol the build mints
  // (overlay_module_css_default) with its .lightbox/.wand USES, and
  // the badge rule's own literal with its quotes.
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
    ['the css-module symbol mints (lightbox class)', 'overlay_module_css_default'],
    ['the modal class USES the module (lightbox)', 'overlay_module_css_default.lightbox'],
    ['the wand class USES the module', 'overlay_module_css_default.wand'],
    ["3D badge (the badge rule's own literal)", 'text: "3D"'],
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
  // D-C2 (the wall audit, 2026-09-28): the arm scanned THREE files
  // of the client dir by hand ('MediaPanel', 'ui', 'decode') — a
  // contract leaking into any of the other ten walked past. The
  // client plane is WALKED now, and the carrier set must be exactly
  // MediaPanel.tsx. The regexes are the SOURCE'S OWN FULL
  // spellings (the old wall regexes were loose substrings of the
  // real WINDOW_FILM), and POSTER_STEMS — unnamed by the old wall —
  // rides its own arm.
  const clientFiles = readdirSync(join(GALLERY, 'src', 'client')).filter(
    (f) => /\.(tsx?|css)$/.test(f),
  ).sort();
  assert.ok(clientFiles.length >= 10, `census floor: the client plane is real (${clientFiles.length} files — the walk rotted?)`);
  const contracts: Array<[string, RegExp, string[]]> = [
    ['poster sibling stem (_last_frame.png)', /_last_frame\\\.png/, ['MediaPanel.tsx']],
    ['poster sibling stem (_poster.png)', /_poster\\\.png/, ['MediaPanel.tsx']],
    // the film suffix is a LEGITIMATE TWO-SITE mirror: MediaPanel's
    // listing filter and bench-load's hero pick BOTH spell
    // WINDOW_FILM — the wall pins the exact pair AND (below) that
    // the two spellings are character-identical (one spelling in
    // two files, never two spellings)
    ['window film suffix (full spelling)', /_w\\d\+_\\w\+_\?\\\.mp4\$/, ['MediaPanel.tsx', 'bench-load.ts']],
    ['numbered frame dump guard (FRAME_DUMP)', /FRAME_DUMP/, ['MediaPanel.tsx']],
  ]
  for (const [name, re, expectedCarriers] of contracts) {
    const carriers: string[] = []
    for (const f of clientFiles) {
      const src = readFileSync(join(GALLERY, 'src', 'client', f), 'utf8')
      if (re.test(src)) carriers.push(f)
    }
    assert.deepEqual(carriers, expectedCarriers, `contract ${name} must live in exactly ${JSON.stringify(expectedCarriers)} (found in ${JSON.stringify(carriers)})`)
  }
  // THE ONE-SPELLING LAW (the two-site mirror): both WINDOW_FILM
  // declarations are the SAME regex text — a drift between the two
  // is two laws, and the hero pick diverges from the listing.
  const filmSpellings = ['MediaPanel.tsx', 'bench-load.ts'].map((f) => {
    const src = readFileSync(join(GALLERY, 'src', 'client', f), 'utf8')
    return (src.match(/WINDOW_FILM = (\/.+\/[a-z]*)/) ?? [])[1];
  });
  assert.ok(filmSpellings.every((x) => x !== undefined), 'WINDOW_FILM declarations found in both mirrors');
  assert.equal(filmSpellings[0], filmSpellings[1],
    `the two WINDOW_FILM spellings drifted apart: ${filmSpellings[0]} vs ${filmSpellings[1]}`);
})

test('token single-site: DSW token spellings live only in ui.tokens.ts', () => {
  // D-C3 (the wall audit, 2026-09-28): the allow-list named SIX
  // files while the dir holds thirteen — and overlay.module.css
  // carries `--dsw-alias-*` fallbacks TODAY, unchecked. The whole
  // client plane is walked now. The css module is the ONE named
  // exception (its var() fallbacks ARE the token site's mirror for
  // non-token contexts, spelled in the audit fix as the explicit
  // carve); every other file restating a raw token fails.
  const clientFiles = readdirSync(join(GALLERY, 'src', 'client')).filter(
    (f) => /\.(tsx?|css)$/.test(f),
  ).sort();
  assert.ok(clientFiles.length >= 10, `census floor: the client plane is real (${clientFiles.length} files — the walk rotted?)`);
  const tokens = readFileSync(join(GALLERY, 'src', 'client', 'ui.tokens.ts'), 'utf8')
  assert.ok(/--dsw-alias/.test(tokens), 'ui.tokens.ts is the token site')
  const EXPLICIT_CSS_EXCEPTION = 'overlay.module.css' // var() fallbacks only — the declared carve
  for (const f of clientFiles) {
    if (f === 'ui.tokens.ts' || f === EXPLICIT_CSS_EXCEPTION || f === 'css-modules.d.ts') continue
    const src = readFileSync(join(GALLERY, 'src', 'client', f), 'utf8')
    assert.ok(!/--dsw-alias|--dsw-ref/.test(src), `${f} restates raw DSW tokens — import from ui.tokens.ts instead`)
  }
  // and the exception is honest: the css carries var() FALLBACKS
  // (a --dsw- token with a literal default), never a bare token use
  const css = readFileSync(join(GALLERY, 'src', 'client', EXPLICIT_CSS_EXCEPTION), 'utf8')
  const bare = [...css.matchAll(/(^|[^(])--dsw-[a-z-]+/gm)].filter((m) => {
    const before = css.slice(Math.max(0, m.index! - 6), m.index!)
    return !before.includes('var(')
  });
  assert.deepEqual(bare.map(() => 'bare token'), [],
    `overlay.module.css carries --dsw- tokens OUTSIDE var() fallbacks (the carve is fallbacks only)`)
})
