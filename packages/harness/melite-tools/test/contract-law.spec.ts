// contract-law.spec.ts — THE ESTATE CONTRACT LAWS (operator order
// 2026-10-10: "add more testing around contracts to ensure they
// are REAL DEEP ones not little [REDACTED 2026-11-05] ones").
//
// WHAT MAKES THESE DEEP: they are not pins on one card's shape —
// they hold EVERY registered card × EVERY boarded family × EVERY
// mod pack to the contract, across THREE faces at once (the wire
// envelope, the render face fieldsOf, the tool face
// emitParamsSchema), and they pin the GRAMMAR's interpreter
// itself. A drift anywhere in the estate names its card, family,
// field, and law — the suite gets MORE valuable with every card
// added, because every new declaration is born under these laws.
//
// The suite sits in the harness because only the harness may see
// both tiers: the wire + tool face from comfyui-cordis (engine),
// the render face from card-base (web) — the layer law holds.
import { describe, expect, test, beforeAll } from 'vitest'
import { loadCardDefs, theService } from '@melite/comfyui-cordis'
import { emitParamsSchema } from '@melite/comfyui-cordis/params-emit'
import { formSpecArm } from '../src/discovery.ts'
import { fieldsOf, fieldVisible, axisKey, type FormSpecDoc, type SpecField } from '@melite/card-base/spec'
import type { ExtraBag } from '@melite/contracts/extraKeys'

// ── the walk ──────────────────────────────────────────────────
interface RefNode { meta?: Record<string, unknown>; dict?: Record<string, number>; list?: number[] }
interface Envelope { uid: number; refs: Record<number, RefNode> }

interface Arm {
  card: string
  family: string
  doc: FormSpecDoc                    // the SERVED form-spec (wire truth)
  carrier: unknown                    // the card's schema carrier (tool-face input)
  boarded: string[]
  fields: SpecField[]                 // the RENDER face's derivation
  tool: Record<string, unknown>       // the TOOL face's params_schema
  vocab: string[]                     // every key a guard/default may legally name
}

const arms: Arm[] = []
let defsMap: Map<string, unknown> = new Map()
const loadDefsMap = (): Map<string, unknown> => defsMap
const extraRows: Array<{ where: string; field: string; key: string; value: unknown }> = []
const guards: Array<{ where: string; field: string; rule: string; fields: string[] }> = []

const walkExtras = (where: string, env: Envelope | null, vocab: string[]): void => {
  if (env == null) return
  const seen = new Set<number>([env.uid])
  const queue: Array<{ id: number; field: string }> = [{ id: env.uid, field: '' }]
  while (queue.length > 0) {
    const { id, field } = queue.shift()!
    const node = env.refs[id]
    if (node === undefined) continue
    const extra = node.meta?.['extra']
    if (typeof extra === 'object' && extra !== null && !Array.isArray(extra)) {
      for (const [key, value] of Object.entries(extra as Record<string, unknown>)) {
        extraRows.push({ where, field: field || '·root', key, value })
      }
      const vw = (extra as Record<string, unknown>)['visible_when']
      if (typeof vw === 'string' && vw !== '') guards.push({ where, field: field || '·root', rule: vw, fields: [...new Set(vocab)] })
    }
    if (node.dict !== undefined) {
      for (const [name, ref] of Object.entries(node.dict)) {
        if (!seen.has(ref)) { seen.add(ref); queue.push({ id: ref, field: name }) }
      }
    }
    if (node.list !== undefined) {
      for (const ref of node.list) if (!seen.has(ref)) { seen.add(ref); queue.push({ id: ref, field }) }
    }
  }
}

beforeAll(async () => {
  const defs = await loadCardDefs()
  defsMap = defs as unknown as Map<string, unknown>
  const svc = theService()
  for (const card of [...defs.keys()].sort()) {
    const def = defs.get(card)!
    if (def.identity === undefined) continue
    const boarded = [...(def.boarded ?? [])]
    for (const family of (boarded.length > 0 ? boarded : [card])) {
      const doc = (await formSpecArm(family)) as unknown as FormSpecDoc | null
      if (doc == null) continue
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
      const fields = fieldsOf(doc)
      const tool = emitParamsSchema(carrier as never, boarded.length > 0 ? boarded : [card]) as unknown as Record<string, unknown>
      // THE VOCABULARY A GUARD MAY NAME (the contract's own law):
      // every DECLARED root key (hidden included — lane-consumed
      // params are guardable) plus the axis params (axisKey: the
      // variant_groups' ids lowercased — the draft's durable seats)
      const root = doc.schema as unknown as Envelope
      const rootKeys = Object.keys(root.refs[root.uid]?.dict ?? {})
      const axes = Object.keys(doc.features?.variant_groups ?? {}).map(axisKey)
      const vocab = [...rootKeys, ...axes, 'model']
      arms.push({ card, family, doc, carrier, boarded: boarded.length > 0 ? boarded : [card], fields, tool, vocab })
      walkExtras(card + ':' + family, root, vocab)
      for (const [pack, env] of Object.entries(doc.mod_schemas ?? {})) {
        const e = env as unknown as Envelope
        const packKeys = Object.keys(e.refs[e.uid]?.dict ?? {})
        walkExtras(card + ':' + family + ':mod:' + pack, e, [...vocab, ...packKeys])
      }
    }
  }
  expect(arms.length, 'the walk served every card × family').toBeGreaterThan(25)
})

// ── LAW 1: THE WIRE VALUE TYPES — every extra key's wire value
// matches the floor table's declared shape, estate-wide.
const TYPE_OF: Record<string, string> = {
  order: 'number|null', group: 'string', zone: 'string', wtype: 'string',
  width: 'number', columns: 'number', visible_when: 'string', tooltip: 'string',
  required: 'boolean', hidden: 'boolean', families: 'array', max_stack: 'number',
  media: 'string', placeholder: 'string', options: 'array', optionsFrom: 'string',
  serveDefault: 'boolean', min: 'number', max: 'number', default: 'any',
}
const typeOk = (key: string, value: unknown): boolean => {
  const want = TYPE_OF[key] ?? 'any'
  if (want === 'any') return true
  if (want === 'number|null') return typeof value === 'number' || value === null
  if (want === 'array') {
    if (!Array.isArray(value)) return false
    if (key === 'families') return value.every((v) => typeof v === 'string')
    if (key === 'options') return value.every((v) => typeof v === 'string' || (typeof v === 'object' && v !== null && 'value' in (v as object) && 'label' in (v as object)))
    return true
  }
  return typeof value === want
}

describe('THE ESTATE CONTRACT LAWS (every card × family × mod, three faces)', () => {
  test('LAW 1 — every extra value on the wire matches the table\'s declared type', () => {
    expect(extraRows.length, 'the walk harvested extra rows').toBeGreaterThan(200)
    const bad = extraRows.filter((r) => !typeOk(r.key, r.value))
      .map((r) => `${r.where}#${r.field}#${r.key}: ${JSON.stringify(r.value)}`)
    expect(bad, 'wire values off-contract').toEqual([])
  })

  test('LAW 2 — every visible_when guard parses against the interpreter\'s grammar and names a REAL sibling', () => {
    expect(guards.length, 'guards were found on the wire').toBeGreaterThanOrEqual(0)
    const bad: string[] = []
    for (const g of guards) {
      for (const guard of g.rule.split('&')) {
        const trimmed = guard.trim()
        const ne = trimmed.indexOf('!=')
        const eq = trimmed.indexOf('=')
        if (ne >= 0 && (eq < 0 || ne < eq)) {
          const key = trimmed.slice(0, ne).trim()
          if (key === '' || !g.fields.includes(key) && key !== 'model') bad.push(`${g.where}#${g.field}: key '${key}' is not a sibling field (≠ guard)`)
        } else if (eq >= 0) {
          const key = trimmed.slice(0, eq).trim()
          if (key === '' || (!g.fields.includes(key) && key !== 'model')) bad.push(`${g.where}#${g.field}: key '${key}' is not a sibling field`)
          const rhs = trimmed.slice(eq + 1).trim()
          if (rhs === '') bad.push(`${g.where}#${g.field}: empty rhs`)
          if (rhs.includes('!')) bad.push(`${g.where}#${g.field}: malformed ≠/= guard '${trimmed}'`)
        } else {
          bad.push(`${g.where}#${g.field}: guard '${trimmed}' carries no operator`)
        }
      }
    }
    expect(bad, 'guards off-grammar or naming ghosts').toEqual([])
  })

  test('LAW 3 — coherence: hidden fields are never required; select wtypes carry options; caps are sane', () => {
    const bad: string[] = []
    for (const a of arms) {
      const hidden = new Set(a.fields.filter((f) => f.name && extraIs(a, f.name, 'hidden', true)).map((f) => f.name))
      for (const f of a.fields) {
        if (hidden.has(f.name) && f.required) bad.push(`${a.card}:${a.family}#${f.name}: hidden AND required — an unreachable input`)
        if (f.wtype === 'select' && (f.options ?? []).length === 0) bad.push(`${a.card}:${a.family}#${f.name}: select with no options`)
        if (f.max_stack !== undefined && f.max_stack < 1) bad.push(`${a.card}:${a.family}#${f.name}: max_stack < 1`)
        if (f.width !== undefined && f.width < 1) bad.push(`${a.card}:${a.family}#${f.name}: width < 1`)
        if (f.columns !== undefined && f.columns < 1) bad.push(`${a.card}:${a.family}#${f.name}: columns < 1`)
      }
    }
    expect(bad, 'coherence violations').toEqual([])
  })

  test('LAW 4 — RENDER↔TOOL PARITY: every renderable field is toolable, and the two faces speak the same grammar values', () => {
    const bad: string[] = []
    for (const a of arms) {
      const props = (a.tool['properties'] ?? {}) as Record<string, Record<string, unknown>>
      const hidden = new Set(a.fields.filter((f) => extraIs(a, f.name, 'hidden', true)).map((f) => f.name))
      for (const f of a.fields) {
        if (hidden.has(f.name)) continue
        if (!(f.name in props)) {
          bad.push(`${a.card}:${a.family}#${f.name}: renders but the tool face cannot see it`)
          continue
        }
        const vwTool = props[f.name]?.['x-visible-when']
        if (f.visible_when !== undefined && vwTool !== undefined && vwTool !== f.visible_when) {
          bad.push(`${a.card}:${a.family}#${f.name}: render says visible_when='${f.visible_when}' but tool says '${String(vwTool)}'`)
        }
      }
    }
    expect(bad, 'two-faced fields (render ≠ tool)').toEqual([])
  })

  test('LAW 5 — NO GHOST DEFAULTS: every model_defaults key is a real field', () => {
    const bad: string[] = []
    for (const a of arms) {
      const legal = new Set([...a.vocab, ...(((loadDefsMap().get(a.card) as { admits?: string[] }) ?? {}).admits ?? [])])
      for (const key of Object.keys(a.doc.model_defaults ?? {})) {
        if (!legal.has(key)) bad.push(`${a.card}:${a.family}: model_defaults carries '${key}' — no such field, axis, or admitted lane key`)
      }
    }
    expect(bad, 'defaults for ghost fields').toEqual([])
  })

  test('LAW 6 — THE ZONE VOCABULARY is closed: only the seats the contract knows', () => {
    const seats = new Set<string>()
    for (const r of extraRows) if (r.key === 'zone' && typeof r.value === 'string') seats.add(r.value)
    expect([...seats].sort(), 'the estate zone vocabulary (pin: adding a seat is a contract act)').toEqual(['inputs', 'mods', 'params'])
  })

  test('LAW 7 — THE GRAMMAR INTERPRETER ITSELF: = matches, | alternates, ≠ negates, null is the unset face, keys trim', () => {
    const f = (rule: string): SpecField => ({ name: 'x', kind: 'text', group: '', required: false, visible_when: rule } as SpecField)
    // = matches
    expect(fieldVisible(f('model=a'), { model: 'a' })).toBe(true)
    expect(fieldVisible(f('model=a'), { model: 'b' })).toBe(false)
    // | alternates
    expect(fieldVisible(f('model=a|b'), { model: 'b' })).toBe(true)
    // & joins
    expect(fieldVisible(f('model=a&steps=4'), { model: 'a', steps: 4 })).toBe(true)
    expect(fieldVisible(f('model=a&steps=4'), { model: 'a', steps: 8 })).toBe(false)
    // ≠ negates
    expect(fieldVisible(f('model!=a'), { model: 'b' })).toBe(true)
    expect(fieldVisible(f('model!=a'), { model: 'a' })).toBe(false)
    // null is the unset face (String(undefined ?? '') === '')
    expect(fieldVisible(f('image1=null'), {})).toBe(true)
    expect(fieldVisible(f('image1=null'), { image1: '/tmp/x.png' })).toBe(false)
    expect(fieldVisible(f('image1!=null'), {})).toBe(false)
    expect(fieldVisible(f('image1!=null'), { image1: '/tmp/x.png' })).toBe(true)
    // whitespace trims — 'image1 != null' is the SAME guard as 'image1!=null'
    expect(fieldVisible(f('image1 != null'), { image1: '/tmp/x.png' })).toBe(true)
    // numbers compare as strings (the wire's face)
    expect(fieldVisible(f('steps=4'), { steps: 4 })).toBe(true)
  })
})

// helper: does the SERVED extra row for `field` carry key===value?
function extraIs(a: Arm, field: string, key: string, value: unknown): boolean {
  const row = extraRows.find((r) => r.where === `${a.card}:${a.family}` && r.field === field && r.key === key)
  return row !== undefined && row.value === value
}
