/**
 * form.tsx — @melite/card-base: THE CONSTRUCTOR.
 *
 * THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
 * construct the card ui should see that the card package emits an
 * image input, then constructs the input component automatically"):
 * the base reads the card package's EMISSION — the served form-spec
 * (fields, declared input/output edges, mod kinds) — and constructs
 * the surface. Defaults propagate from the emission (specDefaults);
 * every image/file field gets THE ONE square (square.tsx) with the
 * three source verbs; no card ever hand-rolls an input component.
 *
 * THE SEAM (slots.ts): each field renders through the field-atom seam
 * keyed by its emitted wire type — the caller may pass claimed atoms
 * (the composition consults the slot machinery and hands them in);
 * the base's built-in atom is the default (the ui-tool built-ins
 * pattern). A whole-form takeover replaces CardForm itself.
 *
 * DSH NATIVE: Menu/Input/Switch from the installed ui-primitives; the
 * atoms the primitives set lacks (select, slider, textarea) are
 * layout-only module CSS over native elements, every color an
 * inherited --dsw-alias-* token (the package's documented pattern).
 */
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Menu, Input, Modal, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare, isImageUrl, readAsDataUrl, type InputSquareVerbs } from './square.tsx'
import { ModifiersSection } from './mods.tsx'
import { uploadInputFile } from './wire.ts'
import {
  activeRowId, activeVariantId, axisGroups, axisKey, axisPickPatch, composingRows, groupFields, modelChoices,
  modOwnedFields, rowsFor, seedAxisValues, variantRows, quantRowsFor,
  type FormSpecDoc, type SpecField, type SpecValues, type VariantRow,
} from './spec.ts'
import { fetchFormSpec } from './wire.ts'
import { fetchMediaLibrary } from '@melite-plugin/melite-run-wire'
import css from './card.module.css'

/** THE SERVED-SPEC HOOK (the DRY extraction, 2026-09-13): four
 *  consumers (mask-studio's TuneSection, h3's RunAdvancedPanels,
 *  img-to-mesh's client, ideogram4's client) each hand-copied the
 *  same fetch-once + abort dance. One spelling now: fetches
 *  /v1/form-spec?model=<id> when the id is non-empty, aborts the
 *  in-flight fetch on unmount or id change, and hands back the doc
 *  (null until it lands) + the refusal message (null unless the door
 *  refused — loud consumers render it, silent ones ignore it).
 *  Consumer-specific derivations (field filters, value seeding) stay
 *  at the call site as reactions to `spec`. */
export function useFormSpec(modelId: string | null | undefined): {
  spec: FormSpecDoc | null
  error: string | null
} {
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = typeof modelId === 'string' && modelId !== '' ? modelId : null
  useEffect(() => {
    if (id === null) return
    const ctl = new AbortController()
    setSpec(null)
    setError(null)
    fetchFormSpec(id, ctl.signal)
      .then((doc) => { setSpec(doc) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'form-spec failed') })
    return () => { ctl.abort() }
  }, [id])
  return { spec, error }
}

/** What a host hands the constructor for slot-shaped fields: the
 *  square's verbs + an optional display mirror (the fresh-upload
 *  preview while the PARAM carries the estate path — the old
 *  upload-rail law). */
export interface SquareHost {
  verbs: InputSquareVerbs
  display?: string | null
}

/** The picker half of the square provider: candidates are the OTHER
 *  stages' LATEST OUTPUTS (title + the media-route url the run wrote
 *  onto their bench rows). Picking one WRITES THE PARAM — the input
 *  slot is the wire, there is no separate wiring mechanic.
 *
 * THE EDGE LAW (2026-09-12): `candidatesFor` narrows the list PER
 *  FIELD — only rows whose card DECLARES an output of the field's
 *  input-edge kind. The static `candidates` list is the fallback for
 *  fields with no declared edge (the picker never blocks on a meta
 *  miss — it just stops guessing kinds it cannot verify). */
export interface SquareWire {
  candidates: Array<{ id: string; label: string; url: string }>
  candidatesFor?: (f: SpecField) => Array<{ id: string; label: string; url: string }>
  /** The surface's OWN file law (optional): when present, From file
   *  and OS drops route here instead of the default upload door —
   *  bespoke vocabularies (the studio's inline data:-URL cap) keep
   *  their semantics under the same three-entry grammar. */
  onFile?: (file: File) => void
  /** THE SOURCE-PICK SEAM (2026-09-13, the operator's law: one
   *  system, no exceptions): the host may claim the picker modal's
   *  face — same grammar as the stage-view consult. The fallback is
   *  the base's own modal (the plain filtered list). */
  renderSourcePick?: (
    req: {
      mode: 'flow' | 'media'
      kind: string
      field: SpecField
      candidates: Array<{ id: string; label: string; url: string }>
    },
    fallback: ReturnType<typeof h>,
  ) => ReturnType<typeof h>
}

/** The media-kind the picker fetches for a field: image fields name
 *  image; file fields take the whole library (their accept narrows
 *  client-side per row). */
function mediaKindForField(f: SpecField): string {
  return f.type === 'image' ? 'image' : 'all'
}

/** THE ONE square provider (the old SlotGrid law, DSH substrate):
 *  every slot-shaped field of a stage gets the same verbs — file
 *  upload (the /v1/uploads door + the data-URL mirror), media drop
 *  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
 *  on the square listing the other stages' latest outputs; picking
 *  one writes the PARAM — the slot is the wire, no separate wiring
 *  mechanic exists). ONE definition; the constructor and every
 *  claimed atom ride it. */
export function useSquareProvider(onEdit: (name: string, v: unknown) => void, wire: SquareWire): {
  square: (f: SpecField) => SquareHost | undefined
  wireMenu: ReturnType<typeof h> | null
} {
  const [mirror, setMirror] = useState<Record<string, string>>({})
  const [pickAt, setPickAt] = useState<{ rect: DOMRect; field: SpecField } | null>(null)
  // THE PICKER MODAL seat (2026-09-13): From flow / From media open
  // ONE selector modal — mode decides the rows; From file goes to the
  // OS dialog. The flat click-through picker is dead (the operator:
  // "Flat pick didn't even make any sense").
  const [modalAt, setModalAt] = useState<{ mode: 'flow' | 'media'; field: SpecField } | null>(null)
  // the From file capture: the menu closes (pickAt → null) BEFORE the
  // OS dialog answers — the field rides a ref from the menu click.
  const fieldRef = useRef<SpecField | null>(null)
  const [mediaRows, setMediaRows] = useState<Array<{ id: string; label: string; url: string }> | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onFile = useCallback(async (f: SpecField, file: File): Promise<void> => {
    if (wire.onFile !== undefined) { wire.onFile(file); return }
    try {
      const dataUrl = await readAsDataUrl(file)
      setMirror((m) => ({ ...m, [f.name]: dataUrl }))
      const { name } = await uploadInputFile(file)
      onEdit(f.name, name)
    } catch (e: unknown) {
      onEdit(f.name, e instanceof Error ? e.message : 'upload failed')
    }
  }, [onEdit, wire.onFile])
  const square = (f: SpecField): SquareHost | undefined => {
    if (f.type !== 'image' && f.type !== 'file') return undefined
    return {
      display: mirror[f.name] ?? null,
      verbs: {
        onPick: (anchor?: unknown) => {
          const el = anchor instanceof HTMLElement ? anchor : null
          setPickAt(el !== null
            ? { rect: el.getBoundingClientRect(), field: f }
            : { rect: new DOMRect(8, 8, 1, 1), field: f })
        },
        onFile: (file: File) => { void onFile(f, file) },
        onAsset: (url: string) => { onEdit(f.name, url) },
        onClear: () => {
          setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
          onEdit(f.name, '')
        },
      },
    }
  }
  const sourceMenu = pickAt === null ? null : h(Menu, {
    open: true,
    anchor: null,
    getAnchorRect: () => pickAt.rect,
    items: [
      { id: '__flow__', label: 'From flow' },
      { id: '__media__', label: 'From media' },
      { id: '__file__', label: 'From file' },
      { type: 'separator' as const, id: 'sep' },
      { id: '__none__', label: '— clear —', danger: true },
    ],
    onSelect: (id: string) => {
      const f = pickAt.field
      setPickAt(null)
      if (id === '__flow__') { setModalAt({ mode: 'flow', field: f }); return }
      if (id === '__media__') { setModalAt({ mode: 'media', field: f }); return }
      if (id === '__file__') { fieldRef.current = f; fileRef.current?.click(); return }
      if (id === '__none__') {
        setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
        onEdit(f.name, '')
        return
      }
    },
    onClose: () => { setPickAt(null) },
    portal: true,
  })

  // THE PICKER MODAL (default face; the seam may claim it): ONE
  // component, two row sources — flow candidates (edge-law narrowed)
  // and the media library (kind-filtered through the wire's door).
  useEffect(() => {
    if (modalAt?.mode !== 'media') return
    const ctrl = new AbortController()
    setMediaRows(null)
    fetchMediaLibrary(mediaKindForField(modalAt.field), ctrl.signal)
      .then((items) => { setMediaRows(items.map((it) => ({ id: it.url, label: it.name, url: it.url }))) })
      .catch(() => { setMediaRows([]) })
    return () => { ctrl.abort() }
  }, [modalAt])
  const pickerModal = modalAt === null ? null : (() => {
    const f = modalAt.field
    const candidates = modalAt.mode === 'flow'
      ? (wire.candidatesFor !== undefined ? wire.candidatesFor(f) : wire.candidates)
      : (mediaRows ?? [])
    const req = { mode: modalAt.mode, kind: mediaKindForField(f), field: f, candidates }
    const pick = (url: string): void => {
      setModalAt(null)
      if (url !== '') onEdit(f.name, url)
    }
    const fallback = h(Modal, {
      open: true,
      onClose: () => { setModalAt(null) },
      title: modalAt.mode === 'flow' ? 'From flow' : 'From media',
      description: modalAt.mode === 'flow'
        ? 'The other stages\u2019 latest outputs' + (req.kind !== 'all' ? ' (' + req.kind + ')' : '')
        : 'The runs library' + (req.kind !== 'all' ? ' (' + req.kind + ')' : ''),
      closeLabel: 'Close picker',
    },
      candidates.length === 0
        ? h('p', { className: css.pickEmpty },
            modalAt.mode === 'media' && mediaRows === null ? 'loading\u2026' : 'nothing to pick yet')
        : h('ul', { className: css.pickList },
            candidates.map((c) => h('li', { key: c.id, className: css.pickRow },
              h('button', {
                type: 'button',
                className: css.pickBtn,
                'data-testid': 'source-pick-row',
                onClick: () => { pick(c.url) },
              },
                isImageUrl(c.url)
                  ? h('img', { className: css.pickThumb, src: c.url, alt: c.label, loading: 'lazy' })
                  : h('span', { className: css.pickGlyph }, c.label.slice(0, 1).toUpperCase()),
                h('span', { className: css.pickLabel }, c.label),
              ),
            ))),
    )
    return wire.renderSourcePick !== undefined ? wire.renderSourcePick(req, fallback) : fallback
  })()

  // THE FILE INPUT lives OUTSIDE the Menu (the Menu's close path
  // tears its children down before the From file branch can click);
  // it rides the provider fragment and closes over pickAt per render.
  const fileInput = h('input', {
    ref: fileRef,
    type: 'file',
    accept: 'image/png,image/jpeg,image/webp',
    'aria-hidden': true,
    tabIndex: -1,
    style: { display: 'none' },
    onChange: (e: unknown) => {
      const inp = e as { target: { files: FileList | null } }
      const file = inp.target.files?.[0]
      const f = fieldRef.current
      if (f !== null && file !== undefined && file !== null) {
        fieldRef.current = null
        void onFile(f, file)
      }
      if (fileRef.current !== null) fileRef.current.value = ''
    },
  })

  const wireMenu = h(Fragment, null, sourceMenu, pickerModal, fileInput)
  return { square, wireMenu }
}

/** The field-atom claim the constructor accepts — the seam's runtime
 *  consult result (the composition passes what the slot machinery
 *  holds; undefined = the base's built-in atom renders). */
export type FieldAtomClaim = (props: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
}) => ReturnType<typeof h>

/** THE GENERIC SOURCE ROW (2026-09-13, the operator's law: ONE
 *  generic input component — "EVEN FOR THE ADVANCED STUDIO CARDS…
 *  sources from ONE SYSTEM with NO EXCEPTIONS"). SpecForm fields get
 *  the row through the constructor; every NON-field surface (studio
 *  cards, bespoke rails) rides THIS wrapper: the same plus square,
 *  the same three-entry menu (From flow / From media / From file),
 *  the same picker modal — with the surface's OWN flow candidates
 *  and an optional seam claim. One grammar, zero bespoke slots. */
export interface SourceRowProps {
  /** Short key shown under the square. */
  label: string
  /** 'image' narrows the media modal to image; anything else lists
   *  the whole library (the file face). */
  kind?: 'image' | 'file'
  /** Attached value (thumbnail when it passes isImageUrl). */
  value?: string | null
  /** The ONE write verb — every source funnels here. */
  onEdit: (v: string) => void
  /** The surface's own upstream outputs (the From flow rows). */
  candidates?: Array<{ id: string; label: string; url: string }>
  /** The surface's own file law (From file + OS drops route here). */
  onFile?: (file: File) => void
  /** The seam claim (same grammar as the field wire). */
  renderSourcePick?: SquareWire['renderSourcePick']
}

export function SourceRow(props: SourceRowProps): ReturnType<typeof h> {
  const field: SpecField = {
    name: '__source_row__',
    label: props.label,
    type: props.kind === 'image' ? 'image' : 'file',
  }
  const onEditField = useCallback((name: string, v: unknown): void => {
    void name
    props.onEdit(typeof v === 'string' ? v : String(v ?? ''))
  }, [props.onEdit])
  const { square, wireMenu } = useSquareProvider(onEditField, {
    candidates: props.candidates ?? [],
    ...(props.onFile !== undefined ? { onFile: props.onFile } : {}),
    ...(props.renderSourcePick !== undefined ? { renderSourcePick: props.renderSourcePick } : {}),
  })
  const host = square(field)
  const shown = host !== undefined ? host.display ?? props.value ?? null : props.value ?? null
  return h('div', { className: css.sourceRow, 'data-source-row': props.label },
    wireMenu,
    h(InputSquare, {
      label: props.label,
      value: shown !== null && isImageUrl(shown) ? shown : null,
      metric: typeof props.value === 'string' && props.value !== '' && !isImageUrl(props.value)
        ? props.value
        : undefined,
      ...(host !== undefined ? host.verbs : {}),
    }),
  )
}

/** THE MULTI-IMAGE ROW (2026-09-13, the operator's source-row law):
 *  an image_list value renders as ONE row of source squares — one per
 *  entry (each with the full three-source grammar: menu, modal, OS
 *  file, drops, detach) plus a trailing add square that APPENDS. The
 *  row is the mods grammar applied to inputs: same plus square, same
 *  menu, dynamically addable. The cap rides the declaration's tooltip
 *  law (the frozen picker served up to 3). */
const IMAGE_LIST_CAP = 3

function ImageListAtom({ f, value, onEdit, candidates }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  candidates?: Array<{ id: string; label: string; url: string }>
}): ReturnType<typeof h> {
  const arr: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
  const write = (next: string[]): void => { onEdit(f.name, next) }
  const writeAt = (i: number, v: string): void => {
    if (v === '') { write(arr.filter((_, j) => j !== i)); return }
    const next = [...arr]
    next[i] = v
    write(next)
  }
  const append = (v: string): void => {
    if (v === '') return
    write([...arr, v])
  }
  return h('div', { className: css.specListBlock, 'data-image-list': f.name },
    h('span', { className: css.specFieldKey }, f.label),
    h('div', { className: css.specSlotRow },
      arr.map((v, i) => h(SourceRow, {
        key: f.name + '-' + i + '-' + v,
        label: '',
        kind: 'image',
        value: v,
        candidates,
        onEdit: (nv: string) => { writeAt(i, nv) },
      })),
      arr.length < IMAGE_LIST_CAP
        ? h(SourceRow, {
            key: f.name + '-add',
            label: '',
            kind: 'image',
            value: null,
            candidates,
            onEdit: append,
          })
        : null,
    ),
  )
}

/** THE TRI-STATE ATOM (hour 15, stroke C): inherit / on / off —
 *  promoted from h3's studio-local TriControl (same semantics, same
 *  option order). Serves schema-bound fields of type 'tri' AND the
 *  standalone rail rows that hand-rolled the select before. */
export function TriStateAtom({ label, value, onEdit, name, disabled }: {
  label: string
  value: boolean | undefined
  onEdit(name: string, v: unknown): void
  name: string
  disabled?: boolean
}): ReturnType<typeof h> {
  return h('select', {
    className: css.specSelect,
    'aria-label': label,
    disabled: disabled === true,
    value: value === undefined ? '' : String(value),
    onChange: (e: unknown) => {
      const v = (e as { target: { value: string } }).target.value
      onEdit(name, v === '' ? undefined : v === 'true')
    },
  },
  h('option', { value: '' }, 'inherit'),
  h('option', { value: 'true' }, 'on'),
  h('option', { value: 'false' }, 'off'))
}

/** The slider's local display during a drag (the settle law's
 *  carrier): local owns the bubble while dragging; an external move
 *  of the backing value (agent write, revive, another card opened)
 *  reclaims the display. */
function useLocalSliderValue(value: unknown, def: unknown): { value: number, set(n: number): void } {
  const num = typeof value === 'number' ? value : Number(value)
  const [local, setLocal] = useState<number | null>(null)
  useEffect(() => { setLocal(null) }, [num]) // eslint-disable-line react-hooks/exhaustive-deps
  return {
    value: local !== null ? local : (Number.isFinite(num) ? num : Number(def ?? 0)),
    set: setLocal,
  }
}

/** THE SETTLE LAW for slider atoms (hour 15, stroke C — grown from
 *  mask-studio's draft absorber, 2026-08-10): a drag fires input
 *  60×/sec; if every step wrote to the card, updateStageParams →
 *  _recomputeKeys would hash multi-MB paint data 60×/sec and freeze
 *  the editor. The atom shows the drag locally and persists ONCE on
 *  settle (the change event = release / keyboard step). External
 *  writes (agent, revive) re-sync the display when the backing
 *  value actually moves. */
export function SpecSliderAtom({ f, value, onEdit }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
}): ReturnType<typeof h> {
  const shown = useLocalSliderValue(value, f.default)
  return h('span', { className: css.specSliderRow },
    h('input', {
      className: css.specSlider,
      type: 'range',
      min: f.min ?? 0,
      max: f.max ?? 10,
      step: f.step ?? 0.1,
      value: shown,
      onInput: (e: unknown) => { shown.set(Number((e as { target: { value: string } }).target.value)) },
      onChange: (e: unknown) => { onEdit(f.name, (e as { target: { value: string } }).target.value) },
      'aria-label': f.label,
    }),
    h('span', { className: css.specSliderValue }, String(shown.value)),
  )
}

/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export function SpecAtom({ f, value, onEdit, square, wireCandidates }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  /** the wire's flow rows (the image_list slots source From flow too) */
  wireCandidates?: Array<{ id: string; label: string; url: string }>
}): ReturnType<typeof h> {
  // THE INPUT SQUARE (the old law: slot-shaped values render the ONE
  // square with the three source verbs — never a bare text Input).
  // THE CONSTRUCTION LAW: an emitted image/file input constructs THIS
  // component — automatically, for every card, no per-card handling.
  if ((f.type === 'image' || f.type === 'file') && square !== undefined) {
    const shown = square.display !== undefined && square.display !== null && square.display !== ''
      ? square.display : (typeof value === 'string' ? value : null)
    return h(InputSquare, {
      label: f.label !== '' ? f.label : f.name,
      value: shown !== null && isImageUrl(shown) ? shown : null,
      metric: typeof value === 'string' && value !== '' && !isImageUrl(value) ? value : undefined,
      ...square.verbs,
    })
  }
  if (f.type === 'select' && Array.isArray(f.options) && f.options.length > 0) {
    return h('select', {
      className: css.specSelect,
      value: String(value ?? ''),
      onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
      'aria-label': f.label,
    }, f.options.map((o) => {
      // normalize: '1024' | {value:'1024', label:'1K'} → one shape
      const row = typeof o === 'string' ? { value: o, label: o } : o
      return h('option', { key: row.value, value: row.value }, row.label)
    }))
  }
  if (f.type === 'slider') {
    return h(SpecSliderAtom, { f, value, onEdit })
  }
  if (f.type === 'tri') {
    // THE TRI-STATE ATOM (hour 15, stroke C — h3's TriControl
    // semantics, promoted): boolean | undefined — inherit (the
    // upstream default), on, off. One spelling everywhere.
    return h(TriStateAtom, {
      label: f.label !== '' ? f.label : f.name,
      value: value === undefined || value === null ? undefined : (value === true || value === 'true'),
      onEdit,
      name: f.name,
    })
  }
  if (f.type === 'switch' || f.type === 'boolean') {
    // the primitives catalog owns the two-state toggle — Switch, with
    // its required label (the control cannot ship unnamed)
    const on = value === true || value === 'true'
    return h(Switch, {
      label: f.label,
      checked: on,
      onChange: (next: boolean) => { onEdit(f.name, next) },
    })
  }
  if (f.type === 'textarea') {
    return h('textarea', {
      className: css.specTextarea,
      rows: 3,
      value: String(value ?? ''),
      placeholder: f.placeholder ?? '',
      onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
      'aria-label': f.label,
    })
  }
  if (f.type === 'image_list') {
    return h(ImageListAtom, { f, value, onEdit, candidates: wireCandidates })
  }
  // number, seed, text — the raw-string Input (coerce once at patch)
  return h(Input, {
    value: String(value ?? ''),
    placeholder: f.placeholder ?? '',
    onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
    'aria-label': f.label,
  })
}

/** THE MODEL AXES (the pass-along law, 2026-09-12): the Model select
 *  plus ONE SELECT PER SERVED AXIS GROUP — Variant, Quant, Recipe,
 *  Precision, … the declaration's whole vocabulary, NEVER a hardcoded
 *  list (the operator's lane proof caught the hardcoded Quant-only
 *  list dropping seedvr2's and qwen's other axes). Order: the door's
 *  variant_groups contract, else first-seen. Chain: an axis' options
 *  are the rows composing with the axes above (the row's `owner`).
 *  Each pick applies the row's defaults overlay through onEdit — the
 *  values (model + every axis key + overlay keys) ride the caller's
 *  map and pass along at Run. Renders nothing when the spec declares
 *  no matrix. */
export function ModelAxes({ spec, values, onEdit }: {
  spec: FormSpecDoc
  values: SpecValues
  onEdit(name: string, v: unknown): void
}): ReturnType<typeof h> | null {
  const groups = axisGroups(spec)
  if (groups.length === 0) return null
  const models = modelChoices(spec)
  const contract = spec.features?.variant_groups ?? {}
  const pick = (row: VariantRow): void => {
    const patch = axisPickPatch(spec, row)
    for (const [k, v] of Object.entries(patch)) onEdit(k, v)
  }
  // resolve actives down the chain (Variant first, then chained groups)
  const active: Record<string, string | undefined> = {}
  for (const g of groups) {
    const held = values[axisKey(g)]
    const rows = composingRows(spec, g, active)
    if (typeof held === 'string' && held !== '' && rows.some((r) => r.id === held)) {
      active[g] = held
    } else {
      const byRoute = activeRowId(spec, values, g, active)
      active[g] = byRoute ?? (rows.length > 0 ? rows[0].id : '')
    }
  }
  return h('section', { className: `${css.specGroup} ${css.modelAxes}`, 'data-model-axes': '1' },
    h('h4', { className: css.specGroupTitle }, 'Model'),
    h('label', { className: css.specField },
      h('span', { className: css.specFieldKey }, 'Model'),
      h('select', {
        className: css.specSelect,
        'aria-label': 'Model',
        value: typeof values['model'] === 'string' && values['model'] !== '' ? values['model'] as string
          : (typeof spec.model === 'string' && spec.model !== '' ? spec.model : models[0] ?? ''),
        onChange: (e: unknown) => { onEdit('model', (e as { target: { value: string } }).target.value) },
      }, models.map((m) => h('option', { key: m, value: m }, m)))),
    groups.map((g) => {
      const rows = composingRows(spec, g, active)
      if (rows.length === 0) return null
      const label = contract[g]?.label ?? g
      return h('label', { key: g, className: css.specField },
        h('span', { className: css.specFieldKey }, label),
        h('select', {
          className: css.specSelect,
          'aria-label': label,
          'data-axis': g,
          value: active[g] ?? '',
          onChange: (e: unknown) => {
            const id = (e as { target: { value: string } }).target.value
            const row = rows.find((v) => v.id === id)
            if (row !== undefined) pick(row)
          },
        }, rows.map((v) => h('option', { key: v.id, value: v.id },
          v.label + (typeof v.hint === 'string' && v.hint !== '' ? ` — ${v.hint}` : '')))))
    }),
  )
}

/** THE CARD FORM (the constructor's surface half) — the spec's
 *  fields, grouped, visible-when honored, defaults seeded by the
 *  caller (specDefaults — propagated from the emission). Edits ride
 *  the caller's values map. Each field renders through the claimed
 *  atom for its emitted type when the caller passes one; the base's
 *  built-in atom is the default.
 *
 *  THE CONSTRUCTION LAW IS NOT OPTIONAL (operator, 2026-09-12: "the
 *  img-to-mesh input component — you are not using it around — you
 *  are hardcoding"): an emitted image/file input constructs THE ONE
 *  SQUARE AUTOMATICALLY, in EVERY surface. The constructor OWNS the
 *  square provider — no call site wires it, no call site can forget
 *  it. The caller hands only the WIRE (picker candidates), never the
 *  component; a caller that passes its own `square` fn overrides (the
 *  host-claim seam), but the default is the constructor's own. */
/** ONE SPEC FIELD ROW (hour 15, stroke C): the label chrome (key,
 *  required star, hint) around the atom — CardForm's own row, opened
 *  to rail sections that render served fields outside a whole form
 *  (mask's TuneSection). The claim seam stays CardForm's; this row
 *  takes the resolved atom inputs. */
export function SpecFieldRow({ f, value, onEdit, square, wireCandidates }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  wireCandidates?: Array<{ id: string; label: string; url: string }>
}): ReturnType<typeof h> {
  return h('label', { className: css.specField },
    h('span', { className: css.specFieldKey },
      f.label,
      f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
    ),
    h(SpecAtom, { f, value, onEdit, square, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
    f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
  )
}

export function CardForm({ spec, fields, values, onEdit, wire, square, atoms, onPatch }: {
  /** the WHOLE emission (fields + model/variants) — present whenever
   *  the host fetched the doc; the axes render from THIS. */
  spec?: FormSpecDoc
  fields: SpecField[]
  values: SpecValues
  onEdit(name: string, v: unknown): void
  /** the picker wire (the other stages' latest outputs) — data, never
   *  components. The constructor builds the provider from THIS. */
  wire?: SquareWire
  /** the host's square override (the claim seam). Rare. */
  square?: (f: SpecField) => SquareHost | undefined
  /** the field-atom seam's claims, keyed by emitted wire type —
   *  a card's takeover of its own atoms (undefined = built-ins). */
  atoms?: Record<string, FieldAtomClaim>
  /** immediate persistence for mod commits (the onSaveParams law).
   *  Absent (the add drill): commits ride the values map. */
  onPatch?: (patch: Record<string, unknown>) => void
}): ReturnType<typeof h> {
  // THE MOD SYSTEM IS CORE (operator, 2026-09-12: "MOD SYSTEM IS
  // CORE. NEVER HARDCODED"): mod-owned names NEVER render as flat
  // card fields — the section owns them. The exclusion is derived
  // from the served kinds alone, in EVERY surface, automatically.
  const modKinds = spec?.features?.modifiers ?? []
  const owned = modOwnedFields(spec ?? { form: '', fields: [], variants: [] })
  const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields
  const groups = groupFields(flatFields, values)
  const atomOf = (f: SpecField): FieldAtomClaim | undefined => atoms?.[f.type]
  // THE CONSTRUCTOR'S OWN PROVIDER — always built (hook law), used
  // unless the host claimed the square seam itself.
  const own = useSquareProvider(onEdit, wire ?? { candidates: [] })
  const squareFor = square ?? own.square
  // ONE-TIME axis seeding (a reopened stage holds its keys; a fresh
  // stage gets the first-declared law) — an effect, never render-time.
  const seeded = useRef(false)
  const valuesRef = useRef(values)
  valuesRef.current = values
  useEffect(() => {
    if (spec === undefined || seeded.current) return
    seeded.current = true
    const seed = seedAxisValues(spec, valuesRef.current)
    for (const [k, v] of Object.entries(seed)) onEdit(k, v)
    // one-shot by the ref guard; spec identity is the trigger
  }, [spec, onEdit])
  return h('div', { className: css.specForm },
    spec !== undefined ? h(ModelAxes, { spec, values, onEdit }) : null,
    groups.map((g) => {
      // THE SLOT ROW partition: image/image_list fields of one group
      // share a horizontal row (their labels live under their squares);
      // every other field keeps its stacked key row.
      const children: Array<ReturnType<typeof h>> = []
      let row: Array<ReturnType<typeof h>> = []
      const flush = (): void => {
        if (row.length === 0) return
        children.push(h('div', { key: 'slotrow-' + String(children.length), className: css.specSlotRow }, row))
        row = []
      }
      for (const f of g.fields) {
        const claim = atomOf(f)
        const sq = squareFor(f)
        const wireCandidates = wire?.candidates
        if (claim !== undefined) {
          flush()
          children.push(h('label', { key: f.name, className: css.specField },
            h('span', { className: css.specFieldKey },
              f.label,
              f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
            ),
            claim({ f, value: values[f.name], onEdit, square: sq }),
            f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
          ))
          continue
        }
        if (f.type === 'image_list') {
          flush()
          children.push(h('div', {
            key: f.name,
            className: css.specSlotCell,
            title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
          },
            h(SpecAtom, { f, value: values[f.name], onEdit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
          ))
          continue
        }
        if (f.type === 'image' || f.type === 'file') {
          row.push(h('div', {
            key: f.name,
            className: css.specSlotCell,
            title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
          },
            h(SpecAtom, { f, value: values[f.name], onEdit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
          ))
          continue
        }
        flush()
        children.push(h(SpecFieldRow, { key: f.name, f, value: values[f.name], onEdit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }))
      }
      flush()
      return h('section', { key: g.group ?? '', className: css.specGroup },
        g.group !== null ? h('h4', { className: css.specGroupTitle }, g.group) : null,
        children,
      )
    }),
    // THE MOD SYSTEM — rendered by the constructor itself: every
    // surface (stage drill, add drill, studios) obeys, none wires it.
    modKinds.length > 0
      ? h(ModifiersSection, { kinds: modKinds, values, onEdit, ...(onPatch !== undefined ? { onPatch } : {}) })
      : null,
    own.wireMenu,
  )
}
