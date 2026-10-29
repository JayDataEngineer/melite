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
import { emitParamsSchema } from '../../comfyui-card-kit/src/params-emit.ts'

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

  test('prompt is required (extra.required — the declaration\'s spelling); width/height ride SERVED run params under the toggle (the size-seat law) + the prompt layout', () => {
    const p = nodeOf('prompt')
    expect(extraOf(p)['required']).toBe(true)
    expect(extraOf(p)['wtype']).toBe('textarea')
    for (const nm of ['width', 'height']) {
      const n = nodeOf(nm)
      // THE SIZE-SEAT LAW (the ground-truth cure, 2026-11-12): the
      // edit lanes surface the deliverable pair beside the card's
      // match_input_resolution toggle — the pair sizes the RENDER
      // (encoder budget + exact empty latent; no ImageScale tail),
      // so the envelope SERVES it (never hidden) gated on the
      // toggle OFF — the operator's verbatim burn (flipping the
      // switch hid the numbers) stays red if this regresses.
      expect(extraOf(n)['hidden'], nm).toBeUndefined()
      expect(extraOf(n)['visible_when'], nm).toBe('match_input_resolution=false')
      expect(typeof extraOf(n)['tooltip'], nm).toBe('string')
    }
    // NO schema default — the geometry is the source's own frame on
    // every lane; a default here would re-serve a stated size
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
  test('THE DELIVERABLE PAIR: width/height emit on the served face (the size-seat law — both DECLs surface the pair as run params)', () => {
    const emitted = emitParamsSchema(
      carrier as never,
      ['qwen-img-edit-21', 'qwen-img-edit-2511'],
    ) as { properties: Record<string, Record<string, unknown>> }
    for (const nm of ['width', 'height']) {
      // the size-seat law: the surfaced pair is part of the
      // served face's vocabulary — the intersection (card schema ×
      // boarded DECLs) keeps it because BOTH lanes' DECLs declare
      // it. The tool face and the cards can never disagree.
      expect(emitted.properties[nm], nm).toBeDefined()
    }
  })

  test('THE DECL LAYER: the family row owns NO width/height default (the latent law — the encoder\u2019s own latent is the geometry)', async () => {
    const { getModel, cascadeInit } = await import('../src/models/models.ts')
    await cascadeInit()
    const decl = getModel('qwen-img-edit-21') as { defaults?: Record<string, unknown> }
    expect(decl.defaults?.['width']).toBeUndefined()
    expect(decl.defaults?.['height']).toBeUndefined()
  })
})

// ── THE WIRING WALL RIDES EVERY SUBMIT SEAM (2026-10-10, the bypass
// audit's HIGH-3) ─────────────────────────────────────────────────
// 2026-10-10, THE OPERATOR'S LAW: ON SUBMIT IS A HACK; later the
// same day, THE AUDIT'S LAW: A WALL THAT IS DEAD IN PRODUCTION IS
// NOT A WALL. The first reseat threaded the wall as an OPTIONAL
// callback through ONE engine submit call — its missing import
// crashed a live run. The second cut moved the walk to the run
// seat but gated it on the seat-less branch, and the estate bundle
// ALWAYS submits through the engines adapter: dead on the lane,
// twice over (the doc was module state armed by a service the
// bundle never mounts, so it was unarmed there too). The seats
// now: the CARD-COMPOSE seat, the RUN SEAT'S UNGATED PRE-FLIGHT
// (runsExecute's wiring fence, every path, the built rows), and
// the ENGINES ADAPTER'S POST-SPLICE WALK (the graph the engine
// actually receives — behaviourally pinned in comfyui-engine.spec:
// a bad class_type refuses with the host's executeFlow NEVER
// CALLED). These pins hold the ABSENCE of the hack AND the
// PRESENCE of the production seat.
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

  test("the run seat owns the fence — UNGATED from the seat branch (the audit's finding)", () => {
    const src = readFileSync(
      new URL("../../../harness/estate-queue/src/runsExecute.ts", import.meta.url),
      "utf8",
    );
    // the walk rides the wiring service, on EVERY path
    expect(src).toContain('wiring.assert(');
    // THE BUG WAS A GATE: the first cut walked only when the seat
    // executor was null, and production always takes the seat path
    expect(src).not.toContain("if (seatExecutor === null) {\n      for (let i = 0; i < rows.length;");
    // the fence predates the engine submit — the only executeFlow call
    const fence = src.indexOf('wiring.assert(');
    const submit = src.indexOf("engine.executeFlow(");
    expect(fence).toBeGreaterThan(-1);
    expect(submit).toBeGreaterThan(-1);
    expect(fence).toBeLessThan(submit);
  });

  test("the engines adapter walks the POST-SPLICE graph (production's submit seat)", () => {
    const src = readFileSync(new URL("../src/entries/comfyui-engine.ts", import.meta.url), "utf8");
    // the F-2 voice chain (2026-10-10): the card when the run was
    // card-commissioned, the stage id only as the fallback
    expect(src).toContain('wiring.assert(row.card ?? row.stageId, row.workflow)');
    // the walk predates the host submit — the only executeFlow call
    const walk = src.indexOf("wiring.assert(row.card ?? row.stageId");
    const submit = src.indexOf("host.executeFlow(");
    expect(walk).toBeGreaterThan(-1);
    expect(submit).toBeGreaterThan(-1);
    expect(walk).toBeLessThan(submit);
    // resolved AT WALK TIME (a doc armed after mount still judges)
    expect(src).toContain('ctx.get("comfyuiWiring")');
  });

  test("the wall is ONE judge: the wiring service owns the doc, three seats call it", () => {
    const wall = readFileSync(new URL("../src/wiringWall.ts", import.meta.url), "utf8");
    expect(wall).toContain("export function assertWiringAgainst");
    expect(wall).toContain("export class ComfyUIWiringService");
    expect(wall).toContain("export const comfyuiWiringProvider");
    // the module-global doc and its armers are DEAD (the audit: they
    // were never armed in production at all); the submit-time NAME is
    // dead as code (the header keeps the history, as history)
    expect(wall).not.toContain("let objectInfo");
    expect(wall).not.toMatch(/export function setObjectInfoDoc/);
    expect(wall).not.toMatch(/export function assertWiringNow/);
    expect(wall).not.toMatch(/export function assertWiringAtSubmit/);
    // the card service is a CALLER that ARMS the shared service, not a
    // second implementation
    const svc = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
    expect(svc).toContain("deriveWiringDoc");
    expect(svc).toContain('ctx.get(\'comfyuiWiring\')');
    expect(svc).not.toMatch(/private assertWiring\([\s\S]*?for \(const \[id, node\]/);
    // the estate registry (production's doc owner) primes AND arms
    const reg = readFileSync(
      new URL("../../../harness/estate-queue/src/cardsRegistry.ts", import.meta.url),
      "utf8",
    );
    expect(reg).toContain("armWiringFromDoc");
    // the estate bundle mounts the provider before the host
    const bundle = readFileSync(
      new URL("../../../web/melite-estate/src/index.ts", import.meta.url),
      "utf8",
    );
    const wiringRow = bundle.indexOf("comfyuiWiring,");
    const hostRow = bundle.indexOf("comfyuiHost,");
    expect(wiringRow).toBeGreaterThan(-1);
    expect(hostRow).toBeGreaterThan(-1);
    expect(wiringRow).toBeLessThan(hostRow);
  });
});

// ── THE LANE CAP NARROW (2026-10-11, the operator's wall: "the
// 2511 model is still showing 18 input images even though it only
// has 3 by design"): a multi-family card declares its stack face
// at the ROOMIEST boarded cap (image-edit: 16) — the SERVED form
// narrows it to the boarded lane's own lane_inputs.max_images, so
// the 2511 face renders 3 and the 2.1 face renders 16. The card's
// own law says so on its doc face; this pin holds the serve to it.
describe('THE LANE CAP NARROW (the served stack cap is the boarded lane\'s own)', () => {
  const capOf = (env: Envelope): number => {
    const root = env.refs[env.uid]
    const id = root.dict?.input_images
    if (id === undefined) throw new Error('no input_images in the envelope root dict')
    const cap = extraOf(env.refs[id]).max_stack
    if (typeof cap !== 'number') throw new Error('input_images carries no max_stack')
    return cap
  }

  test('the 2.1 serve keeps its own 16', async () => {
    await loadCardDefs()
    const schemas = theService().formSchemas('image-edit', 'qwen-img-edit-21')
    expect(capOf(schemas!.schema as Envelope)).toBe(16)
  })

  test('the 2511 serve narrows to its own 3 — never the roomiest boarded cap', async () => {
    const schemas = theService().formSchemas('image-edit', 'qwen-img-edit-2511')
    expect(capOf(schemas!.schema as Envelope)).toBe(3)
  })

  test('the narrow is pure — the card\'s own declaration is untouched', async () => {
    // the card object still declares the roomiest cap; each serve
    // narrows its own copy (no mutation of the shared schema)
    const s21 = theService().formSchemas('image-edit', 'qwen-img-edit-21')
    const s2511 = theService().formSchemas('image-edit', 'qwen-img-edit-2511')
    expect(capOf(s21!.schema as Envelope)).toBe(16)
    expect(capOf(s2511!.schema as Envelope)).toBe(3)
    expect((theService().getCardDef('image-edit')?.schema as { toJSON?: () => Envelope })?.toJSON).toBeDefined()
  })
})
