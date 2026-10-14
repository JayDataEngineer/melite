// discovery.ts synthetic walls (vitest, the model registry + card
// defs + service scripted — the live registry carries no quantless,
// hidden, routeless, dup-quant, unoffered, or unboarded cells, so
// the envelope's filter arms ride synthetic DECLs; live truth stays
// in discovery.spec.ts).
import "../../../../tests/helpers/boot-models.ts";
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'

const mockState = vi.hoisted(() => ({
  decls: {} as Record<string, Record<string, unknown>>,
  defs: new Map() as Map<string, unknown>,
  // The service fake always rides the svc() builder below (a full
  // ComfyUIService cast from intentionally-partial fixtures) or null
  // past reset() — never a bare record.
  svc: null as null | ComfyUIService,
}))

vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...orig,
    getModel: (id: string) => {
      if (id in mockState.decls) return mockState.decls[id]
      return (orig as unknown as { getModel(id: string): unknown }).getModel(id)
    },
    loadCardDefs: async () => mockState.defs,
    theService: () => mockState.svc,
  }
})

import type { ComfyUIService } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import type { ModifierKind } from '@melite/contracts/formSpec'
import {
  cardToolsArm, formSpecArm as formSpecArmRaw, resolveSpecKey, specBody as specBodyRaw, stampOptionsFrom,
} from '../src/discovery.ts'

/** THE TRANSIENT-GENRE RACE (stroke 83, the discovery.spec twin):
 * enhance-recipes.spec (comfyui-cordis) lays EPHEMERAL zz-cov-<pid>
 * genres under the real models root — a parallel worker's sweep here
 * can catch one mid-flight. Bounded retry on exactly that scratch
 * signature; any real fault fails untouched. */
const sweepRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= 4 || !/zz-cov-\d+/.test(String(error))) throw error
      await new Promise((r): void => { setTimeout(r, 200) })
    }
  }
}
/** specBody is SYNC (every row uses it un-awaited) — the retry sleeps
 * the worker thread via Atomics.wait (the one honest sync sleep). */
const specBody = (...a: Parameters<typeof specBodyRaw>): ReturnType<typeof specBodyRaw> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return specBodyRaw(...a)
    } catch (error) {
      if (attempt >= 4 || !/zz-cov-\d+/.test(String(error))) throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
}
const formSpecArm = (...a: Parameters<typeof formSpecArmRaw>): ReturnType<typeof formSpecArmRaw> =>
  sweepRetry(() => formSpecArmRaw(...a))

function card(partial: Record<string, unknown>): CardDefinition {
  // THE EVERY-CARD-DECLARES LAW: real cards all carry flowKinds (the
  // loadCardDefs wall); synth fixtures mimic real cards — the edge
  // emission reads the declaration, so fixtures declare edges too.
  return {
    flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
    ...partial,
  } as unknown as CardDefinition
}

function svc(partial: Record<string, unknown>): ComfyUIService {
  // packPresence: the EXTENSION-LAW gate's read (stroke 18) — the
  // synth fakes carry no engine facts, so the default marks unknown
  return {
    packPresence: (packs: readonly string[]) => packs.map((id) => ({ id, present: null })),
    ...partial,
  } as unknown as ComfyUIService
}

/** A schema-envelope stand-in (the served shape — schemastery's own
 *  toJSON in production; the synth tests only need the wire form). */
const ENVELOPE = { uid: 0, refs: { 0: { type: 'object', dict: {} } } }

function decl(partial: Record<string, unknown>): Record<string, unknown> {
  return { id: 'syn', genre: 'image', label: 'Syn', ...partial }
}

function reset(): void {
  mockState.decls = {}
  mockState.defs = new Map()
  mockState.svc = null
}

describe('resolveSpecKey synthetic arms', () => {
  test('a card id that is also a family key walks the family path', () => {
    reset()
    mockState.decls = { 'syn-fam': decl({}) }
    const defs = new Map([['syn-fam', card({ boarded: ['syn-fam'] })]])
    assert.deepEqual(
      resolveSpecKey('syn-fam', defs, new Map([['syn-fam', 'syn-card']])),
      { card: 'syn-card', service: 'syn-fam', model: 'syn-fam' },
    )
  })

  test('an unoffered family resolves to null', () => {
    reset()
    mockState.decls = { 'syn-off': decl({ unoffered: true }) }
    assert.equal(resolveSpecKey('syn-off', new Map(), new Map()), null)
  })

  test('a boarded loop with no route to the key resolves to null', () => {
    reset()
    mockState.decls = {
      'syn-key': decl({}),
      'syn-novariants': decl({}),
      'syn-noroute': decl({
        variants: [
          { id: 'v', label: 'V', group: 'Variant', cells: [{ quant: 'q', label: 'Q' }] },
          { id: 'w', label: 'W', group: 'Variant', route: '' },
        ],
      }),
    }
    const boarded = new Map([
      ['__bogus__', 'nowhere'],
      ['syn-novariants', 'card-a'],
      ['syn-noroute', 'card-b'],
    ])
    assert.equal(resolveSpecKey('syn-key', new Map(), boarded), null)
  })

  test('a boarded owner routes to the key', () => {
    reset()
    mockState.decls = {
      'syn-key': decl({}),
      'syn-owner': decl({
        variants: [{ id: 'v', label: 'V', group: 'Variant', route: 'syn-key' }],
      }),
    }
    assert.deepEqual(
      resolveSpecKey('syn-key', new Map(), new Map([['syn-owner', 'card-o']])),
      { card: 'card-o', service: 'syn-owner', model: 'syn-key' },
    )
  })
})

describe('formSpecArm synthetic boarding', () => {
  test('first-seen boarding wins when two cards board one family', async () => {
    reset()
    mockState.decls = { 'syn-fam': decl({}) }
    mockState.defs = new Map<string, unknown>([
      ['card-a', card({ boarded: ['syn-fam'], identity: { label: 'A', description: 'a', genre: 'image' } })],
      ['card-b', card({ boarded: ['syn-fam'], identity: { label: 'B', description: 'b', genre: 'image' } })],
      ['card-c', card({ identity: { label: 'C', description: 'c', genre: 'image' } })],
    ])
    mockState.svc = svc({ formSchemas: () => ({ schema: ENVELOPE, mods: {} }) })
    const spec = await formSpecArm('syn-fam')
    assert.equal(spec?.form, 'card-a')
    assert.equal(spec?.service, 'syn-fam')
  })

  test('cardToolsArm tolerates a def without boarding', async () => {
    reset()
    mockState.defs = new Map<string, unknown>([
      ['bare', card({
        identity: { label: 'Bare', description: 'b', genre: 'image' },
        schemaCarrier: { dict: {} },
      })],
    ])
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    assert.equal(tools.length, 1)
    // THE MINTED-FAMILY KILL (2026-10-12): the old pins here were the
    // mint itself (model 'bare', families ['bare']). A board-less def
    // serves NO pick — model null, families empty; the alias is the
    // run plane's law, never a served pick.
    assert.equal(tools[0]!['model'] ?? null, null)
    assert.deepEqual(tools[0]!['families'], [])
    // F-7: mocked defs ride the same emit — the stamp is on the
    // face, never on the def
    assert.equal(typeof tools[0]!['face_stamp'], 'string')
    assert.ok((tools[0]!['face_stamp'] as string).length > 0)
  })
})

describe('specBody primary envelope', () => {
  function mega(): { defs: Map<string, CardDefinition>; res: { card: string; service: string; model: string } } {
    reset()
    mockState.decls = {
      'syn-a': decl({
        // the registry keys by decl.id (the one-owner interlock) —
        // the mock honors it: the key IS the decl's id, so the
        // head-claim derivation reads the same identity prod serves.
        id: 'syn-a',
        engine: 'custom-engine',
        defaults: { strength: 3 },
        mods: ['loras', 'controlnet', 'mask', 'bogus-pack'],
        variant_groups: [
          { id: 'Variant', label: 'Variant', tooltip: 't', default: 'turbo' },
          { id: 'Quant', label: 'Quant' },
        ],
        variants: [
          {
            id: 'turbo',
            label: 'Turbo',
            group: 'Variant',
            hint: 'fast',
            route: 'syn-a',
            engine: 'variant-engine',
            resolver_defaults: { steps: 10 },
            cells: [
              { quant: 'q-hide', label: 'Hidden', route: 'syn-a', hide_from_dropdown: true },
              { quant: 'q-noroute', label: 'NoRoute' },
              { quant: 'int8', label: 'INT8', route: 'syn-a', engine: 'cell-eng', vram_peak_gb: 20, resolver_defaults: { b: 2 } },
              { quant: 'int8', label: 'INT8-dup', route: 'syn-a' },
              { quant: 'fp8', label: 'F', route: 'syn-b' },
              { quant: 'q3', route: 'syn-a' },
              { quant: 'q4', label: 'Q', route: 'syn-a' },
            ],
          },
           { id: 'bare', group: 'Variant' },
           { id: 'hidden-variant', group: 'Variant', hide_from_dropdown: true, cells: [{ quant: 'q8', route: 'syn-a' }] },
        ],
      }),
    }
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-a'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
        surface: { layout: 'studio', size: 'huge' },
      })],
    ])
    mockState.svc = svc({
      // THE NEW SEAM (the parameter audit): one call serves the card
      // schema envelope + the mod contracts' own envelopes, family-
      // filtered (the real service folds cardModFields here — the
      // synth mirrors the fold: syn-a boards loras + controlnet)
      formSchemas: () => ({
        schema: { uid: 0, refs: { 0: { type: 'object', dict: { prompt: 1 } }, 1: { type: 'string' } } },
        mods: {
          loras: { uid: 0, refs: { 0: { type: 'object', dict: { f1: 1, f2: 2, f3: 3, f4: 4 } } } },
          controlnet: { uid: 0, refs: { 0: { type: 'object', dict: {} } } },
        },
      }),
      modCatalog: (pack: string) => {
        if (pack === 'loras') {
          return {
            shared: true,
            rows: [
              { id: 'l1', label: 'L1', category: 'cat', filename: 'f.safetensors', default_strength: 0.8 },
              { id: 'l2', filename: 'g.safetensors' },
            ],
          }
        }
        if (pack === 'mask') {
          return { shared: false, rows: [{ id: 'm1', label: 'M1', filename: 'm.safetensors' }] }
        }
        return { shared: false, rows: [] }
      },
      cardModFields: () => [
        {
          pack: 'loras',
          families: ['syn-a', 'other'],
          fields: {
            dict: {
              f1: { meta: { extra: { group: 'g-lora' } } },
              f2: { meta: { extra: { group: 99 } } },
              f3: { meta: {} },
              f4: {},
            },
          },
        },
        { pack: 'loras', families: ['other'], fields: { dict: {} } },
        { pack: 'controlnet', families: ['syn-a'], fields: {} },
        { pack: 'mask', families: ['other'], fields: { dict: {} } },
      ],
    })
    return { defs, res: { card: 'syn-card', service: 'syn-b', model: 'syn-a' } }
  }

  test('variants filter, dedupe, and label every cell', () => {    const { defs, res } = mega()
    const spec = specBody(mockState.svc as ComfyUIService, defs, res)
    assert.equal(spec.engine, 'custom-engine')
    // THE BASE LAYER INPUT: the family row's own defaults (the schema
    // envelope carries the rest — defaults derive client-side now)
    assert.deepEqual(spec.model_defaults, { strength: 3 })
    assert.equal(spec.layout, 'studio')
    assert.equal(spec.size, 'huge')
    const variants = spec.variants ?? []
    assert.deepEqual(variants.map((r) => r.id), [
      'turbo',
      'int8',
      'turbo__int8',
      'fp8',
      'q3',
      'q4',
      'bare',
    ])
    assert.deepEqual(variants[1], {
      id: 'int8',
      label: 'INT8',
      group: 'Quant',
      defaults: { b: 2 },
      route: 'syn-a',
      hint: null,
      engine: 'cell-eng',
      quant: 'int8',
      vram_peak_gb: 20,
      owner: 'turbo',
    })
    assert.equal(variants[3]!['route'], 'syn-b') // the service leg rides primary
    assert.equal(variants[4]!['label'], 'Q3') // the unlabeled cell caps its quant
    assert.equal(variants[5]!['engine'], 'custom-engine')
    assert.deepEqual(variants[6], {
      id: 'bare',
      label: undefined,
      group: 'Variant',
      defaults: {},
      route: '',
      hint: null,
      engine: 'custom-engine',
      // the envelope key rides always — null for absent (the DECL
      // audit's row 3: the domain is served or the agent guesses)
      sampler_envelope: null,
      quant: null,
      vram_peak_gb: null,
      owner: '',
    })
  })

  test('THE BIRTH WALL (2026-09-29, the second live break): a quantless cell REFUSES the spec — never silently skips', () => {
    // The DECL validator refuses it upstream (service.ts: "a cell
    // needs a quant"); if one ever reaches the expander — a bypassed
    // validator, a foreign DECL — the spec REFUSES AT BIRTH. The old
    // silent skip was the fallback that hid the construction hole:
    // a Quant row without its coordinate would stamp its catalog
    // address where the door reads the value ('raw__int8').
    const { defs, res } = mega()
    mockState.decls = {
      'syn-a': decl({
        variants: [
          { id: 'v', group: 'Variant', cells: [{ quant: '', label: 'Empty', route: 'syn-a' }] },
        ],
      }),
    }
    assert.throws(
      () => specBody(mockState.svc as ComfyUIService, defs, res),
      /\/v: a cell needs a quant \(refused at the spec's birth/,
    )
  })

  test('modifiers scope packs, absorb fields, and tooltip options', () => {
    const { defs, res } = mega()
    const spec = specBody(mockState.svc as ComfyUIService, defs, res)
    const modifiers = spec.features?.modifiers ?? []
    const rowOf = (k: string): ModifierKind => {
      const hit = modifiers.find((m) => m.kind === k)
      assert.ok(hit !== undefined, 'kind ' + k)
      return hit
    }
    // THE WIRE IS PLURAL (the retired controlnets bag — kind stays
    // singular, param_key is plural, schema_key names the pack
    // envelope for the client's hybrid walk). THE ENVELOPE MIRROR
    // (2026-09-21): mask boards only family 'other', so syn-a serves
    // no mask envelope (pinned below) and no mask seat — a kind with
    // no envelope is a brick by construction (the qvoice/base live
    // precedent: the owner offers, the scoped-out withholds).
    assert.deepEqual(modifiers.map((m) => m.param_key), ['loras', 'controlnets'])
    assert.ok(!modifiers.some((m) => m.kind === 'mask'), 'no mask seat without its envelope')
    const loras = modifiers[0]!
    assert.equal(loras.kind, 'lora')
    assert.equal(loras.entry, 'option')
    assert.equal(loras.option_key, 'id')
    assert.equal(loras.schema_key, 'loras')
    assert.equal('max_stack' in loras, false)
    // THE PARAM FIELDS ARE THE ENVELOPE'S: the entry carries catalog
    // facts only — its param rows derive client-side off mod_schemas
    assert.equal('fields' in loras, false)
    // THE RESOLVED FACTS ride every option (the hybrid leaf stamps
    // model + preprocessor onto new entries; lora leaves ignore
    // them — additive, never a second wire)
    assert.deepEqual(loras.options, [
      { value: 'l1', label: 'L1', tooltip: 'cat — f.safetensors — runtime catalog', defaults: { strength: 0.8 }, model: 'f.safetensors' },
      { value: 'l2', label: 'l2', tooltip: 'g.safetensors — runtime catalog', defaults: {}, model: 'g.safetensors' },
    ])
    assert.equal('fields' in modifiers[1]!, false)
    // the hybrid entry mode is served (the leaf switches on THIS,
    // never the kind name)
    assert.deepEqual(
      (({ kind, param_key, schema_key, entry, option_key, max_stack, cardinality }) =>
        ({ kind, param_key, schema_key, entry, option_key, max_stack, cardinality }))(
        modifiers[1]!,
      ),
      {
        kind: 'controlnet', param_key: 'controlnets', schema_key: 'controlnet',
        entry: 'hybrid', option_key: 'type', max_stack: 5, cardinality: 'list',
      },
    )
    assert.deepEqual(modifiers[1]!.options, [])
    // THE MOD CONTRACT ENVELOPES ride keyed by pack; mask (family
    // 'other') never boards syn-a — the law by absence (and the seat
    // drops with the envelope — the mirror law, asserted above)
    assert.deepEqual(Object.keys(spec.mod_schemas ?? {}), ['loras', 'controlnet'])
    const groups = spec.features?.variant_groups
    assert.deepEqual(groups, {
      Variant: { label: 'Variant', tooltip: 't', default: 'turbo' },
      Quant: { label: 'Quant' },
    })
  })
})

describe('specBody non-primary envelope', () => {
  test('THE NULL ENVELOPE (service.ts:735/740): a carrier with no toJSON serves null, never a throw', () => {
    // the engine answers `schema = null` when the card's carrier has no
    // toJSON (and the same per pack for an absorbed mod contract), so
    // the served form must ride that null — a malformed envelope
    // refuses, an ABSENT one does not (the client walks mod_schemas
    // and finds no rows to render).
    reset()
    mockState.decls = { 'syn-n': decl({}) }
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-n'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
      })],
    ])
    mockState.svc = svc({ formSchemas: () => ({ schema: null, mods: { loras: null } }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card', service: 'syn-n', model: 'syn-n',
    })
    assert.equal(spec['schema'], null)
    assert.deepEqual(spec['mod_schemas'], { loras: null })
  })
  test('unrouted cells drop when the key is not primary', () => {
    reset()
    mockState.decls = {
      'syn-b': decl({
        // key === decl.id (the registry's own invariant — see mega) —
        // the arm judges cell filtering, never identity drift.
        id: 'syn-b',
        variants: [
          {
            id: 'v',
            label: 'V',
            group: 'Variant',
            route: 'syn-b',
            cells: [
              { quant: 'q-key', label: 'K', route: 'syn-b' },
              { quant: 'q-svc', label: 'S', route: 'syn-b' },
              { quant: 'q-out', label: 'O', route: 'elsewhere' },
            ],
          },
        ],
      }),
    }
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-a'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
      })],
    ])
    mockState.svc = svc({ formSchemas: () => ({ schema: ENVELOPE, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card',
      service: 'syn-a',
      model: 'syn-b',
    })
    const variants = spec.variants ?? []
    assert.deepEqual(
      variants.map((r) => r.id),
      ['v', 'q-key', 'q-svc'],
    )
    assert.equal(spec['layout'], null)
    assert.equal(spec['size'], null)
  })
})

describe('specBody declaration-absent arms', () => {
  test('a declaration without defaults/engine/variants/groups rides the schema', () => {
    reset()
    mockState.decls = { 'syn-n': decl({ engine: undefined }) }
    delete (mockState.decls['syn-n'] as Record<string, unknown>)['engine']
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-n'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
        schemaCarrier: { dict: { d: { meta: { default: 2 } } } },
      })],
    ])
    // the fake seam serves the carrier's own envelope (the real
    // service toJSONs it — schemaCarrier ?? schema)
    const carrier = { uid: 0, refs: { 0: { type: 'object', dict: { d: { meta: { default: 2 } } } } } }
    mockState.svc = svc({ formSchemas: () => ({ schema: carrier, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card',
      service: 'syn-n',
      model: 'syn-n',
    })
    assert.equal(spec['engine'], 'comfyui')
    // schema defaults ride the ENVELOPE (client derives); the family
    // row declares none — model_defaults serves the empty object
    assert.deepEqual(spec['model_defaults'], {})
    assert.equal(spec['schema'], carrier)
    assert.deepEqual(spec['variants'], [])
    assert.deepEqual((spec['features'] as { modifiers: unknown[] }).modifiers, [])
    assert.deepEqual((spec['features'] as { variant_groups: unknown }).variant_groups, {})
  })

  test('stroke 34: the recipes key NEVER rides — the card-recipe emission is dead', () => {
    reset()
    mockState.decls = { 'syn-r': decl({}) }
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-r'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
        schemaCarrier: { dict: {} },
      })],
    ])
    const carrier = { uid: 0, refs: { 0: { type: 'object', dict: {} } } }
    mockState.svc = svc({ formSchemas: () => ({ schema: carrier, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card', service: 'syn-r', model: 'syn-r',
    })
    assert.equal('recipes' in spec, false)
  })

  test('stroke 34: a family row\'s WIRE PAYLOAD rides its served defaults (the macro stamp source)', () => {
    reset()
    mockState.decls = {
      'syn-r': {
        ...decl({}),
        variants: [
          { id: 'realism', label: 'Realism', hint: '', group: 'Recipe', route: '', order: 0,
            resolver_defaults: {}, lane_inputs: {}, wire_defaults: { loras: [{ id: 'cel_shade' }] }, cells: [] },
          { id: 'plain', label: 'Plain', hint: '', group: 'Recipe', route: '', order: 1,
            resolver_defaults: {}, lane_inputs: {}, wire_defaults: null, cells: [] },
        ],
      },
    }
    const defs = new Map<string, CardDefinition>([
      ['syn-card', card({
        boarded: ['syn-r'],
        identity: { label: 'Syn', description: 's', genre: 'image' },
        schemaCarrier: { dict: {} },
      })],
    ])
    const carrier = { uid: 0, refs: { 0: { type: 'object', dict: {} } } }
    mockState.svc = svc({ formSchemas: () => ({ schema: carrier, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card', service: 'syn-r', model: 'syn-r',
    })
    const rows = spec['variants'] as Array<{ id: string; defaults: Record<string, unknown> }>
    // the payload row: the stamp the pill writes at click
    assert.deepEqual(rows.find((r) => r.id === 'realism')!.defaults, { loras: [{ id: 'cel_shade' }] })
    // the stamp-less row stays stamp-less
    assert.deepEqual(rows.find((r) => r.id === 'plain')!.defaults, {})
  })

  test('a declaration-less key rides the envelope verbatim (defaults derive client-side)', () => {
    reset()
    const defs = new Map<string, CardDefinition>([
      ['syn-nodecl', card({
        identity: { label: 'Syn', description: 's', genre: 'image' },
        schemaCarrier: {
          dict: {
            keep: { meta: { default: 1 } },
            falsy: { meta: { default: false } },
            absent: { meta: {} },
            nometa: {},
            undef: undefined,
          },
        },
      })],
    ])
    const carrier = { uid: 0, refs: { 0: { type: 'object', dict: { keep: { meta: { default: 1 } } } } } }
    mockState.svc = svc({ formSchemas: () => ({ schema: carrier, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-nodecl',
      service: 'syn-nodecl',
      model: '__no_decl__',
    })
    // THE LAW (the parameter audit): the body NEVER flattens schema
    // defaults — the envelope rides verbatim and fieldsOf walks the
    // node shapes client-side (pinned in card-base)
    assert.equal(spec['schema'], carrier)
    assert.deepEqual(spec['model_defaults'], {})
    assert.deepEqual((spec['features'] as { variant_groups: unknown }).variant_groups, {})
  })

  test('a function schema with no dict rides empty defaults', () => {
    reset()
    const defs = new Map<string, CardDefinition>([
      ['syn-fn', card({
        identity: { label: 'Syn', description: 's', genre: 'image' },
        schema: (() => ({})) as never,
      })],
    ])
    mockState.svc = svc({ formSchemas: () => ({ schema: ENVELOPE, mods: {} }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-fn',
      service: 'syn-fn',
      model: '__no_decl__',
    })
    // the seam's own toJSON answers ({} for the function-schema
    // fixture); the body adds no walk of its own
    assert.deepEqual(spec['model_defaults'], {})
  })
})

describe('the catalog-fed select stamp (2026-09-21, the freeform-lie kill)', () => {
  /** An envelope carrying one optionsFrom field (default '' — the
   * clearable shape) and one ordinary field (never touched). */
  const env = (): Record<string, unknown> => ({
    uid: 0,
    refs: {
      0: { type: 'object', dict: { refine_lora: 1, prompt: 2 } },
      1: { type: 'string', meta: { description: 'Refine lora', default: '', extra: { wtype: 'select', optionsFrom: 'loras' } } },
      2: { type: 'string', meta: { description: 'Prompt', extra: {} } },
    },
  })
  const rowsSvc = (rows: Array<{ id: string }>) =>
    ({ modCatalog: (pack: string) => (pack === 'loras' ? { rows } : { rows: [] }) }) as never
  const boarded = (packs: string[]) => new Set(packs)

  test('stamps options from the pack\'s LIVE rows — the empty arm first for a clearable default', () => {
    const e = env()
    stampOptionsFrom(e, rowsSvc([{ id: 'h3_taomate_3step' }, { id: 'h3_lightx2v_turbo' }]), 'h3', boarded(['loras']))
    const node = (e.refs as Record<string, { meta: { extra: Record<string, unknown> } }>)['1']
    assert.deepEqual(node.meta.extra.options, [
      { value: '', label: '— none —' },
      { value: 'h3_taomate_3step', label: 'h3_taomate_3step' },
      { value: 'h3_lightx2v_turbo', label: 'h3_lightx2v_turbo' },
    ])
    assert.equal(node.meta.extra.optionsFrom, undefined, 'the hint never rides the served doc')
  })

  test('a non-empty default serves rows only', () => {
    const e = env()
    const node1 = (e.refs as Record<string, { meta: { default: string; extra: Record<string, unknown> } }>)['1']
    node1.meta.default = 'h3_taomate_3step'
    stampOptionsFrom(e, rowsSvc([{ id: 'h3_taomate_3step' }]), 'h3', boarded(['loras']))
    assert.deepEqual(node1.meta.extra.options, [{ value: 'h3_taomate_3step', label: 'h3_taomate_3step' }])
  })

  test('THE REFERENT REFUSAL (T5, 2026-10-12): a pack the envelope does not board refuses loud, naming field, pack, and what IS boarded', () => {
    const e = env()
    // the old law served an empty select and called it honest — the
    // dropdown read "nothing installed" for a misconfigured name.
    // The door now refuses at the sweep, the earliest point where
    // the pack, the field, and the boarded set are all in hand.
    assert.throws(
      () => stampOptionsFrom(e, rowsSvc([]), 'h3', boarded([])),
      /form-spec: field 'refine_lora' names optionsFrom pack 'loras' the h3 envelope does not board \(no packs boarded\)/,
    )
    assert.throws(
      () => stampOptionsFrom(e, rowsSvc([]), 'h3', boarded(['controlnet'])),
      /names optionsFrom pack 'loras' the h3 envelope does not board \(boarded: controlnet\)/,
    )
    // nothing was stamped onto the refusing envelope
    const node = (e.refs as Record<string, { meta: { extra: Record<string, unknown> } }>)['1']
    assert.equal(node.meta.extra.options, undefined)
  })

  test('a provider that throws past a PROVEN referent propagates (never a silent catch)', () => {
    const e = env()
    const throwing = { modCatalog: () => { throw new Error('no pack') } } as never
    assert.throws(
      () => stampOptionsFrom(e, throwing, 'h3', boarded(['loras'])),
      /no pack/,
    )
  })

  test('ordinary fields are untouched; a null-ish envelope is a no-op (never a throw)', () => {
    const e = env()
    stampOptionsFrom(e, rowsSvc([{ id: 'x' }]), 'h3', boarded(['loras']))
    const prompt = (e.refs as Record<string, { meta: { extra: Record<string, unknown> } }>)['2']
    assert.deepEqual(prompt.meta.extra, {}, "a field without the hint never gains options")
    stampOptionsFrom(null, rowsSvc([]), 'x', boarded([]))
    stampOptionsFrom({} as never, rowsSvc([]), 'x', boarded([]))
    // a root with NO dict and a ref id that misses the refs table:
    // both walk arms return/continue, never throw
    stampOptionsFrom({ uid: 0, refs: { 0: { type: 'object' } } } as never, rowsSvc([]), 'x', boarded([]))
    stampOptionsFrom({ uid: 9, refs: { 0: { type: 'object', dict: { a: 1 } } } } as never, rowsSvc([]), 'x', boarded([]))
    stampOptionsFrom({ uid: 0, refs: { 0: { type: 'object', dict: { a: 1 } } } } as never, rowsSvc([]), 'x', boarded([]))
  })
})
