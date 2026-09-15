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
import { Button, IconPlusOutline16, Input, Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import { SpecAtom } from './form.tsx'
import { useSquareProvider } from './form.tsx'
import { coerceFieldEdit, isHybridKind, isOptionKind, optionKeyOf, scalarKeyOf, titleCaseId, type ModifierKind, type ModifierOption, type SpecField, type SpecValues } from './spec.ts'

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
    setDraftParams(fieldDefaults(k))
    setLeafError(null)
    setLeaf({ mode: 'create', kind: k, index: -1 })
  }
  const openEdit = (k: ModifierKind, index: number): void => {
    const entry = entriesOf(k)[index]
    if (entry === undefined) return
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
    if (leaf === null) return
    const k = leaf.kind
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
      if (leaf.mode === 'create') {
        commit(k, [...entries, { ...stamped, ...draftParams, ...scalar }])
      } else {
        const entry = entries[leaf.index]
        if (entry === undefined) { setLeaf(null); return }
        const next = [...entries]
        next[leaf.index] = { ...entry, ...stamped, ...draftParams, ...scalar }
        commit(k, next)
      }
    } else if (isOptionKind(k)) {
      if (leaf.mode === 'create') {
        if (draftOption === '') { setLeafError('Pick one from the served rows.'); return }
        const option = optionOf(k, draftOption)
        const seed = option !== null && option.defaults?.strength !== undefined ? option.defaults.strength : 1.0
        const strength = draftStrength.trim() === '' ? seed : Number(draftStrength)
        if (!Number.isFinite(strength)) { setLeafError('Strength must be a number.'); return }
        commit(k, [...entries, { id: draftOption, strength }])
      } else {
        const entry = entries[leaf.index]
        if (entry === undefined) { setLeaf(null); return }
        const strength = Number(draftStrength)
        if (!Number.isFinite(strength)) { setLeafError('Strength must be a number.'); return }
        const next = [...entries]
        next[leaf.index] = { ...entry, strength }
        commit(k, next)
      }
    } else {
      // FIELD kind: the draft params object IS the entry
      if (leaf.mode === 'create') commit(k, [...entries, { ...draftParams }])
      else {
        const entry = entries[leaf.index]
        if (entry === undefined) { setLeaf(null); return }
        const next = [...entries]
        next[leaf.index] = { ...entry, ...draftParams }
        commit(k, next)
      }
    }
    setLeaf(null)
  }
  const deleteLeaf = (): void => {
    if (leaf === null || leaf.mode !== 'edit') return
    commit(leaf.kind, entriesOf(leaf.kind).filter((_, i) => i !== leaf.index))
    setLeaf(null)
  }
  // apply order = array order: the drop rewrites the bag; the
  // composed graph follows (the old rule-2 parity). Same splice verb,
  // native drag ids (the dnd-kit purge).
  const onTileDrop = (k: ModifierKind, active: string, over: string): void => {
    if (over === active) return
    const entries = entriesOf(k)
    const from = entries.findIndex((_, i) => k.param_key + '-' + i === active)
    const to = entries.findIndex((_, i) => k.param_key + '-' + i === over)
    if (from < 0 || to < 0) return
    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commit(k, next)
  }

  return h('section', { className: css.modSection, 'data-subcard-grid': 'on' },
    h('div', { className: css.modHead },
      h('span', { className: css.modTitle }, 'Modifiers'),
      h('span', { className: css.modHint }, 'drag to set apply order'),
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
        (k.kindFields ?? []).map((f) =>
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
            onReorderStart: (id: string | null) => { setDragTile(id); if (id === null) setOverTile(null) },
            onReorderOver: setOverTile,
            onReorderDrop: (active: string, over: string) => {
              setDragTile(null); setOverTile(null); onTileDrop(k, active, over)
            },
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
        const k = addable.find((x) => x.kind === id)
        if (k !== undefined) openCreate(k)
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
      h(ModLeaf, { leaf, values, hideFields: seated, onDraft: { setDraftOption, setDraftStrength, setDraftParams, draftOption, draftStrength, draftParams }, onError: setLeafError, onSave: saveLeaf, onDelete: deleteLeaf, leafError }),
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
    draftOption: string
    draftStrength: string
    draftParams: SpecValues
  }
  onError: (e: string | null) => void
  onSave: () => void
  onDelete: () => void
  leafError: string | null
}): ReturnType<typeof h> {
  const { leaf, onDraft, onSave, onDelete, leafError } = props
  const k = leaf.kind
  const hidden = props.hideFields
  const leafFields: SpecField[] = (k.fields ?? []).filter((f) => !(hidden?.has(f.name) ?? false))
  // the FIELD-kind leaf's own provider: the mod's image inputs get
  // the three verbs (upload/drop/pick) exactly like a card's
  const own = useSquareProvider(
    (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
    { candidates: [] },
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
                  (k.options ?? []).map((o) =>
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
        )
      : h('div', { className: css.modLeafFields },
          leafFields.map((f) => h('label', { key: f.name, className: css.modField },
            f.label ?? f.name,
            h(SpecAtom, {
              f,
              value: onDraft.draftParams[f.name],
              onEdit: (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
              square: own.square(f),
            }),
          )),
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
  onReorderStart: (id: string | null) => void
  onReorderOver: (id: string) => void
  onReorderDrop: (active: string, over: string) => void
}): ReturnType<typeof h> {
  return h('li', {
    className: css.modTile
      + (props.dragging ? ' ' + css.tileDragging : '')
      + (props.dragOver ? ' ' + css.modTileOver : ''),
    draggable: true,
    'data-mod-tile': props.tileId,
    title: 'Drag to reorder · click to edit',
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(MOD_DRAG_MIME, props.tileId)
      e.dataTransfer.effectAllowed = 'move'
      props.onReorderStart(props.tileId)
    },
    onDragEnd: () => { props.onReorderStart(null) },
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        props.onReorderOver(props.tileId)
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        const active = e.dataTransfer.getData(MOD_DRAG_MIME)
        if (active !== '' && active !== props.tileId) props.onReorderDrop(active, props.tileId)
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
