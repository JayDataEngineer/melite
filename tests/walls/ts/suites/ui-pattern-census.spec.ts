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
 *  the artifacts tile (tile-face class — the tile-face slice).
 *  card-view 13→8 at S6f (2026-11-05): the run view's action bar
 *  (back-to-bench ×2, cancel, restore) + the group sub-view's
 *  Ungroup verb → Button outline sm (cancel rides .dangerVerb —
 *  the error-token class idiom infer-gallery set); six literals →
 *  chromeCopy; the .runBtn/.back/.restore/.cancelBtn rules died
 *  (.runBtn was already userless). THE TILE-FACE CLASS argued
 *  (S6g 2026-11-05, reference receipt): the bench tile face
 *  (.tileInner :138 + add-tile bench-view:599) is a layout face —
 *  a Button conversion nests buttons (invalid HTML); the three
 *  hover icon verbs (.tileIconBtn trash/play/stop) ARE the
 *  settings-form .helpButton idiom already (24px seat, module css,
 *  --dsw-alias tokens + --ds transitions) — argued, converged,
 *  census holds.
 *  THE REMAINING TREES' SEATS NAMED (S6h 2026-11-05, the
 *  conversion ledger for the next slices): deck 4 — assets-tab
 *  :614 lora-slot select + lora-section :279 strength input, :308
 *  family select, :326 chip × button (a chip-remove glyph — the
 *  one true button; selects/input join the ONE-Menu/Input sweep).
 *  action_cards 3 — form-fields :49 text input, :225 range input
 *  (the documented kit-native slider — S7's ONE-slider-law slice),
 *  :336 toggle button (Switch atom's seat). h3 5 + motion 2 live
 *  under different paths (packages/web/h3*, packages/*motion*) —
 *  their census rows already name the seats; conversions follow
 *  the same classes. S6i (2026-11-05): deck's chip × is ARGUED —
 *  the S6e inline-verb class (raw <button> + module css + dsw
 *  tokens; the reference's .reset idiom) — deck's true conversion
 *  debt is the three select/input seats of the ONE-Menu/Input
 *  sweep. S6j (2026-11-05): deck's lora-file input is type="file"
 *  — a native control the catalog LACKS (no file-upload atom; the
 *  Input atom is text-only). Argued: module css over the native
 *  control, the atoms-documented drift class. Deck now: chip × +
 *  file input ARGUED, two selects = the ONE-Menu sweep. S7a
 *  (2026-11-05): action_cards' Collapsible family DELETED — the
 *  shadcn carryover (Trigger/Content/Provider) had ZERO call
 *  sites estate-wide, and the catalog owns disclosure as a
 *  composed atom (DisclosureRow/FoldToggle), not headless
 *  triggers. The :336 trigger button died with it: 3→2 (the text
 *  input + the kit-native slider remain). S7b (2026-11-05): h3's
 *  mod-path form — the bare <input type="text"> + the raw submit
 *  — rides the Input/Button atoms (attrs pass through; the form's
 *  namedItem read keeps working on the DOM node). The chip ×
 *  strip ARGUES (the S6i inline-verb/chip class, dsw tokens); the
 *  lane-class select defers to the ONE-Menu sweep. 5→3. S7c
 *  (2026-11-05): motion's two seats ARGUED — the hidden
 *  type="file" bg door (MotionRail :258, the Button-triggered
 *  native file picker — catalog lacks a file atom, S6j class) and
 *  the type="range" frame scrubber (MotionExportDialog :783, the
 *  kit-native slider — S7's ONE-slider-law class). The tree rides
 *  the atoms everywhere else (Button, icon set, Tip). Motion: ZERO
 *  conversion debt. S7d (2026-11-05): deck's TWO selects —
 *  SelectField (variant/quant/switch-to-version) and the family
 *  door — ride the DSH Menu (the zoom.tsx idiom: owner open bit,
 *  Button anchor w/ aria-label, compact portal rows, check
 *  selection). The specs' selectOptions/querySelector drivers
 *  rewrote to open-trigger + click-menuitem (shownRow reads the
 *  trigger's row label). 4→2 (chip × + file input, both argued).
 *  S7e (2026-11-05): card-base's three spec-axis selects (Model,
 *  the Variant/Quant axis fields, Recipe) ride the same Menu via a
 *  shared AxisMenuSelect (rows carry their full faces — refused
 *  rows, not-downloaded suffixes — as menu items). The stale-spec
 *  "thin air pick" seam is now structural: no row, no click. The
 *  unit-driver cost paid across card-base (form-axes, studio,
 *  gate-r7b-axes) and card-view (model-axes, card-drill, drill2,
 *  gates, real-contract) — selectOptions/querySelector('option')
 *  retired for open-trigger + click-menuitem. 29→26. S7f
 *  (2026-11-05): h3's lane inspector class picker (the estate's
 *  last row-level native select) rides the DSH Menu — one open id
 *  across rows, the trigger Button carries the clip's current lane
 *  face, per-row aria-label "<clip> lane". 3→2 (the remaining two
 *  are the argued chip-× class). S7g (2026-11-05): the ONE-Input
 *  sweep resolves — action_cards' two remaining seats are ARGUED
 *  with DSH source: the catalog ships no slider/range atom (the
 *  full primitives export list — Button…Tooltip — has none), and
 *  DSH's own SettingsValueField renders a raw <input type="text">
 *  with module css INSIDE its field widget (ui-primitives
 *  settings-form/fields.tsx:96-105), one import from its own
 *  Input atom — the atom is for standalone fields, not embedded
 *  faces. ScrubInput's native range keeps the kit's byte-identical
 *  invisibility contract; NumberField's typing face is the same
 *  embedded class under a pointer-capture gesture. Pin stays 2.
 *
 *  card-base 26→24 at S7h (2026-11-05): the schema atoms' two
 *  native selects — the tri-state inherit/on/off seat and the enum
 *  field select (atoms.tsx) — ride the catalog Menu select idiom
 *  (SpecMenuSelect, the axes template promoted to the atoms seam;
 *  axes' own AxisMenuSelect delegates to it — one seat, one seam).
 *  The ghost row keeps its verbatim face; option faces title-case
 *  per the sweep law. card-base 24→22 at S7i (2026-11-05): mods.tsx's
 *  two mod-face catalog selects (the construct seat + the hybrid
 *  leaf's picker) ride SpecMenuSelect through catalogRows — ghost
 *  '— pick —', served labels verbatim, the drifted pick stays
 *  VISIBLE as the title-cased ' (unregistered)' row (never a
 *  silent blank); the native option tooltips died with the select
 *  (the catalog's MenuItem ships no title channel — the label is
 *  the face). card-base 22→15 at S7j (2026-11-05): seven seats
 *  converted to the catalog atoms — form.tsx's group tab rail →
 *  SegmentedTabs (role grammar + arrow walk + sliding indicator;
 *  panel id/labelledby linkage; the data-form-group-tab hook died,
 *  drivers re-rolled to role+name); glb-stage's four layer chips →
 *  Pill (the catalog independent-chip capsule, README line 78;
 *  aria-pressed via the rest channel, the pressed face is Pill's
 *  active); the preview stale badge → Pill (README line 77 —
 *  interactive capsule, not the read-only Tag) and the text copy
 *  verb → Button outline sm (the S6a bench-verb idiom). Walls:
 *  form-submenu-tabs / glb-stage-layer-pills / preview-pill-seats
 *  (package-local, each red-proved). Remaining 15, all ARGUED with
 *  DSH source: the slider's native range + the auto-grow textarea
 *  (no slider/textarea atom in the catalog's export set; DSH renders
 *  both raw in its own widgets — fields.tsx:95-106,
 *  FeedbackDialog.tsx:117-124); the two .specLinkBtn prose verbs
 *  (the S6e inline-verb class; fields.tsx:71-90); the two hidden
 *  file inputs (no file atom; InputBar.tsx:434-441); the square's
 *  22px overlay icon-verbs + the seed dice (the fields.tsx:71-76
 *  helpButton idiom); the mod add-square + the two media tile
 *  strips (the S6g tile-face class; PresentedFileCard.tsx:40); the
 *  source pick row + the two wire-picker rows (the row-face class;
 *  ChangedFiles.tsx:83). */
const HAND_ROLLED_CHROME_PIN: Record<string, number> = {
  'packages/motion/motion/src/ui': 2,
  // (Sahar R6 re-pin, 2026-11-06) 2 → 1: RailBackButton rides the
  // catalog's outline/sm grammar — the sole remaining raw seat is
  // CallCardPrompt's textarea (the ONE-prompt textarea; the catalog
  // ships no textarea atom).
  'packages/video/h3-timeline/src/ui': 1,
  'packages/image/mask-studio/src/ui': 0,
  'packages/web/card-base/src': 15,
  'packages/web/melite-card-view/src': 8,
  'packages/web/melite-card-deck/src': 2,
  'packages/web/melite-run-wire/src': 0,
  'packages/web/infer-gallery/src': 2,
  'packages/web-kit/timeline/src': 0,
  'packages/engines/comfyui/src/action_cards/src': 2,
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

  // ── THE S7 CLASS-4 RESIDUE CANONS (2026-11-05) ─────────────────
  // Three grammar classes judged against the DSH references; the
  // package-local behavior walls (card-base/melite-card-view
  // tests/class4-grammar.spec.ts) own the toggles, these arms own
  // the estate-wide shrink-only ratchets. The walkers mirror the
  // package walls' semantics exactly (element-tag h() + JSX; the
  // catalog roster minus the semantic-title components).

  /** Native-title seats (element tags + catalog rest channels).
   *  Pins at the convergence's close: card-base 23 — 18 element
   *  (truncation spans, embedded field faces, positioned overlay
   *  controls, the drag hint — every seat receipts
   *  TrajectoryTable.tsx:1174,1265 / fields.tsx:96-105 /
   *  TrajectoryToolbar.tsx:60,92,105) + 5 rest-channel (the S7h
   *  trigger law, two Input faces, the leaf range Input, the
   *  StaleBadge capsule); card-view 12 — 4 element (the tile
   *  truncations, the zoom build id, the picker card overflow) + 8
   *  Button-verb hints (TrajectoryToolbar class). The three
   *  JSX-idiom trees hold their SURVEYED baselines (2026-11-05 —
   *  h3-timeline 12, infer-gallery 2, timeline-kit 5: their
   *  truncation/label title= residue belongs to their own slices;
   *  the ratchet fires on any NEW seat in any tree). */
  const TIP_CANON_PIN: Record<string, number> = {
    'packages/video/h3-timeline/src/ui': 12,
    'packages/web/card-base/src': 23,
    'packages/web/melite-card-view/src': 12,
    'packages/web/infer-gallery/src': 2,
    'packages/web-kit/timeline/src': 5,
  }

  /** Hand-rolled empty-face element seats (className `.empty` on an
   *  element tag). Zero estate-wide: every empty pane face rides
   *  EmptyState (card-base layout.tsx; the DSH shape,
   *  WorkspaceBrowser.tsx:266-280). The raw LIST-row empties
   *  (wireEmpty, pickEmpty) are the argued TrajectoryTable.tsx:1363
   *  class — excluded by name in the walker. */
  const EMPTY_CANON_PIN: Record<string, number> = {}

  /** Group-title class on a non-heading element. Zero estate-wide:
   *  a group title is a real heading element (the reference's
   *  h3/h4 section heads — PluginManagerPage.tsx:209,
   *  TrajectoryTable.tsx:846,850). */
  const PANE_CANON_PIN: Record<string, number> = {}

  /** The pane arm's title-class judge: F5's own audit enumeration
   *  (nativity-2026-11-05-timeline-card-b.md) — the studio
   *  section-head spellings, case-insensitive (the old
   *  case-sensitive /(Group|Genre)Title/ missed the lowercase
   *  groupTitle AND every JSX-idiom head spelling). The item-label
   *  classes (tileTitle, clipTitle, paneTitle…) and the atoms'
   *  internals are NOT section heads and stay unseen; the h4/h3
   *  spellings (specGroupTitle, sectionTitle) are real headings,
   *  excluded by the heading rule. */
  const PANE_TITLE_CLASS = /(?:group|genre|rows|focus|kf|clips|hist|cut)title/i

  /** Hand-rolled empty/pane class seats inside a JSX className
   *  attribute — the same two grammars the h() arms judge, on the
   *  JSX-idiom plane (F6, nativity-2026-11-05-timeline-card-b.md:
   *  the arms walked only h('tag', props) call args, so JSX-idiom
   *  trees passed vacuously). */
  const EMPTY_CLASS = /\.empty\b(?!\w)/
  const EMPTY_CLASS_ARGUED = /emptyGlyph|emptyHint|emptyTitle|pickEmpty|wireEmpty|timelineEmpty|emptyMesh/

  /** The catalog COMPONENT roster minus the semantic-title
   *  components (Modal/DisclosureRow/Tooltip own `title` as their
   *  contract, never a DOM rest channel). */
  const TITLE_ROSTER = (() => {
    const names = new Set(
      [...catalogSource.matchAll(/^export \{ ([A-Za-z0-9_]+) \} from/gm)].map(m => m[1]!),
    )
    for (const s of ['Modal', 'DisclosureRow', 'Tooltip', 'HoverCard', 'ConfigField']) names.delete(s)
    return names
  })()

  interface Class4Seats { tip: number, empty: number, pane: number }

  function class4Seats(source: string, kind: 'ts' | 'tsx'): Class4Seats {
    const seats: Class4Seats = { tip: 0, empty: 0, pane: 0 }
    const sf = ts.createSourceFile(
      'seat.tsx', source, ts.ScriptTarget.Latest, true,
      kind === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const nameOf = (n: ts.PropertyName): string | undefined =>
      ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : undefined
    /** A `title` assignment (any depth — the conditional-spread
     *  seats count) or, on ELEMENT seats only, the empty/pane class
     *  seats inside the props object. */
    const hunt = (node: ts.Node, element: boolean): void => {
      if (ts.isPropertyAssignment(node)) {
        const name = nameOf(node.name)
        if (name === 'title') seats.tip++
        if (element && name === 'className') {
          const cls = node.initializer.getText(sf)
          if (EMPTY_CLASS.test(cls) && !EMPTY_CLASS_ARGUED.test(cls)) seats.empty++
        }
      }
      node.forEachChild(child => hunt(child, element))
    }
    // Pane counts only NON-heading tags (an h4 with the class is the
    // cure, not the disease).
    const huntPane = (node: ts.Node, heading: boolean): void => {
      if (!heading && ts.isPropertyAssignment(node) && nameOf(node.name) === 'className'
        && PANE_TITLE_CLASS.test(node.initializer.getText(sf))) seats.pane++
      node.forEachChild(child => huntPane(child, heading))
    }
    /** The host element a JSX className attribute rides (opening OR
     *  self-closing — a self-closing seat is the same DOM class
     *  seat), plus its tag name; undefined for a malformed tree. */
    const jsxClassSeat = (node: ts.JsxAttribute): { tag: string, cls: string } | undefined => {
      let open: ts.Node | undefined = node.parent
      while (open !== undefined && !ts.isJsxOpeningElement(open) && !ts.isJsxSelfClosingElement(open)) open = open.parent
      if (open === undefined) return undefined
      const el = open as ts.JsxOpeningElement | ts.JsxSelfClosingElement
      return { tag: el.tagName.getText(sf), cls: node.initializer?.getText(sf) ?? '' }
    }
    const visit = (node: ts.Node): void => {
      if (ts.isJsxAttribute(node)) {
        // THE F6 ARM (nativity-2026-11-05-timeline-card-b.md): the
        // empty/pane grammars ride JSX className seats too — same
        // host-element rule as the title arm (a capitalized tag's
        // className is a component's prop contract, never a DOM
        // class).
        if (node.name.getText(sf) === 'className') {
          const seat = jsxClassSeat(node)
          if (seat !== undefined && seat.tag !== '' && seat.tag[0] === seat.tag[0]!.toLowerCase()) {
            if (EMPTY_CLASS.test(seat.cls) && !EMPTY_CLASS_ARGUED.test(seat.cls)) seats.empty++
            if (!/^h[1-6]$/.test(seat.tag) && PANE_TITLE_CLASS.test(seat.cls)) seats.pane++
          }
        }
      }
      if (ts.isJsxAttribute(node) && node.name.getText(sf) === 'title') {
        let open: ts.Node | undefined = node.parent
        while (open !== undefined && !ts.isJsxOpeningElement(open)) open = open.parent
        const tag = open === undefined ? '' : (open as ts.JsxOpeningElement).tagName.getText(sf)
        if (tag !== '' && tag[0] === tag[0]!.toLowerCase()) seats.tip++ // host element only
      }
      if (ts.isCallExpression(node) && node.expression.getText(sf) === 'h' && node.arguments.length >= 2) {
        const first = node.arguments[0]!
        if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
          hunt(node.arguments[1]!, true)
          huntPane(node.arguments[1]!, /^h[1-6]$/.test(first.text))
        }
        else if (ts.isIdentifier(first) && TITLE_ROSTER.has(first.text)) hunt(node.arguments[1]!, false)
      }
      node.forEachChild(visit)
    }
    visit(sf)
    return seats
  }

  function class4ByTree(count: (s: Class4Seats) => number): Map<string, number> {
    const totals = new Map<string, number>()
    for (const tree of TREES) totals.set(tree, 0)
    for (const [file, source] of files) {
      for (const tree of TREES) {
        if (file.startsWith(`${tree}/`)) {
          totals.set(tree, totals.get(tree)! + count(class4Seats(source, kindOf(file))))
          break
        }
      }
    }
    return totals
  }

  function class4Arm(label: string, pin: Record<string, number>, count: (s: Class4Seats) => number, why: string): void {
    const offenders: string[] = []
    for (const [tree, n] of class4ByTree(count)) {
      const p = pin[tree] ?? 0
      if (n > p) offenders.push(`${tree}: ${n} seats (pin ${p})`)
    }
    expect(offenders, `${label} drifted past the pin — a cure shrinks it, a new seat re-pins with the DSH argument (${why}):\n${offenders.join('\n')}`).toEqual([])
  }

  it('TIP CANON: native-title seats per tree only shrink (hover text rides the estate Tip; the argued truncation/field/toolbar classes hold the pins)', () => {
    class4Arm('native-title seats', TIP_CANON_PIN, s => s.tip,
      'Rows.tsx:297 / TeamAction.tsx:92 are the Tip pattern; TrajectoryToolbar.tsx:60,92,105 + TrajectoryTable.tsx:1174,1265 + fields.tsx:96-105 are the argued raw classes')
  })

  it('EMPTY-STATE CANON: hand-rolled empty faces per tree only shrink (target 0; every empty pane face rides EmptyState)', () => {
    class4Arm('hand-rolled empty faces', EMPTY_CANON_PIN, s => s.empty,
      'WorkspaceBrowser.tsx:266-280 is the empty-state shape; TrajectoryTable.tsx:1363 is the argued raw LIST-row class')
  })

  it('PANE CANON: group-title classes on non-heading elements only shrink (target 0; a group title is a real heading element)', () => {
    class4Arm('group-title classes on non-headings', PANE_CANON_PIN, s => s.pane,
      'PluginManagerPage.tsx:209 h4.sectionTitle + TrajectoryTable.tsx:846,850 h4.usageHeading are the section-head pattern')
  })
})

/** THE DEAD-CSS STANDING JUDGE (reseat-chrome W5, 2026-11-06): the R7
 *  purge cut 40 dead classes / 50 blocks from the studio css by a
 *  one-shot inline script — class regrowth after it is invisible.
 *  This describe is the purge guard made standing: every class the
 *  css DEFINES must be referenced in code (comments stripped both
 *  sides — the purge's kill-notes name the dead in prose, which
 *  must never count as a reference), and the rule-block count only
 *  shrinks past its pin. */
describe('the studio css carries no dead rules (the R7 purge stands)', () => {
  const CSS = 'packages/video/h3-timeline/src/ui/studio/studio.module.css'
  const TREE = 'packages/video/h3-timeline/src'
  const BLOCK_PIN = 108 // re-pinned 2026-11-06: the R5 conversion cut .warnRow + .warnIcon
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  function definedClasses(): Set<string> {
    const bare = stripComments(readFileSync(resolve(ROOT, CSS), 'utf8'))
    const keyframes = new Set([...bare.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!))
    const out = new Set<string>()
    for (const m of bare.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (!keyframes.has(m[1]!)) out.add(m[1]!)
    }
    return out
  }
  function codeBlob(): string {
    let blob = ''
    for (const f of globSync(`${TREE}/**/*.{ts,tsx}`, { cwd: ROOT })) {
      if (f.endsWith('.css')) continue
      blob += stripComments(readFileSync(resolve(ROOT, f), 'utf8')) + '\n'
    }
    return blob
  }

  it('every defined class is referenced in code — a dead rule reds', () => {
    const code = codeBlob()
    const dead = [...definedClasses()].filter((c) => !code.includes(c)).sort()
    expect(dead, `dead css rules (cut the rule or reference the class — kill-note prose does not count):\n${dead.join('\n')}`).toEqual([])
  })

  it('the rule-block count only shrinks past its pin', () => {
    const bare = stripComments(readFileSync(resolve(ROOT, CSS), 'utf8'))
    const blocks = (bare.match(/\{/g) ?? []).length
    expect(blocks <= BLOCK_PIN, `rule blocks grew past the pin (${blocks} > ${BLOCK_PIN}) — a cure shrinks it, a new rule re-pins deliberately`).toBe(true)
  })
})
