/**
 * form.tsx — @melite/card-base: THE CONSTRUCTOR.
 *
 * THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
 * construct the card ui should see that the card package emits an
 * image input, then constructs the input component automatically"):
 * the base reads the card package's EMISSION — the served form-spec
 * (the schema envelope, declared input/output edges, mod kinds) —
 * and constructs the surface. The resolved value derives per render
 * (resolveValue — the engine's compose cascade mirrored); every
 * image/file field gets THE ONE square (square.tsx) with the
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
  activeRowId, activeVariantId, axisGroups, axisKey, axisPickPatch, coerceFieldEdit, composingRows, fieldsOf,
  fieldsOfEnvelope, groupFields, modelChoices, modOwnedFields, modelSwitchPatch, recipeModStacks, resolveValue, rowsFor, variantRows,
  quantRowsFor,
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
function useLocalSliderValue(value: unknown): { value: number | null, set(n: number): void } {
  const num = typeof value === 'number' ? value : Number(value)
  const [local, setLocal] = useState<number | null>(null)
  useEffect(() => { setLocal(null) }, [num]) // eslint-disable-line react-hooks/exhaustive-deps
  // NO FALLBACK (operator, hour 26): a HELD value that is not a
  // finite number is an ERROR, surfaced by the atom (null = the
  // refused face) — NEVER the field default painted over it while
  // the run composes the poison. ABSENT alone may seed (the
  // initial-value law, resolved upstream by resolveValue).
  return {
    value: local !== null ? local : (Number.isFinite(num) ? num : null),
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
  const shown = useLocalSliderValue(value)
  // the refused face: the held value is not a number the run can
  // compose — it renders AS ITSELF (raw), the slider refuses to
  // imply a healthy number it does not hold
  if (shown.value === null) {
    return h('span', { className: css.specSliderRow, 'data-refused': f.name },
      h('span', { className: css.specSliderValue },
        String(value) + ' — REFUSED: not a number'),
    )
  }
  return h('span', { className: css.specSliderRow },
    h('input', {
      className: css.specSlider,
      type: 'range',
      min: f.min ?? 0,
      max: f.max ?? 10,
      step: f.step ?? 0.1,
      value: shown.value,
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
    // NO FALLBACK (operator, hour 26): a HELD value that is neither
    // boolean nor their wire strings is an ERROR — rendered as
    // itself, refused. Painting OFF over a poison truthy (while the
    // run composes it) was a 1:1 lie.
    if (value !== undefined && value !== null
      && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      return h('span', { className: css.specField, 'data-refused': f.name },
        f.label + ': ' + String(value) + ' — REFUSED: not a boolean',
      )
    }
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
export function ModelAxes({ spec, value, onSet }: {
  spec: FormSpecDoc
  value: SpecValues
  onSet(name: string, v: unknown): void
}): ReturnType<typeof h> | null {
  const groups = axisGroups(spec)
  if (groups.length === 0) return null
  const models = modelChoices(spec)
  const contract = spec.features?.variant_groups ?? {}
  const pick = (row: VariantRow): void => {
    const patch = axisPickPatch(spec, row)
    for (const [k, v] of Object.entries(patch)) onSet(k, v)
  }
  // ── THE NO-FALLBACK LAW (operator, hour 26: "NO. MORE.
  //    FALLBACKS.") ───────────────────────────────────────────────
  // A HELD value that cannot be honored is an ERROR and renders AS
  // ITSELF, refused — NEVER substituted with a plausible neighbor.
  // The lane proof: a stage holding model=anima (not offered by its
  // card's matrix) rendered krea-2 (first <option> painted over the
  // unmatched value) and krea's turbo blurb (the held id matched
  // ANOTHER family's row in the ungated union) while the run shot
  // anima and the engine refused. Every one of those soft landings
  // was a 1:1 lie. Seeding stays legal for ABSENT keys only (the
  // initial-value law); a HELD key renders its own truth.
  const heldModelRaw = value['model']
  const heldModel = typeof heldModelRaw === 'string' && heldModelRaw !== '' ? heldModelRaw : undefined
  const refusedModel = heldModel !== undefined && !models.includes(heldModel) ? heldModel : undefined
  // absent alone seeds (spec.model, the declared initial model)
  const shownModel = heldModel ?? (typeof spec.model === 'string' && spec.model !== '' ? spec.model : models[0] ?? '')
  // rows compose with the axes above (the owner chain — the
  // declared matrix law: the Variant axis is the family's OWN
  // cross-model map, so its offers stay the full served list; the
  // groups below chain by owner)
  const rowsOf = (g: string, active: Record<string, string | undefined>): VariantRow[] =>
    composingRows(spec, g, active)
  // resolve actives down the chain (Variant first, then chained
  // groups): a HELD id that composes renders grounded; a held id
  // that does NOT renders AS ITSELF, refused (never the first row
  // painted over it — that substitution was the 1:1 lie); an ABSENT
  // id alone seeds (activeRowId's model-aware lookup, else the
  // first-declared composing row — the initial-value law).
  const active: Record<string, string | undefined> = {}
  for (const g of groups) {
    const heldRaw = value[axisKey(g)]
    const heldId = typeof heldRaw === 'string' && heldRaw !== '' ? heldRaw : undefined
    const rows = rowsOf(g, active)
    if (heldId !== undefined && rows.some((r) => r.id === heldId)) {
      active[g] = heldId
    } else if (heldId !== undefined) {
      active[g] = heldId // refused — rendered as itself below
    } else {
      const byRoute = activeRowId(spec, value, g, active)
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
        ...(refusedModel !== undefined ? { 'data-refused': 'model' } : {}),
        value: shownModel,
        // THE STALE-VARIANT CURE (operator 2026-09-14): a model
        // switch re-seeds EVERY axis (variant/quant/…) to the new
        // family's rows — keeping turbo while pointing at anima is
        // a compose refusal, never a carried-over default.
        onChange: (e: unknown) => {
          const m = (e as { target: { value: string } }).target.value
          const patch = modelSwitchPatch(spec, m)
          for (const [k, v] of Object.entries(patch)) onSet(k, v)
        },
      },
        // the refused model renders AS ITSELF — the run will shoot
        // it and the engine will refuse; the visual says the same
        refusedModel !== undefined
          ? h('option', { key: refusedModel, value: refusedModel },
              refusedModel + ' — REFUSED: not offered by this card')
          : null,
        models.map((m) => h('option', { key: m, value: m }, m)))),
    groups.map((g) => {
      const rows = rowsOf(g, active)
      const heldRaw = value[axisKey(g)]
      const heldId = typeof heldRaw === 'string' && heldRaw !== '' ? heldRaw : undefined
      const refusedId = heldId !== undefined && !rows.some((r) => r.id === heldId) ? heldId : undefined
      if (rows.length === 0 && refusedId === undefined) return null
      const label = contract[g]?.label ?? g
      return h('label', { key: g, className: css.specField },
        h('span', { className: css.specFieldKey }, label),
        h('select', {
          className: css.specSelect,
          'aria-label': label,
          'data-axis': g,
          ...(refusedId !== undefined ? { 'data-refused': g } : {}),
          value: active[g] ?? '',
          onChange: (e: unknown) => {
            const id = (e as { target: { value: string } }).target.value
            const row = rows.find((v) => v.id === id)
            if (row !== undefined) pick(row)
          },
        },
          // the refused coord renders AS ITSELF (never another
          // family's row face) — the run refuses it, so does the
          // visual; the grounded rows stay one pick away as repair
          refusedId !== undefined
            ? h('option', { key: refusedId, value: refusedId },
                refusedId + ' — REFUSED: not a ' + label.toLowerCase() + ' of ' + (heldModel ?? shownModel))
            : null,
          rows.map((v) => h('option', { key: v.id, value: v.id },
            v.label + (typeof v.hint === 'string' && v.hint !== '' ? ` — ${v.hint}` : '')))))
    }),
  )
}

/** THE CARD FORM (the constructor's surface half) — the emission's
 *  fields walked off the schema envelope, grouped, visible-when
 *  honored; the RESOLVED value derives per render (resolveValue —
 *  the engine's compose cascade mirrored), edits are set/unset ops
 *  over the USER layer (the settings law: presence IS the override
 *  mark, the reset chip removes it). Each field renders through the
 *  claimed atom for its emitted type when the caller passes one;
 *  the base's built-in atom is the default.
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
  // the row is a DIV, not a wrapper label: the atoms self-label
  // (aria-label) — a button inside a <label> steals the label
  // association (interactive-in-label is the discouraged shape
  // anyway; the reset chips retired hour-26 — the unset path is the
  // tri-state's native undefined, no chrome needed)
  return h('div', { className: css.specField },
    h('span', { className: css.specFieldKey },
      f.label,
      f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
    ),
    h(SpecAtom, { f, value, onEdit, square, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
    f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
  )
}

export function CardForm({ spec, user, base, onSet, onUnset, wire, square, atoms, onPatch }: {
  /** the WHOLE emission (the schema envelope + model/variants) —
   *  REQUIRED now: the fields, the axes, and the mod param rows all
   *  derive from THIS (useFormSpec fetches it). */
  spec: FormSpecDoc
  /** THE USER LAYER (the settings model): the stage's explicit
   *  params. A key's PRESENCE is the override mark — the resolved
   *  value derives (resolveValue: schema defaults <- model defaults
   *  <- card recipe <- user), never a seeded values map. */
  user: SpecValues
  /** THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): the stage
   *  row's `resolved` map — prepareCardParams' own stamps, served by
   *  the drafts doors. Layers under the user (presence still wins)
   *  and over the client's guesses — one resolver, served to the
   *  visual. Absent = the registry-less lane derive. */
  base?: SpecValues
  onSet(name: string, v: unknown): void
  /** Remove an override (the reset path): the host patches the key
   *  out of the user layer; the row re-derives to its base. */
  onUnset?(name: string): void
  /** the picker wire (the other stages' latest outputs) — data, never
   *  components. The constructor builds the provider from THIS. */
  wire?: SquareWire
  /** the host's square override (the claim seam). Rare. */
  square?: (f: SpecField) => SquareHost | undefined
  /** the field-atom seam's claims, keyed by emitted wire type —
   *  a card's takeover of its own atoms (undefined = built-ins). */
  atoms?: Record<string, FieldAtomClaim>
  /** immediate persistence for mod commits (the onSaveParams law).
   *  Absent (the add drill): commits ride the user map. */
  onPatch?: (patch: Record<string, unknown>) => void
}): ReturnType<typeof h> {
  // DERIVED, ALWAYS FRESH (the layered law): fields walk the schema
  // envelope (families-scoped); the resolved value layers defaults
  // <- model defaults <- recipe <- user — exactly what a run
  // composes. No seeding, no mirrors, no stamp ledger: one source,
  // re-derived every render.
  const fields = fieldsOf(spec)
  const value = resolveValue(spec, user, base)
  const fieldByName = new Map(fields.map((f) => [f.name, f] as const))
  // THE EDIT COERCION (the one specPatch duty that survives, moved
  // to the edit boundary where it always belonged): atoms emit raw
  // strings while typing; a numeric field's edit rides the user
  // layer as a NUMBER. An unparseable/empty numeric string rides
  // VERBATIM (the run's schema parse refuses loud, naming the field
  // — never a silent 0). The tri-state's `undefined` (inherit) is an
  // UNSET, not a value: the settings' unset path op, natively.
  const edit = (name: string, v: unknown): void => {
    if (v === undefined) { onUnset?.(name); return }
    onSet(name, coerceFieldEdit(fieldByName.get(name), v))
  }
  // THE MOD SYSTEM IS CORE (operator, 2026-09-12: "MOD SYSTEM IS
  // CORE. NEVER HARDCODED"): mod-owned names NEVER render as flat
  // card fields — the section owns them. The exclusion is derived
  // from the served kinds alone, in EVERY surface, automatically.
  // The FIELD kinds' param rows derive off the mod contracts' own
  // envelopes (mod_schemas — the same walker as the card fields).
  const family = typeof spec.model === 'string' ? spec.model : undefined
  const modKinds = (spec.features?.modifiers ?? []).map((k) => ({
    ...k,
    fields: fieldsOfEnvelope(spec.mod_schemas?.[k.param_key], family),
  }))
  const owned = modOwnedFields(spec)
  const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields
  // THE INPUT RAIL (the operator's law, 2026-09-13: "CARDS EMIT INPUT
  // SIGNATURES, SO IT'S CLEAN DATA THE UI PACKAGE RECEIVES"): when the
  // spec carries the declared input signature, the slot-shaped inputs
  // render in ONE rail IN DECLARED ORDER — image1, image2, image3 side
  // by side, the image_list row in the same zone — and the param groups
  // EXCLUDE them (the flat fields' incidental grouping — card-owned vs
  // absorbed flavor, group ids, emission order — never shapes the
  // input surface again). Text-kind edges stay params; fields whose
  // wtype has no slot atom yet stay in the groups.
  const signature = Array.isArray(spec.inputs) ? spec.inputs : []
  const railOf = (inp: { name: string; kind?: string }): SpecField | undefined => {
    const f = flatFields.find((x) => x.name === inp.name)
    if (f === undefined) return undefined
    if (f.type === 'image' || f.type === 'file') return f
    return undefined
  }
  const railFields = signature
    .map((inp) => (typeof inp?.name === 'string' ? railOf(inp as { name: string }) : undefined))
    .filter((f): f is SpecField => f !== undefined)
  const railNames = new Set(railFields.map((f) => f.name))
  const visible = (f: SpecField): boolean =>
    f.type !== 'image_list' && !railNames.has(f.name)
  const groupFieldsAll = flatFields.filter(visible)
  const groups = groupFields(groupFieldsAll, value)
  const atomOf = (f: SpecField): FieldAtomClaim | undefined => atoms?.[f.type]
  // THE CONSTRUCTOR'S OWN PROVIDER — always built (hook law), used
  // unless the host claimed the square seam itself.
  const own = useSquareProvider(edit, wire ?? { candidates: [] })
  const squareFor = square ?? own.square
  return h('div', { className: css.specForm },
    // THE AXES ride the user layer through the same edit seam (their
    // picks are ordinary sets; the resolved value passes along).
    h(ModelAxes, { spec, value, onSet: edit }),
    railFields.length > 0
      ? h('section', { className: css.specGroup + ' ' + css.inputRail, 'data-input-rail': '1' },
          h('div', { className: css.specSlotRow },
            railFields.map((f) => {
              if (f.type === 'image_list') return null
              return h('div', {
                key: f.name,
                className: css.specSlotCell,
                title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
              },
                h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: squareFor(f), ...(wire?.candidates !== undefined ? { wireCandidates: wire.candidates } : {}) }),
              )
            }),
          ),
        )
      : null,
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
        if (railNames.has(f.name)) continue
        const claim = atomOf(f)
        const sq = squareFor(f)
        const wireCandidates = wire?.candidates
        if (claim !== undefined) {
          flush()
          // div, not label (see SpecFieldRow)
          children.push(h('div', { key: f.name, className: css.specField },
            h('span', { className: css.specFieldKey },
              f.label,
              f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
            ),
            claim({ f, value: value[f.name], onEdit: edit, square: sq }),
            f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
          ))
          continue
        }
        if (f.type === 'image' || f.type === 'file') {
          row.push(h('div', {
            key: f.name,
            className: css.specSlotCell,
            title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
          },
            h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
          ))
          continue
        }
        flush()
        children.push(h(SpecFieldRow, {
          key: f.name, f, value: value[f.name], onEdit: edit,
          ...(sq !== undefined ? { square: sq } : {}),
          ...(wireCandidates !== undefined ? { wireCandidates } : {}),
        }))
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
      ? h(ModifiersSection, {
          kinds: modKinds, values: value, onEdit: edit,
          ...(onPatch !== undefined ? { onPatch } : {}),
          // the recipe's mod payload — read-only rows ahead of the
          // user's (the mod plane owns them; loras are a mod type)
          base: recipeModStacks(spec, user, base),
        })
      : null,
    own.wireMenu,
  )
}
