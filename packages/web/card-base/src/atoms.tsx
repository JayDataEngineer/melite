/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'
import { Input, Pill, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare, isImageUrl, isMeshUrl } from './square.tsx'
import { type SpecField, resolveValue, titleCaseId } from './spec.ts'
import css from './card.module.css'
import { type SourceRowProps, type SquareHost, useSquareProvider } from './square-provider.tsx'

export function SourceRow(props: SourceRowProps): ReturnType<typeof h> {
  const field: SpecField = {
    // THE EDGE-BEARING NAME (the list-seat law): a caller that owns
    // a declared input edge (the stack's owning field) threads it so
    // the From-flow picker narrows by THAT edge's kind; the legacy
    // synthetic name carries no edge and lists unfiltered.
    name: props.name ?? '__source_row__',
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
    ...(props.candidatesFor !== undefined ? { candidatesFor: props.candidatesFor } : {}),
    ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}),
    ...(props.onFile !== undefined ? { onFile: props.onFile } : {}),
    ...(props.accept !== undefined ? { accept: props.accept } : {}),
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
      ...(props.ariaLabel !== undefined ? { ariaLabel: props.ariaLabel } : {}),
      // THE MESH VALUE RIDES THROUGH (primitive ③'s forgotten seam:
      // isMeshUrl was imported but the gate below only knew
      // isImageUrl — a .glb value arrived as null + a metric line,
      // so the square's inline viewport never mounted). Thumb rule,
      // same for both faces: a renderable value rides as value,
      // junk rides as metric.
      value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
      metric: typeof props.value === 'string' && props.value !== '' && !isImageUrl(props.value) && !isMeshUrl(props.value)
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
 *  value actually moves.
 *
 *  THE VARIANT-ENVELOPE CLAMP (the dragbar law, 2026-10-13): the
 *  track clamps to the ACTIVE variant's declared envelope (min and
 *  max intersected with the field's own bounds) — an
 *  out-of-envelope value cannot be dragged or saved from the form
 *  while the wire gate stays loud for API authors. A HELD value
 *  outside the envelope renders AS ITSELF, refused (the
 *  no-fallback law): the track never paints a clamped neighbor over
 *  an impossible contract. @param f the knob's field row.
 *  @param value the resolved display value.
 *  @param onEdit the settle seam.
 *  @param envelope the active variant's [min,max] for THIS knob,
 *  null when the variant declares none. */
export function SpecSliderAtom({ f, value, onEdit, envelope }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  envelope?: readonly [number, number] | null
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
  // the envelope's refused face: a HELD out-of-envelope number is
  // an impossible contract — rendered as itself, never clamped over.
  // A disjoint envelope (its min above the field's max or its max
  // below the field's min) admits no value at all — the knob is
  // refused outright, the DECL's own broken state named.
  const clamped = envelope !== undefined && envelope !== null
    ? {
        min: Math.max(f.min ?? Number.NEGATIVE_INFINITY, envelope[0]),
        max: Math.min(f.max ?? Number.POSITIVE_INFINITY, envelope[1]),
      }
    : null
  if (clamped !== null && (clamped.min > clamped.max
    || shown.value < clamped.min || shown.value > clamped.max)) {
    const lo = clamped.min > clamped.max ? Math.min(clamped.min, clamped.max) : clamped.min
    const hi = clamped.min > clamped.max ? Math.max(clamped.min, clamped.max) : clamped.max
    return h('span', { className: css.specSliderRow, 'data-refused': f.name },
      h('span', { className: css.specSliderValue },
        String(shown.value) + ' — OUTSIDE the variant envelope ['
        + String(lo) + ', ' + String(hi) + ']'),
    )
  }
  return h('span', { className: css.specSliderRow },
    h('input', {
      className: css.specSlider,
      type: 'range',
      min: clamped !== null ? clamped.min : (f.min ?? 0),
      max: clamped !== null ? clamped.max : (f.max ?? 10),
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
export function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  /** the wire's flow rows (the image_list slots source From flow too) */
  wireCandidates?: Array<{ id: string; label: string; url: string }>
  /** the active variant's [min,max] for THIS knob — the slider
   *  track clamps to it (the dragbar law); absent when the caller
   *  has no variant envelope to offer. */
  envelope?: readonly [number, number] | null
  /** the row's placeholder override (the seed dice's random face:
   *  the sentinel never paints, the placeholder explains the state) */
  placeholder?: string
  /** THE SELECT'S INHERIT GHOST (2026-09-18, the operator's ruling:
   *  "atoms get ONE semantic addition — select inherit-ghost"): when
   *  defined, a leading <option value=''> renders with this label —
   *  the unset mark for undefined-able selects. '' is the bind target
   *  for undefined (never the browser's painted-first-option lie).
   *  The call site authors the label ('inherit', or the richer
   *  '← on' when the inherited value is known). */
  ghost?: string
}): ReturnType<typeof h> {
  // THE INPUT SQUARE (the old law: slot-shaped values render the ONE
  // square with the three source verbs — never a bare text Input).
  // THE CONSTRUCTION LAW: an emitted image/file input constructs THIS
  // component — automatically, for every card, no per-card handling.
  // MESH BOARDS THE SAME FACE (primitive ③, 2026-09-21): a 'mesh'
  // wtype field is slot-shaped — the square's thumb is the inline
  // mini GLB viewport, the verbs are the same three sources.
  if ((f.type === 'image' || f.type === 'file' || f.type === 'mesh') && square !== undefined) {
    const shown = square.display !== undefined && square.display !== null && square.display !== ''
      ? square.display : (typeof value === 'string' ? value : null)
    return h(InputSquare, {
      label: f.label !== '' ? f.label : f.name,
      value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
      metric: typeof value === 'string' && value !== '' && !isImageUrl(value) && !isMeshUrl(value)
        ? value
        : undefined,
      ...square.verbs,
    })
  }
  // THE MULTI-SELECT CHIPS (the YOLO-classes law, 2026-10-08 — the
  // operator's verdict: a detector-owned vocabulary is NEVER a
  // freeform text box): a closed vocabulary with multi renders as
  // toggle chips; the wire is a COMMA-JOINED string in the options'
  // declared order (deterministic — Set order never leaks).
  if (f.type === 'select' && f.multi === true && Array.isArray(f.options) && f.options.length > 0) {
    const rows = f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
    const held = new Set(String(value ?? '').split(',').map((w) => w.trim()).filter((w) => w !== ''))
    return h('div', { className: css.specChips, role: 'group', 'aria-label': f.label,
      ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}) },
      rows.map((row) => {
        const on = held.has(row.value)
        // DSH Pill (the interactive chip, law 1): the toggle row is
        // the primitive's own case — Pill renders a button when
        // onClick rides it and owns its active face. The old
        // `data-chip` test hook left with the hand-rolled chip: no
        // reader anywhere in the tree, and data-* props do not
        // cross Pill's prop type.
        return h(Pill, {
          key: row.value,
          active: on,
          'aria-pressed': on,
          onClick: () => {
            const next = new Set(held)
            if (on) { next.delete(row.value) } else { next.add(row.value) }
            onEdit(f.name, rows.filter((r) => next.has(r.value)).map((r) => r.value).join(','))
          },
        }, titleCaseId(row.label))
      }))
  }
  if (f.type === 'select' && Array.isArray(f.options) && f.options.length > 0) {
    return h('select', {
      className: css.specSelect,
      value: String(value ?? ''),
      onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
      'aria-label': f.label,
      ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
    },
      // THE INHERIT GHOST: undefined binds to '' — the ghost option IS
      // the unset mark; without it the browser paints the first listed
      // option over an unheld value (the 1:1 lie)
      ghost !== undefined ? h('option', { value: '' }, ghost) : null,
      f.options.map((o) => {
      // normalize: '1024' | {value:'1024', label:'1K'} → one shape.
      // THE TITLE-CASE FACE (the operator's sweep law): every label
      // renders titled — the value rides verbatim. (2026-09-18: a
      // verbatim-authored carve-out was tried and REVERTED — the
      // estate's own door picker (input-square) pins the blanket law;
      // prose labels title-case like ids, pattern conformance.)
      const row = typeof o === 'string' ? { value: o, label: o } : o
      return h('option', { key: row.value, value: row.value }, titleCaseId(row.label))
    }))
  }
  if (f.type === 'slider') {
    return h(SpecSliderAtom, { f, value, onEdit, ...(envelope !== undefined ? { envelope } : {}) })
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
    // rows=2 sets the floor; mount + value writes resize the box to
    // its content (height:auto → scrollHeight, never below the
    // two-row floor). THE STABLE REF (2026-09-21, the operator's
    // per-tick card jerk): an INLINE closure ref detaches/reattaches
    // EVERY render — every progress tick re-ran the auto→measure→set
    // thrash and the card's content height jittered on tall screens.
    // fitStable attaches ONCE per mount; the value-effect refits on
    // real content change only (outside writes, the enhance sweep).
    const fitStable = useCallback((el: HTMLTextAreaElement | null): void => {
      if (el === null) return
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 2 * 22) + 'px'
    }, [])
    const fitEl = useRef<HTMLTextAreaElement | null>(null)
    useEffect((): void => {
      // non-null by the ref law: the callback ref attaches BEFORE
      // effects fire — the null arm was dead and gate-uncovered
      const el = fitEl.current!
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 2 * 22) + 'px'
    }, [String(value ?? '')])
    return h('textarea', {
      className: css.specTextarea,
      rows: 2,
      value: String(value ?? ''),
      placeholder: f.placeholder ?? '',
      ref: (el) => { const ta = (el ?? null) as HTMLTextAreaElement | null; fitEl.current = ta; fitStable(ta) },
      onChange: (e: unknown) => {
        const el = (e as { target: HTMLTextAreaElement }).target
        fitStable(el)
        onEdit(f.name, el.value)
      },
      'aria-label': f.label,
    })
  }
  // NUMBER FACE (2026-09-18, the operator's conviction: "you
  // handrolled and avoided the parameter system we developed, as
  // number fields are just from text" — the estate's own atom was
  // the hand-roll, degrading EVERY number to a freeform string).
  // Numbers render the NUMBER control: type=number carrying the
  // field's own min/max/step facts (the declaration's law, the
  // steppers and the bounds in the OS's own grammar). The VALUE
  // still travels as the raw string — coerce once at patch, the
  // estate's law, unchanged.
  if (f.type === 'number') {
    return h(Input, {
      type: 'number',
      min: f.min,
      max: f.max,
      step: f.step,
      value: String(value ?? ''),
      placeholder: placeholder ?? f.placeholder ?? '',
      onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
      'aria-label': f.label,
      ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
    })
  }
  // seed, text — the raw-string Input (coerce once at patch)
  return h(Input, {
    value: String(value ?? ''),
    placeholder: placeholder ?? f.placeholder ?? '',
    onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
    'aria-label': f.label,
    ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
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
