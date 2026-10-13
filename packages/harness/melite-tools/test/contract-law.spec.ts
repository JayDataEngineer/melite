// contract-law.spec.ts — THE ESTATE CONTRACT LAWS (operator order
// 2026-10-10: "add more testing around contracts to ensure they
// are REAL DEEP ones, not shallow ones").
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
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, test, beforeAll } from 'vitest'
import { loadCardDefs, theService, getModel } from '@melite/comfyui-cordis'
import { emitParamsSchema } from '@melite/comfyui-cordis/params-emit'
import { formSpecArm } from '../src/discovery.ts'
import { fieldsOf, fieldVisible, axisKey, type FormSpecDoc, type SpecField } from '@melite/card-base/spec'
import { WTYPE_SET, MEDIA_SET, ROLE_SET, WTYPE_SEATS } from '@melite/contracts/extraKeys'
import { assertEnvelopeLaws, EnvelopeLawRefusal } from '@melite/comfyui-cordis/envelope-laws'

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
const wtypes = new Set<string>()
const medias = new Set<string>()
const roles = new Set<string>()
const optionRows: Array<{ where: string; field: string; values: string[] }> = []
const edgeKinds = new Set<string>()
const edges: Array<{ where: string; name: string; kind: string; required: boolean; vocab: string[] }> = []

const walkExtras = (where: string, env: Envelope | null, vocab: string[]): void => {
  if (env == null) return
  const seen = new Set<number>([env.uid])
  const queue: Array<{ id: number; field: string }> = [{ id: env.uid, field: '' }]
  while (queue.length > 0) {
    const { id, field } = queue.shift()!
    const node = env.refs[id]
    if (node === undefined) continue
    const role = node.meta?.['role']
    if (typeof role === 'string') roles.add(role)
    const extra = node.meta?.['extra']
    if (typeof extra === 'object' && extra !== null && !Array.isArray(extra)) {
      for (const [key, value] of Object.entries(extra as Record<string, unknown>)) {
        extraRows.push({ where, field: field || '·root', key, value })
        if (key === 'wtype' && typeof value === 'string') wtypes.add(value)
        if (key === 'media' && typeof value === 'string') medias.add(value)
      }
      const opts = (extra as Record<string, unknown>)['options']
      if (Array.isArray(opts)) {
        optionRows.push({ where, field: field || '·root', values: opts.map((o) => (typeof o === 'string' ? o : String((o as { value: unknown }).value))) })
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
      for (const edge of doc.inputs ?? []) {
        edgeKinds.add(edge.kind)
        edges.push({ where: card + ':' + family, name: edge.name, kind: edge.kind, required: edge.required === true, vocab })
      }
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
    // THE FLOOR IS A FLOOR (the walls audit's C3, 2026-10-10): the
    // old line was toBeGreaterThanOrEqual(0) — true for every
    // possible count, so deleting the visible_when harvest left this
    // arm judging ZERO guards and passing. The guards provably exist
    // (input-prep, rig and music declare them), so the wall requires
    // them — the same idiom LAW 1 and LAW 9 use in this file.
    expect(guards.length, 'guards were found on the wire').toBeGreaterThan(0)
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
    const f = (rule: string): SpecField => ({ name: 'x', kind: 'text', group: '', required: false, visible_when: rule }) as unknown as SpecField // partial fixture: LAW 7 drives only visible_when
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

  test('LAW 8 — THE CLOSED FACE VOCABULARIES: wtype/media/role sets, complete and exclusive, with seats', () => {
    expect([...wtypes].sort(), 'wtypes on the wire — every spelling is contract; a foreign one renders as a silent text input').toEqual([...WTYPE_SET].slice().sort())
    expect([...medias].sort()).toEqual([...MEDIA_SET].slice().sort())
    expect([...roles].sort()).toEqual(['path'])
    // SEAT COVERAGE: every wtype has a declared rendering seat
    expect(Object.keys(WTYPE_SEATS).sort()).toEqual([...WTYPE_SET].slice().sort())
    // atom-routed members must ALL be exercised (a dead atom wtype
    // means the renderer arm rots untested)
    const atomRouted = Object.entries(WTYPE_SEATS).filter(([, seat]) => seat === 'atom').map(([w]) => w)
    for (const w of atomRouted) expect(wtypes.has(w), `atom wtype '${w}' exercised on the wire`).toBe(true)
  })

  test('LAW 9 — INPUT EDGES: every signature edge binds a real field, kinds closed', () => {
    expect(edges.length, 'the walk found input edges').toBeGreaterThan(20)
    const bad: string[] = []
    for (const e of edges) {
      if (!e.vocab.includes(e.name)) bad.push(`${e.where}#edge:${e.name}: names no declared field`)
      if (e.required && !e.vocab.includes(e.name)) bad.push(`${e.where}#edge:${e.name}: required but unbound`)
    }
    expect(bad, 'ghost input edges').toEqual([])
    // the kind vocabulary, pinned closed from the wire — the
    // rail's seats (image/video/audio lists are the typed stacks,
    // seg is the mask modality, text stays params, data/mesh the
    // 3d lanes). A new kind is a contract act.
    expect([...edgeKinds].sort(), 'edge kinds (a new kind is a contract act)').toEqual(
      ['audio', 'audio_list', 'data', 'image', 'image_list', 'mesh', 'seg', 'text', 'video_list']
    )
  })

  test('LAW 10 — OPTIONS UNIQUENESS on the wire (a duplicate value is an ambiguous pick)', () => {
    const bad: string[] = []
    for (const row of optionRows) {
      const seen = new Set<string>()
      for (const v of row.values) {
        if (seen.has(v)) bad.push(`${row.where}#${row.field}: duplicate option value '${v}'`)
        seen.add(v)
      }
    }
    expect(bad, 'duplicate option values').toEqual([])
  })

  test('LAW 11 — THE BOOT GATE FIRES: registration refuses foreign envelopes (plugins included)', async () => {
    const { default: z } = await import('@deepseek-ai/schemastery')
    // fresh construction per arm (a schemastery schema is a live
    // function — never cloneable)
    const def = (schema: unknown): never => ({
      id: 'probe-card', identity: 'probe', boarded: [],
      schema, compose: () => { throw new Error('never reaches compose') },
    } as never)
    const refuse = (msg: string, schema: unknown): void => {
      expect(() => assertEnvelopeLaws(def(schema)), msg).toThrow(EnvelopeLawRefusal)
    }
    refuse('foreign wtype', z.object({ x: z.string().extra('extra', { wtype: 'image_lst' }) }))
    refuse('ghost extra key', z.object({ x: z.string().extra('extra', { visable_when: 'a=b' }) }))
    refuse('malformed guard', z.object({ y: z.string(), x: z.string().extra('extra', { visible_when: 'model' }) }))
    refuse('ghost guard sibling', z.object({ x: z.string().extra('extra', { visible_when: 'ghost=1' }) }))
    refuse('hidden AND required', z.object({ x: z.string().extra('extra', { hidden: true, required: true }) }))
    refuse('duplicate options', z.object({ x: z.string().extra('extra', { wtype: 'select', options: [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }] }) }))
    refuse('foreign zone', z.object({ x: z.string().extra('extra', { zone: 'rail' }) }))
    refuse('foreign media', z.object({ x: z.array(z.string()).extra('extra', { wtype: 'image_list', media: 'strng' }) }))
    // the LEGAL twin passes clean
    expect(() => assertEnvelopeLaws(def(z.object({
      model2: z.string(),
      x: z.string().extra('extra', { wtype: 'image_list', visible_when: 'model2=a|b', max_stack: 4, media: 'video', zone: 'inputs' }),
    }))), 'the legal twin registers').not.toThrow()
  })

  test('LAW 12 — THE FOLD\u2019S SERVING HALF: h3 serves every migration route its drafts and frozen facts name', () => {
    // THE FOLDED-LANES RETRACTION (2026-10-27): the first cut of
    // this law judged served routes through resolveSpecKey (a door
    // that answers from the DECL's own route table — self-
    // referential, green while dead), then deleted the h3 folded
    // rows as "pills promising cards that do not exist". Three
    // estate walls fired: recipe-rows DEBT RETIRED
    // (getModel('h3-keyframe') — the fold law's migration promise),
    // closure-gate RULE 4c (the card∩family set lost
    // 'h3-timeline'), and the recipe TEETH PROOF on image-edit, a
    // family the cut never touched. The mechanism (scratch-debug
    // probe, same day): the FROZEN facts file still names the
    // retired routes, so modelFacts() throws unknown-model, and
    // laneVerdictCore's selection-tolerance catch swallows it into
    // a FALSE ADMIT on every family's write door. A route old
    // drafts and frozen facts name is RESOLUTION TRUTH (make-model
    // skill 1c, the fold law) — the serving door must hand it over.
    // Judged at the SERVED spec (the real door, formSpecArm): the
    // h3 arm serves every migration address, so the rail, the
    // resolver, the frozen facts, and old drafts agree on one set.
    // RED-PROOF RECEIPT (hands-on, 2026-10-27): removing the folded
    // rows from the h3 DECL reddened this arm's set (served routes
    // {Recipe rows} against the migration set below); restoring
    // them greened it — and the same toggle reddened DEBT RETIRED
    // + RULE 4c + TEETH PROOF, all green again at restore.
    const arm = arms.find((a) => a.card === 'h3-timeline' && a.family === 'h3')
    expect(arm, 'the sweep serves h3-timeline × h3').toBeDefined()
    const served = new Set(
      (arm!.doc.variants ?? []).map((r) => r.route ?? '').filter((r) => r !== ''),
    )
    for (const addr of ['h3-timeline', 'h3-fl2va', 'h3-ref2va', 'h3-keyframe', 'h3-timeline-ref', 'h3']) {
      expect(served.has(addr), `the rail serves the migration address '${addr}' (fold law: old drafts resolve migration-free)`).toBe(true)
      expect(() => getModel(addr), `the models table derives '${addr}' (the door frozen facts resolve through)`).not.toThrow()
    }
  })
})

// helper: does the SERVED extra row for `field` carry key===value?
function extraIs(a: Arm, field: string, key: string, value: unknown): boolean {
  const row = extraRows.find((r) => r.where === `${a.card}:${a.family}` && r.field === field && r.key === key)
  return row !== undefined && row.value === value
}
