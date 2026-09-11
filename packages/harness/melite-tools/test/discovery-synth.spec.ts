// discovery.ts synthetic walls (vitest, the model registry + card
// defs + service scripted — the live registry carries no quantless,
// hidden, routeless, dup-quant, unoffered, or unboarded cells, so
// the envelope's filter arms ride synthetic DECLs; live truth stays
// in discovery.spec.ts).
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'

const mockState = vi.hoisted(() => ({
  decls: {} as Record<string, Record<string, unknown>>,
  defs: new Map() as Map<string, unknown>,
  svc: null as null | Record<string, unknown>,
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

import type { CardDefinition, ComfyUIService } from '@melite/comfyui-cordis'
import { cardToolsArm, formSpecArm, resolveSpecKey, specBody } from '../src/discovery.ts'

function card(partial: Record<string, unknown>): CardDefinition {
  return partial as unknown as CardDefinition
}

function svc(partial: Record<string, unknown>): ComfyUIService {
  return partial as unknown as ComfyUIService
}

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
    mockState.svc = svc({ formSpec: () => ({ fields: [], schema_groups: [] }) })
    const spec = (await formSpecArm('syn-fam')) as Record<string, unknown>
    assert.equal(spec['form'], 'card-a')
    assert.equal(spec['service'], 'syn-fam')
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
    assert.equal(tools[0]!['model'], 'bare')
    assert.deepEqual(tools[0]!['families'], ['bare'])
  })
})

describe('specBody primary envelope', () => {
  function mega(): { defs: Map<string, CardDefinition>; res: { card: string; service: string; model: string } } {
    reset()
    mockState.decls = {
      'syn-a': decl({
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
              { quant: '', label: 'Empty', route: 'syn-a' },
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
      formSpec: () => ({
        fields: [{ name: 'prompt' }],
        schema_groups: [
          { id: 'g-lora', fields: [{ name: 'loras' }, { name: 'strength' }] },
          { id: 'g-other', fields: [{ name: 'x' }] },
        ],
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

  test('variants filter, dedupe, and label every cell', () => {
    const { defs, res } = mega()
    const spec = specBody(mockState.svc as ComfyUIService, defs, res) as Record<string, unknown>
    assert.equal(spec['engine'], 'custom-engine')
    assert.deepEqual(spec['defaults'], { strength: 3 })
    assert.equal(spec['layout'], 'studio')
    assert.equal(spec['size'], 'huge')
    const variants = spec['variants'] as Array<Record<string, unknown>>
    assert.deepEqual(variants.map((r) => r['id']), [
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
      quant: null,
      vram_peak_gb: null,
      owner: '',
    })
  })

  test('modifiers scope packs, absorb fields, and tooltip options', () => {
    const { defs, res } = mega()
    const spec = specBody(mockState.svc as ComfyUIService, defs, res) as Record<string, unknown>
    const modifiers = (spec['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    assert.deepEqual(modifiers.map((m) => m['param_key']), ['loras', 'controlnet', 'mask'])
    const loras = modifiers[0]!
    assert.equal(loras['kind'], 'lora')
    assert.equal('max_stack' in loras, false)
    assert.deepEqual(loras['fields'], [{ name: 'strength' }])
    assert.deepEqual(loras['options'], [
      { value: 'l1', label: 'L1', tooltip: 'cat — f.safetensors — runtime catalog', defaults: { strength: 0.8 } },
      { value: 'l2', label: 'l2', tooltip: 'g.safetensors — runtime catalog', defaults: {} },
    ])
    assert.deepEqual(modifiers[1]!['fields'], [])
    assert.equal(modifiers[2]!['max_stack'], 1)
    assert.deepEqual(modifiers[2]!['options'], [
      { value: 'm1', label: 'M1', tooltip: 'm.safetensors', defaults: {} },
    ])
    const groups = (spec['features'] as { variant_groups: Record<string, unknown> }).variant_groups
    assert.deepEqual(groups, {
      Variant: { label: 'Variant', tooltip: 't', default: 'turbo' },
      Quant: { label: 'Quant' },
    })
  })
})

describe('specBody non-primary envelope', () => {
  test('unrouted cells drop when the key is not primary', () => {
    reset()
    mockState.decls = {
      'syn-b': decl({
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
    mockState.svc = svc({ formSpec: () => ({ fields: [], schema_groups: [] }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card',
      service: 'syn-a',
      model: 'syn-b',
    }) as Record<string, unknown>
    const variants = spec['variants'] as Array<Record<string, unknown>>
    assert.deepEqual(
      variants.map((r) => r['id']),
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
    mockState.svc = svc({ formSpec: () => ({ fields: [], schema_groups: [] }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-card',
      service: 'syn-n',
      model: 'syn-n',
    }) as Record<string, unknown>
    assert.equal(spec['engine'], 'comfyui')
    assert.deepEqual(spec['defaults'], { d: 2 })
    assert.deepEqual(spec['variants'], [])
    assert.deepEqual((spec['features'] as { modifiers: unknown[] }).modifiers, [])
    assert.deepEqual((spec['features'] as { variant_groups: unknown }).variant_groups, {})
  })

  test('a declaration-less key rides schema defaults, all node shapes', () => {
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
    mockState.svc = svc({ formSpec: () => ({ fields: [], schema_groups: [] }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-nodecl',
      service: 'syn-nodecl',
      model: '__no_decl__',
    }) as Record<string, unknown>
    assert.deepEqual(spec['defaults'], { keep: 1, falsy: false })
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
    mockState.svc = svc({ formSpec: () => ({ fields: [], schema_groups: [] }) })
    const spec = specBody(mockState.svc as ComfyUIService, defs, {
      card: 'syn-fn',
      service: 'syn-fn',
      model: '__no_decl__',
    }) as Record<string, unknown>
    assert.deepEqual(spec['defaults'], {})
  })
})
