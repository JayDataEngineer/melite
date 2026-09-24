/**
 * coerceWireArrays + coerceWireNumbers — THE WIRE COERCION MODULE
 * (operator law 2026-09-24, P2 of ROADMAP §36; receipts from
 * commission 034's forensic, run `run-9953f652410d-d365af74`, and
 * commission 035's blocked-first-call):
 *
 * 1. THE `{item:[…]}` UNWRAP — arrays that cross a free-form tool
 *    param (JSON-schema `additionalProperties: true`, e.g.
 *    melite_construct's `params`) corrupt on the wire: a non-empty
 *    array arrives as `{ item: [...] }` (the serializer's own array
 *    encoding leaked into the VALUE), an empty array arrives as
 *    `""`. Declared top-level arrays survive. The shape is
 *    unambiguous to repair WITHOUT a schema: an object whose ONLY
 *    own key is `item` and whose `item` is an array IS the wire's
 *    array encoding, never a legitimate param value in this
 *    estate's vocabulary (no card declares such an object shape).
 * 2. THE `""`→`[]` FILL — for keys the CARD's schema declares as
 *    arrays, an empty-string value (the wire's spelling of an
 *    empty array) fills to `[]`. This arm needs the schema's own
 *    dict (schema-derived, never a hand-copied key mirror — LAW 2);
 *    it lives at the card parse seat, the same law as h3's
 *    `coerceWireBoolean` precedent.
 * 3. THE NUMERIC-STRING→NUMBER FILL (commission 035, 2026-09-24 —
 *    receipt `card 'image-gen' refused params: $.width expected
 *    number but got 768`): the SAME corruption family hits nested
 *    numeric params — the maker emitted a number, the wire
 *    delivered a string, the compose door refused. For keys the
 *    schema declares `type: 'number'`, a string matching the
 *    strict numeric grammar fills to its Number. General seat: the
 *    compose door (comfyui-cordis service.ts) applies it through
 *    the schemaCarrier — card-agnostic, both compose paths, every
 *    card, no opt-out (the assertNoCheat precedent).
 *
 * Never silent on ambiguity: a value that is neither the wire
 * shape nor a valid array rides UNTOUCHED — Schemastery's own
 * refusal (`expected array but got …`) stays the honest voice.
 */
import type Schema from '@deepseek-ai/schemastery'

/** True when the value is the wire's array encoding: an object
 * whose single own key `item` holds an array. */
export function isItemWrapped(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== 1 || keys[0] !== 'item') return false
  return Array.isArray((value as Record<string, unknown>)['item'])
}

/** Deep-unwrap every `{item:[…]}` shape in a params-like tree
 * (objects and arrays both walked, cycles severed by identity).
 * The tool-boundary seat: melite_construct/melite_flow params
 * before they reach the bench — the draft stores CLEAN, reads and
 * compose never see the poison. */
export function unwrapItemArrays<T>(value: T): T {
  const walk = (v: unknown, seen: Map<object, unknown>): unknown => {
    if (Array.isArray(v)) {
      if (seen.has(v)) return seen.get(v)
      const out: unknown[] = new Array(v.length)
      seen.set(v, out)
      for (let i = 0; i < v.length; i++) out[i] = walk(v[i], seen)
      return out
    }
    if (typeof v !== 'object' || v === null) return v
    if (isItemWrapped(v)) return walk((v as Record<string, unknown>)['item'], seen)
    if (seen.has(v)) return seen.get(v)
    const out: Record<string, unknown> = {}
    seen.set(v, out)
    for (const k of Object.keys(v)) out[k] = walk((v as Record<string, unknown>)[k], seen)
    return out
  }
  return walk(value, new Map()) as T
}

/** The card-seat arm: for every key the Schemastery object schema
 * declares as `type: 'array'`, an empty-string value fills to `[]`
 * (the wire's empty-array spelling). Schema-derived — the dict is
 * the truth, no key list is hand-copied. Every other value rides
 * untouched. */
export function coerceWireArrays(
  schema: { dict?: Record<string, { type?: string }> },
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const dict = schema.dict
  if (dict === undefined) return raw
  let out: Record<string, unknown> | null = null
  for (const [key, inner] of Object.entries(dict)) {
    if (inner?.type !== 'array') continue
    const v = raw[key]
    if (v === undefined) continue
    if (v === '') {
      out = out ?? { ...raw }
      out[key] = []
    } else if (isItemWrapped(v)) {
      out = out ?? { ...raw }
      out[key] = (v as Record<string, unknown>)['item']
    } else if (
      typeof v === 'object' && v !== null && !Array.isArray(v) &&
      Object.keys(v).length === 1 && Object.prototype.hasOwnProperty.call(v, 'item')
    ) {
      // THE SINGLE-ELEMENT ARM (attempt-035/008's forensic,
      // 2026-09-24): the transport encodes a ONE-element array as
      // `{item: <the element>}` — the element itself, NOT wrapped
      // in an array — so the shape seat (isItemWrapped) misses it.
      // Here the DICT has already declared this key an array, so
      // the restore is schema-licensed: `[element]`.
      out = out ?? { ...raw }
      out[key] = [(v as Record<string, unknown>)['item']]
    }
  }
  return out ?? raw
}

/** The strict numeric grammar a wire string must match before it
 * fills to a Number (Number() alone admits '0x10', '1e999'→Infinity
 * — the fill never reinterprets, it only restores the number the
 * wire stringified). */
const NUMERIC_STRING = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

/** The numeric-string fill (commission 035's receipt): for every
 * key the Schemastery object schema declares `type: 'number'`, a
 * string value matching the strict numeric grammar fills to its
 * Number. Schema-derived through the dict — the carrier names the
 * numeric keys, no mirror is hand-copied (LAW 2). Every other value
 * (real numbers, non-numeric strings, nulls, objects) rides
 * untouched so Schemastery's own bounds refusal stays the honest
 * voice. */
export function coerceWireNumbers(
  schema: { dict?: Record<string, { type?: string }> },
  raw: unknown,
): unknown {
  const dict = schema.dict
  if (dict === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const rec = raw as Record<string, unknown>
  let out: Record<string, unknown> | null = null
  for (const [key, inner] of Object.entries(dict)) {
    if (inner?.type !== 'number') continue
    const v = rec[key]
    if (typeof v !== 'string' || v.trim() === '' || !NUMERIC_STRING.test(v.trim())) continue
    out = out ?? { ...rec }
    out[key] = Number(v.trim())
  }
  // THE BOXED-NUMBER UNBOX (the same corruption family's object
  // arm — a typeof 'object' Number boxes on some wire seats; plain
  // JSON never produces one, the serializer does): Number objects
  // are unambiguously numbers — restore the primitive.
  if (out === null) {
    for (const [key, inner] of Object.entries(dict)) {
      if (inner?.type !== 'number') continue
      const v = rec[key]
      if (typeof v !== 'object' || v === null || !(v instanceof Number) || !Number.isFinite(v.valueOf())) continue
      out = out ?? { ...rec }
      out[key] = v.valueOf()
    }
  }
  return out ?? raw
}

/** THE WIRE-TYPE LEDGER (commission 035's maker gap #2: "the value
 *  printed as 768 gives no type evidence"): for every key the
 *  Schemastery object schema declares, report the RECEIVED typeof
 *  whenever it mismatches the declared type — the refusal voice
 *  appends this so the next wire-corruption receipt names the
 *  corruptor's exact shape instead of a bare toString. */
export function wireTypeLedger(
  schema: { dict?: Record<string, { type?: string }> },
  raw: unknown,
): string {
  const dict = schema.dict
  if (dict === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) return ''
  const rec = raw as Record<string, unknown>
  const rows: string[] = []
  for (const [key, inner] of Object.entries(dict)) {
    const declared = inner?.type
    if (declared === undefined || !(key in rec)) continue
    const v = rec[key]
    if (v === undefined) continue
    const got = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
    if (got !== declared && !(declared === 'number' && got === 'object' && v instanceof Number)) {
      // objects/arrays carry a short preview — the corruptor's
      // shape (e.g. `{item:…}`) reads straight off the receipt
      const preview = (got === 'object' || got === 'array')
        ? '{' + JSON.stringify(v).slice(1, 25) : ''
      rows.push(key + '=' + got + preview)
    }
  }
  return rows.length > 0 ? ' (wire types: ' + rows.join(', ') + ')' : ''
}
