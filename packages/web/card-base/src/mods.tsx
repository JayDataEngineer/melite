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
import { createElement as h, useState } from 'react'
import type { ReactElement } from 'react'
import { Button, IconPlusOutline16, Input, Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import { SpecAtom } from './form.tsx'
import { useSquareProvider } from './form.tsx'
import { coerceFieldEdit, isHybridKind, isOptionKind, optionKeyOf, scalarKeyOf, titleCaseId, type ModifierKind, type ModifierOption, type SpecField, type SpecValues } from './spec.ts'

// THE FACE CONTRACTS (stroke 79 — the seam-law unification): the
// owner props live in @melite/contracts (modifierFaces.ts) beside
// their sibling seam contracts; re-exported here for the
// component-level types below and every existing importer.
export type { PaintFaceComponentProps, BboxFaceComponentProps } from '@melite/contracts'
import type { BboxFaceComponentProps, PaintFaceComponentProps } from '@melite/contracts'

export type BboxFaceComponent = (props: BboxFaceComponentProps) => ReactElement

/** THE LEAF FACE (paint-leaf-canvas.md): the host's brush modal —
 *  a component, not an import (card-base stays atom-generic; the
 *  custom face is the CARD's UI, delivered by the client plane).
 *  Absent host = the verb never renders (the square is the
 *  contract; the degrade is graceful by design). */
export type PaintFaceComponent = (props: PaintFaceComponentProps) => ReactElement

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
  /** THE PAINT FACE (leaf_face kinds): the host's brush modal.
   *  Together with paintReference — absent either = no verb. */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78): the host's selection modal, for
   *  bbox-canvas kinds — shares paintReference (the card's ONE
   *  image field is both faces' reference). */
  bboxFace?: BboxFaceComponent
  /** the card-level image field whose value is the leaf faces'
   *  reference — the brush paints OVER it, the rectangle selects
   *  ON it (mask-form: 'input_image'). */
  paintReference?: string
  /** The host's media source (threaded from the constructor's wire)
   *  — the leaf's image inputs pick from the library like a card's. */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
}

export function ModifiersSection(props: ModifiersSectionProps): ReturnType<typeof h> | null {
  const { kinds, values, onEdit, onPatch } = props
  // NATIVE REORDER STATE (the dnd-kit purge): the dragging tile id +
  // the hovered tile id, keyed `${param_key}-${index}` like before.
  const [dragTile, setDragTile] = useState<string | null>(null)
  const [overTile, setOverTile] = useState<string | null>(null)
  // THE KIND PICKER (DSH Menu — portal: true escapes the zoom card's
  // clipping).
  const [pickAt, setPickAt] = useState<{ rect: DOMRect } | null>(null)
  // the leaf editor (DSH Modal): which kind, create or edit, the
  // entry's array index (re-derived from the live bag each render).
  const [leaf, setLeaf] = useState<{ mode: 'create' | 'edit'; kind: ModifierKind; index: number } | null>(null)
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
    const v = values[k.param_key]
    return Array.isArray(v) ? v.filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null) : []
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
  /** The scalar seed (the row's own default wins; the contract
   *  field default is the backstop — 0.7, the retired leaf). */
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
    onEdit(k.param_key, next)
    onPatch?.({ [k.param_key]: next })
  }
  const addable = kinds.filter((k) => k.cardinality !== 'scalar')

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

  const openCreate = (k: ModifierKind): void => {
    const entries = entriesOf(k)
    if (k.max_stack !== undefined && entries.length >= k.max_stack) {
      setLeafError(k.label + ' stack limit reached (' + String(k.max_stack) + ') — remove one to add another.')
      return
    }
    setDraftOption('')
    setDraftStrength('')
    setDraftSteps('')
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
        if (entry[f.name] !== undefined) params[f.name] = entry[f.name]
      }
      setDraftParams(params)
    } else if (isOptionKind(k)) {
      const strength = typeof entry['strength'] === 'number' ? entry['strength'] as number : undefined
      setDraftStrength(strength !== undefined ? String(strength) : '')
      setDraftSteps(typeof entry['steps'] === 'number' ? String(entry['steps'] as number) : '')
    } else {
      const params: SpecValues = {}
      for (const f of k.fields ?? []) {
        if ((seated?.has(f.name) ?? false)) continue
        if (entry[f.name] !== undefined) params[f.name] = entry[f.name]
      }
      setDraftParams(params)
    }
    setLeafError(null)
    setLeaf({ mode: 'edit', kind: k, index })
  }
  const saveLeaf = (): void => {
    // (the leaf-null guard was deleted: saveLeaf is wired only to the
    // leaf modal's Add/Save button, rendered iff leaf !== null — no
    // caller can observe the null state.)
    const open = leaf!
    const k = open.kind
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
        const entry = entries[open.index]
        if (entry === undefined) { setLeaf(null); return }
        const next = [...entries]
        next[open.index] = { ...entry, ...stamped, ...draftParams, ...scalar }
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
        const entry = entries[open.index]
        if (entry === undefined) { setLeaf(null); return }
        const strength = Number(draftStrength)
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
          const row = (k.options ?? []).find((o) => o.value === entry.id)
          const min = row?.defaults?.steps_min
          const max = row?.defaults?.steps_max
          if (typeof min === 'number' && steps < min) { setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`); return }
          if (typeof max === 'number' && steps > max) { setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`); return }
        }
        const next = [...entries]
        if (steps === undefined) {
          // blank drops the claim (delete, never a lingering spread)
          const rest: Record<string, unknown> = { ...entry, strength }
          delete rest['steps']
          next[open.index] = rest
        } else {
          next[open.index] = { ...entry, strength, steps }
        }
        commit(k, next)
      }
    } else {
      // FIELD kind: the draft params object IS the entry
      if (open.mode === 'create') commit(k, [...entries, { ...draftParams }])
      else {
        const entry = entries[open.index]
        if (entry === undefined) { setLeaf(null); return }
        const next = [...entries]
        next[open.index] = { ...entry, ...draftParams }
        commit(k, next)
      }
    }
    setLeaf(null)
  }
  const deleteLeaf = (): void => {
    // (the null/create guard was deleted: deleteLeaf is wired only to
    // the Remove button, rendered iff leaf.mode === 'edit' — no caller
    // can observe the guarded states.)
    commit(leaf!.kind, entriesOf(leaf!.kind).filter((_, i) => i !== leaf!.index))
    setLeaf(null)
  }
  // apply order = array order: the drop rewrites the bag; the
  // composed graph follows (the old rule-2). Same splice verb,
  // native drag ids (the dnd-kit purge).
  const onTileDrop = (k: ModifierKind, active: string, over: string): void => {
    // (the over===active guard was deleted: the sole caller is the
    // tile-drop closure, and ModTile's onDrop gates active !== tileId
    // before invoking — equal ids never arrive.)
    const entries = entriesOf(k)
    const from = entries.findIndex((_, i) => k.param_key + '-' + i === active)
    const to = entries.findIndex((_, i) => k.param_key + '-' + i === over)
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

  return h('section', { className: css.modSection, 'data-subcard-grid': 'on' },
    h('div', { className: css.modHead },
      h('span', { className: css.modTitle }, 'Modifiers'),
      h('span', { className: css.modHint },
        anyOrdered ? 'drag to set apply order' : 'each entry is its own output (standalone)'),
    ),
    leafError !== null && leaf === null
      ? h('p', { className: css.modLeafError }, leafError)
      : null,
    // THE PACK-LEVEL ROWS (the hybrid section's own scalars — the
    // controlnet strength floor): served kindFields above the tiles,
    // committed + persisted like any card scalar (never flat in the
    // card form — mod-owned names stay in the section).
    ...kinds.filter((k) => (k.kindFields ?? []).length > 0).map((k) =>
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
        if (entries.length === 0) return null
        const ordered = isOrdered(k)
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
          return h(ModTile, {
            key: k.param_key + '-' + i,
            tileId: k.param_key + '-' + i,
            label: option !== null ? option.label : (id !== '' ? titleCaseId(id) : (isOptionKind(k) ? k.label + ' ' + String(i + 1) : k.label)),
            ...(strength !== undefined ? { strength } : {}),
            onOpen: () => { openEdit(k, i) },
            dragging: dragTile === k.param_key + '-' + i,
            dragOver: overTile === k.param_key + '-' + i && dragTile !== null && dragTile !== overTile,
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
        ? h('button', {
            type: 'button',
            className: css.modAddSquare,
            'data-subcard-add': 'mod',
            'aria-label': 'Add modifier',
            title: 'Add a modifier',
            onClick: (e: MouseEvent) => {
              setPickAt({ rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() })
            },
          }, h(IconPlusOutline16, { className: css.squareGlyph }))
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
    leaf !== null ? h(Modal, {
      open: true,
      onClose: () => { setLeaf(null) },
      title: (leaf.mode === 'create' ? 'Add ' : 'Edit ') + leaf.kind.label,
      closeLabel: 'Close',
    },
      h(ModLeaf, { leaf, values, hideFields: seated, onDraft: { setDraftOption, setDraftStrength, setDraftParams, setDraftSteps, draftOption, draftStrength, draftParams, draftSteps }, onError: setLeafError, onSave: saveLeaf, onDelete: deleteLeaf, leafError, paintFace: props.paintFace, bboxFace: props.bboxFace, paintReferenceValue: typeof props.paintReference === 'string' ? String(values[props.paintReference] ?? '') : '', ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}) }),
    ) : null,
  )
}

/** THE LEAF BODY — split so the FIELD-kind editor gets its own
 *  square provider (the construction law: an image input constructs
 *  the square automatically, even inside a mod leaf). */
function ModLeaf(props: {
  leaf: { mode: 'create' | 'edit'; kind: ModifierKind; index: number }
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
  /** THE PAINT FACE (leaf_face kinds): the host modal + the card's
   *  reference field value (absent host = no verb, graceful). */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78): same law — absent host = the four
   *  number inputs hold. */
  bboxFace?: BboxFaceComponent
  paintReferenceValue: string
  /** The host's media source — the leaf's image inputs pick from
   *  the library like a card's. */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
}): ReturnType<typeof h> {
  const { leaf, onDraft, onSave, onDelete, leafError } = props
  const k = leaf.kind
  const hidden = props.hideFields
  const leafFields: SpecField[] = (k.fields ?? []).filter((f) => !(hidden?.has(f.name) ?? false))
  // the FIELD-kind leaf's own provider: the mod's image inputs get
  // the three verbs (upload/drop/pick) exactly like a card's
  const own = useSquareProvider(
    (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
    { candidates: [], ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}) },
  )
  return h('div', { className: css.modLeaf },
    leafError !== null ? h('p', { className: css.modLeafError }, leafError) : null,
    isHybridKind(k)
      ? h('div', { className: css.modLeafFields },
          // THE HYBRID LEAF (the retired subcard, 1:1): the catalog
          // select binds option_key in BOTH modes (a type switch
          // re-stamps model/preprocessor on save); the bag element's
          // remaining fields render through the constructor's atoms
          // (the conditioning image gets the square — the
          // construction law). A drifted type stays VISIBLE, marked
          // unregistered, and refuses at save — never a silent blank.
          h('label', { className: css.modField },
            k.label,
            h('select', {
              className: css.modSelect,
              value: onDraft.draftOption,
              onChange: (e: { target: { value: string } }) => { onDraft.setDraftOption(e.target.value) },
            },
              h('option', { value: '' }, '— pick —'),
              (k.options ?? []).map((o) =>
                h('option', { key: o.value, value: o.value, title: o.tooltip ?? o.label }, o.label)),
              onDraft.draftOption !== '' && (k.options ?? []).every((o) => o.value !== onDraft.draftOption)
                ? h('option', { value: onDraft.draftOption }, titleCaseId(onDraft.draftOption) + ' (unregistered)')
                : null,
            ),
          ),
          h('label', { className: css.modField },
            (k.fields ?? []).find((f) => f.name === scalarKeyOf(k))?.label ?? 'Strength',
            h(Input, {
              type: 'number',
              step: '0.05',
              value: onDraft.draftStrength,
              placeholder: 'the row default',
              onChange: (e: { target: { value: string } }) => { onDraft.setDraftStrength(e.target.value) },
            }),
          ),
          (k.fields ?? []).filter((f) => f.name !== optionKeyOf(k) && f.name !== scalarKeyOf(k) && !(hidden?.has(f.name) ?? false))
            .map((f) => h('label', { key: f.name, className: css.modField },
              h('span', { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name),
              h(SpecAtom, {
                f,
                value: onDraft.draftParams[f.name] ?? f.default,
                onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
                square: own.square(f),
              }),
            )),
          own.wireMenu,
        )
      : isOptionKind(k)
      ? h('div', { className: css.modLeafFields },
          leaf.mode === 'create'
            ? h('label', { className: css.modField },
                k.label,
                h('select', {
                  className: css.modSelect,
                  value: onDraft.draftOption,
                  onChange: (e: { target: { value: string } }) => { onDraft.setDraftOption(e.target.value) },
                },
                  h('option', { value: '' }, '— pick —'),
                  // (options! — this branch renders only when
                  // isOptionKind(k): options defined and non-empty.)
                  k.options!.map((o) =>
                    h('option', { key: o.value, value: o.value }, o.label)),
                ),
              )
            : null,
          h('label', { className: css.modField },
            'Strength',
            h(Input, {
              type: 'number',
              step: '0.05',
              value: onDraft.draftStrength,
              placeholder: 'the row default',
              onChange: (e: { target: { value: string } }) => { onDraft.setDraftStrength(e.target.value) },
            }),
          ),
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
                  ? ` ${rMin}\u2013${rMax}`
                  : typeof activeRow?.defaults?.steps === 'number'
                    ? ` (fixed at ${activeRow.defaults.steps})`
                    : ''
                return h('label', { className: css.modField },
                `Steps applied${rangeText}`,
                h(Input, {
                  'aria-label': 'Steps applied',
                  type: 'number',
                  step: '1',
                  min: typeof rMin === 'number' ? String(rMin) : undefined,
                  max: typeof rMax === 'number' ? String(rMax) : undefined,
                  value: onDraft.draftSteps,
                  placeholder: String(activeRow?.defaults?.steps ?? ''),
                  title: typeof rMin === 'number' && typeof rMax === 'number' && rMin !== rMax
                    ? `This adapter runs ${rMin}\u2013${rMax} steps — the dial bounds to the row's declared domain; the run\u2019s sampler applies it unless a call pins steps explicitly.`
                    : 'The distill\u2019s own step count — the run\u2019s sampler applies it unless a call pins steps explicitly.',
                  onChange: (e: { target: { value: string } }) => { onDraft.setDraftSteps(e.target.value) },
                }),
              )
              })()
            : null,
        )
      : h('div', { className: css.modLeafFields },
          leafFields.map((f) => h('div', { key: f.name },
            h('label', { className: css.modField },
              f.label ?? f.name,
              h(SpecAtom, {
                f,
                value: onDraft.draftParams[f.name],
                onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
                square: own.square(f),
              }),
            ),
            // THE PAINT VERB (paint-leaf-canvas.md): on a declared
            // face, each image field gains the brush beside the
            // square — the modal writes the same payload the
            // square reads. Host-less = nothing renders (the
            // square holds). The verb is the label's SIBLING, never
            // nested inside it (a button in a label corrupts both
            // accessible names — the wall caught it).
            props.paintFace !== undefined && k.leaf_face === 'paint-canvas' && (f.type === 'image' || f.wtype === 'image')
              ? h(PaintVerb, {
                  Face: props.paintFace,
                  referenceUrl: props.paintReferenceValue,
                  payloadUrl: typeof onDraft.draftParams[f.name] === 'string' ? onDraft.draftParams[f.name] as string : '',
                  onSaved: (dataUrl: string) => { onDraft.setDraftParams({ ...onDraft.draftParams, [f.name]: dataUrl }) },
                })
              : null,
          )),
          // THE BBOX VERB (stroke 78): on a declared bbox-canvas face,
          // ONE verb per entry (the rectangle is the entry's, not a
          // field's) — it opens the preview, fills the four inputs.
          props.bboxFace !== undefined && k.leaf_face === 'bbox-canvas'
            ? h(BboxVerb, {
                Face: props.bboxFace,
                referenceUrl: props.paintReferenceValue,
                draft: onDraft.draftParams,
                onSaved: (bbox) => {
                  onDraft.setDraftParams({
                    ...onDraft.draftParams,
                    bbox_x: Math.round(bbox.x), bbox_y: Math.round(bbox.y),
                    bbox_w: Math.round(bbox.width), bbox_h: Math.round(bbox.height),
                  })
                },
              })
            : null,
          own.wireMenu,
        ),
    h('div', { className: css.modLeafActions },
      h(Button, { variant: 'primary', onClick: onSave }, leaf.mode === 'create' ? 'Add' : 'Save'),
      leaf.mode === 'edit'
        ? h(Button, { variant: 'ghost', onClick: onDelete }, 'Remove')
        : null,
    ),
  )
}

/** THE PAINT VERB — the brush button + modal mount (the face
 *  component arrives from the host; this is the wiring only). */
function PaintVerb(props: {
  Face: PaintFaceComponent
  referenceUrl: string
  payloadUrl: string
  onSaved: (dataUrl: string) => void
}): ReturnType<typeof h> {
  const [open, setOpen] = useState(false)
  return h('div', { className: css.modField },
    h(Button, { variant: 'ghost', onClick: () => { setOpen(true) } }, 'Paint'),
    open
      ? h(props.Face, {
          referenceUrl: props.referenceUrl,
          payloadUrl: props.payloadUrl,
          onSave: (dataUrl: string) => { props.onSaved(dataUrl); setOpen(false) },
          onCancel: () => { setOpen(false) },
        })
      : null,
  )
}

/** THE BBOX VERB (stroke 78) — the selection button + modal mount:
 *  reads the entry's current rectangle (all four present and finite
 *  = set; anything else = null, a fresh draw), writes the four
 *  bbox_* inputs on save. Same delivery law as the paint verb. */
function BboxVerb(props: {
  Face: BboxFaceComponent
  referenceUrl: string
  draft: SpecValues
  onSaved: (bbox: { x: number; y: number; width: number; height: number }) => void
}): ReturnType<typeof h> {
  const [open, setOpen] = useState(false)
  const quad = [props.draft['bbox_x'], props.draft['bbox_y'], props.draft['bbox_w'], props.draft['bbox_h']]
  const set = quad.length === 4 && quad.every((v) => typeof v === 'number' && Number.isFinite(v) && (v as number) >= 0)
    ? { x: quad[0] as number, y: quad[1] as number, width: quad[2] as number, height: quad[3] as number }
    : null
  return h('div', { className: css.modField },
    h(Button, { variant: 'ghost', onClick: () => { setOpen(true) } }, set === null ? 'Draw box' : 'Redraw box'),
    open
      ? h(props.Face, {
          referenceUrl: props.referenceUrl,
          bbox: set,
          onSave: (bbox) => { props.onSaved(bbox); setOpen(false) },
          onCancel: () => { setOpen(false) },
        })
      : null,
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
    title: ordered ? 'Drag to reorder · click to edit' : 'Click to edit (standalone — own output)',
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
  )
}
