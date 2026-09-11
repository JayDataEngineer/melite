// discovery.ts walls, live plane (vitest, live card defs + live model
// registry; synthetic Maps only for the pure projections
// formsTable/cardSections, which take their defs as an argument):
// key resolution, the forms table law, section shapes, and the live
// door arms.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { loadCardDefs, theService } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-cordis'
import {
  cardSections,
  cardToolsArm,
  catalogSection,
  formsArm,
  formsTable,
  formSpecArm,
  kindsArm,
  kindsDoorArm,
  modelCatalogArm,
  resolveSpecKey,
  specBody,
} from '../src/discovery.ts'

function card(partial: Record<string, unknown>): CardDefinition {
  return partial as unknown as CardDefinition
}

describe('resolveSpecKey', () => {
  test('a card-id alias serves the default family envelope', () => {
    const defs = new Map([
      ['__alias__', card({ boarded: ['fam-default'] })],
      ['__solo__', card({})],
    ])
    assert.deepEqual(resolveSpecKey('__alias__', defs, new Map()), {
      card: '__alias__',
      service: 'fam-default',
      model: 'fam-default',
    })
    // No boarded families: the card IS its own service.
    assert.deepEqual(resolveSpecKey('__solo__', defs, new Map()), {
      card: '__solo__',
      service: '__solo__',
      model: '__solo__',
    })
  })

  test('a self-boarded family resolves to its card', () => {
    assert.deepEqual(
      resolveSpecKey('krea-2', new Map(), new Map([['krea-2', 'image-gen']])),
      { card: 'image-gen', service: 'krea-2', model: 'krea-2' },
    )
  })

  test('a route-owned key rides its owner past a bogus boarding', () => {
    const boarded = new Map([
      ['__bogus__', 'nowhere'],
      ['krea-2', 'image-gen'],
    ])
    assert.deepEqual(resolveSpecKey('krea-2-raw', new Map(), boarded), {
      card: 'image-gen',
      service: 'krea-2',
      model: 'krea-2-raw',
    })
  })

  test('unknown keys resolve to null', () => {
    assert.equal(resolveSpecKey('__no_such_key__', new Map(), new Map()), null)
  })
})

describe('formsTable', () => {
  test('orders by (sidebar order, card id) with door defaults', () => {
    const defs = new Map<string, CardDefinition>([
      ['b-card', card({
        boarded: [],
        identity: { label: 'B', description: 'b', genre: 'image' },
        sidebar: { key: 'image', order: 5, hidden: false },
      })],
      ['a-card', card({
        boarded: ['fam'],
        identity: { label: 'A', description: 'a', genre: 'audio' },
        sidebar: { key: 'audio', order: 5, hidden: true },
      })],
      ['c-card', card({})],
      ['d-card', card({
        boarded: ['f1', 'f2'],
        identity: { label: 'D', description: 'd' },
        sidebar: { key: 'x', order: 'high', hidden: undefined },
      })],
    ])
    const table = formsTable(defs) as Record<string, Record<string, unknown>>
    assert.deepEqual(Object.keys(table), ['c-card', 'd-card', 'a-card', 'b-card'])
    assert.deepEqual(table['c-card'], {
      label: 'c-card',
      genre: '',
      order: 0,
      plugin: 'comfyui',
      sidebar_key: '',
      default_service: 'c-card',
      hidden: false,
      covers: ['c-card'],
    })
    assert.equal(table['d-card']!['order'], 'high')
    assert.deepEqual(table['d-card']!['covers'], ['f1', 'f2'])
    assert.equal(table['d-card']!['default_service'], 'f1')
    assert.equal(table['d-card']!['genre'], '')
    assert.equal(table['a-card']!['hidden'], true)
    assert.equal(table['a-card']!['default_service'], 'fam')
    assert.equal(table['b-card']!['hidden'], false)
  })
})

describe('cardSections', () => {
  test('cards ride boarding, capabilities ride the default family', () => {
    const defs = new Map<string, CardDefinition>([
      ['x', card({
        boarded: ['f'],
        identity: { label: 'X', description: 'xd', genre: 'image', icon: 'I', principles: ['p1'] },
      })],
      ['y', card({
        identity: { label: 'Y', description: 'yd', genre: 'audio' },
      })],
    ])
    const { cards, capabilities } = cardSections(defs) as {
      cards: Record<string, Record<string, unknown>>
      capabilities: Record<string, Record<string, unknown>>
    }
    assert.deepEqual(cards['x'], {
      id: 'x',
      label: 'X',
      description: 'xd',
      genre: 'image',
      families: ['f'],
      principles: ['p1'],
      skills: [],
      has_inference: false,
      has_rubric: false,
    })
    assert.deepEqual((capabilities['x'] as Record<string, unknown>)['resolved'], {
      family: 'f',
      model: 'f',
      params: {},
    })
    assert.equal((capabilities['x'] as Record<string, unknown>)['icon'], 'I')
    assert.deepEqual((cards['y'] as Record<string, unknown>)['families'], ['y'])
    assert.equal((capabilities['y'] as Record<string, unknown>)['default_family'], 'y')
    assert.equal((capabilities['y'] as Record<string, unknown>)['icon'], '')
  })

  test('an identity-less card refuses loud', () => {
    assert.throws(
      () => cardSections(new Map([['bad', card({})]])),
      /catalog: card 'bad' declares no identity/,
    )
  })
})

describe('live door arms', () => {
  test('kindsArm projects the kind table in order', async () => {
    const kinds = kindsArm() as { kinds: Array<Record<string, unknown>> }
    assert.ok(kinds.kinds.length >= 7)
    assert.deepEqual(Object.keys(kinds.kinds[0]!).sort(), [
      'badgeTone',
      'compound',
      'executable',
      'formSpec',
      'kind',
      'opensStudio',
      'runnable',
    ])
    assert.deepEqual((await kindsDoorArm()).kinds, kinds.kinds)
  })

  test('modelCatalogArm serves all five sections live', async () => {
    const defs = await loadCardDefs()
    const section = catalogSection(defs) as Record<string, unknown>
    assert.deepEqual(
      Object.keys(section).sort(),
      ['capabilities', 'cards', 'families', 'input_vocabulary', 'models'],
    )
    assert.ok(Object.keys(section['models'] as object).length > 50)
    assert.deepEqual((await modelCatalogArm())['models'], section['models'])
  })

  test('formsArm serves the live table (sort law pinned synthetically)', async () => {
    const table = (await formsArm()) as Record<string, Record<string, unknown>>
    assert.ok('tts' in table)
    assert.ok('mask-studio' in table)
    assert.equal(table['tts']!['plugin'], 'comfyui')
    assert.equal(typeof table['tts']!['order'], 'number')
  })

  test('cardToolsArm serves one manifest per card, model-first', async () => {
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    const defs = await loadCardDefs()
    assert.equal(tools.length, defs.size)
    assert.deepEqual(tools.map((t) => t['name']), [...defs.keys()].sort())
    const tts = tools.find((t) => t['name'] === 'tts')!
    assert.equal(tts['model'], 'qwen3-tts')
    assert.deepEqual(tts['families'], ['qwen3-tts', 'qwen3-tts-base'])
    assert.ok(typeof tts['params_schema'] === 'object')
  })

  test('formSpecArm serves the tts envelope for its default family', async () => {
    const spec = (await formSpecArm('tts')) as Record<string, unknown>
    assert.equal(spec['form'], 'tts')
    assert.equal(spec['service'], 'qwen3-tts')
    assert.equal(spec['model'], 'qwen3-tts')
    assert.deepEqual(Object.keys(spec).sort(), [
      'contract',
      'defaults',
      'engine',
      'enhance_prompt',
      'enhance_prompts',
      'features',
      'fields',
      'form',
      'genre',
      'guide',
      'label',
      'layout',
      'loader_info',
      'model',
      'schema_groups',
      'service',
      'size',
      'variants',
    ])
  })

  test('formSpecArm serves the card-only mask-studio envelope', async () => {
    const spec = (await formSpecArm('mask-studio')) as Record<string, unknown>
    assert.equal(spec['form'], 'mask-studio')
    assert.equal(spec['service'], 'mask-studio')
    assert.deepEqual(spec['variants'], [])
    assert.deepEqual((spec['features'] as { modifiers: unknown[] }).modifiers, [])
  })

  test('formSpecArm 404s unknown keys as null', async () => {
    assert.equal(await formSpecArm('__no_such_key__'), null)
  })

  test('specBody refuses unknown cards, identity-less cards, and null fragments', async () => {
    const svc = theService()
    const defs = await loadCardDefs()
    const res = { card: 'tts', service: 'qwen3-tts', model: 'qwen3-tts' }
    assert.throws(
      () => specBody(svc, new Map(), { card: '__no__', service: 's', model: 'm' }),
      /form-spec: unknown card '__no__'/,
    )
    assert.throws(
      () => specBody(svc, new Map([['bad', card({})]]), { card: 'bad', service: 's', model: 'm' }),
      /form-spec: card 'bad' declares no identity/,
    )
    assert.throws(
      () =>
        specBody({ formSpec: () => null } as never, defs, res),
      /form-spec: card 'tts' unknown/,
    )
  })
})
