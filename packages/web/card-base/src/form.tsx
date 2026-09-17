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
import type { BboxFaceComponent, PaintFaceComponent } from './mods.tsx'
import { uploadInputFile } from './wire.ts'
import {
  activeRowId, activeVariantId, axisGroups, axisKey, axisPickPatch, coerceFieldEdit, composingRows, fieldsOf,
  fieldsOfEnvelope, entryFieldsOfEnvelope, kindScalarFieldsOfEnvelope, groupFields, modelChoices, modOwnedFields, modelSwitchPatch, resolveValue, rowsFor, titleCaseId, variantRows,
  quantRowsFor,
  type FormSpecDoc, type SpecField, type SpecValues, type VariantRow,
} from './spec.ts'
import { fetchFormSpec } from './wire.ts'
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
  /** THE MEDIA SOURCE (stroke 81's one-lane law): the picker's
   *  media rows arrive INJECTED — the host surface owns the estate
   *  lane (the mounted media namespace); the base form carries no
   *  transport of its own. Absent → the picker degrades to an empty
   *  list (honest, never a hidden fetch). */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
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
      // NO __none__ GUARD (the exhaustive-menu proof): this closure's
      // items are the four literal ids above and the three arms above
      // return — reaching here MEANS __none__ (the danger row). A
      // fourth guard would be untestable dead code (v8 cannot count a
      // block-end implicit else) guarding an impossible state.
      setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
      onEdit(f.name, '')
      return
    },
    onClose: () => { setPickAt(null) },
    portal: true,
  })

  // THE PICKER MODAL (default face; the seam may claim it): ONE
  // component, two row sources — flow candidates (edge-law narrowed)
  // and the media library (kind-filtered through the wire's door).
  // THE DEP LAW: the effect keys on the loader FUNCTION, never the
  // wire object — callers build the wire inline per render (a fresh
  // identity every pass), so keying on `wire` re-fires the load on
  // every setMediaRows render: an infinite load loop that OOMs the
  // tab (input-square's From-media wall caught it: 4GB, zero tests
  // run). The loader is a stable module reference at every call
  // site (CardsTab injects fetchMediaLibrary), so the load fires
  // once per modal opening.
  const loadMedia = wire?.loadMedia
  useEffect(() => {
    if (modalAt?.mode !== 'media') return
    if (loadMedia === undefined) { setMediaRows([]); return }
    const ctrl = new AbortController()
    setMediaRows(null)
    loadMedia(mediaKindForField(modalAt.field), ctrl.signal)
      .then((items) => { setMediaRows(items.map((it) => ({ id: it.url, label: it.name, url: it.url }))) })
      .catch(() => { setMediaRows([]) })
    return () => { ctrl.abort() }
  }, [modalAt, loadMedia])
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
      // NO NULL GUARD (the always-mounted proof): this handler fires
      // only while the provider fragment is mounted and the ref rides
      // its always-rendered hidden input (same shape as square.tsx's
      // retired guard) — unmounts deliver no change events.
      fileRef.current!.value = ''
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
  /** Hide the caption under the square — the owning section already
   *  names it (2026-09-15: the studio's First/Last frame subcards
   *  rendered the label TWICE). Default shows it. */
  hideLabel?: boolean
  /** 'image' narrows the media modal to image; anything else lists
   *  the whole library (the file face). */
  kind?: 'image' | 'file'
  /** Attached value (thumbnail when it passes isImageUrl). */
  value?: string | null
  /** The ONE write verb — every source funnels here. */
  onEdit: (v: string) => void
  /** The surface's own upstream outputs (the From flow rows). */
  candidates?: Array<{ id: string; label: string; url: string }>
  /** The surface's media source (the mounted media namespace's
   *  fetchMediaLibrary, or a test fake) — absent = the picker shows
   *  no media rows (honest, never a hidden fetch). */
  loadMedia?: SquareWire['loadMedia']
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
    // NO COERCION (the string-verbs proof): the provider's four
    // onEdit call sites all pass strings — pick/onAsset are
    // string-typed, clear is the '' literal, upload passes the estate
    // name or its refusal message — so a non-string can never arrive.
    props.onEdit(v as string)
  }, [props.onEdit])
  const { square, wireMenu } = useSquareProvider(onEditField, {
    candidates: props.candidates ?? [],
    ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}),
    ...(props.onFile !== undefined ? { onFile: props.onFile } : {}),
    ...(props.renderSourcePick !== undefined ? { renderSourcePick: props.renderSourcePick } : {}),
  })
  // NO HOST GUARD (the slot-shape proof): field.type is image|file
  // by construction (line 324) and square() returns undefined only
  // for non-slot types — host is ALWAYS defined here, so both the
  // shown pick and the verbs spread below ride it directly.
  const host = square(field)!
  const shown = host.display ?? props.value ?? null
  return h('div', { className: css.sourceRow, 'data-source-row': props.label },
    wireMenu,
    h(InputSquare, {
      label: props.hideLabel === true ? '' : props.label,
      value: shown !== null && isImageUrl(shown) ? shown : null,
      metric: typeof props.value === 'string' && props.value !== '' && !isImageUrl(props.value)
        ? props.value
        : undefined,
      ...(host.verbs),
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
export function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  /** the wire's flow rows (the image_list slots source From flow too) */
  wireCandidates?: Array<{ id: string; label: string; url: string }>
  /** the row's placeholder override (the seed dice's random face:
   *  the sentinel never paints, the placeholder explains the state) */
  placeholder?: string
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
      // normalize: '1024' | {value:'1024', label:'1K'} → one shape.
      // THE TITLE-CASE FACE (the operator's sweep law): raw-id
      // labels render titled — the value rides verbatim.
      const row = typeof o === 'string' ? { value: o, label: o } : o
      return h('option', { key: row.value, value: row.value }, titleCaseId(row.label))
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
    // THE TEXTAREA LAW (stroke 23, the operator's word): "they
    // should start two lines, then as text enters them, they grow."
    // rows=2 sets the floor; the ref + input resize keeps the box at
    // its content (height:auto → scrollHeight, never below the
    // two-row floor). The ref fires on mount AND on outside writes
    // (the enhance sweep's write-back grows it too).
    const fit = (el: HTMLTextAreaElement | null): void => {
      if (el === null) return
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 2 * 22) + 'px'
    }
    return h('textarea', {
      className: css.specTextarea,
      rows: 2,
      value: String(value ?? ''),
      placeholder: f.placeholder ?? '',
      ref: fit,
      onChange: (e: unknown) => {
        const el = (e as { target: HTMLTextAreaElement }).target
        fit(el)
        onEdit(f.name, el.value)
      },
      'aria-label': f.label,
    })
  }
  // number, seed, text — the raw-string Input (coerce once at patch)
  return h(Input, {
    value: String(value ?? ''),
    placeholder: placeholder ?? f.placeholder ?? '',
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
/** THE PACK PROMPT (the no-silent-drop law's extension half,
 *  stroke 18): the card's DECLARED extension packs that the engine
 *  cannot see render AS THEMSELVES — marked missing, with the
 *  install verb one click away (the manage door's install_extension;
 *  the host owns the wire). Present and unknown packs render nothing
 *  (nothing to act on; the spec carries their truth for anyone who
 *  reads it). Never a silently absent pack: the run's refusal text
 *  and this prompt name the same id. */
export function PackPrompt({ spec, onInstallPack }: {
  spec: FormSpecDoc
  onInstallPack?: (id: string) => Promise<boolean>
}): ReturnType<typeof h> | null {
  const missing = (spec.packs ?? []).filter((p) => p.present === false)
  if (missing.length === 0 || onInstallPack === undefined) return null
  return h('section', { className: `${css.specGroup} ${css.modelAxes}`, 'data-pack-prompt': '1' },
    h('h4', { className: css.specGroupTitle }, 'Extensions'),
    missing.map((p) => h(PackPromptRow, { key: p.id, id: p.id, onInstallPack })))
}

function PackPromptRow({ id, onInstallPack }: {
  id: string
  onInstallPack: (id: string) => Promise<boolean>
}): ReturnType<typeof h> {
  const [st, setSt] = useState<'idle' | 'busy' | 'queued' | 'failed'>('idle')
  return h('div', { className: css.specHint, 'data-missing-pack': id },
    id + ' is required by this card but not installed on the engine.',
    ' ',
    h('button', {
      type: 'button',
      className: css.specLinkBtn,
      disabled: st !== 'idle',
      onClick: () => {
        setSt('busy')
        void onInstallPack(id)
          .then((ok: boolean) => setSt(ok ? 'queued' : 'failed'))
          .catch(() => setSt('failed'))
      },
    }, st === 'idle' ? 'Install ' + id
      : st === 'busy' ? 'Requesting…'
      : st === 'queued' ? 'Install queued ✓ (restart the engine when it lands)'
      : 'Install request failed — retry from the assets tab'))
}

export function ModelAxes({ spec, value, onSet, onDownloadModel }: {
  spec: FormSpecDoc
  value: SpecValues
  onSet(name: string, v: unknown): void
  /** THE RECIPE'S SEAT (stroke 20, the operator's placement law):
   *  when the card owns a recipe field AND the matrix serves, the
   *  field renders HERE — under Model/Variant/Quant — never at the
   *  bottom of the params list. One key, one seat; the options stay
   *  the card's own (the recipe-yield law above). */
  /** THE DOWNLOAD PROMPT's arm (stroke 18, the operator's law: a
   *  boarded model is OFFERED — absence prompts the user to
   *  download, never blocks the pick): when the HELD model is a
   *  boarded family whose weights are not on the machine, the rail
   *  renders the prompt; the click fires this (the host owns the
   *  manage wire — postManageAction provision_model). Without the
   *  arm the mark still renders (hosts without the manage door
   *  never show a dead button). Returns whether the provision
   *  request queued. */
  onDownloadModel?: (id: string) => Promise<boolean>
}): ReturnType<typeof h> | null {
  const groups = axisGroups(spec)
  if (groups.length === 0) return null
  const models = modelChoices(spec)
  // THE FAMILIES BLOCK (no-silent-drop law): the card's boarded
  // families render in the Model rail even when the machine has not
  // downloaded them — visible, marked, PICKABLE (stroke 18: offered
  // is offered; absence prompts, never blocks). Present families
  // not in the matrix (sibling boards) ride as options too.
  const matrixSet = new Set(models)
  const familyRows = (spec.families ?? []).map((f) => ({
    ...f,
    inMatrix: matrixSet.has(f.id),
  }))
  // THE FAMILY FACE MAP: a matrix route that IS a family route
  // (route-id-as-model, the family-routed cards — sfx, mask-form)
  // renders the family's DECL label, version included; variant and
  // quant routes keep their own faces (the axes carry those).
  const familyFace = new Map<string, string>()
  for (const f of spec.families ?? []) {
    if (f.label !== undefined && f.label !== '') familyFace.set(f.id, f.label)
  }
  const contract = spec.features?.variant_groups ?? {}
  const pick = (row: VariantRow): void => {
    const patch = axisPickPatch(spec, row)
    for (const [k, v] of Object.entries(patch)) onSet(k, v)
  }
  // STROKE 38 — THE OPERATOR'S LAW: "LORA IS NEVER STANDALONE. IT
  // IS ALWAYS A SUBSET OF THE MOD SYSTEM." A recipe pill's stamp
  // drops every mod-owned key (the bag storages and the mod fields
  // — modOwnedFields, the SubcardGrid law's own gate): the pill
  // never writes them, and a row whose stamp is ENTIRELY mod-owned
  // renders NO pill at all — the Modifiers menu is that payload's
  // one surface (it already serves every flavor row — label,
  // tooltip, default strength; a pill beside the axes was a second,
  // lesser door to the same entries).
  const modOwned = modOwnedFields(spec)
  const knobStamp = (r: VariantRow): SpecValues => {
    const stamp: SpecValues = {}
    for (const [k, v] of Object.entries(axisPickPatch(spec, r))) {
      if (!modOwned.has(k)) stamp[k] = v
    }
    return stamp
  }
  const pillRows = rowsFor(spec, 'Recipe').filter((r) => Object.keys(knobStamp(r)).length > 0)
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
  const knownModel = (m: string): boolean =>
    models.includes(m) || (spec.families ?? []).some((f) => f.id === m)
  const refusedModel = heldModel !== undefined && !knownModel(heldModel) ? heldModel : undefined
  // absent alone seeds (spec.model, the declared initial model)
  const shownModel = heldModel ?? (typeof spec.model === 'string' && spec.model !== '' ? spec.model : models[0] ?? '')
  // the HELD family's presence (the download prompt's trigger —
  // stroke 18) + the prompt's own gesture state
  const heldFam = (spec.families ?? []).find((f) => f.id === shownModel && !f.present)
  const [dlState, setDlState] = useState<'idle' | 'busy' | 'queued' | 'failed'>('idle')
  useEffect(() => { setDlState('idle') }, [shownModel])
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
        // (neutral mark — the error, not a scream)
        refusedModel !== undefined
          ? h('option', { key: refusedModel, value: refusedModel },
              titleCaseId(refusedModel) + ' — not an offered model of this card')
          : null,
        // boarded families: pickable — offered is offered (stroke
        // 18); absent ones carry the machine truth in the label and
        // the download prompt below (never dropped, never blocked).
        // IDs ONLY (stroke 19): the DECL label is prose describing a
        // variant+quant config — never a model option's face.
        familyRows.map((f) => f.inMatrix ? null : h('option', {
          key: 'fam-' + f.id, value: f.id,
          // THE FAMILY FACE (operator, 2026-09-16): the DECL label
          // carries the version ("MOSS-SFX v2") — an id-only face is
          // ambiguous between versions; titleCaseId stays the
          // label-less fallback.
        }, (f.label ?? titleCaseId(f.id)) + (f.present ? '' : ' — not downloaded on this machine'))),
        models.map((m) => h('option', { key: m, value: m }, familyFace.get(m) ?? titleCaseId(m)))),
    // THE DOWNLOAD PROMPT (stroke 18): the held model is boarded
    // but its weights are not on the machine — ask the user, never
    // block the pick. The button is the gesture; the manage door
    // queues the provision.
    heldFam !== undefined && onDownloadModel !== undefined
      ? h('div', { className: css.specHint, 'data-download-prompt': heldFam.id },
          titleCaseId(heldFam.id) + ' is offered by this card but not downloaded on this machine.',
          ' ',
          h('button', {
            type: 'button',
            className: css.specLinkBtn,
            disabled: dlState !== 'idle',
            onClick: () => {
              setDlState('busy')
              void onDownloadModel(heldFam.id)
                .then((ok: boolean) => setDlState(ok ? 'queued' : 'failed'))
                .catch(() => setDlState('failed'))
            },
          }, dlState === 'idle' ? 'Download ' + (heldFam.label ?? titleCaseId(heldFam.id))
            : dlState === 'busy' ? 'Requesting…'
            : dlState === 'queued' ? 'Download queued ✓ (run when it lands)'
            : 'Download request failed — retry from the assets tab'))
      : null),
    groups.map((g) => {
      const rows = rowsOf(g, active)
      const heldRaw = value[axisKey(g)]
      const heldId = typeof heldRaw === 'string' && heldRaw !== '' ? heldRaw : undefined
      const refusedId = heldId !== undefined && !rows.some((r) => r.id === heldId) ? heldId : undefined
      if (rows.length === 0 && refusedId === undefined) return null
      const label = contract[g]?.label ?? titleCaseId(g)
      return h('label', { key: g, className: css.specField },
        h('span', { className: css.specFieldKey }, label),
        h('select', {
          className: css.specSelect,
          'aria-label': label,
          'data-axis': g,
          ...(refusedId !== undefined ? { 'data-refused': g } : {}),
          // NO ?? '' (the assigned-every-path proof): the loop above
          // writes active[g] on ALL three arms (grounded / refused /
          // seeded) for every group before this map runs — the right
          // side could never fire.
          value: active[g]!,
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
                titleCaseId(refusedId) + ' — invalid ' + label.toLowerCase() + ' for ' + titleCaseId(heldModel ?? shownModel))
            : null,
          rows.map((v) => h('option', { key: v.id, value: v.id },
            titleCaseId(v.label) + (typeof v.hint === 'string' && v.hint !== '' ? ` — ${v.hint}` : '')))))
    }),
    // THE FAMILY RECIPE PILLS (stroke 34 — recipes are macros now,
    // never a mode): a served Recipe row that CARRIES a knob payload
    // renders as a stamp pill under the axes. The click writes the
    // row's knobStamp (above — the stroke-38 law) onto declared knob
    // keys (axisPickPatch — the same pick verb as every axis row). No
    // recipe key persists, nothing derives, nothing goes stale when
    // the variant rail moves — what it stamped is what you see.
    // Stamp-less rows (the family `default`) render nothing: a pill
    // that writes nothing is a dead control.
    pillRows.length > 0
      ? h('div', { className: css.specGroup, 'data-recipe-pills': '1' },
          pillRows.map((r) => h('button', {
              key: r.id,
              type: 'button',
              className: css.specLinkBtn,
              'data-recipe-pill': r.id,
              title: typeof r.hint === 'string' && r.hint !== '' ? r.hint : undefined,
              onClick: () => {
                for (const [k, v] of Object.entries(knobStamp(r))) onSet(k, v)
              },
            }, titleCaseId(r.label))))
      : null,
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
/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
 *  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
 *  seed in the lane, EVERY run). The dice sits at the key line's
 *  right end, across from the field's name: FILLED pips = random
 *  (a new seed every run), HOLLOW pips = fixed (this exact seed
 *  re-runs). The state DERIVES from the resolved value alone — no
 *  hidden mode to drift; the click writes the value: fixed → -1
 *  (random), random → a minted concrete int (the kit's own mint
 *  law, Math.floor(random * 2147483647)). Typing a number while
 *  random fixes it — the dice unfills by derivation, one source
 *  of truth. The input never paints the sentinel: random shows
 *  the placeholder, never "-1". */
function SeedDice({ random, onToggle }: { random: boolean; onToggle(): void }): ReturnType<typeof h> {
  return h('button', {
    type: 'button',
    className: css.specDice + (random ? ' ' + css.specDiceOn : ''),
    'data-seed-dice': random ? 'random' : 'fixed',
    'aria-pressed': random,
    'aria-label': 'seed dice',
    title: random
      ? 'Random — a new seed every run. Click to fix one.'
      : 'Fixed seed — this exact seed re-runs. Click for a new one every run.',
    onClick: onToggle,
  },
    h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': 'true' },
      h('rect', { x: 1.4, y: 1.4, width: 13.2, height: 13.2, rx: 3.2, stroke: 'currentColor', strokeWidth: 1.3 }),
      // the 5-pip face: 4 corners + center — filled when random,
      // hollow when fixed (one glyph, the pip fill IS the state)
      h('circle', { cx: 5, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 11, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 8, cy: 8, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 5, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 11, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
    ))
}

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
  const seedKnob = f.name === 'seed'
  const seedRandom = seedKnob && (value === -1 || value === '-1')
  return h('div', { className: css.specField },
    seedKnob
      // THE DICE SEAT (stroke 39): the key line becomes a header —
      // name left, dice right, per the operator's placement law
      // ("a dice icon to the top right, across from Seed")
      ? h('div', { className: css.specFieldHead },
          h('span', { className: css.specFieldKey },
            f.label,
            f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
          ),
          h(SeedDice, {
            random: seedRandom,
            onToggle: () => {
              if (seedRandom) {
                // random → fixed: mint NOW (the kit's mint law) so
                // the visual shows the exact seed that will run
                onEdit(f.name, Math.floor(Math.random() * 2147483647))
              } else {
                // fixed → random: the sentinel — the lane mints
                // every run (GATE S)
                onEdit(f.name, -1)
              }
            },
          }),
        )
      : h('span', { className: css.specFieldKey },
          f.label,
          f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
        ),
    h(SpecAtom, {
      f,
      // THE SENTINEL NEVER PAINTS: random shows the placeholder,
      // never "-1" (the dice carries the state's face)
      value: seedRandom ? undefined : value,
      ...(seedRandom ? { placeholder: 'random — new every run' } : {}),
      onEdit, square, ...(wireCandidates !== undefined ? { wireCandidates } : {}),
    }),
    f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
  )
}

export function CardForm({ spec, user, base, onSet, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference }: {
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
  /** THE PAINT FACE (paint-leaf-canvas.md): the host's brush modal
   *  for leaf_face kinds. Absent host = no verb (the square holds).
   *  Threaded verbatim into the mod section. */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78): the host's selection modal for
   *  bbox-canvas kinds. Absent host = the four inputs hold. */
  bboxFace?: BboxFaceComponent
  /** the card-level image field feeding the brush reference
   *  (mask-form: 'input_image'). Absent = no verb. */
  paintReference?: string
  /** THE DOWNLOAD PROMPT's arm (stroke 18): a boarded-but-absent
   *  model prompts download; the host supplies the manage wire. See
   *  ModelAxes. */
  onDownloadModel?: (id: string) => Promise<boolean>
  /** THE EXTENSION INSTALL ARM (stroke 18): a missing declared pack
   *  prompts install; the host supplies the manage wire. See
   *  PackPrompt. */
  onInstallPack?: (id: string) => Promise<boolean>
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
  // HYBRID kinds (the served entry mode — never the kind name):
  // the catalog select binds the option_key field while the bag
  // element's REMAINING fields render as entry rows, plus the
  // pack-level scalars as the section's own rows (the floor).
  const family = typeof spec.model === 'string' ? spec.model : undefined
  const modKinds = (spec.features?.modifiers ?? []).map((k) => {
    const env = spec.mod_schemas?.[k.schema_key ?? k.param_key]
    const hybrid = k.entry === 'hybrid'
    // CONTRACT A (stroke 76 wall — the paint leaf proved it): a
    // card-declared kind IS the catalog — its served fields/
    // kindFields ride VERBATIM, never re-derived from a mod_schemas
    // envelope it doesn't have (derivation would wipe the leaf).
    // Pack kinds (no declared rows) still derive from the envelope.
    // The declared rows normalize through the walker's own rule
    // (presentation type: the wtype hint wins — a declared
    // {type:'path',wtype:'image'} constructs the square like the
    // envelope's extra.wtype does).
    const declared = (rows: SpecField[] | undefined): SpecField[] | undefined =>
      rows?.map((f) => (typeof f.wtype === 'string' && f.wtype !== '' ? { ...f, type: f.wtype } : f))
    return {
      ...k,
      fields: hybrid ? entryFieldsOfEnvelope(env, k.param_key, family) : (declared(k.fields) ?? fieldsOfEnvelope(env, family)),
      kindFields: hybrid ? kindScalarFieldsOfEnvelope(env, k.param_key, family) : (declared(k.kindFields) ?? []),
    }
  })
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
  // THE MOD-OWNED SLOT LAW (stroke 32 — the operator's missing-seat
  // report: image-edit's required image1 never rendered): the
  // signature names SLOTS, not schema fields — a mod-owned slot
  // (image1, the lanpaint brick's anchor) seats in the rail like any
  // other, so the rail falls back to the mod kinds' fields. The mod
  // leaf skips rail-seated fields (no double face) — the signature
  // is the seat, the brick keeps its knobs.
  const modFieldByName = new Map<string, SpecField>()
  // NO ?? [] (the always-assigned proof): the modKinds map above
  // overwrites fields on EVERY arm (hybrid → entryFieldsOfEnvelope,
  // else declared ?? fieldsOfEnvelope — all arrays), so k.fields is
  // never undefined here.
  for (const k of modKinds) for (const f of k.fields) {
    if (!modFieldByName.has(f.name)) modFieldByName.set(f.name, f)
  }
  const railOf = (inp: { name: string; kind?: string }): SpecField | undefined => {
    const f = flatFields.find((x) => x.name === inp.name) ?? modFieldByName.get(inp.name)
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
  // THE PARAMETER SUBMENU (stroke 89, operator order 2026-09-17:
  // "instead of making a form card, and abstracting the form card
  // to allow for switchable submenus of parameters, you handroll" —
  // the base form owns it now): an emission declaring MORE THAN ONE
  // parameter group renders the groups as a switchable submenu — a
  // tab rail, one visible panel at a time. Zero/one group keeps the
  // stacked sections: no existing card sees a behavior change, and
  // a card NEVER owns this UI (the constructor reads the declared
  // `group` extras — the emission contract, nothing bespoke).
  const submenu = groups.length > 1
  const [openGroup, setOpenGroup] = useState<string | null | undefined>(undefined)
  const activeGroup = submenu ? (groups.find((g) => g.group === openGroup) ?? groups[0]) : undefined
  const shownGroups = submenu && activeGroup !== undefined ? [activeGroup] : groups
  const atomOf = (f: SpecField): FieldAtomClaim | undefined => atoms?.[f.type]
  // THE CONSTRUCTOR'S OWN PROVIDER — always built (hook law), used
  // unless the host claimed the square seam itself.
  const own = useSquareProvider(edit, wire ?? { candidates: [] })
  const squareFor = square ?? own.square
  return h('div', { className: css.specForm },
    // THE AXES ride the user layer through the same edit seam (their
    // picks are ordinary sets; the resolved value passes along).
    h(PackPrompt, { spec, onInstallPack }),
    h(ModelAxes, { spec, value, onSet: edit, onDownloadModel }),
    railFields.length > 0
      ? h('section', { className: css.specGroup + ' ' + css.inputRail, 'data-input-rail': '1' },
          h('div', { className: css.specSlotRow },
            railFields.map((f) => {
              // NO image_list ARM (the rail-gate proof): railOf returns
              // a field ONLY for type image|file, so railFields can
              // never carry an image_list row.
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
    submenu && activeGroup !== undefined
      ? h('div', { className: css.groupTabs, role: 'tablist', 'data-form-submenu': '1' },
          groups.map((g) => {
            const selected = activeGroup.group === g.group
            return h('button', {
              key: g.group ?? '__general__',
              type: 'button',
              role: 'tab',
              'aria-selected': selected ? 'true' : 'false',
              'data-form-group-tab': g.group ?? 'general',
              className: css.groupTab + (selected ? ' ' + css.groupTabActive : ''),
              onClick: () => { setOpenGroup(g.group) },
            }, titleCaseId(g.group ?? 'General'))
          }),
        )
      : null,
    shownGroups.map((g) => {
      // THE DECL GRID (stroke 22): the group's `columns` (declared on
      // its fields — first-seen wins) grids the section; each field
      // spans its declared `width`. Undeclared → the stacked face.
      const gridCols = g.fields.find((f) => typeof f.columns === 'number' && f.columns >= 2)?.columns
      const cellStyle = (f: SpecField): Record<string, string> => {
        // NO gridCols-undefined ARM (the guarded-call-site proof):
        // the sole call below runs only in the gridded branch, so
        // gridCols is ALWAYS defined here.
        // THE TEXTAREA LAW: prompts never sit side by side — a
        // textarea spans the full row however the group grids
        // THE OVERFLOW LAW (stroke 24): minWidth 0 lets the ITEM
        // shrink inside its track — an input's ~185px intrinsic min
        // must never grow the card a horizontal scrollbar.
        if (f.type === 'textarea') return { gridColumn: '1 / -1', minWidth: '0' }
        return { gridColumn: `span ${Math.max(1, Math.floor(f.width ?? 1))}`, minWidth: '0' }
      }
      // THE SLOT ROW partition: image/image_list fields of one group
      // share a horizontal row (their labels live under their squares);
      // every other field keeps its stacked key row.
      const children: Array<ReturnType<typeof h>> = []
      let row: Array<ReturnType<typeof h>> = []
      const flush = (): void => {
        if (row.length === 0) return
        children.push(h('div', {
          key: 'slotrow-' + String(children.length), className: css.specSlotRow,
          ...(gridCols !== undefined ? { style: { gridColumn: '1 / -1', minWidth: '0' } } : {}),
        }, row))
        row = []
      }
      for (const f of g.fields) {
        // NO railNames SKIP (the visible-filter proof): groups derive
        // from groupFieldsAll, which visible() already stripped of
        // rail-seated names — a rail field can never arrive here.
        const claim = atomOf(f)
        const sq = squareFor(f)
        const wireCandidates = wire?.candidates
        if (claim !== undefined) {
          flush()
          const cell = h('div', { key: f.name, className: css.specField },
            h('span', { className: css.specFieldKey },
              f.label,
              f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
            ),
            claim({ f, value: value[f.name], onEdit: edit, square: sq }),
            f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
          )
          children.push(gridCols === undefined ? cell : h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell))
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
        const cell = h(SpecFieldRow, {
          key: f.name, f, value: value[f.name], onEdit: edit,
          ...(sq !== undefined ? { square: sq } : {}),
          ...(wireCandidates !== undefined ? { wireCandidates } : {}),
        })
        children.push(gridCols === undefined ? cell : h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell))
      }
      flush()
      return h('section', { key: g.group ?? '', className: css.specGroup, 'data-form-group-panel': g.group ?? 'general' },
        // THE SUBMENU NAMES THE PANEL: when the tab rail carries the
        // group's title, the panel repeats nothing (the DRY law).
        g.group !== null && !submenu ? h('h4', { className: css.specGroupTitle }, titleCaseId(g.group)) : null,
        gridCols === undefined ? children
          : h('div', { className: css.specGrid, style: { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` } }, children),
      )
    }),
    // THE MOD SYSTEM — rendered by the constructor itself: every
    // surface (stage drill, add drill, studios) obeys, none wires it.
    modKinds.length > 0
      ? h(ModifiersSection, {
          kinds: modKinds, values: value, onEdit: edit, railSeated: railNames,
          ...(onPatch !== undefined ? { onPatch } : {}),
          ...(paintFace !== undefined ? { paintFace } : {}),
          ...(bboxFace !== undefined ? { bboxFace } : {}),
          ...(paintReference !== undefined ? { paintReference } : {}),
          ...(wire?.loadMedia !== undefined ? { loadMedia: wire.loadMedia } : {}),
        })
      : null,
    own.wireMenu,
  )
}
