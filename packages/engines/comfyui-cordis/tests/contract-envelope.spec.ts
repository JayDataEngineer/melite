// contract-envelope.spec.ts — THE CONTRACT PINS (2026-10-10, the
// operator's order: "the contract must actually be fully fleshed
// out so it can serve as mocking for testing").
//
// Every pin walks the REAL image-edit declaration — the same
// loadCardDefs boot the serve rides — and proves every declared
// fact SURVIVES serialization onto the wire envelope. Before this
// file nothing pinned the real contract: the GUI tests hand-rolled
// spec fixtures, so a declaration could drop max_stack or wtype or
// the visibility grammar and every test would keep passing green
// over a hollowed contract ("going through the motions").
//
// The pins are RAW envelope walks (refs + meta.extra) — deliberately
// NOT card-base's fieldsOf — so a failure names the WIRE fact that
// died, not a derived symptom a walker change could mask.
import { readFileSync } from "node:fs";
import { describe, expect, test, beforeAll } from 'vitest'
import { loadCardDefs, theService } from '../src/cardDefs.ts'
import { emitParamsSchema } from '../src/params-emit.ts'

/** The serialized envelope's ref node shape (what toJSON actually
 *  puts on the wire — see card-base SchemaRef for the client's
 *  declaration of the same shape). */
interface RefNode {
  type?: string
  meta?: Record<string, unknown>
  value?: unknown
  list?: number[]
  dict?: Record<string, number>
  inner?: number
}
interface Envelope { uid: number; refs: Record<number, RefNode> }

const extraOf = (n: RefNode | undefined): Record<string, unknown> =>
  (n?.meta?.['extra'] as Record<string, unknown> | undefined) ?? {}

let schema: Envelope
let modSchemas: Record<string, unknown>
let carrier: unknown

beforeAll(async () => {
  await loadCardDefs()
  const svc = theService()
  const schemas = svc.formSchemas('image-edit', 'qwen-img-edit-21')
  expect(schemas).not.toBeNull()
  schema = schemas!.schema as Envelope
  modSchemas = schemas!.mods
  carrier = (svc.getCardDef('image-edit')?.schemaCarrier
    ?? svc.getCardDef('image-edit')?.schema) as unknown
})

/** The root dict row for a param name (throws naming it — never a
 *  silent undefined walk). */
const nodeOf = (name: string): RefNode => {
  const root = schema.refs[schema.uid]
  const id = root.dict?.[name]
  if (id === undefined) throw new Error(`no '${name}' in the image-edit envelope's root dict`)
  const node = schema.refs[id]
  if (node === undefined) throw new Error(`'${name}' points at ref ${id} — absent from the table`)
  return node
}

describe('THE CONTRACT: the real image-edit envelope (every declared fact rides)', () => {
  test('THE ONE LIST: input_images is an array whose inner is a NUMBER ref id (the interface honest)', () => {
    const n = nodeOf('input_images')
    expect(n.type).toBe('array')
    // THE HONEST INTERFACE PIN: inner rides as a ref id (number),
    // resolved against the same refs table as list/dict — the
    // client's entry-field walk reads exactly this.
    expect(typeof n.inner).toBe('number')
    expect(schema.refs[n.inner as number]?.type).toBe('string')
    // the declared default ([] — the empty stack)
    expect(n.meta?.['default']).toEqual([])
  })

  test('input_images carries the full presentation contract (wtype, max_stack, zone, order, media group)', () => {
    const x = extraOf(nodeOf('input_images'))
    expect(x['wtype']).toBe('image_list')
    expect(x['max_stack']).toBe(16)
    expect(x['zone']).toBe('inputs')
    expect(x['group']).toBe('input')
    expect(x['order']).toBe(-1)
    expect(typeof x['tooltip']).toBe('string')
  })

  test('THE HIDDEN ALIASES: image1/image2/image3/reference_images ride hidden (the one-list law)', () => {
    for (const alias of ['image1', 'image2', 'image3', 'reference_images']) {
      expect(extraOf(nodeOf(alias))['hidden'], alias).toBe(true)
    }
    // the anchor carries the path role (schemastery role rides meta.role)
    expect(nodeOf('image1').meta?.['role']).toBe('path')
  })

  test('prompt is required (extra.required — the declaration\'s spelling); width/height carry NO model guard (the DECL surface owns visibility) + the resolution layout', () => {
    const p = nodeOf('prompt')
    expect(extraOf(p)['required']).toBe(true)
    expect(extraOf(p)['wtype']).toBe('textarea')
    for (const nm of ['width', 'height']) {
      const n = nodeOf(nm)
      // THE GUARD IS DEAD (li-aq, fix shape 2): family scoping rides
      // the DECL params surface (served as the lanes block), never a
      // card-authored visible_when — a guard here would be a second
      // declaration drifting beside the first.
      expect(extraOf(n)['visible_when'], nm).toBeUndefined()
      expect(extraOf(n)['group'], nm).toBe('resolution')
      expect(extraOf(n)['columns'], nm).toBe(3)
      expect(typeof extraOf(n)['tooltip'], nm).toBe('string')
    }
    // THE LAYERED DEFAULT: width/height declare NO schema default —
    // the family row owns it (the DECL defaults layer, pinned below
    // so the layering itself can never silently flip)
    expect(nodeOf('width').meta?.['default']).toBeUndefined()
  })

  test('THE MOD ABSORPTION: the mask pack envelope rides mod_schemas with the 1:1 mask seat (li-a law)', () => {
    expect(Object.keys(modSchemas)).toContain('mask')
    const env = modSchemas['mask'] as Envelope
    const root = env.refs[env.uid]
    expect(root.dict?.['input_mask']).toBeDefined()
    const m = env.refs[root.dict!['input_mask']]
    expect(extraOf(m)['wtype']).toBe('image')
    expect(extraOf(m)['group']).toBe('input')
    expect(extraOf(m)['zone']).toBe('inputs')
    expect(extraOf(m)['order']).toBe(-1)
  })
})

describe('THE EMIT PARITY (the tool face reads the same vocabulary the cards write)', () => {
  test('THE DEAD GUARD: width/height emit NO x-visible-when (the DECL surface owns family scoping — li-aq)', () => {
    const emitted = emitParamsSchema(
      carrier as never,
      ['qwen-img-edit-21', 'qwen-img-edit-2511'],
    ) as { properties: Record<string, Record<string, unknown>> }
    for (const nm of ['width', 'height']) {
      const knob = emitted.properties[nm]
      expect(knob, nm).toBeDefined()
      // the camel read itself stays healed (a card that DOES declare a
      // guard emits it — the read is the emit's vocabulary); the
      // image-edit card simply declares none anymore
      expect(knob['x-visible-when'], nm).toBeUndefined()
    }
  })

  test('THE DECL LAYER: the family row owns width/height 1024 (the layered default — getModel reads the same DECL the serve layers)', async () => {
    const { getModel, cascadeInit } = await import('../src/models/models.ts')
    await cascadeInit
    const decl = getModel('qwen-img-edit-21') as { defaults?: Record<string, unknown> }
    expect(decl.defaults?.['width']).toBe(1024)
    expect(decl.defaults?.['height']).toBe(1024)
  })
})

// ── THE WIRING WALL RIDES EVERY SUBMIT SEAM (2026-10-10, the bypass
// audit's HIGH-3) ─────────────────────────────────────────────────
// 2026-10-10, THE OPERATOR'S LAW: ON SUBMIT IS A HACK. The first
// reseat threaded the wall as an OPTIONAL callback through ONE
// engine submit call (defaulted at the host, grepped-pin'd here) —
// and its missing import crashed a live run, proving the shape: a
// wall someone remembered to build at one door is not the schema
// system. The wall's seats are the CARD-COMPOSE seat and the RUN
// SEAT'S PRE-FLIGHT (runsExecute's wiring fence, on the built rows,
// before any engine action — behaviourally pinned in the queue's
// runs-hero spec: a bad class_type fails the run with the engine
// NEVER CALLED). These pins hold the ABSENCE of the hack.
describe("NO WALL AT THE SUBMIT SEAM (the opt is the hack)", () => {
  test("the host's executeFlow carries no wall, no default injection, no import", () => {
    const src = readFileSync(new URL("../src/comfyui-host.ts", import.meta.url), "utf8");
    expect(src).not.toContain("assertWiring");
    expect(src).not.toContain("assertWiringAtSubmit");
  });

  test("ExecuteOpts threads no assertWiring callback (no submit seam judges)", () => {
    const src = readFileSync(new URL("../src/comfyui-execute.ts", import.meta.url), "utf8");
    expect(src).not.toContain("assertWiring");
    const merge = readFileSync(new URL("../src/comfyui-merge.ts", import.meta.url), "utf8");
    expect(merge).not.toContain("assertWiring");
  });

  test("the run seat owns the fence (the behavioural wall's home)", () => {
    const src = readFileSync(
      new URL("../../../harness/estate-queue/src/runsExecute.ts", import.meta.url),
      "utf8",
    );
    expect(src).toContain("assertWiringNow(");
    // the fence predates the engine submit — the only executeFlow call
    const fence = src.indexOf("assertWiringNow(");
    const submit = src.indexOf("engine.executeFlow(");
    expect(fence).toBeGreaterThan(-1);
    expect(submit).toBeGreaterThan(-1);
    expect(fence).toBeLessThan(submit);
  });

  test("the wall is ONE judge with two callers (the service composes, the run seat fences)", () => {
    const wall = readFileSync(new URL("../src/wiringWall.ts", import.meta.url), "utf8");
    expect(wall).toContain("export function assertWiringAgainst");
    expect(wall).toContain("export function assertWiringNow");
    // the submit-time NAME is dead as code (the header keeps the
    // history, as history)
    expect(wall).not.toMatch(/export function assertWiringAtSubmit/);
    // the service is a CALLER, not a second implementation
    const svc = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
    expect(svc).toContain("assertWiringAgainst(this.objectInfoNodes");
    expect(svc).not.toMatch(/private assertWiring\([\s\S]*?for \(const \[id, node\]/);
  });
});
