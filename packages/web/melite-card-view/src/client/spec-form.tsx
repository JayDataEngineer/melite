/**
 * spec-form.tsx — THE CARD FORM, spec-driven (2026-09-11 rebirth).
 *
 * THE OLD SYSTEM'S LAW (the editor's flowParamEditor + the /v1/form-spec
 * SSOT): a card's knob surface is DECLARED, not guessed — the Schemastery
 * schema projects to the served form spec (typed atoms: textarea, number,
 * slider, select, seed, switch; defaults seeded; groups; visible-when).
 * The picker and the drilldown both render THIS — the nice formatting is
 * the spec's own shape, never a raw key/value dump.
 *
 * DSH NATIVE: Input from the installed ui-primitives where it fits;
 * the atoms the primitives set lacks (select, slider, textarea) are
 * layout-only module CSS over native elements, every color an
 * inherited --dsw-alias-* token. No second app, no iframe — same-origin
 * /v1 doors (the 2026-09-11 production restore: model-catalog,
 * form-spec) and the bench wire door.
 */
import { createElement as h, useCallback, useRef, useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare, isImageUrl, readAsDataUrl, type InputSquareVerbs } from './input-square.tsx'
import { uploadInputFile } from './cards-resource.ts'
import { Input, Pill, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'

/** One served form-spec field (/v1/form-spec — the params_emit contract:
 *  type/format/enum/default/minimum/maximum/description + the editor's
 *  own serving keys: group, zone, order, placeholder, tooltip,
 *  visible_when, options, step, required). */
export interface SpecField {
  name: string
  label: string
  type: string
  default?: unknown
  min?: number
  max?: number
  step?: number
  /** The door's BOTH shapes (lane-read 2026-09-12): plain strings
   *  (img-to-mesh resolution/bg_removal/samplers) or {value,label}
   *  rows. The atom normalizes — the ONE spelling rule. */
  options?: Array<string | { value: string; label: string }>
  group?: string
  zone?: string
  required?: boolean
  placeholder?: string
  tooltip?: string
  visible_when?: string
}

/** The served form-spec document. */
export interface FormSpecDoc {
  form: string
  genre?: string
  engine?: string
  fields: SpecField[]
  /** The estate's surface envelope (served TOP-LEVEL by the door —
   *  2026-09-12 lane read): layout='studio' means a registered view
   *  exists (the client's business is the keyed slot, not this flag);
   *  size='huge' is the estate's only size class — the zoom card's
   *  width law consumes it. */
  layout?: string | null
  size?: string | null
}

/** One catalog card (/v1/model-catalog's cards section). */
export interface CatalogCard {
  id: string
  label: string
  description: string
  genre: string
  families: string[]
}

export type SpecValues = Record<string, unknown>

/** Seed the editable values from the spec's declared defaults (the old
 *  picker's law: pick → defaults seeded → the user edits from there). */
export function specDefaults(fields: SpecField[]): SpecValues {
  const out: SpecValues = {}
  for (const f of fields) {
    if (f.default !== undefined && f.default !== null) out[f.name] = f.default
  }
  return out
}

/** evalVisibleWhen's serving shape: "key=value" (a field shows when its
 *  guard key holds the value). A field with no visible_when always
 *  shows. Unknown guard keys: show (never hide on a typo). */
export function fieldVisible(f: SpecField, values: SpecValues): boolean {
  const rule = f.visible_when
  if (typeof rule !== 'string' || rule === '') return true
  const eq = rule.indexOf('=')
  if (eq < 0) return true
  const key = rule.slice(0, eq)
  const want = rule.slice(eq + 1)
  const held = values[key]
  return String(held ?? '') === want
}

/** Group the visible fields (the spec's own group key, first-appearance
 *  order — ungrouped first under no heading). */
export function groupFields(fields: SpecField[], values: SpecValues): Array<{ group: string | null; fields: SpecField[] }> {
  const out: Array<{ group: string | null; fields: SpecField[] }> = []
  for (const f of fields) {
    if (!fieldVisible(f, values)) continue
    const g = typeof f.group === 'string' && f.group !== '' ? f.group : null
    const known = out.find((x) => x.group === g)
    if (known === undefined) out.push({ group: g, fields: [f] })
    else known.fields.push(f)
  }
  return out
}

/** Read a same-origin /v1 JSON door. Non-200 → named throw (the door's
 *  own error text when present). */
async function v1Get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { ...(signal === undefined ? {} : { signal }) })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined
    throw new Error(typeof err === 'string' ? err : path + ': HTTP ' + String(res.status))
  }
  return body as T
}

/** /v1/model-catalog → the cards section (the picker's ONE surface —
 *  action cards, one tile per card package; models are NOT entries). */
export async function fetchCardCatalog(signal?: AbortSignal): Promise<CatalogCard[]> {
  const doc = await v1Get<{ cards?: Record<string, Record<string, unknown>> }>('/v1/model-catalog', signal)
  const raw = doc['cards'] ?? {}
  const out: CatalogCard[] = []
  for (const [id, row] of Object.entries(raw)) {
    if (typeof row !== 'object' || row === null) continue
    const famsRaw = row['families']
    out.push({
      id,
      label: typeof row['label'] === 'string' ? row['label'] : id,
      description: typeof row['description'] === 'string' ? row['description'] : '',
      genre: typeof row['genre'] === 'string' ? row['genre'] : '',
      families: Array.isArray(famsRaw) ? famsRaw.filter((x): x is string => typeof x === 'string') : [id],
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** /v1/form-spec?model=<family> — the card family's declared knob set. */
export async function fetchFormSpec(model: string, signal?: AbortSignal): Promise<FormSpecDoc> {
  const doc = await v1Get<FormSpecDoc>('/v1/form-spec?model=' + encodeURIComponent(model), signal)
  if (!Array.isArray(doc['fields'])) throw new Error('form-spec: no fields array')
  return doc
}

/** What a host hands SpecForm for slot-shaped fields: the square's
 *  verbs + an optional display mirror (the fresh-upload preview while
 *  the PARAM carries the estate path — the old upload-rail law). */
export interface SquareHost {
  verbs: InputSquareVerbs
  display?: string | null
}

/** The picker half of the square provider: candidates are the OTHER
 *  stages' LATEST OUTPUTS (title + the media-route url the run wrote
 *  onto their bench rows). Picking one WRITES THE PARAM — the input
 *  slot is the wire, there is no separate wiring mechanic. */
export interface SquareWire {
  candidates: Array<{ id: string; label: string; url: string }>
}

/** THE ONE square provider (the old SlotGrid law, DSH substrate):
 *  every image/file field of a stage gets the same verbs — file
 *  upload (the /v1/uploads door + the data-URL mirror), media drop
 *  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
 *  on the square listing the other stages' latest outputs; picking
 *  one writes the PARAM — the slot is the wire, no separate wiring
 *  mechanic exists). ONE definition; the generic drill and every
 *  registered studio ride it. */
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
      ...wire.candidates.map((c) => ({ id: c.id, label: c.label })),
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
      const c = wire.candidates.find((x) => x.id === id)
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

/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
function SpecAtom({ f, value, onEdit, square }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
}): ReturnType<typeof h> {
  // THE INPUT SQUARE (the old law: slot-shaped values render the ONE
  // square with the three source verbs — never a bare text Input)
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

/** THE CARD FORM — the spec's fields, grouped, visible-when honored,
 *  defaults seeded by the caller. Edits ride the caller's values map. */
export function SpecForm({ fields, values, onEdit, square }: {
  fields: SpecField[]
  values: SpecValues
  onEdit(name: string, v: unknown): void
  /** the host's slot-shaped-field provider (the three verbs). */
  square?: (f: SpecField) => SquareHost | undefined
}): ReturnType<typeof h> {
  const groups = groupFields(fields, values)
  return h('div', { className: css.specForm },
    groups.map((g) => h('section', { key: g.group ?? '', className: css.specGroup },
      g.group !== null ? h('h4', { className: css.specGroupTitle }, g.group) : null,
      g.fields.map((f) => h('label', { key: f.name, className: css.specField },
        h('span', { className: css.specFieldKey },
          f.label,
          f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
        ),
        h(SpecAtom, { f, value: values[f.name], onEdit, square: square?.(f) }),
        f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
      )),
    )),
  )
}

/** Coerce the raw edit strings to the spec's declared types — ONCE, at
 *  patch time (the editPatch law). Only keys that CHANGED from the
 *  stage's held params ride the patch. */
export function specPatch(fields: SpecField[], values: SpecValues, held: SpecValues): SpecValues {
  const out: SpecValues = {}
  for (const f of fields) {
    const v = values[f.name]
    if (v === undefined) continue
    const before = held[f.name] ?? f.default
    const same = String(v) === String(before ?? '')
    if (same) continue
    if (f.type === 'number' || f.type === 'seed' || f.type === 'slider') {
      const n = Number(v)
      out[f.name] = Number.isFinite(n) ? n : v
    } else if (f.type === 'switch' || f.type === 'boolean') {
      out[f.name] = v === true || v === 'true'
    } else {
      out[f.name] = v
    }
  }
  return out
}
