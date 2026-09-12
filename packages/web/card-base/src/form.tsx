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
import { createElement as h, useCallback, useRef, useState } from 'react'
import { Menu, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare, isImageUrl, readAsDataUrl, type InputSquareVerbs } from './square.tsx'
import { uploadInputFile } from './wire.ts'
import { groupFields, type SpecField, type SpecValues } from './spec.ts'
import css from './card.module.css'

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
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onFile = useCallback(async (f: SpecField, file: File): Promise<void> => {
    try {
      const dataUrl = await readAsDataUrl(file)
      setMirror((m) => ({ ...m, [f.name]: dataUrl }))
      const { name } = await uploadInputFile(file)
      onEdit(f.name, name)
    } catch (e: unknown) {
      onEdit(f.name, e instanceof Error ? e.message : 'upload failed')
    }
  }, [onEdit])
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
  const wireMenu = pickAt === null ? null : h(Menu, {
    open: true,
    anchor: null,
    getAnchorRect: () => pickAt.rect,
    items: [
      // THE EDGE LAW: per-field candidates when the host narrows by
      // the declared input-edge kind; the static list otherwise.
      ...(wire.candidatesFor !== undefined ? wire.candidatesFor(pickAt.field) : wire.candidates)
        .map((c) => ({ id: c.id, label: c.label })),
      { type: 'separator' as const, id: 'sep' },
      { id: '__file__', label: 'Upload a file…' },
      { id: '__none__', label: '— clear —', danger: true },
    ],
    onSelect: (id: string) => {
      const f = pickAt.field
      setPickAt(null)
      if (id === '__file__') { fileRef.current?.click(); return }
      if (id === '__none__') {
        setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
        onEdit(f.name, '')
        return
      }
      const list = wire.candidatesFor !== undefined ? wire.candidatesFor(f) : wire.candidates
      const c = list.find((x) => x.id === id)
      // THE SLOT IS THE WIRE: the picked output's url rides into the
      // param VERBATIM (media-route spelling — renders in the square
      // and stages at the engine under its runs-root arm)
      if (c !== undefined && c.url !== '') onEdit(f.name, c.url)
    },
    onClose: () => { setPickAt(null) },
    portal: true,
  },
    // the picker's upload entry (the menu renders portal-side, so its
    // hidden file input rides WITH it)
    h('input', {
      ref: fileRef,
      type: 'file',
      accept: 'image/png,image/jpeg,image/webp',
      'aria-hidden': true,
      tabIndex: -1,
      style: { display: 'none' },
      onChange: (e: unknown) => {
        const inp = e as { target: { files: FileList | null } }
        const file = inp.target.files?.[0]
        if (pickAt !== null && file !== undefined && file !== null) void onFile(pickAt.field, file)
        if (fileRef.current !== null) fileRef.current.value = ''
      },
    }),
  )
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

/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export function SpecAtom({ f, value, onEdit, square }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
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
    const num = typeof value === 'number' ? value : Number(value)
    return h('span', { className: css.specSliderRow },
      h('input', {
        className: css.specSlider,
        type: 'range',
        min: f.min ?? 0,
        max: f.max ?? 10,
        step: f.step ?? 0.1,
        value: Number.isFinite(num) ? num : (f.default ?? 0),
        onInput: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
        'aria-label': f.label,
      }),
      h('span', { className: css.specSliderValue }, String(value ?? f.default ?? '')),
    )
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
  // number, seed, text — the raw-string Input (coerce once at patch)
  return h(Input, {
    value: String(value ?? ''),
    placeholder: f.placeholder ?? '',
    onChange: (e: unknown) => onEdit(f.name, (e as { target: { value: string } }).target.value),
    'aria-label': f.label,
  })
}

/** THE CARD FORM (the constructor's surface half) — the spec's
 *  fields, grouped, visible-when honored, defaults seeded by the
 *  caller (specDefaults — propagated from the emission). Edits ride
 *  the caller's values map. Each field renders through the claimed
 *  atom for its emitted type when the caller passes one; the base's
 *  built-in atom is the default. */
export function CardForm({ fields, values, onEdit, square, atoms }: {
  fields: SpecField[]
  values: SpecValues
  onEdit(name: string, v: unknown): void
  /** the host's slot-shaped-field provider (the three verbs). */
  square?: (f: SpecField) => SquareHost | undefined
  /** the field-atom seam's claims, keyed by emitted wire type —
   *  a card's takeover of its own atoms (undefined = built-ins). */
  atoms?: Record<string, FieldAtomClaim>
}): ReturnType<typeof h> {
  const groups = groupFields(fields, values)
  const atomOf = (f: SpecField): FieldAtomClaim | undefined => atoms?.[f.type]
  return h('div', { className: css.specForm },
    groups.map((g) => h('section', { key: g.group ?? '', className: css.specGroup },
      g.group !== null ? h('h4', { className: css.specGroupTitle }, g.group) : null,
      g.fields.map((f) => h('label', { key: f.name, className: css.specField },
        h('span', { className: css.specFieldKey },
          f.label,
          f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
        ),
        (() => {
          const claim = atomOf(f)
          const sq = square?.(f)
          if (claim !== undefined) return claim({ f, value: values[f.name], onEdit, square: sq })
          return h(SpecAtom, { f, value: values[f.name], onEdit, square: sq })
        })(),
        f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
      )),
    )),
  )
}
