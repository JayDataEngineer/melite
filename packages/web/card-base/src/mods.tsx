/**
 * mods.tsx — THE MOD SYSTEM, CORE (the old SubcardGrid, ported 1:1 —
 * and moved into the base package 2026-09-12 after the operator's
 * law: "MOD SYSTEM IS CORE. NEVER HARDCODED. The LORAS should not be
 * on cards, the MOD SYSTEM SHOULD").
 *
 * The laws this section enforces:
 *  - mods NEVER ride the card's param form. The estate serves the
 *    OPEN kind vocabulary (features.modifiers); the constructor
 *    (CardForm) renders THIS section itself and excludes every
 *    mod-owned name from the flat groups — no surface wires it, no
 *    surface can forget it (the construction law, same as the
 *    square).
 *  - THE WIRE IS THE STORAGE: params[param_key] holds the bag; the
 *    same bag runs and the agent reads/writes it.
 *  - commits persist immediately (the old onSaveParams law — never
 *    deferred to Run): onEdit rides the caller's values map AND
 *    onPatch (when present) persists to the domain on the spot.
 *  - apply order = array order; the drag rewrites the bag.
 *  - THREE kind shapes, all first-class (the leaf switches on the
 *    SERVED entry mode, never the kind name):
 *      OPTION kinds (lora): served catalog rows + strength; the
 *        entry is { id, strength } — the row's own defaults seed the
 *        strength.
 *      HYBRID kinds (controlnet): served catalog rows AND entry
 *        fields; the entry is the bag element keyed by its option_key
 *        (type) — the leaf stamps the row's resolved facts (model +
 *        preprocessor) onto new entries so the run record carries the
 *        retired wire shape; the lane re-validates them, never trusts
 *        them. Pack-level scalars (the strength floor) render as the
 *        section's own rows above the tiles.
 *      OPTION kinds (lora): served catalog rows + strength; the
 *        entry is { id, strength } — the row's own defaults seed the
 *        strength.
 *      FIELD kinds (mask): the kind's own spec fields (image squares,
 *        selects, sliders); the entry IS the params object. The leaf
 *        renders kind.fields through the same constructor atoms —
 *        the fields NEVER render flat on the card form.
 */
import { createElement as h, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Button, IconPlusOutlineRegular, Input, Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import { SpecAtom } from './form.tsx'
import { useSquareProvider } from './form.tsx'
import { coerceFieldEdit, fieldRequired, fieldVisible, isHybridKind, isOptionKind, optionKeyOf, scalarKeyOf, titleCaseId, type ModifierKind, type ModifierOption, type SpecField, type SpecValues } from './spec.ts'
import { modCommitWrite } from '@melite/contracts/formSpec'
import { LORA_ACCEPT } from '@melite/contracts/loraExtensions'
import { SpecMenuSelect } from './atoms.tsx'
import { InputSquare } from './square.tsx'
import { Tip } from './layout.tsx'
import { rejectionVoice } from './rejection-voice.ts'
import type { ChainRunCandidate } from './runs-policy.ts'

/** THE CATALOG PICKER ROWS (S7i): ghost '— pick —', served rows
 *  verbatim (the catalog's own faces), and the drifted pick stays
 *  VISIBLE — title-cased id + the unregistered marker, never a
 *  silent blank. Shared by the construct seat and the hybrid
 *  leaf's picker (F4's symmetry). */
function catalogRows(k: ModifierKind, draftOption: string): Array<{ id: string, label: string }> {
  const rows: Array<{ id: string, label: string }> = [{ id: '', label: '— pick —' }]
  for (const o of k.options ?? []) rows.push({ id: o.value, label: o.label })
  if (draftOption !== '' && (k.options ?? []).every((o) => o.value !== draftOption)) {
    rows.push({ id: draftOption, label: titleCaseId(draftOption) + ' (unregistered)' })
  }
  return rows
}

/** THE CHAIN-RUN PICKER (the upscale leaf's `chain-run` field — the
 *  free-text store name burn): the seat renders a REAL picker over
 *  the LIVE chain-store runs (the loader rides the host's wire, the
 *  same injection the media rows ride) — HUMAN-LABELED rows (run id,
 *  lane, scene count), the drifted/pasted value stays VISIBLE marked
 *  unregistered (catalogRows' own law), and the free-text affordance
 *  survives as the EXPLICIT advanced fallback beneath the menu. A
 *  host without the runs lane (loader absent) or a failed load
 *  degrades to the plain text input — the field never blocks, never
 *  fabricates. */
function ChainRunPicker(props: {
  f: SpecField
  value: unknown
  onEdit: (name: string, v: unknown) => void
  loadChainRuns?: (signal: AbortSignal) => Promise<ChainRunCandidate[]>
}): ReturnType<typeof h> {
  const [rows, setRows] = useState<ChainRunCandidate[] | null>(null)
  const [failed, setFailed] = useState(false)
  const load = props.loadChainRuns
  useEffect(() => {
    if (load === undefined) return
    const ctl = new AbortController()
    load(ctl.signal)
      .then((r) => { setRows(r) })
      .catch((e: unknown) => {
        // a superseded flight aborts by design — cleanup, never an
        // error face (use-form-spec's own law)
        if (ctl.signal.aborted) return
        setFailed(true)
      })
    return () => { ctl.abort() }
  }, [load])
  const current = typeof props.value === 'string' ? props.value : ''
  const edit = (v: string): void => { props.onEdit(props.f.name, v) }
  // THE DEGRADE LAW (the faces' own: absent host = the plain inputs
  // hold): no lane, or a load that died, renders the text input —
  // the field stays usable, the truth stays honest. The load state
  // rides the seat as a rendered fact (the seat's own face, the
  // stage-caption idiom — the walls read it, never a sleep).
  const degraded = load === undefined || failed
  return h('div', {
    className: css.modField,
    'data-chain-run-picker': props.f.name,
    'data-chain-runs-loaded': failed ? 'failed' : (rows !== null ? 'true' : 'false'),
  },
    degraded
      ? h(Input, {
          type: 'text',
          value: current,
          placeholder: props.f.placeholder ?? '',
          title: props.f.tooltip,
          'aria-label': props.f.label,
          onChange: (e: { target: { value: string } }) => { edit(e.target.value) },
        })
      : [
          h(SpecMenuSelect, {
            key: 'menu',
            label: props.f.label,
            value: current,
            rows: (() => {
              const menuRows: Array<{ id: string, label: string }> = [{ id: '', label: '— pick —' }]
              for (const c of rows ?? []) menuRows.push({ id: c.runId, label: chromeCopy.chainRunOptionLabel({ run: c.runId, kind: c.variant, scenes: c.scenes }) })
              if (current !== '' && menuRows.every((r) => r.id !== current)) {
                menuRows.push({ id: current, label: current + ' (unregistered)' })
              }
              return menuRows
            })(),
            ...(props.f.tooltip !== undefined && props.f.tooltip !== '' ? { title: props.f.tooltip } : {}),
            onPick: (id: string) => { edit(id) },
          }),
          rows !== null && rows.length === 0
            ? h('span', { key: 'empty', className: css.modLeafHint }, chromeCopy.chainRunEmptyNote)
            : null,
          h(Input, {
            key: 'advanced',
            type: 'text',
            value: current,
            placeholder: chromeCopy.chainRunAdvancedLabel,
            'aria-label': chromeCopy.chainRunAdvancedLabel,
            onChange: (e: { target: { value: string } }) => { edit(e.target.value) },
          }),
        ],
  )
}
import { chromeCopy } from './locales/chromeCopy.ts'

// THE FACE CONTRACTS (stroke 79 — the seam-law unification;
// REWORKED stroke 95 — the embedded leaf): the owner props live in
// @melite/contracts (modifierFaces.ts) beside their sibling seam
// contracts; re-exported here for the component-level types below
// and every existing importer. A face is an EMBEDDED CANVAS — the
// visual preview INSIDE the leaf popup (an image the user drags a
// rectangle on / brushes strokes over), reporting every committed
// change through onChange; the leaf's own Add/Save/Cancel own the
// commit chrome. The retired modal-shaped verbs (a Paint / Draw
// box button opening a SECOND modal over the leaf) died.
export type { PaintCanvasFaceProps, BboxCanvasFaceProps, OrbitCanvasFaceProps } from '@melite/contracts'
import type { BboxCanvasFaceProps, OrbitCanvasFaceProps, PaintCanvasFaceProps } from '@melite/contracts'

export type BboxFaceComponent = (props: BboxCanvasFaceProps) => ReactElement

/** THE ORBIT FACE (the reshoot orb, 2026-11-15): the host's
 *  camera-pose orb — a component, not an import (card-base stays
 *  atom-generic). Absent host = the orb never renders (the three
 *  number dials hold — graceful by design). */
export type OrbitFaceComponent = (props: OrbitCanvasFaceProps) => ReactElement

/** THE PAINT FACE (paint-leaf-canvas.md, embedded stroke 95): the
 *  host's brush canvas — a component, not an import (card-base
 *  stays atom-generic; the custom face is the CARD's UI, delivered
 *  by the client plane). Absent host = the canvas never renders
 *  (the square is the contract; the degrade is graceful by
 *  design). */
export type PaintFaceComponent = (props: PaintCanvasFaceProps) => ReactElement

export interface ModifiersSectionProps {
  kinds: ModifierKind[]
  values: SpecValues
  onEdit: (name: string, v: unknown) => void
  /** rail-seated field names (the stroke-32 mod-owned slot law): a
   *  mod field seated in the input rail never renders in the leaf —
   *  the signature is the seat, the brick keeps its knobs. */
  railSeated?: ReadonlySet<string>
  /** immediate persistence (the onSaveParams law) — optional: an
   *  add-drill without a stage commits through its values map. */
  onPatch?: (patch: Record<string, unknown>) => void
  /** THE PAINT FACE (leaf_face kinds): the host's brush canvas —
   *  EMBEDDED at the top of the leaf popup. Together with
   *  paintReference — absent either = no canvas (the square
   *  holds). */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78, embedded stroke 95): the host's
   *  selection canvas for bbox-canvas kinds — EMBEDDED at the top
   *  of the leaf popup; shares paintReference (the card's ONE
   *  image field is both faces' reference). */
  bboxFace?: BboxFaceComponent
  /** THE ORBIT FACE (the reshoot orb, 2026-11-15): the host's
   *  camera-pose orb for orbit-canvas kinds — EMBEDDED at the top
   *  of the leaf popup (absent host = the three number dials
   *  hold). */
  orbitFace?: OrbitFaceComponent
  /** the card-level image field whose value is the leaf faces'
   *  reference — the brush paints OVER it, the rectangle selects
   *  ON it (mask: 'input_image'). */
  paintReference?: string
  /** The host's media source (threaded from the constructor's wire)
   *  — the leaf's image inputs pick from the library like a card's. */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
  /** THE CHAIN-RUN SOURCE (the upscale leaf's picker): the live
   *  chain-store runs, threaded from the constructor's wire like the
   *  media rows. Absent → the chain-run field degrades to its plain
   *  text input. */
  loadChainRuns?: (signal: AbortSignal) => Promise<ChainRunCandidate[]>
  /** THE LORA UPLOAD SOURCE (2026-11-15, the mods-plane hand-upload):
   *  the host's estate transport (POST /v1/uploads/lora — raw
   *  octet-stream) with the host's own family resolution. Absent →
   *  the OPTION-kind leaf renders no upload affordance (the degrade
   *  law — the same honest absence loadChainRuns degrades to). */
  uploadLora?: (file: File, opts: { strength?: number }) => Promise<{
    id: string
    default_strength?: number
    row_seated: boolean
    refusal?: string
  }>
  /** THE SAME-SESSION REFRESH (rides the upload wire): stale-while-
   *  revalidate form-spec refetch — a landed lora row serves in the
   *  picker the SAME session. Absent → the id serves on next mount. */
  refreshSpec?: () => Promise<void>
  /** THE FLOW CANDIDATES (E2-11a — the region-mask picker law): the
   *  host bench's other stages' latest artifacts, threaded from the
   *  constructor's wire. The leaf's From-flow picker serves THESE —
   *  a structurally empty list ("nothing to pick yet" beside a run
   *  mask node) is the shipped burn this seam closes. */
  candidates?: Array<{ id: string; label: string; url: string }>
  /** the per-field narrowing (the edge law at the host's seat — the
   *  drill's own candidatesFor); absent = the raw rows. */
  candidatesFor?: (f: SpecField) => Array<{ id: string; label: string; url: string }>
}

/** THE LEAF SEAT — the opened entry's identity, frozen at open
 *  time. `index` anchors the nearest-of-duplicates tier only; the
 *  commit re-derives the entry from the LIVE bag (the next frame
 *  re-serves the whole bag as fresh objects — streamBenchFrames
 *  JSON round-trips it — so an index alone orphans every
 *  concurrent hand into a ghost). */
export interface LeafSeat {
  mode: 'create' | 'edit'
  kind: ModifierKind
  index: number
  /** tier 1: the opened object itself (the intra-frame fast path). */
  ref?: Record<string, unknown>
  /** tier 2: the catalog key (optionKeyOf — the lora name, the
   *  row id) with its field name; survives other hands' scalar
   *  edits and seats above/below the opened row. */
  key?: { field: string; value: string }
  /** tier 3: the entry's serialized content (field kinds, whose
   *  every field is a dial — a fresh parse re-serves equal
   *  content in new objects). Also the tier-2 confirm's
   *  ride-through snapshot. */
  content?: string
  /** tier 2 confirm: the keys the leaf itself displays (its
   *  dials). Owned keys may diverge freely (last-writer-wins —
   *  the modal owns them); every OTHER key is a ride-through and
   *  must still match the open-time snapshot or the candidate is
   *  a stranger (F1/F2/G1). */
  owned?: ReadonlySet<string>
  /** THE MODAL'S CHECKED SECTIONS (operator 2026-11-16, §0.8 THE
   *  FLOW MODEL): the ids of the modifier sections whose boxes are
   *  checked — intent, not paint: a hand-moved dial does NOT
   *  uncheck its section (the checkbox says "apply this modifier";
   *  the seed already ran). Checking seeds the patch; unchecking
   *  strips only values still equal to the seed. Save never reads
   *  it — the bag is the truth. */
  sections?: ReadonlyArray<string>
}

/** The ride-through projection of an entry: everything the modal
 *  does NOT own, serialized. Two entries are strangers when their
 *  projections differ — the save never silently clobbers a field
 *  the leaf never displayed. */
function ridesProject(entry: Record<string, unknown>, owned: ReadonlySet<string>): string {
  const out: Record<string, unknown> = {}
  for (const name of Object.keys(entry)) {
    if (!owned.has(name)) out[name] = entry[name]
  }
  return JSON.stringify(out)
}

/** THE CONTENT TAG (the 2026-11-01 identity finding, debt 24): a
 * stable FNV-1a over the entry's serialized content — a fresh
 * parse (the bench re-serve JSON round-trips the bag) re-serves
 * EQUAL content in new objects, so the tag survives what an index
 * cannot: the bag shrinking or reordering under a live gesture. */
function modEntryTag(entry: Record<string, unknown>): string {
  let h = 0x811c9dc5
  for (const ch of JSON.stringify(entry)) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** IDENTITY-MINTED TILE IDS (debt 24's cure, reusing the leaf's
 * tier law): `<param_key>#<content-tag>.<occurrence>` — content
 * is the identity (the leaf's tier 3), the occurrence ordinal
 * disambiguates same-content duplicates the way the leaf's
 * resolver picks the nearest seat. The render and the drop
 * resolver share THIS function, so a drop id minted at drag-start
 * resolves against whatever bag the next frame serves. */
export function modTileIds(k: ModifierKind, entries: ReadonlyArray<Record<string, unknown>>): string[] {
  const seen = new Map<string, number>()
  const out: string[] = []
  for (const entry of entries) {
    const tag = modEntryTag(entry)
    const occ = seen.get(tag) ?? 0
    seen.set(tag, occ + 1)
    out.push(`${k.param_key}#${tag}.${String(occ)}`)
  }
  return out
}

/** Resolve a minted tile id against the LIVE bag by content: the
 * tag matches entries whose serialized content is equal, the
 * occurrence ordinal picks among duplicates. -1 = the entry is
 * GONE (or the id is foreign) — the caller refuses the move,
 * never lands it on the wrong pair (the index-commit class debt
 * 23 cured at the leaf; this is its drag twin). Duplicate
 * collapse (one of two same-content rows removed) is deliberately
 * conservative: an orphaned ordinal refuses. */
export function modTileSeat(entries: ReadonlyArray<Record<string, unknown>>, id: string): number {
  const m = /#([0-9a-f]+)\.(\d+)$/.exec(id)
  if (m === null) return -1
  const want = m[1]!
  const occ = Number(m[2])
  let seen = 0
  for (let i = 0; i < entries.length; i++) {
    if (modEntryTag(entries[i]!) === want) {
      if (seen === occ) return i
      seen++
    }
  }
  return -1
}

/** The ghost-race refusal (2026-10-31 triage §B): the opened entry
 *  left the bag while the leaf was open — the save refuses LOUD,
 *  the leaf stays open, and every draft value survives. The old
 *  silent close (`setLeaf(null)`) threw the operator's edits away. */
function ghostRaceRefusal(k: ModifierKind): string {
  return chromeCopy.ghostRaceRefusal({ kindLabel: k.label })
}

/** THE SEAT RESOLVER — the opened entry in the LIVE bag, by
 *  identity, never by a stale index. Tier 1: the reference itself.
 *  Tier 2: the catalog key, confirmed on ride-through fields (the
 *  seat NEAREST the opened index — two same-key rows both
 *  confirming, the nearer seat wins, never the first walk match,
 *  and a farther later duplicate never regresses the best). Tier
 *  3: full content (a fresh parse re-serves equal content in new
 *  objects — the field-kind shape; also the keyless repair path).
 *  null = the entry is GONE — the call site refuses loud (save) or
 *  closes satisfied (delete) and the drafts survive. */
export function resolveSeatEntry(
  entries: ReadonlyArray<Record<string, unknown>>,
  seat: LeafSeat,
): { entry: Record<string, unknown>; index: number } | null {
  if (seat.mode !== 'edit' || seat.ref === undefined) return null
  const byRef = entries.findIndex((e) => e === seat.ref)
  if (byRef >= 0) return { entry: entries[byRef] as Record<string, unknown>, index: byRef }
  if (seat.key !== undefined && seat.owned !== undefined && seat.content !== undefined) {
    // LOCAL BINDINGS (strict narrowing, 2026-11-02): property
    // narrowing on `seat` does not survive into the forEach closure —
    // the guarded members ride locals so the callback stays total.
    const key = seat.key
    const owned = seat.owned
    const snapRides = ridesProject(JSON.parse(seat.content) as Record<string, unknown>, owned)
    let best = -1
    let bestDist = Number.POSITIVE_INFINITY
    entries.forEach((e, i) => {
      if (e[key.field] !== key.value) return
      if (ridesProject(e, owned) !== snapRides) return
      const dist = Math.abs(i - seat.index)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    if (best >= 0) return { entry: entries[best] as Record<string, unknown>, index: best }
  }
  if (seat.content !== undefined) {
    const byContent = entries.findIndex((e) => JSON.stringify(e) === seat.content)
    if (byContent >= 0) return { entry: entries[byContent] as Record<string, unknown>, index: byContent }
  }
  return null
}

export function ModifiersSection(props: ModifiersSectionProps): ReturnType<typeof h> | null {
  const { kinds, values, onEdit, onPatch } = props
  // NATIVE REORDER STATE (the dnd-kit purge): the dragging tile id +
  // the hovered tile id — IDENTITY-minted (modTileIds, debt 24),
  // never index-keyed: a bag that shifts mid-drag must not move the
  // drop onto the wrong pair.
  const [dragTile, setDragTile] = useState<string | null>(null)
  const [overTile, setOverTile] = useState<string | null>(null)
  // THE KIND PICKER (DSH Menu — portal: true escapes the zoom card's
  // clipping).
  const [pickAt, setPickAt] = useState<{ rect: DOMRect } | null>(null)
  // the leaf editor (DSH Modal): which kind, create or edit, and
  // the opened entry's frozen identity (resolved from the live bag
  // at save — see resolveSeatEntry).
  const [leaf, setLeaf] = useState<LeafSeat | null>(null)
  const [namedLeaf, setNamedLeaf] = useState<{ kind: ModifierKind; name: string } | null>(null)
  const [leafError, setLeafError] = useState<string | null>(null)
  const [draftOption, setDraftOption] = useState('')
  const [draftStrength, setDraftStrength] = useState('')
  // STEPS APPLIED draft (2026-09-18): option kinds whose rows claim a
  // distill step count (the served defaults carry `steps`) render a
  // steps row in the leaf — '' rides the row default.
  const [draftSteps, setDraftSteps] = useState('')
  // FIELD-kind leaf draft: the entry's params object (create starts
  // from the kind fields' defaults).
  const [draftParams, setDraftParams] = useState<SpecValues>({})

  const entriesOf = (k: ModifierKind): Array<Record<string, unknown>> => {
    // THE FLAT READ (the qvoice_save burn, 2026-10-22): a flat kind's
    // fields ARE the root knobs — its one entry is those values; no
    // bag exists to read. A root with none of the fields stated has
    // no entry yet (create seeds them).
    if (k.flat === true) {
      const entry: Record<string, unknown> = {}
      let stated = false
      for (const f of k.fields ?? []) {
        const v = values[f.name]
        if (v !== undefined && v !== null) { entry[f.name] = v; stated = true }
      }
      return stated ? [entry] : []
    }
    const v = values[k.param_key]
    const bag = Array.isArray(v) ? v.filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null) : []
    // THE GHOST DEFAULT (F34's chip half, 2026-11-13): a kind served
    // with `default_entry` (the family's resolved absent-bag row) shows
    // ONE chip while the bag is ABSENT — the compose door really rides
    // that row, so an empty face would hide the adapter the film runs.
    // An explicit empty bag (`[]`) is the operator's off: no ghost.
    if (bag.length === 0 && v === undefined && k.default_entry !== undefined) {
      return [{ ...k.default_entry }]
    }
    return bag
  }
  const optionOf = (k: ModifierKind, value: string): ModifierOption | null =>
    (k.options ?? []).find((o) => o.value === value) ?? null
  /** THE HYBRID ENTRY FIELDS (the bag element minus its two bound
   *  rows — the option_key select and the scalar dial own those). */
  const hybridFields = (k: ModifierKind, hidden?: ReadonlySet<string>): SpecField[] => {
    const key = optionKeyOf(k)
    const scalar = scalarKeyOf(k)
    return (k.fields ?? []).filter((f) => f.name !== key && f.name !== scalar && !(hidden?.has(f.name) ?? false))
  }
  /** The scalar seed of the HYBRID leaf (controlnet — the only kind
   *  that rides this helper): the row's own default wins; the contract
   *  field default is the backstop — 0.7 is the CONTROLNET seed, never
   *  the lora row-default law (a lora entry's blank dial seeds 1 at the
   *  saveLeaf option arms — mods.tsx:690 create, :723 edit — and the
   *  door/compose seats carry the same 1: service.ts:1017, doors.ts:854). */
  const strengthSeedOf = (k: ModifierKind, option: ModifierOption | null): number => {
    const scalar = scalarKeyOf(k)
    const rowDefault = option?.defaults?.[scalar]
    if (typeof rowDefault === 'number') return rowDefault
    const field = (k.fields ?? []).find((f) => f.name === scalar)
    return typeof field?.default === 'number' ? field.default : 0.7
  }
  const commitScalar = (f: SpecField, name: string, v: unknown): void => {
    const coerced = coerceFieldEdit(f, v)
    onEdit(name, coerced)
    onPatch?.({ [name]: coerced })
  }
  const commit = (k: ModifierKind, next: Array<Record<string, unknown>>): void => {
    // THE FLAT COMMIT (the qvoice_save burn): the write is the shared
    // spelling — flat fields at the root, never the bag key the door
    // refuses. A flat kind holds ONE entry; an emptied entries array
    // clears the fields.
    if (k.flat === true) {
      const entry = next[next.length - 1] ?? {}
      const flatWrite = modCommitWrite(k, entry)
      for (const name of Object.keys(flatWrite)) onEdit(name, flatWrite[name])
      if (next.length === 0) {
        // THE REMOVE MUST LAND (the stuck-mod burn, operator
        // 2026-10-22: "I CAN'T EVEN REMOVE THE MOD"): the patch
        // wire is JSON — undefined DROPS OUT of the serialized
        // patch, the bench never receives the delete, and the chip
        // re-serves forever. null is the merge-patch delete
        // spelling: onEdit drops the client key, the patch carries
        // the null the bench turns into a key delete.
        // (fields is declared at this write, provably: both flat
        // remove gestures — the presence tile's open-removes and
        // deleteLeaf's seat filter — require a stated entry, and a
        // stated entry requires declared fields; a fields-undefined
        // flat kind states nothing, renders no tile, and deleteLeaf
        // refuses before commit.)
        for (const f of k.fields!) { onEdit(f.name, undefined); flatWrite[f.name] = null }
      }
      onPatch?.(flatWrite)
      return
    }
    onEdit(k.param_key, next)
    onPatch?.({ [k.param_key]: next })
  }
  const addable = kinds.filter((k) => k.cardinality !== 'scalar')

  // THE PRESENCE-KIND LAW (operator 2026-10-22: "WHEN I PUT THE
  // SAVE QVOICE MOD ON, IT JUST WORKS. IT IS LIKE A MOD… WHY WOULD
  // IT HAVE A TOGGLE / BOOLEAN"): a flat kind whose fields are all
  // booleans has NO editor — the chip IS the signal. Add states
  // every boolean true (one write, no leaf); the tile's open
  // gesture removes it (commit([]) → the null delete). No toggle
  // widget, no knob wall, nothing to get stuck in.
  //
  // THE NAMED-PRESENCE REFINEMENT (operator 2026-10-22: "Make sure
  // that the 'design' mod has a popup, it can just be 'name' or
  // something so a name can be used for the save file"): a flat
  // kind of booleans plus EXACTLY ONE text field keeps the chip law
  // — add is one gesture, the tile click still removes — but the
  // add opens a one-field popup (the name), never a knob wall. The
  // booleans still stamp true; the name rides as its one text
  // field; empty stays lawful (the build mints the save name).
  const presenceKind = (k: ModifierKind): boolean =>
    k.flat === true
    && (k.fields ?? []).length > 0
    // the length guard above proved fields declared and non-empty —
    // the every reads the declared array (a guard reorder re-arms a
    // fallback here)
    && k.fields!.every((f) => f.type === 'boolean')
  const namedPresenceKind = (k: ModifierKind): boolean => {
    const fields = k.fields ?? []
    return k.flat === true
      && fields.filter((f) => f.type === 'text').length === 1
      && fields.some((f) => f.type === 'boolean')
      && fields.every((f) => f.type === 'boolean' || f.type === 'text')
  }
  const namedFieldOf = (k: ModifierKind): SpecField => {
    // namedPresenceKind guards every caller (the render and the
    // stamp both branch on it first): fields is declared and the one
    // served text row exists — the fences state that contract (a
    // namedFieldOf call reachable without the judge re-arms them).
    return k.fields!.find((x) => x.type === 'text')!
  }
  const presenceStamp = (k: ModifierKind): Record<string, unknown> => {
    const stamp: Record<string, unknown> = {}
    // both stamp callers (the presence add and namedPresenceStamp)
    // branch on presenceKind/namedPresenceKind first — fields is
    // declared wherever this loop evaluates
    for (const f of k.fields!) stamp[f.name] = true
    return stamp
  }
  const namedPresenceStamp = (k: ModifierKind, name: string): Record<string, unknown> => ({
    ...presenceStamp(k),
    [namedFieldOf(k).name]: name.trim(),
  })

  if (kinds.length === 0) return null

  const seated = props.railSeated
  const fieldDefaults = (k: ModifierKind): SpecValues => {
    const out: SpecValues = {}
    for (const f of k.fields ?? []) {
      if ((seated?.has(f.name) ?? false)) continue
      if (f.default !== undefined && f.default !== null) out[f.name] = f.default
    }
    return out
  }

  // THE MASTER-MODAL SECTION OVERLAY (§0.8, 2026-11-16): the
  // plus box OPENS the leaf unseeded — the sections start
  // unchecked, the operator checks the modifiers they want
  // (the instant commit died with the collapse's one-interface
  // law: the chip is a door into the modal, never a second editor).
  const openCreate = (k: ModifierKind): void => {
    const entries = entriesOf(k)
    if (k.max_stack !== undefined && entries.length >= k.max_stack) {
      setLeafError(k.label + ' stack limit reached (' + String(k.max_stack) + ') — remove one to add another.')
      return
    }
    // THE PRESENCE ADD: no leaf ever opens for a presence kind —
    // the add IS the statement (every boolean true, one write).
    if (presenceKind(k)) {
      commit(k, [presenceStamp(k)])
      return
    }
    // THE NAMED-PRESENCE ADD: the one-field popup (the name), never
    // a knob wall — confirm states the booleans plus the name.
    if (namedPresenceKind(k)) {
      setNamedLeaf({ kind: k, name: '' })
      return
    }
    setDraftOption('')
    setDraftStrength('')
    setDraftSteps('')
    // (the chip-corpse params are gone with the one door: the only
    // callers that ever passed a patch/section were the deleted outer
    // chips; the in-leaf section checkbox routes its patch at its own
    // check, never through the open)
    setDraftParams(fieldDefaults(k))
    setLeafError(null)
    setLeaf({ mode: 'create', kind: k, index: -1 })
  }
  const openEdit = (k: ModifierKind, index: number): void => {
    // (the entry-undefined guard was deleted: tiles map 1:1 over this
    // same entriesOf(k) array in the same render — the clicked index
    // is always in range. No caller can observe the undefined state.)
    const entry = entriesOf(k)[index]
    if (isHybridKind(k)) {
      const key = optionKeyOf(k)
      setDraftOption(typeof entry[key] === 'string' ? entry[key] as string : '')
      const scalar = scalarKeyOf(k)
      const strength = typeof entry[scalar] === 'number' ? entry[scalar] as number : undefined
      setDraftStrength(strength !== undefined ? String(strength) : '')
      const params: SpecValues = {}
      for (const f of hybridFields(k, seated)) {
        // coerce at the seed too (the sam_threshold cure): a legacy
        // string row (saved before the leaf's patch boundary existed)
        // cures the moment the leaf opens — never persists forward.
        if (entry[f.name] !== undefined) params[f.name] = coerceFieldEdit(f, entry[f.name])
      }
      // (the chip-corpse patch overlay died with the one door: the
      // in-leaf switch routes its patch at its own press)
      setDraftParams(params)
    } else if (isOptionKind(k)) {
      // THE ENTRY'S ROW RIDES THE DIAL (the steps-choice fix, #38):
      // a bare '' fell to rowOpts[0] — editing a 4-to-8 turbo read
      // the FIRST row's facts ("fixed at 4", unbounded, placeholder
      // 4) and the domain the operator chose by was invisible.
      // Seed the entry's id so the Steps row follows THE ENTRY.
      setDraftOption(typeof entry['id'] === 'string' ? entry['id'] as string : '')
      const strength = typeof entry['strength'] === 'number' ? entry['strength'] as number : undefined
      setDraftStrength(strength !== undefined ? String(strength) : '')
      setDraftSteps(typeof entry['steps'] === 'number' ? String(entry['steps'] as number) : '')
    } else {
      // THE DISPLAY-IS-THE-COMMIT LAW (the YOLO-classes fix): the
      // edit draft opens on the kind's defaults with the entry
      // overlaid — create's seeding mirrored. A legacy entry
      // missing a defaulted field (a label-less sam2) SHOWS the
      // default AND saves it — never shows Person pressed then
      // refuses loud on save. Graph-neutral: compose reads absent
      // scalars as their declared defaults anyway.
      const params: SpecValues = { ...fieldDefaults(k) }
      for (const f of k.fields ?? []) {
        if ((seated?.has(f.name) ?? false)) continue
        // coerce at the seed too (the sam_threshold cure): a legacy
        // string row cures on open, never persists forward.
        if (entry[f.name] !== undefined) params[f.name] = coerceFieldEdit(f, entry[f.name])
      }
      setDraftParams(params)
    }
    setLeafError(null)
    // THE IDENTITY FREEZE: the seat carries the opened entry's
    // reference, catalog key, full content, and the owned-dial set,
    // so the save re-derives the entry in whatever bag the next
    // frame serves (the fresh-parse race) instead of trusting a
    // stale index. Owned = exactly the dials this leaf displays:
    // the key select, the scalar dial, the steps row (option
    // kinds), and the kind's own fields (hybrids) — everything
    // else is ride-through, confirmed at save.
    const seat: LeafSeat = { mode: 'edit', kind: k, index, ref: entry, content: JSON.stringify(entry) }
    const owned = new Set<string>([optionKeyOf(k), scalarKeyOf(k)])
    if (isHybridKind(k)) {
      seat.key = { field: optionKeyOf(k), value: typeof entry[optionKeyOf(k)] === 'string' ? entry[optionKeyOf(k)] as string : '' }
      for (const f of hybridFields(k, seated)) owned.add(f.name)
    } else if (isOptionKind(k)) {
      seat.key = { field: 'id', value: typeof entry['id'] === 'string' ? entry['id'] as string : '' }
      owned.add('steps')
    }
    seat.owned = owned
    setLeaf(seat)
  }
  const saveLeaf = (): void => {
    // (the leaf-null guard was deleted: saveLeaf is wired only to the
    // leaf modal's Add/Save button, rendered iff leaf !== null — no
    // caller can observe the null state.)
    const open = leaf!
    // THE LIVE KIND AT SAVE TIME (the upload refresh, 2026-11-15):
    // the same re-resolution the render rides — a row the refreshed
    // serve added must pass the served-rows judgment HERE too (the
    // stale kind would refuse the just-uploaded id as
    // hand-spelled). A kind the refresh retired saves against its
    // last serve; unknown ids still refuse loud.
    const k = kinds.find((x) => x.kind === open.kind.kind && x.param_key === open.kind.param_key) ?? open.kind
    const entries = entriesOf(k)
    if (isHybridKind(k)) {
      // HYBRID kind: the catalog select binds option_key; the row's
      // resolved facts stamp onto the entry (the retired wire shape);
      // the remaining fields ride verbatim. A type the catalog no
      // longer serves refuses LOUD (never a silent drifted save).
      const key = optionKeyOf(k)
      if (draftOption === '') { setLeafError('Pick one from the served rows.'); return }
      const option = optionOf(k, draftOption)
      if (option === null) { setLeafError('\u2018' + draftOption + '\u2019 is not a served ' + k.label + ' row — pick from the catalog, never hand-spell.'); return }
      const seed = strengthSeedOf(k, option)
      const strength = draftStrength.trim() === '' ? seed : Number(draftStrength)
      if (!Number.isFinite(strength)) { setLeafError('Strength must be a number.'); return }
      const scalar = { [scalarKeyOf(k)]: strength }
      const stamped: Record<string, unknown> = { [key]: draftOption }
      if (typeof option.model === 'string') stamped['model'] = option.model
      if (typeof option.preprocessor === 'string') stamped['preprocessor'] = option.preprocessor
      if (open.mode === 'create') {
        commit(k, [...entries, { ...stamped, ...draftParams, ...scalar }])
      } else {
        const seatEntry = resolveSeatEntry(entries, open)
        if (seatEntry === null) { setLeafError(ghostRaceRefusal(k)); return }
        const next = [...entries]
        next[seatEntry.index] = { ...seatEntry.entry, ...stamped, ...draftParams, ...scalar }
        commit(k, next)
      }
    } else if (isOptionKind(k)) {
      if (open.mode === 'create') {
        if (draftOption === '') { setLeafError('Pick one from the served rows.'); return }
        const option = optionOf(k, draftOption)
        const seed = option !== null && option.defaults?.strength !== undefined ? option.defaults.strength : 1.0
        const strength = draftStrength.trim() === '' ? seed : Number(draftStrength)
        if (!Number.isFinite(strength)) { setLeafError('Strength must be a number.'); return }
        // steps applied: the row's served default seeds a blank input
        // (the distill's married count); a stated count must be a
        // whole number — never a silent fractional step run.
        const stepsSeed = option?.defaults?.steps
        const steps = draftSteps.trim() === ''
          ? (typeof stepsSeed === 'number' ? stepsSeed : undefined)
          : Number(draftSteps)
        if (steps !== undefined && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
          setLeafError('Steps applied must be a whole number \u2265 1.'); return
        }
        // RANGE (the 4-to-8 correction): the chosen row's declared
        // domain bounds the claim — a count outside it refuses LOUD
        // (the call knob stays free; this is the row's own dial).
        if (steps !== undefined) {
          const min = option?.defaults?.steps_min
          const max = option?.defaults?.steps_max
          if (typeof min === 'number' && steps < min) { setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`); return }
          if (typeof max === 'number' && steps > max) { setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`); return }
        }
        commit(k, [...entries, steps === undefined ? { id: draftOption, strength } : { id: draftOption, strength, steps }])
      } else {
        const seatEntry = resolveSeatEntry(entries, open)
        if (seatEntry === null) { setLeafError(ghostRaceRefusal(k)); return }
        // strength (edit): a blank dial falls to the ENTRY'S row
        // default (create's law mirrored) — an id-only recipe stamp
        // edits without a NaN refusal; a stated dial wins. The row
        // follows the PICKED catalog seat (F4's repair path: a
        // keyless row re-keyed by picking a served row).
        const entry = seatEntry.entry
        const editRow = (k.options ?? []).find((o) => o.value === draftOption)
        const strengthSeed = typeof editRow?.defaults?.strength === 'number' ? editRow.defaults.strength : 1.0
        const strength = draftStrength.trim() === '' ? strengthSeed : Number(draftStrength)
        if (!Number.isFinite(strength)) { setLeafError('Strength must be a number.'); return }
        // steps applied (edit): a blank input DROPS the claim (back
        // to the ambient steps row); a stated count replaces it.
        const steps = draftSteps.trim() === '' ? undefined : Number(draftSteps)
        if (steps !== undefined && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
          setLeafError('Steps applied must be a whole number \u2265 1.'); return
        }
        // RANGE (the 4-to-8 correction): the ENTRY's row bounds the
        // claim — outside refuses LOUD, never a silent clamp.
        if (steps !== undefined) {
          const min = editRow?.defaults?.steps_min
          const max = editRow?.defaults?.steps_max
          if (typeof min === 'number' && steps < min) { setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`); return }
          if (typeof max === 'number' && steps > max) { setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`); return }
        }
        const next = [...entries]
        // the picked catalog seat re-keys the row (F4) — the id
        // follows the select when a row is picked; a keyless row
        // saved without a pick keeps its own (absent) key, never a
        // stamped blank.
        const rekey = draftOption !== '' ? { id: draftOption } : {}
        if (steps === undefined) {
          // blank drops the claim (delete, never a lingering spread)
          const rest: Record<string, unknown> = { ...entry, ...rekey, strength }
          delete rest['steps']
          next[seatEntry.index] = rest
        } else {
          next[seatEntry.index] = { ...entry, ...rekey, strength, steps }
        }
        commit(k, next)
      }
    } else {
      // FIELD kind: the draft params object IS the entry
      if (open.mode === 'create') commit(k, [...entries, { ...draftParams }])
      else {
        const seatEntry = resolveSeatEntry(entries, open)
        if (seatEntry === null) { setLeafError(ghostRaceRefusal(k)); return }
        const next = [...entries]
        next[seatEntry.index] = { ...seatEntry.entry, ...draftParams }
        commit(k, next)
      }
    }
    setLeaf(null)
  }
  const deleteLeaf = (): void => {
    // (the null/create guard was deleted: deleteLeaf is wired only to
    // the Remove button, rendered iff leaf.mode === 'edit' — no caller
    // can observe the guarded states.)
    const open = leaf!
    const entries = entriesOf(open.kind)
    // THE DELETE RACE: the bag may have been re-served (fresh
    // objects, reordered seats) since the leaf opened — a
    // reference filter would remove nothing. Resolve the seat by
    // identity (the save's own tiers), then cut the resolved seat.
    // A vanished entry needs no write at all: the intent is
    // already satisfied — close only, both doors shut.
    const seatEntry = resolveSeatEntry(entries, open)
    if (seatEntry === null) { setLeaf(null); return }
    commit(open.kind, entries.filter((_, i) => i !== seatEntry.index))
    setLeaf(null)
  }
  // apply order = array order: the drop rewrites the bag; the
  // composed graph follows (the old rule-2). Same splice verb,
  // native drag ids (the dnd-kit purge). THE RESOLUTION IS
  // CONTENT-KEYED (debt 24): the ids were minted over the bag at
  // drag-start; the LIVE bag may have shrunk or reordered under
  // the gesture — modTileSeat resolves each id by its entry's
  // CONTENT, so the pair the drag meant is the pair the commit
  // moves, and a vanished entry (its content left the bag) REFUSES
  // — the index class would have landed the move on whatever now
  // sits at the stale index (the wrong pair).
  const onTileDrop = (k: ModifierKind, active: string, over: string): void => {
    // (the over===active guard was deleted: the sole caller is the
    // tile-drop closure, and ModTile's onDrop gates active !== tileId
    // before invoking — equal ids never arrive.)
    const entries = entriesOf(k)
    const from = modTileSeat(entries, active)
    const to = modTileSeat(entries, over)
    if (from < 0 || to < 0) return
    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commit(k, next)
  }

  // THE CATEGORY LAW (stroke 78): a kind is ordered unless it
  // declares standalone — the drag stack seats ONLY on ordered kinds
  // (standalone entries each own their output; order is void).
  const isOrdered = (k: ModifierKind): boolean => k.category !== 'standalone'
  const anyOrdered = kinds.some(isOrdered)
  // THE HINT NAMES THE PRESENT AFFORDANCE (the 2026-11-16 operator
  // friction: "a modifiers section that does nothing above the mod
  // slots"): the drag hint rides the FIRST ordered ENTRY, never the
  // category alone — an empty section (checkboxes and the add
  // square, nothing draggable) must not voice a drag that does not
  // exist. The standalone hint stays categorical: it explains why no
  // drag will EVER come, the honest word at any count.
  const anyOrderedTile = kinds.some((k) => isOrdered(k) && entriesOf(k).length > 0)
  const hint = !anyOrdered
    ? 'each entry is its own output (standalone)'
    : anyOrderedTile ? 'drag to set apply order' : null

  return h('section', { className: css.modSection, 'data-subcard-grid': 'on', 'data-testid': 'cb-mods-section' },
    h('div', { className: css.modHead },
      h('span', { className: css.modTitle }, chromeCopy.modifiersTitle),
      hint !== null ? h('span', { className: css.modHint }, hint) : null,
    ),
    leafError !== null && leaf === null
      ? h('p', { className: css.modLeafError }, leafError)
      : null,
    // THE MOD-KIND KNOB LAW (E2-7, the operator's burn: a ControlNet
    // knob NEVER renders outside the ControlNet mod): a kind-level
    // scalar of a LEAF-BEARING kind (cardinality ≠ 'scalar') renders
    // inside the mod's own leaf — never here above the tiles. Only a
    // LEAFLESS kind (cardinality 'scalar' — no entries, no add
    // square, no modal to host them) keeps its rows at the section:
    // they are its only face.
    ...kinds.filter((k) => k.cardinality === 'scalar' && (k.kindFields ?? []).length > 0).map((k) =>
      h('div', { key: k.param_key + ':kind', className: css.modLeafFields },
        // (kindFields! — the filter above passes only kinds with a
        // defined non-empty kindFields; TS cannot see through it.)
        k.kindFields!.map((f) =>
          h('label', { key: f.name, className: css.modField },
            f.label ?? f.name,
            h(SpecAtom, {
              f,
              value: values[f.name] ?? f.default,
              onEdit: (name: string, v: unknown) => { commitScalar(f, name, v) },
            }),
          ),
        ),
      ),
    ),
    // ONE flowing row (the old law: the + tile rides right after
    // the last tile, never on its own vertical row); per-kind
    // DndContexts are renderless — layout stays one flex-wrap line.
    h('div', { className: css.modRow, 'data-subcard-row': 'flow' },
      kinds.map((k) => {
        const entries = entriesOf(k)
        // ONE DOOR (operator, 2026-11-16: "collapse the mods into
        // one"): a declared section is a CHECKBOX INSIDE the leaf
        // (the flow face, §0.8) — the chip row that once
        // rendered here was a second entry surface around the kind
        // picker, born as back-compat for the retired bag spellings.
        // It is deleted: the plus box is the only door, the grammar
        // every kind rides (Loras prove it). The retired spellings
        // are compose-door translation for pre-collapse documents —
        // not UI, rendered nowhere.
        if (entries.length === 0) return null
        const ordered = isOrdered(k)
        // THE IDENTITY MINT (debt 24): one function owns the id
        // grammar — the drop resolver reads the same ids, so the
        // pair the drag means is derivable from any later bag.
        const tileIds = modTileIds(k, entries)
        return [
          ...entries.map((entry, i) => {
              // THE CATALOG KEY (the served option_key — the hybrid
              // type, the option id; field kinds carry none and fall
              // to the kind label, as before).
              const id = typeof entry[optionKeyOf(k)] === 'string' ? entry[optionKeyOf(k)] as string : ''
              const option = optionOf(k, id)
              const scalar = scalarKeyOf(k)
              const strength = typeof entry[scalar] === 'number'
                ? entry[scalar] as number
                : option !== null && option.defaults !== undefined && typeof option.defaults[scalar] === 'number' ? option.defaults[scalar] as number : undefined
              // THE STEPS BADGE (#38, the choice made visible): the
              // EFFECTIVE count — the entry's own claim, else the
              // row's married default — reads on the tile beside
              // strength (what the film's sampler runs).
              const steps = typeof entry['steps'] === 'number'
                ? entry['steps'] as number
                : option !== null && option.defaults !== undefined && typeof option.defaults['steps'] === 'number' ? option.defaults['steps'] as number : undefined
              // THE ENTRY FACE (2026-09-21, the operator's "not just
              // MCPs"): a tile names its SELECTION. The catalog hit
              // names it (as before); else the entry's own pick
              // field names it — a select (served vocabulary) or a
              // file pick (media rows: the qvoice persona, the F54
              // ghost-parameter cure — a staged persona that tiles
              // as a bare 'Voice' hides which voice the run composes);
              // a served options list labels it, and an optionless
              // pick names its own value. Only then the id title and
              // the bare kind label fallbacks.
              const picked = (k.fields ?? []).find((f) =>
                (f.type === 'select' || f.type === 'file') && typeof entry[f.name] === 'string' && (entry[f.name] as string) !== '')
              const pickedLabel = picked === undefined ? null : (() => {
                const row = (picked.options ?? [])
                  .map((o) => typeof o === 'string' ? { value: o, label: o } : o)
                  .find((o) => o.value === entry[picked.name] as string)
                if (row !== undefined) return row.label
                // An option-less FILE pick names its own value (the
                // staged persona is the tile's identity, F54); an
                // option-less select keeps the kind-label fall (a
                // vocabulary field with no served rows names nothing).
                return picked.type === 'file' && (picked.options ?? []).length === 0 ? String(entry[picked.name]) : null
              })()
          return h(ModTile, {
            key: tileIds[i]!,
            tileId: tileIds[i]!,
            label: option !== null ? option.label : (pickedLabel !== null ? pickedLabel : (id !== '' ? titleCaseId(id) : (isOptionKind(k) ? k.label + ' ' + String(i + 1) : k.label))),
            ...(strength !== undefined ? { strength } : {}),
            ...(steps !== undefined ? { steps } : {}),
            // THE PRESENCE TILE: the chip's open gesture IS the
            // remove (the add menu put it on; clicking it takes it
            // off — the null delete lands at the bench). No editor
            // exists for a presence kind — named presence rides the
            // same law (the name was stated at add; the tile is not
            // an editor).
            onOpen: () => { if (presenceKind(k) || namedPresenceKind(k)) { commit(k, []); return } openEdit(k, i) },
            dragging: dragTile === tileIds[i]!,
            dragOver: overTile === tileIds[i]! && dragTile !== null && dragTile !== overTile,
            ...(ordered ? {
              onReorderStart: (id: string | null) => { setDragTile(id); if (id === null) setOverTile(null) },
              onReorderOver: setOverTile,
              onReorderDrop: (active: string, over: string) => {
                setDragTile(null); setOverTile(null); onTileDrop(k, active, over)
              },
            } : {}),
          })
          }),
        ]
      }),
      // THE ADD ROW (2026-09-13, the source-row law): the same
      // plus-square grammar as every input — a dashed empty square
      // with the plus glyph; the menu's first page lists the declared
      // mod kinds (the estate's kind vocabulary), the leaf's own image
      // inputs ride the SAME three-source square (the construction
      // law via useSquareProvider). One pattern, no exceptions.
      addable.length > 0
        // THE TIP LAW (S7 class-4 residue, 2026-11-05): the add
        // square's hover text rides the estate Tip (the DSH Tooltip,
        // layout.tsx) — the reference's trigger buttons carry hover
        // text through the Tooltip primitive (Rows.tsx:297,
        // TeamAction.tsx:92), never a native title.
        ? h(Tip, {
            tip: chromeCopy.addModifierTitle,
            children: h('button', {
              // ARGUED RAW SEAT (S7j, the tile-face class): the dashed
              // 64px add square is a TILE face, not a verb pill — a
              // Button conversion would pill it (the card-view add-tile
              // ruling, S6a/S6g).
              type: 'button',
              className: css.modAddSquare,
              'data-subcard-add': 'mod',
              'aria-label': chromeCopy.addModifierAria,
              onClick: (e: MouseEvent) => {
                setPickAt({ rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() })
              },
            }, h(IconPlusOutlineRegular, { className: css.squareGlyph })),
          })
        : null,
    ),
    // THE KIND PICKER — the DSH Menu (every declared kind is
    // renderable by construction; hiding one would be a second
    // procedural path around the declarative contract).
    pickAt !== null ? h(Menu, {
      open: true,
      anchor: null,
      getAnchorRect: () => pickAt.rect,
      items: addable.map((k) => ({ id: k.kind, label: k.label })),
      onSelect: (id: string) => {
        setPickAt(null)
        // (find! — the menu items derive 1:1 from addable in the same
        // render; onSelect fires only for a rendered item id.)
        openCreate(addable.find((x) => x.kind === id)!)
      },
      onClose: () => { setPickAt(null) },
      portal: true,
    }) : null,
    // THE LEAF MODAL (DSH) — the ONLY subcard editor. OPTION kinds:
    // pick a served row (strength seeded from the row's own default).
    // HYBRID kinds: the served row PLUS the bag element's fields
    // (the row's resolved facts stamp on save). FIELD kinds: the
    // kind's OWN fields through the constructor's atoms (image
    // fields get the square — the construction law).
    //
    // THE ACTION-CARD LAW (operator, 2026-10-08: "the form is too
    // tall, and has no scroll… based on the action card package,
    // instead of one long vertical stack"): the leaf popup rides the
    // action card's own shape — BOUNDED (never taller than the
    // viewport) and body-scrolling (the canvas seats at the top, the
    // knobs scroll under it). Same grammar as CardDrill/.wireDialog:
    // className lands on the modal card; max-height + overflow own
    // the scroll.
    // THE LIVE-KIND RE-RESOLUTION (the upload refresh, 2026-11-15):
    // the leaf seat captures its kind at OPEN time, but a host spec
    // refresh (the upload wire's stale-while-revalidate) re-serves
    // the kinds — an open leaf must serve the LIVE options (the
    // uploaded row pickable in the SAME session), never the stale
    // object it opened against. Identity = kind + param_key; a kind
    // the refresh retired keeps its last serve (the edit stays
    // honest — saveLeaf's refusal law still judges unknown rows).
    leaf !== null ? (() => {
      const live = kinds.find((k) => k.kind === leaf.kind.kind && k.param_key === leaf.kind.param_key) ?? leaf.kind
      return h(Modal, {
      open: true,
      onClose: () => { setLeaf(null) },
      title: leaf.mode === 'create' ? chromeCopy.leafCreateTitle({ kindLabel: live.label }) : chromeCopy.leafEditTitle({ kindLabel: live.label }),
      closeLabel: chromeCopy.leafCloseLabel,
      className: css.modLeafModal,
    },
      h(ModLeaf, { leaf: { ...leaf, kind: live }, values, hideFields: seated,
        // THE SECTION TOGGLE (operator 2026-11-16, §0.8): check
        // seeds the section's patch over the draft (staged files
        // stay — the seed never removes a hand value, last-writer
        // wins on shared dials); uncheck strips ONLY the keys
        // still equal to the seed — a hand-moved dial survives its
        // section's uncheck. A manual dial edit does NOT touch the
        // checkboxes (intent, not paint — the §0.5 cell-paint law
        // died with the pills).
        onDraft: {
          setDraftOption, setDraftStrength, setDraftSteps,
          draftOption, draftStrength, draftParams, draftSteps,
          setDraftParams,
        },
        onSectionToggle: (id: string) => {
          const def = (live.sections ?? []).find((s) => s.id === id)
          if (def === undefined) return
          const checked = leaf.sections ?? []
          if (checked.includes(id)) {
            const next: SpecValues = { ...draftParams }
            for (const [key, v] of Object.entries(def.patch)) {
              if (next[key] === v) delete next[key]
            }
            setDraftParams(next)
            setLeaf({ ...leaf, sections: checked.filter((s) => s !== id) })
          } else {
            setDraftParams({ ...draftParams, ...routeSectionPatch(live, def.patch, { setOption: setDraftOption, setStrength: setDraftStrength, setSteps: setDraftSteps }) })
            setLeaf({ ...leaf, sections: [...checked, id] })
          }
        }, onError: setLeafError, onSave: saveLeaf, onDelete: deleteLeaf, leafError, paintFace: props.paintFace, bboxFace: props.bboxFace, ...(props.orbitFace !== undefined ? { orbitFace: props.orbitFace } : {}), paintReferenceValue: typeof props.paintReference === 'string' ? String(values[props.paintReference] ?? '') : '', ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}),
        ...(props.loadChainRuns !== undefined ? { loadChainRuns: props.loadChainRuns } : {}),
        ...(props.uploadLora !== undefined ? { uploadLora: props.uploadLora } : {}),
        ...(props.refreshSpec !== undefined ? { refreshSpec: props.refreshSpec } : {}),
        ...(props.candidates !== undefined ? { candidates: props.candidates } : {}),
        ...(props.candidatesFor !== undefined ? { candidatesFor: props.candidatesFor } : {}),
        // THE MOD-KIND KNOB LAW (E2-7): the kind's own scalars ride
        // the leaf — the mod's face, the only seat a leaf-bearing
        // kind's knobs ever get (the section rows died with the
        // burn). Committed envelope-level like any card scalar, the
        // same commitScalar the leafless kinds still ride.
        kindScalars: { fields: live.kindFields ?? [], values, onCommit: commitScalar } }),
      )
    })() : null,
    // THE NAMED-PRESENCE POPUP (operator 2026-10-22: the Design mod
    // "has a popup, it can just be 'name'"): one field, two
    // controls — confirm states the chip (booleans true + the
    // name), cancel changes nothing. Empty stays lawful: the build
    // mints the save name.
    namedLeaf !== null ? h(Modal, {
      open: true,
      onClose: () => { setNamedLeaf(null) },
      title: chromeCopy.namedPresenceTitle({ kindLabel: namedLeaf.kind.label }),
      closeLabel: chromeCopy.leafCloseLabel,
      className: css.modLeafModal,
    },
      h('div', { className: css.modLeaf },
        // the string row's own atom (one text pattern estate-wide):
        // the field's served name rides, the label/placeholder own
        // the popup copy, the tooltip is the mint-fallback law.
        h(SpecAtom, {
          f: {
            name: namedFieldOf(namedLeaf.kind).name,
            label: chromeCopy.namedPresenceInputLabel,
            type: 'text',
            tooltip: chromeCopy.namedPresenceHint,
          },
          value: namedLeaf.name === '' ? undefined : namedLeaf.name,
          placeholder: chromeCopy.namedPresencePlaceholder,
          onEdit: (_, v) => { setNamedLeaf({ kind: namedLeaf.kind, name: typeof v === 'string' ? v : /* v8 ignore next -- the '' fallback is a type fence: this atom is SpecAtom's raw-string text seat, whose only edit channel is the DOM input's onChange handing e.target.value (a string, by the DOM contract); a second atom type at this popup seat would re-arm it */ '' }) },
        }),
        h('div', { className: css.modLeafActions },
          h(Button, {
            variant: 'ghost',
            onClick: () => { setNamedLeaf(null) },
          }, chromeCopy.namedPresenceCancel),
          h(Button, {
            variant: 'primary',
            onClick: () => {
              commit(namedLeaf.kind, [namedPresenceStamp(namedLeaf.kind, namedLeaf.name)])
              setNamedLeaf(null)
            },
          }, chromeCopy.namedPresenceCreate),
        ),
      ),
    ) : null,
  )
}

/** (F2, the front-end evasion audit 2026-11-07) THE PRESET SEAT
 *  ROUTER — one law, all three kind shapes: the patch's seats ride
 *  the drafts they own (a hybrid kind's option/scalar seats and an
 *  option kind's id/strength/steps seats live in their own drafts,
 *  never in params), and everything else rides the params object.
 *  Returns the params remainder — the caller seeds or merges it.
 *  Before this, the patch applied ONLY on the field-kind shapes: a
 *  lawful hybrid-kind section was a dead checkbox (registration
 *  admitted it, the face dropped it silently). */
function routeSectionPatch(
  k: ModifierKind, patch: SpecValues,
  drafts: { setOption: (v: string) => void; setStrength: (v: string) => void; setSteps?: (v: string) => void },
): SpecValues {
  const cell: SpecValues = { ...patch }
  const takeString = (seat: string, set: (v: string) => void): void => {
    if (typeof cell[seat] === 'string') { set(cell[seat] as string); delete cell[seat] }
  }
  const takeNumber = (seat: string, set: (v: string) => void): void => {
    if (typeof cell[seat] === 'number') { set(String(cell[seat])); delete cell[seat] }
  }
  if (isHybridKind(k)) {
    takeString(optionKeyOf(k), drafts.setOption)
    takeNumber(scalarKeyOf(k), drafts.setStrength)
  } else if (isOptionKind(k)) {
    takeString('id', drafts.setOption)
    takeNumber('strength', drafts.setStrength)
    /* v8 ignore else -- the implicit skip is a type fence: the section check (the one live routeSectionPatch caller) always passes setSteps, so the guard is always true where the option branch evaluates; a routeSectionPatch call that omits setSteps on an option kind would re-arm the path */
    if (drafts.setSteps !== undefined) takeNumber('steps', drafts.setSteps)
  }
  return cell
}

/** THE LEAF BODY — split so the FIELD-kind editor gets its own
 *  square provider (the construction law: an image input constructs
 *  the square automatically, even inside a mod leaf). */
function ModLeaf(props: {
  leaf: LeafSeat
  hideFields?: ReadonlySet<string>
  values: SpecValues
  onDraft: {
    setDraftOption: (v: string) => void
    setDraftStrength: (v: string) => void
    setDraftParams: (v: SpecValues) => void
    setDraftSteps: (v: string) => void
    draftOption: string
    draftStrength: string
    draftParams: SpecValues
    draftSteps: string
  }
  onError: (e: string | null) => void
  onSave: () => void
  onDelete: () => void
  leafError: string | null
  /** THE SECTION TOGGLE (operator 2026-11-16, §0.8 THE FLOW
   *  MODEL): the parent's checkbox law — check seeds the section's
   *  patch (the parent merges over the draft); uncheck strips the
   *  seed-only keys in the parent. Absent = the kind carries no
   *  sections (the degrade law). */
  onSectionToggle?: (id: string) => void
  /** THE PAINT FACE (leaf_face kinds): the host's brush canvas —
   *  EMBEDDED at the top of the leaf (absent host = no canvas, the
   *  square holds — graceful). */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78, embedded stroke 95): same law —
   *  absent host = the four number inputs hold. */
  bboxFace?: BboxFaceComponent
  /** THE ORBIT FACE (the reshoot orb, 2026-11-15): same law —
   *  absent host = the three number dials hold (graceful). */
  orbitFace?: OrbitFaceComponent
  paintReferenceValue: string
  /** The host's media source — the leaf's image inputs pick from
   *  the library like a card's. */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
  /** THE CHAIN-RUN SOURCE (the upscale leaf's picker): threaded
   *  from the constructor's wire; absent → the plain text input. */
  loadChainRuns?: (signal: AbortSignal) => Promise<ChainRunCandidate[]>
  /** THE LORA UPLOAD SOURCE (2026-11-15): the host's estate
   *  transport with its own family resolution; absent → the
   *  OPTION-kind leaf renders no add-lora menu (the degrade law).
   *  `name` is the add-lora menu's RENAME (the door seats the row
   *  under it); absent = the picked file's own name. */
  uploadLora?: (file: File, opts: { strength?: number, name?: string }) => Promise<{
    id: string
    default_strength?: number
    row_seated: boolean
    refusal?: string
  }>
  /** THE SAME-SESSION REFRESH (rides the upload wire): stale-while-
   *  revalidate form-spec refetch after a landed row. */
  refreshSpec?: () => Promise<void>
  /** the flow rows + per-field narrowing (E2-11a — see the section's own props). */
  candidates?: Array<{ id: string; label: string; url: string }>
  candidatesFor?: (f: SpecField) => Array<{ id: string; label: string; url: string }>
  /** THE MOD-KIND KNOB LAW (E2-7): the kind's own scalars — rendered
   *  INSIDE the leaf (the mod's face), committed envelope-level the
   *  moment they change. Absent (the leafless kinds' section rows
   *  own their own face) = no block. */
  kindScalars?: {
    fields: readonly SpecField[]
    values: SpecValues
    onCommit: (f: SpecField, name: string, v: unknown) => void
  }
}): ReturnType<typeof h> {
  const { leaf, onDraft, onSave, onDelete, leafError } = props
  const k = leaf.kind
  const hidden = props.hideFields
  // THE HAND-UPLOAD MENU (2026-11-15, the operator's layout order:
  // "the strength and the lora picker ... on the same row. I also
  // need the 'add lora' gated behind the button next to apply. That
  // way, it is a seperate menu, with a back button and you can
  // upload, rename, and set default strength, then hit apply."):
  // the pick face owns ONE row (picker + strength); the upload is
  // its OWN pane inside the same leaf — file, rename, default
  // strength — entered from the add-lora button beside Apply and
  // left by Back (discarding the pending file) or Apply (uploading
  // it and re-opening the pick face with the new row seated). The
  // file rides the host's wire (the door POSTs raw octet-stream
  // bytes and seats the row itself — LAND = SEATED, no restart);
  // the answer's combo name IS the bag id (never a hand-spelled
  // one); the stale-while-revalidate refresh re-serves the picker so
  // the row is pickable in the SAME session. Absent wire = no
  // add-lora button at all (the degrade law, below).
  const [leafPane, setLeafPane] = useState<'pick' | 'upload'>('pick')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadStrength, setUploadStrength] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  /** the picked file's own suffix — a stem rename keeps it (the
   *  door's one-segment filename IS the seated row's id). */
  const uploadExt = (): string =>
    pendingFile === null ? /* v8 ignore next -- the '' fallback is a type fence: applyUpload is the sole reader of this suffix and its own guard refuses a null pendingFile before the call (uploadBusy/pendingFile === null early return), so the state is always a picked file here; a second suffix reader over a cleared seat would re-arm it */ '' : (/\.[A-Za-z0-9]+$/.exec(pendingFile.name)?.[0] ?? '')
  /** the menu's file pick: DEFERRED — nothing rides the wire until
   *  Apply (the rename + default strength are authored first). */
  const pickUpload = (file: File): void => {
    setPendingFile(file)
    setUploadName(file.name)
    props.onError(null)
  }
  /** Back: leave the upload pane empty-handed — the pending file is
   *  discarded, never silently half-committed. */
  const leaveUpload = (): void => {
    setLeafPane('pick')
    setPendingFile(null)
    setUploadName('')
    setUploadStrength('')
  }
  const applyUpload = (): void => {
    const wire = props.uploadLora
    if (wire === undefined || uploadBusy || pendingFile === null) return
    setUploadBusy(true)
    const n = Number(uploadStrength)
    const ext = uploadExt()
    const typed = uploadName.trim()
    const stem = typed === '' ? pendingFile.name : typed
    // THE RENAME KEEPS THE EXTENSION: the door seats the row under
    // this filename, so a typed stem rides the picked file's suffix
    // (typing the suffix too is idempotent, never doubled).
    const name = ext === '' || stem.toLowerCase().endsWith(ext.toLowerCase()) ? stem : stem + ext
    void wire(pendingFile, {
      ...(uploadStrength !== '' && Number.isFinite(n) ? { strength: n } : {}),
      ...(name !== pendingFile.name ? { name } : {}),
    })
      .then(async (answer) => {
        if (answer.row_seated) {
          // the seated combo name is the id the bag commits; blank
          // strength rides the ROW's new default (the create seed
          // law reads it off the refreshed option)
          onDraft.setDraftOption(answer.id)
          onDraft.setDraftStrength('')
          props.onError(null)
          if (props.refreshSpec !== undefined) await props.refreshSpec()
          // the pick face re-opens with the new row seated — the
          // operator never hunts for the menu they just left
          setLeafPane('pick')
          setPendingFile(null)
          setUploadName('')
          setUploadStrength('')
        } else {
          props.onError(answer.refusal ?? chromeCopy.loraUploadRefusedNote)
        }
      })
      .catch((e: unknown) => { props.onError(rejectionVoice(e)) })
      .finally(() => { setUploadBusy(false) })
  }
  // THE EMBEDDED CANVAS (stroke 95 — the operator's design: the
  // mod popup CARRIES the visual preview): a leaf_face kind with a
  // host-delivered face renders the canvas at the TOP of the leaf.
  // The bbox canvas owns the entry's four bbox_* fields (they are
  // faceOwned — they never render as raw inputs when the canvas
  // does); the paint canvas owns the kind's FIRST image field (the
  // payload — the same field the three-source square writes).
  // Absent host = no canvas (the degrade law: every field,
  // faceOwned included, renders — the plain inputs hold).
  const bboxCanvas = props.bboxFace !== undefined && k.leaf_face === 'bbox-canvas'
  const paintField = props.paintFace !== undefined && k.leaf_face === 'paint-canvas'
    ? (k.fields ?? []).find((f) => f.type === 'image' || f.wtype === 'image')
    : undefined
  // THE ORBIT ORB (the reshoot orb, 2026-11-15): the host's
  // camera-pose orb for orbit-canvas kinds — EMBEDDED above the
  // field stack. The orb is ADDITIVE (never faceOwned): it writes
  // the SAME orbit/tilt/dolly draft seats the number dials write
  // (ONE TRUTH, two views of one draft), so the dials stay.
  const orbitCanvas = props.orbitFace !== undefined && k.leaf_face === 'orbit-canvas'
  // the orb's pose read (the draft's own seats, kind defaults as fallback)
  const draftPose = (): { orbit: number; tilt: number; dolly: number } => {
    const num = (v: unknown, fb: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : fb;
    const fieldDefault = (name: string, fb: number): number => {
      const f = (k.fields ?? []).find((ff) => ff.name === name);
      return typeof f?.default === 'number' && Number.isFinite(f.default) ? f.default : fb;
    };
    return {
      orbit: num(onDraft.draftParams['orbit'], fieldDefault('orbit', 0)),
      tilt: num(onDraft.draftParams['tilt'], fieldDefault('tilt', 0)),
      dolly: num(onDraft.draftParams['dolly'], fieldDefault('dolly', 1)),
    };
  };
  const facePresent = bboxCanvas || paintField !== undefined
  // reads the draft's quad (all four present, finite, ≥0 = set)
  const draftQuad = (): { x: number; y: number; width: number; height: number } | null => {
    const quad = [onDraft.draftParams['bbox_x'], onDraft.draftParams['bbox_y'], onDraft.draftParams['bbox_w'], onDraft.draftParams['bbox_h']]
    return quad.every((v) => typeof v === 'number' && Number.isFinite(v) && (v as number) >= 0)
      ? { x: quad[0] as number, y: quad[1] as number, width: quad[2] as number, height: quad[3] as number }
      : null
  }
  // writes the draft's quad (null = the four ride their unset
  // sentinel, -1 — the entry's declared default)
  const writeQuad = (b: { x: number; y: number; width: number; height: number } | null): void => {
    onDraft.setDraftParams(b === null
      ? { ...onDraft.draftParams, bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1 }
      : { ...onDraft.draftParams, bbox_x: Math.round(b.x), bbox_y: Math.round(b.y), bbox_w: Math.round(b.width), bbox_h: Math.round(b.height) })
  }
  // THE BAG IS THE SEAT, NEVER A FIELD (2026-11-15, the operator's
  // Fibo LoRA burn): the envelope's root dict carries the bag param
  // itself (`loras`, `mask`) beside the entry's own knobs. The leaf
  // EDITS that bag — rendering it as a row asked the operator to type
  // the whole bag as text ("The Fibo lora is freeform text"), and the
  // compose door refuses every such literal (`unknown-lora`). Excluded
  // by IDENTITY against the served param_key, never by a kind name: a
  // bag container is a bag container on every pack.
  const leafFields: SpecField[] = (k.fields ?? []).filter((f) =>
    f.name !== k.param_key
    && !(hidden?.has(f.name) ?? false) && !(facePresent && f.faceOwned === true)
    // THE MASTER MODAL'S SUBMENUS (slice 5, 2026-11-16): the riding
    // fields - scale under the refine switch, extend_seconds under
    // the continuation, the mask fields under their own source -
    // declare their visibility through the ONE grammar every card
    // face already interprets (fieldVisible, spec.ts:707); the leaf
    // is the last face to adopt it. The draft is the judge: a switch
    // flip re-seats the row in the SAME open modal, never a second
    // editor. Hidden values stay graph-neutral (compose judges the
    // inert law; the save keeps whatever the draft carried).
    && fieldVisible(f, onDraft.draftParams))
  // THE MODIFIER SECTIONS (operator 2026-11-16, §0.8 THE FLOW
  // MODEL — "check the box, behind the scenes the special nodes
  // are used"): the kind's checkable stages ride the modal's own
  // head as CHECKBOXES — the flow face. Check = the parent seeds
  // the section's patch over the draft; uncheck = the parent
  // strips the seed-only keys; the slots below the row are the
  // checked sections' ingredients (the video mask, the reference
  // still). NO NAMED PILLS anywhere (§0.7): the pills' names died
  // with the two swap rows and the static-mask duplicate — one
  // section per modifier, the variant is a dial.
  const leafSections = k.sections ?? []
  const sectionRow = leafSections.length > 0 && props.onSectionToggle !== undefined
    ? h('div', { className: css.modSectionRow, 'data-mod-sections': k.param_key },
        leafSections.map((s) =>
          h('label', { key: s.id, className: css.modSection, 'data-mod-section': s.id },
            h('input', {
              type: 'checkbox',
              'aria-label': s.label,
              checked: (leaf.sections ?? []).includes(s.id),
              onChange: () => { props.onSectionToggle!(s.id) },
            }),
            // (the class-4 tip law: hover prose rides the estate Tip,
            // never a bare native title — the same channel the add
            // square's hint rides)
            h(Tip, { tip: s.tooltip ?? s.label, children: h('span', { className: css.modSectionLabel }, s.label) }))))
    : null
  // THE CONDITIONAL-REQUIRED STAR (2026-10-12, the sam3 prompt law):
  // the leaf's captions hand-roll — the star paints HERE too, judged
  // against the draft's own sibling values (the same fieldRequired
  // SpecFieldRow rides; a required-when state shows its demand
  // BEFORE the Run press, never at phase 1)
  const leafStar = (f: SpecField): ReturnType<typeof h> | null =>
    fieldRequired(f, onDraft.draftParams) ? h('span', { className: css.specRequired }, ' *') : null
  // the FIELD-kind leaf's own provider: the mod's image inputs get
  // the three verbs (upload/drop/pick) exactly like a card's
  const own = useSquareProvider(
    (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
    // THE REGION-MASK PICKER LAW (E2-11a): the leaf's From-flow
    // picker serves the HOST's rows — the bench's other stages'
    // artifacts, narrowed by the host's own edge law when it
    // declares one. The structurally-empty list this provider once
    // hardcoded shipped "nothing to pick yet" beside a run mask
    // node — the picker's honest empty is an artifact-less bench,
    // never a seam that forgot its rows.
    {
      ...(props.candidates !== undefined ? { candidates: props.candidates } : { candidates: [] as Array<{ id: string; label: string; url: string }> }),
      ...(props.candidatesFor !== undefined ? { candidatesFor: props.candidatesFor } : {}),
      ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}),
    },
  )
  // THE KIND GATE, READ ONCE (the option leaf's own branch AND the
  // actions row's add-lora button judge the SAME answer — a second
  // read would re-judge a catalog the estate may withdraw mid-render;
  // the vanishing-rows arms count this read).
  const optionKind = isOptionKind(k)
  return h('div', { className: css.modLeaf },
    leafError !== null ? h('p', { className: css.modLeafError }, leafError) : null,
    isHybridKind(k)
      ? h('div', { className: css.modLeafFields },
          // (F2) the section checkboxes ride the hybrid arm too —
          // the sections are the kind's OWN stages, and the patch
          // routes into this shape's drafts (one door, every shape)
          sectionRow,
          // THE HYBRID LEAF (the retired subcard, 1:1): the catalog
          // select binds option_key in BOTH modes (a type switch
          // re-stamps model/preprocessor on save); the bag element's
          // remaining fields render through the constructor's atoms
          // (the conditioning image gets the square — the
          // construction law). A drifted type stays VISIBLE, marked
          // unregistered, and refuses at save — never a silent blank.
          // S7i: the DSH Menu idiom (atoms' SpecMenuSelect) — the
          // caption rides a span (the slot law this file already
          // seats at its square branch), the trigger carries the
          // accessible name. The native option tooltips died with
          // the select — the catalog's MenuItem ships no title
          // channel; the row label is the face.
          h('div', { className: css.modField },
            h('span', null, k.label),
            h(SpecMenuSelect, {
              label: k.label,
              value: onDraft.draftOption,
              rows: catalogRows(k, onDraft.draftOption),
              onPick: (id: string) => { onDraft.setDraftOption(id) },
            }),
          ),
          h('label', { className: css.modField },
            (k.fields ?? []).find((f) => f.name === scalarKeyOf(k))?.label ?? 'Strength',
            h(Input, {
              type: 'number',
              step: '0.05',
              value: onDraft.draftStrength,
              placeholder: chromeCopy.rowDefaultPlaceholder,
              onChange: (e: { target: { value: string } }) => { onDraft.setDraftStrength(e.target.value) },
            }),
          ),
          (k.fields ?? []).filter((f) => f.name !== optionKeyOf(k) && f.name !== scalarKeyOf(k) && !(hidden?.has(f.name) ?? false))
            .map((f) => {
              // THE UNWRAPPED SQUARE (2026-09-21, the operator's
              // "opens the full file system when I didn't click
              // it"): the square carries a hidden file input, and a
              // wrapping <label> forwards ANY row click to it — the
              // OS dialog opens when the user only clicked the
              // caption. Slot-shaped fields render the caption + atom
              // as siblings in a div (the card face's specSlotCell
              // law); scalars keep the label (click-to-focus stays).
              const sq = own.square(f)
              const atom = h(SpecAtom, {
                f,
                value: onDraft.draftParams[f.name] ?? f.default,
                // THE LEAF'S PATCH BOUNDARY (the sam_threshold cure,
                // 2026-11-05): SpecAtom hands back e.target.value —
                // the card face coerces at its own onSet (form.tsx);
                // the mod leaf's draft is THIS lane's patch boundary,
                // so the coerce rides here (never at save, never
                // scattered Number() at the consumers).
                onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: coerceFieldEdit(f, v) }) },
                // THE DUPLICATE-LABEL LAW: the caption span above owns
                // the visible name — the square paints none (2026-11-12,
                // the operator burn: every seat listed twice in the
                // Replace leaf)
                hideSquareLabel: true,
                ...(sq !== undefined ? { square: sq } : {}),
              })
              const caption = h('span', { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name, leafStar(f))
              return sq !== undefined
                ? h('div', { key: f.name, className: css.modField }, caption, atom)
                : h('label', { key: f.name, className: css.modField }, caption, atom)
            }),
          own.wireMenu,
        )
      : optionKind
      ? (() => {
          const pickRows = catalogRows(k, onDraft.draftOption)
          // the empty roster is the PICKER's state, never a second
          // control: catalogRows carries the placeholder alone when
          // the catalog serves nothing
          const emptyRoster = pickRows.length === 1
          // ── THE ADD-LORA PANE (the operator's layout order,
          // 2026-11-15: "'add lora' gated behind the button next to
          // apply. That way, it is a seperate menu, with a back
          // button and you can upload, rename, and set default
          // strength, then hit apply") — the bag's pick face stays
          // one compact row; the upload is a deliberate MENU entered
          // from the actions row and left by Back / Apply. The file
          // is DEFERRED here: nothing rides the wire until Apply.
          if (leafPane === 'upload') {
            return h('div', { className: css.modLeafFields, 'data-leaf-pane': 'upload' },
              h('div', { className: css.modFieldPair },
                h('div', {
                  className: css.modField,
                  'data-testid': 'mod-lora-upload',
                  title: chromeCopy.loraUploadHint,
                },
                h(InputSquare, {
                  label: chromeCopy.loraUploadVerb,
                  onFile: pickUpload,
                  accept: LORA_ACCEPT, // the SSOT list, never a hand-spelled copy (lora audit F2)
                  disabled: uploadBusy,
                }),
                pendingFile !== null
                  ? h('span', { className: css.modLeafHint, 'data-upload-picked': pendingFile.name }, pendingFile.name)
                  : null,
                ),
                h('label', { className: css.modField },
                  chromeCopy.loraUploadStrengthLabel,
                  h(Input, {
                    type: 'number',
                    step: '0.05',
                    min: '0',
                    max: '2',
                    'aria-label': chromeCopy.loraUploadStrengthLabel,
                    title: chromeCopy.loraUploadStrengthTitle,
                    placeholder: chromeCopy.loraUploadStrengthPlaceholder,
                    value: uploadStrength,
                    disabled: uploadBusy,
                    onChange: (e: { target: { value: string } }) => { setUploadStrength(e.target.value) },
                  }),
                ),
              ),
              // THE RENAME: the file's name on the engine's shelf —
              // the id the picker commits after the upload. A text
              // box is the RIGHT seat HERE (naming your own file is
              // authoring, not catalog selection — the pick face
              // stays picker-only, the operator's LoRA law above).
              h('label', { className: css.modField },
                chromeCopy.loraNameLabel,
                h(Input, {
                  type: 'text',
                  'aria-label': chromeCopy.loraNameLabel,
                  placeholder: chromeCopy.loraNamePlaceholder,
                  value: uploadName,
                  disabled: uploadBusy || pendingFile === null,
                  onChange: (e: { target: { value: string } }) => { setUploadName(e.target.value) },
                }),
              ),
            )
          }
          // ── THE PICK PANE — ONE ROW (the operator's order: "I need
          // the strength and the lora picker to be on the same row"):
          // the catalog IS the seat (the picker never becomes a text
          // box, empty roster included — the Fibo burn's cure), the
          // dial beside it is the use's strength.
          return h('div', { className: css.modLeafFields, 'data-leaf-pane': 'pick' },
            // THE POSTURE SWITCHES (the one-door law, 2026-11-16): the
            // option shape rides the SAME posture seat as the field and
            // hybrid leaves — the named cells ride the modal's head for
            // every kind shape (the outer chips are gone; this row is
            // the only posture door, and it renders for all three).
            sectionRow,
            // THE ONE-ROW SEAT: the bag is authored in one glance —
            // the picker takes the width, the strength dial keeps its
            // intrinsic width.
            h('div', { className: css.modFieldPair },
              // THE CATALOG SELECT binds the row id in BOTH modes (the
              // hybrid leaf's own symmetry; F4's repair path, 2026-10-31):
              // a keyless legacy row re-keys by picking a served row, a
              // drifted id stays VISIBLE, marked unregistered, and the
              // save follows the select (never a silent blank).
              // S7i: same idiom, same rows — the hybrid leaf's picker is
              // the construct seat's twin (F4's symmetry)
              //
              // THE EMPTY ROSTER IS STILL THE PICKER (2026-11-15, the
              // operator's Fibo LoRA burn — "I think the trigger is when
              // it has 0 loras available"): with no rows served the seat
              // renders the picker's OWN empty face alone, never a
              // freeform box. The face names the state; the pick stays
              // impossible until a row exists, which is the truth (the
              // compose door refuses any unseated name). The add-lora
              // menu beside Apply is where a row comes from.
              h('div', { className: css.modField },
                h('span', null, k.label),
                h(SpecMenuSelect, {
                  label: k.label,
                  value: onDraft.draftOption,
                  rows: pickRows,
                  ...(emptyRoster ? { face: chromeCopy.optionRosterEmptyFace } : {}),
                  onPick: (id: string) => { onDraft.setDraftOption(id) },
                }),
              ),
              h('label', { className: css.modField },
                'Strength',
                h(Input, {
                  type: 'number',
                  step: '0.05',
                  value: onDraft.draftStrength,
                  placeholder: chromeCopy.rowDefaultPlaceholder,
                  onChange: (e: { target: { value: string } }) => { onDraft.setDraftStrength(e.target.value) },
                }),
              ),
            ),
            emptyRoster
              ? h('p', { className: css.modHint, 'data-mod-roster-empty': k.param_key }, chromeCopy.optionRosterEmptyHint)
              : null,
          // STEPS APPLIED (2026-09-18, the operator's plaguekind
          // law): option kinds whose served rows carry a distill
          // step count render the row here — one lora for four
          // steps, another for eight; blank rides the row default,
          // the compose honors it when the caller pins nothing. The
          // SERVED defaults drive the render (never the kind name).
          // RANGE (the 4-to-8 correction): the SELECTED row's
          // declared domain bounds the dial and states itself in
          // the label — a 4-to-8 adapter reads "Steps applied 4–8",
          // never a naked number lying about a range.
          (k.options ?? []).some((o) => typeof o.defaults?.steps === 'number')
            ? (() => {
                const rowOpts = (k.options ?? [])
                const activeRow = rowOpts.find((o) => o.value === onDraft.draftOption) ?? rowOpts[0]
                const rMin = activeRow?.defaults?.steps_min
                const rMax = activeRow?.defaults?.steps_max
                const rangeText = typeof rMin === 'number' && typeof rMax === 'number' && rMin !== rMax
                  ? chromeCopy.stepsRange({ min: rMin, max: rMax })
                  : typeof activeRow?.defaults?.steps === 'number'
                    ? chromeCopy.fixedAtSteps({ steps: activeRow.defaults.steps })
                    : ''
                return h('label', { className: css.modField },
                chromeCopy.stepsAppliedLabel + rangeText,
                h(Input, {
                  'aria-label': chromeCopy.stepsAppliedLabel,
                  type: 'number',
                  step: '1',
                  min: typeof rMin === 'number' ? String(rMin) : undefined,
                  max: typeof rMax === 'number' ? String(rMax) : undefined,
                  value: onDraft.draftSteps,
                  placeholder: String(activeRow?.defaults?.steps ?? ''),
                  title: typeof rMin === 'number' && typeof rMax === 'number' && rMin !== rMax
                    ? chromeCopy.adapterRangeTitle({ min: rMin, max: rMax })
                    : chromeCopy.distillStepsTitle,
                  onChange: (e: { target: { value: string } }) => { onDraft.setDraftSteps(e.target.value) },
                }),
              )
              })()
            : null,
          )
        })()
      : // THE ACTION-CARD SPLIT (the operator's 2026-10-08 law: the
        // leaf is "based on the action card package, instead of one
        // long vertical stack" — the SAME grammar as CardDrill's
        // params-left / preview-right): a face-bearing leaf seats
        // the canvas LEFT and the knobs RIGHT; a faceless leaf keeps
        // the single column (nothing to split around).
        (bboxCanvas || paintField !== undefined || orbitCanvas)
        ? h('div', { className: css.modLeafSplit },
            h('div', { className: css.modLeafStage, 'data-leaf-stage': bboxCanvas ? 'bbox' : orbitCanvas ? 'orbit' : 'paint' },
              // THE REGION CAPTION (the operator's correction,
              // 2026-10-08: "BBOX IS NOT MANUAL, IT IS AUTOMATED" —
              // Impact Pack's boxes come from the DETECTOR, so this
              // canvas is NOT a box filter; it is an optional search
              // REGION scoping the selection. No region (or Clear)
              // runs over the WHOLE image).
              bboxCanvas && props.bboxFace !== undefined
                ? h('div', { className: css.modStageCaption, 'data-stage-caption': 'region' },
                    'Region — optional (scopes the search; clear = whole image)')
                : null,
              bboxCanvas && props.bboxFace !== undefined
                ? h('div', { className: css.modField, 'data-leaf-canvas': 'bbox' },
                    h(props.bboxFace, {
                      referenceUrl: props.paintReferenceValue,
                      value: draftQuad(),
                      onChange: writeQuad,
                    }))
                : null,
              paintField !== undefined && props.paintFace !== undefined
                ? h('div', { className: css.modField, 'data-leaf-canvas': 'paint' },
                    h(props.paintFace, {
                      referenceUrl: props.paintReferenceValue,
                      value: typeof onDraft.draftParams[paintField.name] === 'string' ? onDraft.draftParams[paintField.name] as string : '',
                      onChange: (dataUrl: string) => { onDraft.setDraftParams({ ...onDraft.draftParams, [paintField.name]: dataUrl }) },
                    }))
                : null,
              orbitCanvas && props.orbitFace !== undefined
                ? h('div', { className: css.modField, 'data-leaf-canvas': 'orbit' },
                    h(props.orbitFace, {
                      value: draftPose(),
                      onChange: (pose: { orbit: number; tilt: number; dolly: number }) => { onDraft.setDraftParams({ ...onDraft.draftParams, orbit: pose.orbit, tilt: pose.tilt, dolly: pose.dolly }) },
                    }))
                : null,
            ),
            h('div', { className: css.modLeafFields },
              sectionRow,
              // THE SECTION CAPTION (2026-10-08, the operator's
              // demand — "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"):
              // the kind's declared one-line name for what the
              // stack IS, seated above the fields — the detector
              // arms' chips + confidence ARE the bbox filter, and
              // the caption says so (a caption-less stack reads as
              // loose inputs).
              k.section !== undefined
                ? h('div', { className: css.modStageCaption, 'data-stage-caption': 'filter' }, k.section)
                : null,
              leafFields.map((f) => h('div', { key: f.name },
                (() => {
                  // THE UNWRAPPED SQUARE (same law as the hybrid arm
                  // above): a slot-shaped entry field is caption +
                  // atom siblings, never label-wrapped — else the row
                  // caption opens the OS file dialog through the
                  // square's hidden input.
                  const sq = own.square(f)
                  // THE CHAIN-RUN SEAT (the upscale leaf's picker): a
                  // `chain-run` field renders the LIVE picker, never
                  // the bare text atom (the free-text burn's cure —
                  // the picker's own degrade law lives in it).
                  const atom = f.type === 'chain-run'
                    ? h(ChainRunPicker, {
                        f,
                        value: onDraft.draftParams[f.name],
                        onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: coerceFieldEdit(f, v) }) },
                        ...(props.loadChainRuns !== undefined ? { loadChainRuns: props.loadChainRuns } : {}),
                      })
                    : h(SpecAtom, {
                    f,
                    value: onDraft.draftParams[f.name],
                    // the leaf's patch boundary (see the hybrid arm)
                    onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: coerceFieldEdit(f, v) }) },
                    // THE DUPLICATE-LABEL LAW: the caption span above owns
                // the visible name — the square paints none (2026-11-12,
                // the operator burn: every seat listed twice in the
                // Replace leaf)
                    hideSquareLabel: true,
                    ...(sq !== undefined ? { square: sq } : {}),
                  })
                  return sq !== undefined
                    ? h('div', { className: css.modField },
                        h('span', { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name, leafStar(f)),
                        atom)
                    : h('label', { className: css.modField },
                        f.label ?? f.name,
                        leafStar(f),
                        atom)
                })(),
              )),
              own.wireMenu,
            ))
        : h('div', { className: css.modLeafFields },
          sectionRow,
          // THE EMBEDDED CANVAS (stroke 95, the faceless-fallback
          // shape): a canvas the kind declares but the host did not
          // deliver can never mount — this arm renders the plain
          // fields alone. The section caption rides here too (the
          // filter's name never depends on the host's faces).
          k.section !== undefined
            ? h('div', { className: css.modStageCaption, 'data-stage-caption': 'filter' }, k.section)
            : null,
          leafFields.map((f) => h('div', { key: f.name },
            (() => {
              const sq = own.square(f)
              // THE CHAIN-RUN SEAT (see the canvas-present arm above):
              // the picker rides BOTH plain arms — the face's presence
              // never decides the run seat's shape.
              const atom = f.type === 'chain-run'
                ? h(ChainRunPicker, {
                    f,
                    value: onDraft.draftParams[f.name],
                    onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: coerceFieldEdit(f, v) }) },
                    ...(props.loadChainRuns !== undefined ? { loadChainRuns: props.loadChainRuns } : {}),
                  })
                : h(SpecAtom, {
                f,
                value: onDraft.draftParams[f.name],
                // the leaf's patch boundary (see the hybrid arm)
                onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: coerceFieldEdit(f, v) }) },
                // THE DUPLICATE-LABEL LAW: the caption span above owns
                // the visible name — the square paints none (2026-11-12,
                // the operator burn: every seat listed twice in the
                // Replace leaf)
                hideSquareLabel: true,
                ...(sq !== undefined ? { square: sq } : {}),
              })
              return sq !== undefined
                ? h('div', { className: css.modField },
                    h('span', { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name, leafStar(f)),
                    atom)
                : h('label', { className: css.modField },
                    f.label ?? f.name,
                    leafStar(f),
                    atom)
            })(),
          )),
          own.wireMenu,
        ),
    // THE MOD-KIND KNOB LAW (E2-7 — the operator's burn: "WHY AM I
    // SEEING CONTROLNET STRENGTH FLOOR OUTSIDE OF THE CONTROLNET
    // MOD?"): the kind's own scalars seat HERE, inside the mod's
    // face, below the entry rows — committed envelope-level the
    // moment they change (the same commit the leafless kinds' section
    // rows ride). Never a section-level row beside the tiles again.
    ...(props.kindScalars !== undefined && props.kindScalars.fields.length > 0
      ? [h('div', { className: css.modLeafFields, 'data-leaf-kind-scalars': k.kind },
          props.kindScalars.fields.map((f) =>
            h('label', { key: f.name, className: css.modField },
              f.label ?? f.name,
              h(SpecAtom, {
                f,
                value: props.kindScalars!.values[f.name] ?? f.default,
                onEdit: (name: string, v: unknown) => { props.kindScalars!.onCommit(f, name, v) },
              }),
            ),
          ),
        )]
      : []),
    h('div', { className: css.modLeafActions },
      // ── THE ADD-LORA MENU'S OWN ACTION PAIR (the operator's layout
      // order, 2026-11-15: the upload menu carries "a back button"
      // and the operator "hit[s] apply"): Back discards the pending
      // file; Apply is the commit — disabled until a file is picked
      // (nothing to upload otherwise).
      optionKind && props.uploadLora !== undefined && leafPane === 'upload'
        ? [h(Button, { key: 'back', variant: 'ghost', onClick: leaveUpload }, chromeCopy.loraBackButton),
            h(Button, {
              key: 'apply-upload',
              variant: 'primary',
              onClick: applyUpload,
              ...(pendingFile === null || uploadBusy ? { disabled: true } : {}),
            }, chromeCopy.loraApplyButton)]
        : [
            h(Button, { key: 'save', variant: 'primary', onClick: onSave }, leaf.mode === 'create' ? 'Add' : 'Save'),
            leaf.mode === 'edit'
              ? h(Button, { key: 'remove', variant: 'ghost', onClick: onDelete }, 'Remove')
              : null,
            // THE ADD-LORA DOOR (the operator's order: "'add lora'
            // gated behind the button next to apply"): the upload is
            // its own menu — this button opens it, the pick face
            // never carries the file square inline.
            optionKind && props.uploadLora !== undefined
              ? h(Button, { key: 'add-lora', variant: 'ghost', onClick: () => { setLeafPane('upload') } }, chromeCopy.loraAddButton)
              : null,
          ],
    ),
  )
}

/** One mod tile (the original, verbatim: useSortable + click to
 *  edit + strength to 2 decimals). */
/** The reorder drag's MIME (native HTML5 sortable). */
const MOD_DRAG_MIME = 'application/x-melite-mod'

function ModTile(props: {
  tileId: string
  label: string
  strength?: number
  /** The EFFECTIVE step count (entry claim ?? row default) — the
   *  distill choice made visible beside strength (#38). */
  steps?: number
  onOpen: () => void
  dragging: boolean
  dragOver: boolean
  /** THE CATEGORY GATE (stroke 78): absent reorder handlers = a
   *  STANDALONE tile — not draggable (each entry is its own output;
   *  array order is semantically void). */
  onReorderStart?: (id: string | null) => void
  onReorderOver?: (id: string) => void
  onReorderDrop?: (active: string, over: string) => void
}): ReturnType<typeof h> {
  const ordered = props.onReorderStart !== undefined
  return h('li', {
    className: css.modTile
      + (props.dragging ? ' ' + css.tileDragging : '')
      + (props.dragOver ? ' ' + css.modTileOver : ''),
    draggable: ordered,
    'data-mod-tile': props.tileId,
    title: ordered ? chromeCopy.tileOrderedTitle : chromeCopy.tileStandaloneTitle,
    onDragStart: (e: React.DragEvent) => {
      if (!ordered) return
      e.dataTransfer.setData(MOD_DRAG_MIME, props.tileId)
      e.dataTransfer.effectAllowed = 'move'
      props.onReorderStart!(props.tileId)
    },
    onDragEnd: () => { if (ordered) props.onReorderStart!(null) },
    onDragOver: (e: React.DragEvent) => {
      if (!ordered) return
      if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        props.onReorderOver!(props.tileId)
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (!ordered) return
      if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        const active = e.dataTransfer.getData(MOD_DRAG_MIME)
        if (active !== '' && active !== props.tileId) props.onReorderDrop!(active, props.tileId)
      }
    },
    onClick: props.onOpen,
  },
    h('span', { className: css.modTileLabel }, props.label),
    props.strength !== undefined
      ? h('span', { className: css.modTileStrength }, props.strength.toFixed(2))
      : null,
    props.steps !== undefined
      ? h('span', { className: css.modTileSteps }, `${String(props.steps)} steps`)
      : null,
  )
}
