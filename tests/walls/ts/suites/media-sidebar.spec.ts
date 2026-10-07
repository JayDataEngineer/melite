import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** THE MEDIA SIDEBAR WALL (the full port, 2026-09-11): the deleted
 *  @infer-media/dsh-media package's feature set lives again in
 *  @infer-media/dsh-gallery — this wall pins the port's structural
 *  laws so the migrations cannot silently take it back:
 *
 *  1. (RETIRED 2026-10-11, the li-ay stroke) MEDIA VOCABULARY PARITY
 *     died with the second copy: the client DERIVES from the
 *     contract's mediaVocab() now, and the law lives in
 *     media-vocabulary.spec.ts (derivation + no-literal ban +
 *     absolute pins). Two typed copies pinned equal was the old
 *     world's compromise; one producer made it decorative.
 *  2. RUNS-WINDOW LAW — the host pulls the door's hard max (500),
 *     never a smaller window that lets sidecar floods push artifact
 *     rows out of the listing.
 *  3. SERVED-LIB BYTE PROOFS — the built client bundle carries the
 *     ported machinery AND carries no trace of the deleted package's
 *     standalone Flows tab — with the FRESHNESS law (the li-ay
 *     round's F4): the bundle is judged on CODE bytes (comments
 *     stripped — a header comment quoting the copy never satisfies
 *     the arm), every hand probe must ALSO live in the current
 *     SOURCE (a stale lib that still carries a removed face reds),
 *     and every route/address literal the SOURCE declares must be in
 *     the BUNDLE (a src edit the build never ate reds) — the
 *     BUILT-LIB LAW: src edits reach the host only after a package
 *     build, so the bytes are what ships.
 *  4. FILENAME CONTRACTS SINGLE DEFINITION — the poster/window-film
 *     regex laws live in exactly one file on the client plane (the
 *     Sep-6 audit's F5: restated magic stems drift silently).
 *  5. TOKEN SINGLE-SITE — the DSW token spellings live in one
 *     module; no component restates a raw token literal. */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..', '..')
const GALLERY = join(ROOT, 'packages', 'web', 'infer-gallery')

/* 1. MEDIA VOCABULARY PARITY — RETIRED (2026-10-11, the li-ay
 * stroke): the client's hand copy is gone; media-kinds.ts DERIVES
 * from the contract's mediaVocab(), and the law — derivation, the
 * no-literal ban, the absolute pins — lives in
 * media-vocabulary.spec.ts. A parity arm over a derivation is a
 * tautology; decorative walls are deleted, not accumulated. */

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
  // the bundle is the client MODULE SET (the tsc flat-lib law emits a
  // graph, not a one-file bundle: src/client/** → lib/client/**/*.js,
  // the loader imports lib/client/index.js and the graph rides along).
  // The byte proof's subject is every shipped client module joined —
  // an edit without a build drops its needle from the whole set.
  const libDir = join(GALLERY, 'lib')
  const parts: string[] = []
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const full = join(d, e)
      if (statSync(full).isDirectory()) walk(full)
      else if (e.endsWith('.js')) parts.push(readFileSync(full, 'utf8'))
    }
  }
  walk(libDir)
  const bundle = parts.join('\n')
  // THE BUILT-LIB LAW: these bytes are what the DSH loader serves.
  // D-C1 (the wall audit): three probes were PROSE — '3D' matches
  // ~400 places in any bundle, 'wand'/'lightbox' match the css text
  // and comments — none could fail. The class probes are CODE
  // SHAPES now: the css-module symbol the build mints
  // (the mirrored ./overlay.module.css import) with its .lightbox/.wand USES, and
  // the badge rule's own literal with its quotes.
  //
  // THE FRESHNESS LAW (the li-ay round's F4, 2026-10-11): the old
  // arm judged the bundle ALONE — a needle could be satisfied by a
  // HEADER COMMENT the build preserves (the copy stays green while
  // the machinery dies), and a face REMOVED from src kept passing
  // until someone rebuilt (stale bytes are indistinguishable from
  // fresh). Three closures now:
  //   (a) CODE-BYTES judgement — comments are stripped from BOTH the
  //       bundle and the src census before any needle match;
  //   (b) SRC-PRESENCE — every hand probe must ALSO live in the
  //       CURRENT source (a stale lib that still carries a removed
  //       face reds; a needle surviving only in a src comment reds);
  //   (c) DERIVED ROUTE PROBES — every route/address literal the
  //       source declares must be in the bundle (a src edit the
  //       build never ate reds). The needle list can no longer rot
  //       behind a forgotten rebuild.
  const stripComments = (text: string): string => text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((l: string) => !l.trim().startsWith('//'))
    .join('\n')
  const codeBundle = stripComments(bundle)
  const srcCensus: string[] = []
  const walkSrc = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walkSrc(p)
      else if (/\.(tsx?|css)$/.test(e.name)) srcCensus.push(stripComments(readFileSync(p, 'utf8')))
    }
  }
  // the CLIENT bundle compiles the client plane only — the host
  // (src/index.ts, lib/index.js) is a different artifact with its
  // own routes; judging host literals against client bytes reds
  // forever, and judging nothing lets the client plane rot.
  walkSrc(join(GALLERY, 'src', 'client'))
  assert.ok(srcCensus.length >= 10, `census floor: the gallery src plane is real (${srcCensus.length} files — the walk rotted?)`)
  // the bundler re-quotes string literals ('media' → "media") and
  // keeps template backticks; the presence judgement is
  // QUOTE-AGNOSTIC so a needle proves the same code on both planes
  // regardless of the printer's quote style
  const normalize = (t: string): string => t.replace(/['`]/g, '"')
  const srcCode = normalize(srcCensus.join('\n'))

  // build-minted: the css-module sidecar exists only after the build
  // mirrors it into lib/ (tsc emits JS/DTS alone) — src-presence is
  // vacuous for it; everything else proves both sides. The module
  // graph imports it as './overlay.module.css' and USES css.lightbox /
  // css.wand — the tsdown bundler mints the sidecar as a VIRTUAL
  // module id 'overlay.module.css@<hash>' (2026-10-18, the client
  // consolidation), so the mint probe carries the bundler's spelling.
  const BUILD_MINTED = /overlay\.module\.css|^css\.|^overlay_module_css_default\./
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
    ['the css-module sidecar mints (mirrored by the build)', 'overlay.module.css@'],
    ['the modal class USES the module (lightbox)', 'overlay_module_css_default.lightbox'],
    ['the wand class USES the module', 'overlay_module_css_default.wand'],
    ["3D badge (the badge rule's own literal)", 'text: "3D"'],
    ['honest 3D absence copy', '3D view unavailable'],
    ['honest media-flow absence copy', 'Media Flow view unavailable'],
  ]
  for (const [name, needle] of probes) {
    assert.ok(normalize(codeBundle).includes(needle),
      `built lib/**/*.js lost (in CODE, not comments): ${name} (${needle}) — did the build run after the edit?`)
    if (!BUILD_MINTED.test(needle)) {
      assert.ok(srcCode.includes(needle),
        `probe ${name} (${needle}) is gone from CURRENT src but still rides the stale bundle — a face the source no longer ships`)
    }
  }
  // (c) THE DERIVED ROUTE PROBES: every route/address literal the
  // src declares must reach the bytes, judged by its FULL DELIMITED
  // SPELLING — a substring probe cannot see a rename (`…/flow2?…`
  // contains `…/flow`), so the quotes ride the match on both sides.
  // A new leg added to src without a rebuild ships dead code on the
  // host; a renamed leg ships the OLD route.
  const declared = new Set<string>()
  for (const literal of srcCode.match(/['"`](\/(?:infer-gallery|v1)\/[A-Za-z0-9_\-/.?=&${}]*)['"`]/g) ?? []) {
    declared.add(literal.slice(1, -1))
  }
  for (const literal of srcCode.match(/['"`]dsh-resource:\/\/[a-z-]+['"`]/g) ?? []) {
    declared.add(literal.slice(1, -1))
  }
  assert.ok(declared.size >= 6, `route census floor (${declared.size} literals — the extraction rotted?)`)
  const bundleNorm = normalize(codeBundle)
  for (const route of declared) {
    assert.ok(bundleNorm.includes('"' + route + '"'),
      `src declares the route literal "${route}" but the built bundle does not carry it — rebuild before shipping`)
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
    // FINAL FILM tag"): a tile's preview is its currency —
    // the status ribbon never ships again.
    ['dead FINAL FILM tag', 'FINAL FILM'],
  ]
  for (const [name, needle] of absent) {
    assert.ok(!bundle.includes(needle), `built lib/**/*.js still ships the standalone Flows tab: ${name} (${needle})`)
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
