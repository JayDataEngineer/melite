/**
 * THE UI-PATTERN CENSUS WALL (2026-11-05, the operator's
 * "deep disease" directive: "the UI doesn't follow one set playbook
 * or pattern — fix at the root, pinned with contracts").
 *
 * One DSH-native pattern per class, pinned with baseline ratchets
 * that only shrink. The reference idiom receipts live in
 * dev_docs/audits/dsh-native-ui-idioms-2026-11-05.md; the estate
 * census in dev_docs/audits/ui-pattern-census-2026-11-05.md.
 *
 * THE PLAYBOOK this wall enforces:
 * - FOLD: a fold is DisclosureRow (controlled, per-fold semantic
 *   icon, expandOnRowClick) — reference F0/F1/F2. Raw
 *   `<details>` is the NESTED record-group exception only
 *   (reference F8: ToolDetails.tsx:98, TrajectoryTable.tsx:1169,
 *   ProviderEditor.tsx:398 — never a top-level fold). The estate
 *   carries ZERO sanctioned nested-group seats today, so the
 *   convergence target is 0 raw fold seats in these trees.
 * - ARCHIVE NEVER FOLDS: IconArchive… / IconUnarchive… name the
 *   archive domain only (reference F9: ArchiveSession.tsx:40,68;
 *   Rows.tsx:449-454; WorkspaceBrowser.tsx:269). A fold glyph seat
 *   is semantic per fold (ToolRow's caller-supplied icon prop).
 * - ICON RESIDUE: card-base/src/icons.tsx is the estate's pinned
 *   media-residue icon home (concepts the 94-concept catalog
 *   lacks: Box, Layers, Palette, Film, Camera, Dices...). Its
 *   export set is EXACT-PINNED — both directions fire; a change
 *   re-pins deliberately with the catalog-gap argument. Catalog
 *   duplicates (Play, Pause, Copy...) are the shrink list.
 * - INLINE SVG: the `<svg>` literal seat census — only the icon
 *   homes pin; a new inline-svg file reds.
 *
 * The catalog roster is DERIVED from the installed primitives
 * package at runtime (DEPTH: the wall reads the real catalog, no
 * hand-copied list drifts from the install).
 */
import { globSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../../..')

// The AST engine: package-local seat, the same resolution the
// client-copy census rides (card-base owns node_modules/typescript;
// the root hoists none — version floats with the workspace).
const ts: typeof import('typescript') = createRequire(
  resolve(ROOT, 'packages/web/card-base/node_modules/typescript/package.json'),
)('typescript')

/** The card-facing client trees — the copy census's 7 TREES plus
 *  the three the pattern census measured as card faces beyond
 *  them (infer-gallery's client panel, web-kit's timeline, the
 *  ComfyUI action-cards face). The copy wall scopes its own 7
 *  (copy cures for the three extras are a separate roadmap row);
 *  this wall seats all ten because pattern divergence — inline
 *  glyphs, hand-rolled chrome — lives in the extras too. A scope
 *  move is argued here in lockstep with the copy wall's comment. */
const TREES = [
  'packages/motion/motion/src/ui',
  'packages/video/h3-timeline/src/ui',
  'packages/image/mask-studio/src/ui',
  'packages/web/card-base/src',
  'packages/web/melite-card-view/src',
  'packages/web/melite-card-deck/src',
  'packages/web/melite-run-wire/src',
  'packages/web/infer-gallery/src',
  'packages/web-kit/timeline/src',
  'packages/engines/comfyui/src/action_cards/src',
] as const

/** The estate's residue icon home (the one file allowed to hand
 *  roll media glyphs the catalog lacks — the reference answer for
 *  a missing control is the shared primitives catalog, and this
 *  repo cannot promote into the vendor catalog; the residue home
 *  is the argued local seat). */
const ICONS_HOME = 'packages/web/card-base/src/icons.tsx'

// ── The catalog, derived from the installed package ─────────────

/** Resolve the primitives package through card-base's seat (no
 *  pinned .pnpm path — floats with the workspace install). The
 *  package.json subpath is the one export every package exposes;
 *  the catalog file is reached by path from the package root. */
const primitivesRequire = createRequire(
  resolve(ROOT, 'packages/web/card-base/package.json'),
)
const catalogFile: string = resolve(
  primitivesRequire.resolve('@deepseek-ai/dsh-client-ui-primitives/package.json'),
  '../lib/types/icons/index.d.ts',
)
const catalogSource = readFileSync(catalogFile, 'utf8')
/** The real icon catalog concepts (…OutlineRegular declaration
 *  names, the Regular/Medium prefix stripped). */
const CATALOG_CONCEPTS = new Set(
  [...catalogSource.matchAll(/export declare const (Icon\w+?)OutlineRegular:/g)]
    .map(m => m[1]!.slice('Icon'.length)),
)
/** 79 …OutlineRegular concepts on today's install (the full
 *  catalog is larger — special naming families like PermissionIcon
 *  live in sibling files); the floor below keeps the derivation
 *  honest (a parsed-empty catalog would silently pass every icon
 *  arm — the masked-gate lesson; a catalog that SHRINKS below the
 *  floor forces a look). */
expect(CATALOG_CONCEPTS.size).toBeGreaterThanOrEqual(79)

// ── The walk ────────────────────────────────────────────────────

/** What each arm collects from one source file. */
interface Seats {
  /** Raw `<details>` / `h('details')` opens (a fold seat; the
   *  `<summary>` child is structural, counted beside it). */
  details: number
  summary: number
  /** `<svg>` / `h('svg')` literal seats (icon-home law). */
  svg: number
  /** IconArchive… / IconUnarchive… identifier uses (archive-domain
   *  glyphs; the estate has no archive domain → target 0). */
  archiveGlyphs: number
  /** Raw button/input/select/textarea elements (JSX or h()) —
   *  hand-rolled chrome against the catalog atoms. */
  chrome: number
}

/** Parse kind by extension — a .ts file forced to TSX mangles
 *  comparison operators into malformed JSX nodes. */
function kindOf(file: string): 'ts' | 'tsx' {
  return file.endsWith('.tsx') ? 'tsx' : 'ts'
}

const CHROME_TAGS = new Set(['button', 'input', 'select', 'textarea'])

function walkFile(source: string, kind: 'ts' | 'tsx'): Seats {
  const seats: Seats = { details: 0, summary: 0, svg: 0, archiveGlyphs: 0, chrome: 0 }
  const sf = ts.createSourceFile(
    'seat.tsx', source, ts.ScriptTarget.Latest, true,
    kind === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const visit = (node: ts.Node): void => {
    // JSX element seats (the h3/deck/view JSX idiom); the tagName
    // guard rides parse-shape quirks (a malformed node under a
    // recoverable parse has none). TS 6 seats the paired tag on
    // openingElement (tagName stays on self-closing only) — the
    // red-proof battery caught the vacuous walk when paired
    // elements read as no-tag.
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagNode = ts.isJsxElement(node)
        ? node.openingElement.tagName
        : node.tagName
      const tag = tagNode?.getText(sf) ?? ''
      if (tag === 'details') seats.details++
      if (tag === 'summary') seats.summary++
      if (tag === 'svg') seats.svg++
      if (CHROME_TAGS.has(tag)) seats.chrome++
    }
    // h(tag, …) seats (card-base's non-JSX idiom — the copy
    // census's h()-child lesson: a JSX-only walk reads card-base
    // clean while seats remain)
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 'h' && node.arguments.length > 0) {
      const first = node.arguments[0]
      if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
        if (first.text === 'details') seats.details++
        if (first.text === 'summary') seats.summary++
        if (first.text === 'svg') seats.svg++
        if (CHROME_TAGS.has(first.text)) seats.chrome++
      }
    }
    // Archive-domain glyph identifiers anywhere in the file
    if (ts.isIdentifier(node) && /^Icon(Un)?Archive/.test(node.text)) seats.archiveGlyphs++
    node.forEachChild(visit)
  }
  visit(sf)
  return seats
}

/** Per-tree chrome totals from the walked files. */
function chromeByTree(files: Map<string, string>): Map<string, number> {
  const totals = new Map<string, number>()
  for (const tree of TREES) totals.set(tree, 0)
  for (const [file, source] of files) {
    for (const tree of TREES) {
      if (file.startsWith(`${tree}/`)) {
        totals.set(tree, totals.get(tree)! + walkFile(source, kindOf(file)).chrome)
        break
      }
    }
  }
  return totals
}

/** All source files across TREES, keyed repo-relative. */
function treeFiles(): Map<string, string> {
  const files = new Map<string, string>()
  for (const tree of TREES) {
    for (const file of globSync(`${tree}/**/*.{ts,tsx}`, { cwd: ROOT })) {
      files.set(file.replaceAll('\\', '/'), readFileSync(resolve(ROOT, file), 'utf8'))
    }
  }
  return files
}

// ── THE PINS (baseline 2026-11-05; shrink-only except the exact
// icon set — every re-pin is a deliberate commit with its argument
// in this block) ─────────────────────────────────────────────────

/** Raw fold seats per file at the wall's birth: 9 seats — the h3
 *  knob fold (CallCard.tsx:678) + run panel (component.tsx:234)
 *  and the deck manage panel's seven sections (assets-tab.tsx:
 *  1049/1130/1191/1220/1269/1368/1380). Every one converted to
 *  DisclosureRow in the convergence slices (S2/S3 h3, S4 deck);
 *  the pin is now 0.
 *
 *  Out-of-arm fold-class seats (the census's class-1 remainder,
 *  judged by their own grammar): FlowCards' row-drill (Pill/
 *  CardDrill — the documented c-1 exception: row→modal is not an
 *  inline expansion, no shipped atom); card-base form.tsx's
 *  tab-rail submenu (role:tablist nav, class 4's pane grammar);
 *  comfyui form-fields' dead Collapsible trio (dead code, its
 *  owner's sweep); the unused FoldToggle import (dies with the
 *  first slice that wants it or the cull). */
const RAW_FOLD_PIN: Record<string, number> = {}

/** Archive-glyph seats: ZERO since slice S1 (2026-11-05) replaced
 *  studio.tsx's blanket fold icon with per-fold semantic glyphs
 *  (the operator's "bin icon seen nowhere else" — reference F9:
 *  the glyph names the archive domain, never a fold). Any new
 *  occurrence fires immediately. */
const ARCHIVE_GLYPH_PIN: Record<string, number> = {}

/** Inline-svg files: the residue icon homes (card-base icons.tsx;
 *  timeline-kit icons.tsx re-exports card-base Film — the
 *  convergence model) + three converge-or-argue seats (rows.tsx
 *  decorative glyph; assets-tab manage glyph; MediaPanel's three
 *  hand-drawn glyphs, census D9: the film concept exists in FOUR
 *  drawings across two systems). A NEW file with an inline `<svg>`
 *  reds — glyphs belong to the catalog, a residue home, or an
 *  argued seat re-pinned here. */
const INLINE_SVG_PIN = new Set([
  'packages/web/card-base/src/icons.tsx',
  'packages/web/card-base/src/rows.tsx',
  'packages/web/melite-card-deck/src/client/assets-tab.tsx',
  'packages/web/infer-gallery/src/client/MediaPanel.tsx',
  'packages/web-kit/timeline/src/timeline/icons.tsx',
])

/** Hand-rolled chrome element seats per tree (button/input/select/
 *  textarea raw elements), frozen at the WALL'S OWN AST walk
 *  (2026-11-05, walk-exact: the census grep reported 83 but 4 of
 *  its hits were comment/string noise — motion 3→2, infer-gallery
 *  8→7, comfyui 5→3; the walk is the judge, the grep the receipt).
 *  Shrink-only: the catalog's Button/Input/Menu/Switch own these
 *  concepts; a new hand-rolled element seat re-pins deliberately
 *  with the argument. card-view 29→23 at S6a (2026-11-05): the
 *  bench bar's six verbs (run-all, clear, undo, save, cancel,
 *  save-open) ride DSH Button size sm/outline — the bar's one
 *  remaining bench-view seat is the ADD TILE (a tile face, the
 *  same constrained class as sortable-tile's tile-open — its cure
 *  is the tile-face slice, not a verb swap). 23→18 at S6b: the
 *  zoom bar's five seats (the LLM select → the catalog Menu
 *  select idiom — trigger Button anchor + menuitem rows + selectedId;
 *  enhance/stop/run/close pills → Button sm/outline, the ✕ text
 *  glyph → IconCloseOutlineRegular, the ✦ literals → chromeCopy).
 *  18→13 at S6c: run-rescue's five verbs → Button sm/primary (the
 *  modal confirm grammar — rescue rides DSH Modal already), the
 *  face literals moved to chromeCopy (restart/install/download
 *  words + the missing/run-again templates). infer-gallery 7→2 at
 *  S6d (2026-11-05): the media drilldown's five seats — the inline-
 *  style actionBtn factory → Button outline sm (+ .dangerVerb token
 *  class, the one thing the variant lacks), close ✕ → ghost sm +
 *  IconCloseOutlineRegular, the ‹/› walk buttons → ghost sm +
 *  catalog chevrons on .walkBtn (shape in the module css, catalog
 *  the rest), the rename input → Input (.renameInput width law).
 *  The two remaining tree seats are MediaPanel's draft `▸` verb and
 *  the artifacts tile (tile-face class — the tile-face slice). */
const HAND_ROLLED_CHROME_PIN: Record<string, number> = {
  'packages/motion/motion/src/ui': 2,
  'packages/video/h3-timeline/src/ui': 5,
  'packages/image/mask-studio/src/ui': 0,
  'packages/web/card-base/src': 29,
  'packages/web/melite-card-view/src': 13,
  'packages/web/melite-card-deck/src': 4,
  'packages/web/melite-run-wire/src': 0,
  'packages/web/infer-gallery/src': 2,
  'packages/web-kit/timeline/src': 0,
  'packages/engines/comfyui/src/action_cards/src': 3,
}

/** icons.tsx exports: 33 since slice S5 (2026-11-05) purged the 17
 *  double-agents whose concepts the catalog ships (the catalog is
 *  the only home for its own concepts). EXACT pin — a change in
 *  either direction fires; deletions ride convergence slices,
 *  additions re-pin with the catalog-gap argument. */
const ICON_RESIDUE_PIN = new Set([
  'Upload', 'PersonStanding', 'Box', 'Layers', 'Palette', 'Move',
  'Clapperboard', 'Type', 'Image', 'Brush', 'Focus', 'Expand', 'Hand',
  'EyeOff', 'RotateCw', 'RotateCcw', 'Target', 'ImagePlus', 'Camera',
  'FileBox', 'AudioLines', 'Film', 'Crop', 'Frame', 'Volume2', 'VolumeX',
  'Maximize', 'Minimize2', 'Dices', 'Square', 'Eye', 'EyeAlt', 'PlayAlt',
])

/** The double-agents: the S5 purge list (all deleted 2026-11-05 —
 *  X↔Close, ChevronDown/Left/Right, User, Link2↔Link, Plus, Check,
 *  Loader2↔Loading, AlertTriangle+TriangleAlert↔WarningTriangle,
 *  Copy, Info, Pause, Download, RefreshCw↔Refresh, Play↔Play). The
 *  ratchet: a re-add of ANY name fires its own arm. */
const DOUBLE_AGENTS = new Set([
  'X', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'User', 'Link2', 'Plus',
  'Check', 'Loader2', 'AlertTriangle', 'TriangleAlert', 'Copy', 'Info', 'Pause',
  'Download', 'RefreshCw', 'Play',
])

/** Export names of the residue home (its `export function`
 *  declarations — the only way an icon is born there). */
function residueExports(source: string): Set<string> {
  const names = new Set<string>()
  for (const m of source.matchAll(/^export function (\w+)/gm)) names.add(m[1]!)
  return names
}

// ── The arms (each fires on its OWN path — the split-brain
// lesson: one invariant, one firing arm) ─────────────────────────

describe('THE UI-PATTERN CENSUS (the playbook wall)', () => {
  const files = treeFiles()

  it('derives the catalog roster from the installed primitives package', () => {
    // The DEPTH receipt: Play/Pause/Archive are real concepts on
    // today's install; the wall reads the live catalog file.
    expect(CATALOG_CONCEPTS.has('Play')).toBe(true)
    expect(CATALOG_CONCEPTS.has('Pause')).toBe(true)
    expect(CATALOG_CONCEPTS.has('Archive')).toBe(true)
  })

  it('FOLD CANON: raw <details> fold seats only shrink (target 0; every seat converts to DisclosureRow)', () => {
    const offenders: string[] = []
    let total = 0
    for (const [file, source] of files) {
      const { details, summary } = walkFile(source, kindOf(file))
      const pin = RAW_FOLD_PIN[file] ?? 0
      if (details > pin) offenders.push(`${file}: ${details} raw fold seats (pin ${pin})`)
      total += details
      // A summary outside its details seat is the same disease
      if (summary > details) offenders.push(`${file}: ${summary} summaries over ${details} details`)
    }
    expect(offenders, `raw fold seats drifted past the pin:\n${offenders.join('\n')}`).toEqual([])
    const pinnedTotal = Object.values(RAW_FOLD_PIN).reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(pinnedTotal)
  })

  it('ARCHIVE NEVER FOLDS: IconArchive… / IconUnarchive… seats only shrink (target 0 — the glyph names the archive domain)', () => {
    const offenders: string[] = []
    let total = 0
    for (const [file, source] of files) {
      const { archiveGlyphs } = walkFile(source, kindOf(file))
      const pin = ARCHIVE_GLYPH_PIN[file] ?? 0
      if (archiveGlyphs > pin) offenders.push(`${file}: ${archiveGlyphs} archive glyphs (pin ${pin})`)
      total += archiveGlyphs
    }
    expect(offenders, `archive-glyph seats drifted past the pin:\n${offenders.join('\n')}`).toEqual([])
    const pinnedTotal = Object.values(ARCHIVE_GLYPH_PIN).reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(pinnedTotal)
  })

  it('ICON RESIDUE: icons.tsx export set is exactly the pin (a change re-pins deliberately)', () => {
    const source = files.get(ICONS_HOME)
    expect(source, `${ICONS_HOME} left the trees — the residue home moved; re-pin`).toBeDefined()
    const current = residueExports(source!)
    const missing = [...ICON_RESIDUE_PIN].filter(n => !current.has(n))
    const added = [...current].filter(n => !ICON_RESIDUE_PIN.has(n))
    expect(
      { missing, added },
      'the residue icon home changed — deletions ride a convergence slice, additions need the catalog-gap argument, both re-pin',
    ).toEqual({ missing: [], added: [] })
  })

  it('DOUBLE-AGENT RATCHET: zero catalog-duplicate icons remain (the catalog is the only home for its own concepts)', () => {
    const source = files.get(ICONS_HOME)!
    const current = residueExports(source)
    // S5 (2026-11-05) purged all 17; the ratchet holds the count at
    // ZERO — any re-add fires this arm on its own path (the
    // exact-set arm fires in parallel with the added name).
    const present = [...DOUBLE_AGENTS].filter(n => current.has(n))
    expect(present, `double-agents returned: ${present.join(', ')} — the catalog ships these concepts; import them`).toEqual([])
  })

  it('INLINE-SVG CANON: svg literal seats only in the pinned icon homes', () => {
    const offenders: string[] = []
    for (const [file, source] of files) {
      const { svg } = walkFile(source, kindOf(file))
      if (svg > 0 && !INLINE_SVG_PIN.has(file)) offenders.push(`${file}: ${svg} inline svg seats`)
    }
    expect(offenders, `new inline-svg files — glyphs belong to the catalog or the residue home:\n${offenders.join('\n')}`).toEqual([])
  })

  it('CHROME CANON: hand-rolled button/input/select/textarea seats per tree only shrink (the catalog atoms own the concepts)', () => {
    const offenders: string[] = []
    for (const [tree, count] of chromeByTree(files)) {
      const pin = HAND_ROLLED_CHROME_PIN[tree] ?? 0
      if (count > pin) offenders.push(`${tree}: ${count} hand-rolled chrome seats (pin ${pin})`)
    }
    expect(offenders, `hand-rolled chrome drifted past the pin — a new element seat re-pins with the catalog-gap argument:\n${offenders.join('\n')}`).toEqual([])
  })
})
