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
 *  - TWO kind shapes, both first-class:
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
import { isOptionKind, type ModifierKind, type SpecValues } from './spec.ts'

export interface ModifiersSectionProps {
  kinds: ModifierKind[]
  values: SpecValues
  onEdit: (name: string, v: unknown) => void
  /** immediate persistence (the onSaveParams law) — optional: an
   *  add-drill without a stage commits through its values map. */
  onPatch?: (patch: Record<string, unknown>) => void
  /** THE RECIPE'S MOD PAYLOAD (hour-26 stroke 16 — loras are a MOD
   *  TYPE): stacks keyed by param_key that the engine's applyRecipe
   *  will concat AHEAD of the caller's at compose. Rendered as
   *  READ-ONLY recipe-owned rows first in the bag: the user SEES the
   *  full stack (the 1:1 law) while `values` stays the user's own —
   *  a bag edit can never commit recipe rows back (the double-stack
   *  guard). */
  base?: Record<string, ReadonlyArray<Record<string, unknown>>>
}

export function ModifiersSection(props: ModifiersSectionProps): ReturnType<typeof h> | null {
  const { kinds, values, onEdit, onPatch, base } = props
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
  const optionOf = (k: ModifierKind, value: string): { value: string; label: string; tooltip?: string; defaults?: { strength?: number } } | null =>
    (k.options ?? []).find((o) => o.value === value) ?? null
  const commit = (k: ModifierKind, next: Array<Record<string, unknown>>): void => {
    onEdit(k.param_key, next)
    onPatch?.({ [k.param_key]: next })
  }
  const addable = kinds.filter((k) => k.cardinality !== 'scalar')

  if (kinds.length === 0) return null

  const fieldDefaults = (k: ModifierKind): SpecValues => {
    const out: SpecValues = {}
    for (const f of k.fields ?? []) {
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
    if (isOptionKind(k)) {
      const strength = typeof entry['strength'] === 'number' ? entry['strength'] as number : undefined
      setDraftStrength(strength !== undefined ? String(strength) : '')
    } else {
      const params: SpecValues = {}
      for (const f of k.fields ?? []) {
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
    if (isOptionKind(k)) {
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
    // ONE flowing row (the old law: the + tile rides right after
    // the last tile, never on its own vertical row); per-kind
    // DndContexts are renderless — layout stays one flex-wrap line.
    h('div', { className: css.modRow, 'data-subcard-row': 'flow' },
      kinds.map((k) => {
        const entries = entriesOf(k)
        const recipeRows = base?.[k.param_key] ?? []
        if (entries.length === 0 && recipeRows.length === 0) return null
        // RECIPE-OWNED rows first (read-only — compose concats them
        // ahead of the caller's; apply order = array order, so the
        // visual order IS the stack order).
        return [
          ...recipeRows.map((entry, i) => {
            const name = typeof entry['name'] === 'string' ? entry['name'] as string : ''
            const strength = typeof entry['strength'] === 'number' ? entry['strength'] as number
              : typeof entry['weight'] === 'number' ? entry['weight'] as number : 1
            return h('li', {
              key: k.param_key + '-base-' + i,
              className: css.modTile + ' ' + css.modTileRecipe,
              'data-mod-tile': k.param_key + '-base-' + i,
              'data-mod-recipe': 'on',
              title: 'Recipe-owned — the card recipe stacks it ahead of yours at run',
            },
              h('span', { className: css.modTileLabel }, name !== '' ? name : k.label),
              h('span', { className: css.modTileStrength }, strength.toFixed(2)),
            )
          }),
          ...entries.map((entry, i) => {
              const id = typeof entry['id'] === 'string' ? entry['id'] as string : ''
              const option = optionOf(k, id)
              const strength = typeof entry['strength'] === 'number'
                ? entry['strength'] as number
                : option !== null && option.defaults !== undefined ? option.defaults.strength : undefined
          return h(ModTile, {
            key: k.param_key + '-' + i,
            tileId: k.param_key + '-' + i,
            label: option !== null ? option.label : (id !== '' ? id : (isOptionKind(k) ? k.label + ' ' + String(i + 1) : k.label)),
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
    // FIELD kinds: the kind's OWN fields through the constructor's
    // atoms (image fields get the square — the construction law).
    leaf !== null ? h(Modal, {
      open: true,
      onClose: () => { setLeaf(null) },
      title: (leaf.mode === 'create' ? 'Add ' : 'Edit ') + leaf.kind.label,
      closeLabel: 'Close',
    },
      h(ModLeaf, { leaf, values, onDraft: { setDraftOption, setDraftStrength, setDraftParams, draftOption, draftStrength, draftParams }, onError: setLeafError, onSave: saveLeaf, onDelete: deleteLeaf, leafError }),
    ) : null,
  )
}

/** THE LEAF BODY — split so the FIELD-kind editor gets its own
 *  square provider (the construction law: an image input constructs
 *  the square automatically, even inside a mod leaf). */
function ModLeaf(props: {
  leaf: { mode: 'create' | 'edit'; kind: ModifierKind; index: number }
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
  // the FIELD-kind leaf's own provider: the mod's image inputs get
  // the three verbs (upload/drop/pick) exactly like a card's
  const own = useSquareProvider(
    (name: string, v: unknown) => { onDraft.setDraftParams({ ...onDraft.draftParams, [name]: v }) },
    { candidates: [] },
  )
  return h('div', { className: css.modLeaf },
    leafError !== null ? h('p', { className: css.modLeafError }, leafError) : null,
    isOptionKind(k)
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
          (k.fields ?? []).map((f) => h('label', { key: f.name, className: css.modField },
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
