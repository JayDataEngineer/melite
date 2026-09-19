/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, useCallback, useEffect, useState } from 'react'
import { Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare, isImageUrl } from './square.tsx'
import { type SpecField, resolveValue, titleCaseId } from './spec.ts'
import css from './card.module.css'
import { type SourceRowProps, type SquareHost, useSquareProvider } from './square-provider.tsx'

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
export function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  /** the wire's flow rows (the image_list slots source From flow too) */
  wireCandidates?: Array<{ id: string; label: string; url: string }>
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

