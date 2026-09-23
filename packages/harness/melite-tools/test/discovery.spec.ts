// discovery.ts walls, live plane (vitest, live card defs + live model
// registry; synthetic Maps only for the pure projections
// formsTable/cardSections, which take their defs as an argument):
// key resolution, the forms table law, section shapes, and the live
// door arms.
import { agentFormDoc } from '@melite/engine-agent'
import { craftFormDoc } from '@melite/engine-craft'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { loadCardDefs, theService } from '@melite/comfyui-cordis'

/** The OLD tree's served-spec fixtures — the byte referee for recipe
 *  composition (infer-baseline-tmp sits beside this repo). */
const OLD_FIXTURES = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../infer-baseline-tmp/web/editor/src/__tests__/fixtures',
)
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

/** THE TRANSIENT-GENRE RACE (stroke 83): enhance-recipes.spec
 * (comfyui-cordis) lays EPHEMERAL zz-cov-<pid> genres under the
 * real models root — its error arms are INTENTIONALLY broken
 * SKILL.md files, and a parallel worker's sweep here can catch one
 * mid-flight (the fixture's finally owns the removal; only a
 * CONCURRENT run can ever see it). Bounded retry on exactly that
 * scratch signature; any real tree fault fails untouched. */
const formSpecSweep = async (...args: Parameters<typeof formSpecArm>): Promise<ReturnType<typeof formSpecArm>> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await formSpecArm(...args)
    } catch (error) {
      if (attempt >= 4 || !/zz-cov-\d+/.test(String(error))) throw error
      await new Promise((r): void => setTimeout(r, 200))
    }
  }
}

function card(partial: Record<string, unknown>): CardDefinition {
  // THE EVERY-CARD-DECLARES LAW: real cards all carry flowKinds (the
  // loadCardDefs wall); fixtures mimic real cards — the edge emission
  // reads the declaration strictly, so fixtures declare edges too.
  return {
    flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
    ...partial,
  } as unknown as CardDefinition
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
        flowKinds: { inputs: { prompt: 'text', input_image: 'image' }, outputs: { default: 'image' }, requiresModel: true },
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
      // THE EDGE EMISSION on the meta table (2026-09-12): the
      // declared edges are card meta — {} for an edgeless fixture.
      inputs: {},
      outputs: {},
    })
    // a declared card's edges serve verbatim (the kind-matching half)
    const aInputs = table['a-card']!['inputs']
    assert.deepEqual(aInputs, { prompt: 'text', input_image: 'image' })
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
      ['capabilities', 'cards', 'families', 'models'],
    )
    assert.ok(Object.keys(section['models'] as object).length > 50)
    assert.deepEqual((await modelCatalogArm())['models'], section['models'])
  })

  test('formsArm serves the live table (sort law pinned synthetically)', async () => {
    const table = (await formsArm()) as Record<string, Record<string, unknown>>
    assert.ok('tts' in table)
    assert.ok('mask' in table, 'the mask surface serves (the studio retired at parity, stroke 75)')
    assert.equal('mask-studio' in table, false, 'the studio row is GONE (CONTRACT D)')
    assert.equal(table['tts']!['plugin'], 'comfyui')
    assert.equal(typeof table['tts']!['order'], 'number')
  })

  test('cardToolsArm serves one manifest per card, model-first', async () => {
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    const defs = await loadCardDefs()
    assert.equal(tools.length, defs.size)
    assert.deepEqual(tools.map((t) => t['name']), [...defs.keys()].sort())
    const tts = tools.find((t) => t['name'] === 'tts')!
    // THE LARGE DEFAULT (operator 2026-09-23): boarded[0] = the 1.7B
    // family — the manifest's default model + family order lead large.
    // The Base compose address rides last (qvoice across ALL
    // qwen3-tts — the offer serves atoms + the clone route).
    assert.equal(tts['model'], 'qwen3-tts-voicedesign')
    assert.deepEqual(tts['families'], ['qwen3-tts-voicedesign', 'qwen3-tts', 'qwen3-tts-base'])
    assert.ok(typeof tts['params_schema'] === 'object')
  })

  test('cardToolsArm serves the MODS beside params_schema (stroke 79 — the agent contract)', async () => {
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    const mask = tools.find((t) => t['name'] === 'mask')!
    // the same kinds the UI form-spec serves — kind + category +
    // field names; leaf_face never rides (agents compose values,
    // never faces)
    assert.deepEqual((mask['modifiers'] as Array<Record<string, unknown>>).map((m) => [m['kind'], m['category']]), [
      ['sam3', 'standalone'],
      ['sam2', 'standalone'],
      ['draw', 'ordered'],
    ])
    const sam3 = (mask['modifiers'] as Array<Record<string, unknown>>)[0]!
    assert.ok((sam3['fields'] as string[]).includes('prompt'), 'the field names ride')
    assert.equal('leaf_face' in sam3, false, 'leaf_face is a UI concern — never rides')
    // kindless cards serve NO modifiers key (never an empty array)
    const tts = tools.find((t) => t['name'] === 'tts')!
    assert.equal('modifiers' in tts, false)
  })

  test('cardToolsArm stamps every face with the serving tree version (F-7)', async () => {
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    assert.ok(tools.length > 0)
    for (const t of tools) {
      assert.equal(typeof t['face_stamp'], 'string', `${t['name']} carries the stamp`)
      assert.ok((t['face_stamp'] as string).length > 0, `${t['name']} never stamps empty`)
    }
  })

  test('the stamp IS the disk HEAD — a stale module fails this (F-7 mismatch drill)', async () => {
    const { execFileSync } = await import('node:child_process')
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
    const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
    const want = porcelain !== '' ? `${head}+dirty` : head
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    const h3 = tools.find((t) => t['name'] === 'h3-timeline')!
    assert.equal(h3['face_stamp'], want, 'the served face names the tree it was emitted from')
  })

  test('formSpecArm serves the tts envelope for its default family', async () => {
    const spec = (await formSpecSweep('tts')) as Record<string, unknown>
    assert.equal(spec['form'], 'tts')
    // THE LARGE DEFAULT (operator 2026-09-23): the unstated model
    // resolves the 1.7B family.
    assert.equal(spec['service'], 'qwen3-tts-voicedesign')
    assert.equal(spec['model'], 'qwen3-tts-voicedesign')
    assert.deepEqual(Object.keys(spec).sort(), [
      'contract',
      'engine',
      'enhance_prompt',
      'enhance_prompts',
      'families',
      'features',
      'form',
      'genre',
      'guide',
      'inputs',
      'label',
      'layout',
      'loader_info',
      'mod_schemas',
      'model',
      'model_defaults',
      'outputs',
      'packs',
      'schema',
      'service',
      'size',
      'variants',
    ])
    // THE ENVELOPE (the parameter audit): the schema is the card's
    // own toJSON — uid + refs; flat rows never ride
    const env = spec['schema'] as { uid?: unknown; refs?: unknown }
    assert.equal(typeof env['uid'], 'number')
    assert.equal(typeof env['refs'], 'object')
    assert.equal('fields' in spec, false)
    assert.equal('schema_groups' in spec, false)
    assert.equal('defaults' in spec, false)
  })

  test('formSpecArm serves the card-only mask envelope (the studio retired at parity, stroke 75)', async () => {
    const spec = (await formSpecSweep('mask')) as Record<string, unknown>
    assert.equal(spec['form'], 'mask')
    assert.equal(spec['service'], 'mask')
    assert.deepEqual(spec['variants'], [])
    // the card-declared kinds serve on the ONE modifiers channel
    // (stroke 78: the three-kind reshape — sam3/sam2/draw)
    assert.deepEqual(
      ((spec['features'] as { modifiers: unknown[] }).modifiers as Array<{ kind: string }>).map((m) => m.kind),
      ['sam3', 'sam2', 'draw'],
    )
    // stroke 78: the CATEGORY serves VERBATIM (standalone vs
    // ordered — the section's drag law reads it, never the kind
    // name)
    const mods = (spec['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    assert.deepEqual(mods.map((m) => m['category']), ['standalone', 'standalone', 'ordered'])
    // stroke 76: the paint leaf face serves VERBATIM on the
    // declared kind — the section offers the brush only on this row
    const paint = mods.find((m) => m.kind === 'draw')
    assert.equal(paint?.['leaf_face'], 'paint-canvas')
    // stroke 78: the bbox face rides sam3's region canvas
    assert.equal(mods.find((m) => m.kind === 'sam3')?.['leaf_face'], 'bbox-canvas')
    // THE UNIFIED CARD (the operator's final word, 2026-10-08):
    // BOTH detector kinds carry the image-preview canvas
    assert.equal(mods.find((m) => m.kind === 'sam2')?.['leaf_face'], 'bbox-canvas')
    // the SECTION captions: the twins — only the selector word differs
    assert.ok(String(mods.find((m) => m.kind === 'sam2')?.['section']).startsWith('Bbox filter — the class dropdown'))
    assert.ok(String(mods.find((m) => m.kind === 'sam3')?.['section']).startsWith('Bbox filter — the freetext prompt'))
    assert.equal(mods.find((m) => m.kind === 'draw')?.['section'], undefined)
    // the SAM2 law (2026-09-19 — declared, then auto provisioned):
    // the sam2 kind's pack requirements serve VERBATIM (the compose
    // door enforces them only when the bag is non-empty)
    assert.deepEqual(mods.find((m) => m.kind === 'sam2')?.['requires'], ['comfyui-impact-pack', 'comfyui-impact-subpack'])
    assert.equal('requires' in (mods.find((m) => m.kind === 'sam3') ?? {}), false, 'sam3 declares no packs — the core lane never gates')
    // stroke 34: the recipes key never rides — the layer is dead
    assert.equal('recipes' in spec, false)
  })

  test('formSpecArm serves image-gen with NO recipe catalog (stroke 34 — the layer is dead)', async () => {
    const spec = (await formSpecSweep('image-gen')) as Record<string, unknown>
    assert.equal('recipes' in spec, false)
    // the macro payload rides the FAMILY row instead: krea-2's
    // realism row serves its lora stamp in the variant defaults
    const rows = spec['variants'] as Array<{ id: string; group: string; defaults: Record<string, unknown> }>
    const realism = rows.find((r) => r.id === 'realism')
    assert.ok(realism, 'the realism row serves')
    assert.deepEqual(realism!.defaults, { loras: [{ id: 'krea2_realism_lora' }] })
    // the stamp-less family default stays stamp-less
    const dflt = rows.find((r) => r.group === 'Recipe' && r.id === 'default')
    assert.deepEqual(dflt!.defaults, {})
  })

  test('formSpecArm 404s unknown keys as null', async () => {
    assert.equal(await formSpecSweep('__no_such_key__'), null)
  })

  test('specBody primary falls to the card itself when no family boards (and nameless fields never join reqOf)', async () => {
    const svc = theService()
    // solo card: no boarded families → primary compares res.card;
    // formSpec fragment carries one named required field and one
    // NAMELESS field (the reqOf skip arm)
    const defs = new Map([['__solo2__', card({
      identity: { label: 'Solo', description: 'solo card', genre: 'image' },
      flowKinds: { inputs: { frame: 'image', seed: 'int' }, outputs: { default: 'image' }, requiresModel: false },
    })]])
    const realFormSchemas = svc.formSchemas.bind(svc)
    const fakeSvc = {
      // THE NEW SEAM: one call carries the card schema + mod
      // envelopes; the solo fixture serves a dict whose nodes carry
      // junk shapes — the reqOf walk is client-side now (fieldsOf),
      // so the junk rides verbatim and never names an input row
      formSchemas: (c: string, key: string): unknown => {
        if (c !== '__solo2__') return realFormSchemas(c, key)
        return {
          schema: {
            uid: 0,
            refs: {
              0: { type: 'object', dict: {
                frame: 1,
                7: 2, // nameless junk key — rides verbatim
                junk: 'not-even-a-node',
              } },
              1: { type: 'image' },
              2: { type: 'int' },
            },
          },
          mods: {},
        }
      },
      modCatalog: (pack: string, key: string): unknown => realFormSchemas('__solo2__', key) === null ? { shared: false, rows: [] } : { shared: false, rows: [] },
      cardModFields: (): unknown[] => [],
      // packPresence (stroke 18): the solo fake carries no engine
      // facts — unknown marks, the honest serve
      packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
        packs.map((id) => ({ id, present: null })),
    } as unknown as ReturnType<typeof theService>
    const body = specBody(fakeSvc, defs, { card: '__solo2__', service: '__solo2__', model: '__solo2__' })
    // PRIMARY via the card arm (boarded empty — res.card === key):
    // no decl → no variants (empty, never null)
    assert.equal(JSON.stringify(body['variants']), '[]')
    // THE REQUIRED JOIN MOVED CLIENT-SIDE (the parameter audit): the
    // edge rows serve the DECLARED edges only — required facts ride
    // the schema envelope's own nodes (fieldsOf walks them)
    const inputs = body['inputs'] as Array<Record<string, unknown>>
    assert.equal(JSON.stringify(inputs.find((i) => i['name'] === 'frame')), '{"name":"frame","kind":"image"}')
    assert.equal(JSON.stringify(inputs.find((i) => i['name'] === 'seed')), '{"name":"seed","kind":"int"}')
    // nameless junk rides the ENVELOPE verbatim (nothing drops) — but
    // no input row ever names it
    const dict = ((body['schema'] as { refs: Record<string, { dict?: Record<string, unknown> }> }).refs['0']!.dict)
    assert.deepEqual(Object.keys(dict!).sort(), ['7', 'frame', 'junk'])
    assert.equal(inputs.some((i) => i['name'] === 7 || i['name'] === undefined), false)
    assert.equal('fields' in body, false)
  })

  test('specBody serves card-declared mod kinds VERBATIM on the one modifiers channel (stroke 63)', async () => {
    const svc = theService()
    // CONTRACT A (docs/design/mods-contracts.md): the card's own
    // action kinds ride features.modifiers beside pack kinds — no
    // family DECL, no mod_schemas envelope; fields/kindFields/
    // options ARE the schema (the entry is the schema).
    const defs = new Map([['__maskform__', card({
      identity: { label: 'Mask Form', description: 'mask sources as mods', genre: 'image' },
      flowKinds: { inputs: { input_image: 'image' }, outputs: { default: 'seg' }, requiresModel: false },
      mods: [
        { kind: 'mask_detect', label: 'Detect', param_key: 'mask_detect', cardinality: 'list', max_stack: 3, category: 'standalone',
          fields: [
            { name: 'primary_class', label: 'Class', type: 'string', default: 'person' },
            { name: 'sam_threshold', label: 'Threshold', type: 'number', default: 0.93 },
          ] },
        { kind: 'mask_parts', label: 'Parts', param_key: 'mask_parts', cardinality: 'list', entry: 'option',
          options: [{ value: 'face', label: 'Face' }, { value: 'hands', label: 'Hands' }] },
      ],
    })]])
    const realFormSchemas = svc.formSchemas.bind(svc)
    const fakeSvc = {
      formSchemas: (c: string, key: string): unknown => {
        if (c !== '__maskform__') return realFormSchemas(c, key)
        return {
          schema: { uid: 0, refs: { 0: { type: 'object', dict: { input_image: 1 } }, 1: { type: 'image' } } },
          mods: {},
        }
      },
      modCatalog: (): unknown => ({ shared: false, rows: [] }),
      cardModFields: (): unknown[] => [],
      packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
        packs.map((id) => ({ id, present: null })),
    } as unknown as ReturnType<typeof theService>
    const body = specBody(fakeSvc, defs, { card: '__maskform__', service: '__maskform__', model: '__maskform__' })
    const kinds = (body['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    assert.equal(kinds.length, 2, 'both card-declared kinds serve')
    const detect = kinds.find((k) => k['kind'] === 'mask_detect')
    assert.ok(detect !== undefined, 'the field kind serves')
    assert.equal(detect['param_key'], 'mask_detect')
    assert.equal(detect['max_stack'], 3)
    assert.equal(detect['entry'], undefined, 'field mode is the absent-entry default')
    assert.equal(detect['category'], 'standalone', 'stroke 78: the category serves VERBATIM (absent = ordered default)')
    assert.equal(JSON.stringify(detect['fields']), JSON.stringify([
      { name: 'primary_class', label: 'Class', type: 'string', default: 'person' },
      { name: 'sam_threshold', label: 'Threshold', type: 'number', default: 0.93 },
    ]), 'fields ride VERBATIM — the entry is the schema')
    const parts = kinds.find((k) => k['kind'] === 'mask_parts')
    assert.ok(parts !== undefined, 'the option kind serves')
    assert.equal(parts['entry'], 'option')
    assert.equal(parts['category'], undefined, 'a category-less kind serves NO category row (ordered is the default, never spelled)')
    assert.equal(JSON.stringify(parts['options']), JSON.stringify([
      { value: 'face', label: 'Face' }, { value: 'hands', label: 'Hands' },
    ]), 'static catalog rows ride verbatim (the card IS the catalog)')
  })

  test('specBody serves the full card-kind face VERBATIM (option_key + scalar_key + kindFields)', async () => {
    const svc = theService()
    // The stroke-63 entry arms the __maskform__ wall never takes: a
    // card-declared kind naming its option contract, its scalar, and
    // its per-kind fields — every field rides verbatim.
    const defs = new Map([['__kindfull__', card({
      identity: { label: 'Full', description: 'the full kind face', genre: 'image' },
      flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
      mods: [{
        kind: 'pick', label: 'Pick', param_key: 'pick', cardinality: 'single',
        entry: 'option', option_key: 'id', scalar_key: 'strength', max_stack: 2,
        kindFields: { id: { type: 'string' } },
        fields: [{ name: 'x' }],
        options: [{ value: 'a', label: 'A' }],
      }],
    })]])
    const fakeSvc = {
      formSchemas: (): unknown => ({
        schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } },
        mods: {},
      }),
      modCatalog: (): unknown => ({ shared: false, rows: [] }),
      cardModFields: (): unknown[] => [],
      packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
        packs.map((id) => ({ id, present: null })),
    } as unknown as ReturnType<typeof theService>
    const body = specBody(fakeSvc, defs, { card: '__kindfull__', service: '__kindfull__', model: '__kindfull__' })
    const kinds = (body['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    assert.equal(kinds.length, 1)
    assert.deepEqual(kinds[0], {
      kind: 'pick', label: 'Pick', param_key: 'pick', cardinality: 'single',
      entry: 'option', option_key: 'id', scalar_key: 'strength', max_stack: 2,
      fields: [{ name: 'x' }],
      kindFields: { id: { type: 'string' } },
      options: [{ value: 'a', label: 'A' }],
    })
  })

  test('specBody refuses a malformed card-declared mod kind LOUD (never a half-rendered row)', async () => {
    const svc = theService()
    const defs = new Map([['__badmod__', card({
      identity: { label: 'Bad', description: 'malformed kind', genre: 'image' },
      flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
      mods: [{ kind: 'x', label: 'X', cardinality: 'list' }] as never,
    })]])
    const realFormSchemas = svc.formSchemas.bind(svc)
    const fakeSvc = {
      formSchemas: (c: string, key: string): unknown => {
        if (c !== '__badmod__') return realFormSchemas(c, key)
        return { schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } }, mods: {} }
      },
      modCatalog: (): unknown => ({ shared: false, rows: [] }),
      cardModFields: (): unknown[] => [],
      packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
        packs.map((id) => ({ id, present: null })),
    } as unknown as ReturnType<typeof theService>
    assert.throws(
      () => specBody(fakeSvc, defs, { card: '__badmod__', service: '__badmod__', model: '__badmod__' }),
      /malformed mod kind/,
    )
  })

  test('specBody serves the preview claims verbatim (gap 4 — the h3 family claims the bar; others serve nothing)', async () => {
    const defs = await loadCardDefs()
    const h3 = await formSpecSweep('h3') // the checkpoint id (survivor-id correction 2026-09-22; was h3-timeline)
    assert.ok(h3 !== null)
    assert.deepEqual(h3['preview'], { historyStrip: false }, 'the claim serves verbatim')
    const gen = await formSpecSweep('image-gen')
    assert.ok(gen !== null)
    assert.equal(gen['preview'], undefined, 'absent claim = strip ON (the default, no key served)')
  })

  // ── STEPS APPLIED (2026-09-18, the operator's plaguekind law): a
  // distill row's married step count serves in the option defaults —
  // boarding stamps {strength, steps} onto the entry. ──
  test('the h3 loras options serve their distill step counts (strength + steps in the defaults)', async () => {
    const spec = (await formSpecSweep('h3')) as Record<string, unknown>
    assert.ok(spec !== null)
    const modifiers = (spec['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    const lora = modifiers.find((m) => m['kind'] === 'lora')
    assert.ok(lora !== undefined, 'the loras pack serves on the h3 family')
    // THE MARRIAGE DECLARATION (#36, the recipes rework): the kind
    // serves the knob marriage VERBATIM from the family DECL — the
    // client resolver mirrors compose (lora steps > steps row,
    // Math.max) so the face shows what the film runs.
    assert.deepEqual(lora!['marries'], { steps: 'max' }, 'the loras kind declares the steps marriage (max aggregation)')
    const opts = lora!['options'] as Array<Record<string, unknown>>
    const dareties = opts.find((o) => o['value'] === 'h3_lightx2v_dareties')
    const turbo = opts.find((o) => o['value'] === 'h3_lightx2v_turbo')
    assert.ok(dareties !== undefined && turbo !== undefined, 'both distill rows serve')
    assert.deepEqual(dareties!['defaults'], { strength: 0.8, steps: 4 }, 'dareties v4: a four-step distill (fixed point); strength 0.8 per the operator 2026-09-21 (silveroxides\u2019 documented solo range 0.6\u20130.8)')
    assert.deepEqual(turbo!['defaults'], { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 }, 'turbo 4-8: the married default rides WITH its declared range')
    // ── THE CATALOG EXPANSION (2026-09-20, operator: "add multiple
    // loras and let the user choose"): the official lightx2v turbos
    // + the Kijai Acc adapters serve as user picks — strength 1 per
    // Comfy-Org's own t2v/i2v/r2v templates, steps married. ──
    const turbo8 = opts.find((o) => o['value'] === 'h3_turbo8_v1')
    const acc8 = opts.find((o) => o['value'] === 'h3_acc8_fl2va')
    assert.ok(turbo8 !== undefined && acc8 !== undefined, 'the expansion rows serve on the picker')
    assert.deepEqual(turbo8!['defaults'], { strength: 1, steps: 8 }, 'official 8-step v1.0: full strength (the template operating point)')
    assert.deepEqual(acc8!['defaults'], { strength: 1, steps: 8 }, 'Kijai Acc 8-Step: designed at full strength')
    // ── THE ARENA ROWS (the 15k-vote leaderboard + authors' READMEs):
    // larryvrh #1 at 6 steps strength 1 (his README: "6–8 steps,
    // where v4 looks its best"); Parasyte #2 at the author's 1.5
    // strength / 8 steps (a strength-2 contract, not a typo);
    // TaoMate the refiner instrument (0.7 / 3 steps). ──
    const larry = opts.find((o) => o['value'] === 'h3_larryvrh_v4_ema')
    const para = opts.find((o) => o['value'] === 'h3_pk_parasyte')
    const tao = opts.find((o) => o['value'] === 'h3_taomate_3step')
    assert.ok(larry !== undefined && para !== undefined && tao !== undefined, 'the arena rows serve on the picker')
    assert.deepEqual(larry!['defaults'], { strength: 1, steps: 6, steps_min: 4, steps_max: 8 }, 'larryvrh v4-600 EMA: the crowd #1, 6 steps per README')
    assert.deepEqual(para!['defaults'], { strength: 1.5, steps: 8, steps_min: 6, steps_max: 8 }, 'Parasyte: the author rec — 1.5 str / 8 steps / er_sde beta57')
    assert.deepEqual(tao!['defaults'], { strength: 0.7, steps: 3 }, 'TaoMate: the refiner operating point (0.7 over 3 closing steps)')
  })

  test("formSpecArm serves the AGENT ENGINE doc from the declared contract (stroke 66 — the census rides LIVE)", async () => {
    const docs = new Map([['agent', () => agentFormDoc({
      mcps: [{ value: 'blender', label: 'blender' }],
      skills: [{ value: 'card:mask', label: 'Mask Form' }],
    })]])
    const doc = await formSpecSweep('agent', docs)
    assert.ok(doc !== null, 'the engine id resolves')
    assert.equal(doc['form'], 'agent')
    assert.equal(doc['engine'], 'agent')
    const kinds = (doc['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    assert.deepEqual(kinds.map((k) => k['param_key']), ['mcps', 'skills', 'inputs'])
    const mcps = kinds[0]!['fields'] as Array<{ options: Array<{ value: string }> }>
    assert.deepEqual(mcps[0]!.options, [{ value: 'blender', label: 'blender' }])
    const skills = kinds[1]!['fields'] as Array<{ options: Array<{ value: string }> }>
    assert.deepEqual(skills[0]!.options, [{ value: 'card:mask', label: 'Mask Form' }])
  })

  test('formSpecArm refuses unknown keys as before (the engine arm does not widen resolution)', async () => {
    const doc = await formSpecSweep('__no_such_engine__', new Map())
    assert.equal(doc, null)
  })

  test('formSpecArm serves the CRAFT ENGINE doc from its declared contract (stroke 69 — the card-seam completion)', async () => {
    const docs = new Map([['craft', () => craftFormDoc()]])
    const doc = await formSpecSweep('craft', docs)
    assert.ok(doc !== null, 'the engine id resolves')
    assert.equal(doc['form'], 'craft')
    assert.deepEqual((doc['features'] as { modifiers: unknown[] }).modifiers, [], 'craft has no bags — the four fields ride flat')
    const env = doc['schema'] as { uid: number; refs: Record<string, { type: string; dict?: Record<string, number> }> }
    const root = env.refs[String(env.uid)]!
    assert.deepEqual(Object.keys(root.dict!).sort(), ['agent_prompt', 'command', 'max_iterations', 'model'])
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
        specBody({ formSchemas: () => null } as never, defs, res),
      /form-spec: card 'tts' unknown/,
    )
  })
})

  // ── THE RECIPE SEAT (hour 24 stroke 10): the form-spec serves the
  //    model's prompt-enhance SKILL.md, composed with the old
  //    composer's grammar ─────────────────────────────────────────
  test('formSpecArm serves krea-2 the composed prompt-enhance recipe (byte referee: the old served fixture)', async () => {
    const spec = (await formSpecSweep('krea-2')) as { enhance_prompts?: Record<string, unknown> }
    const served = spec.enhance_prompts?.['prompt']
    assert.equal(typeof served, 'string')
    // the composition grammar is pinned by the OLD tree's served spec
    // fixture — byte-for-byte (role + notes + img_gen + img_gen_json)
    const referee = JSON.parse(
      readFileSync(join(OLD_FIXTURES, 'spec_krea-2.json'), 'utf8'),
    ) as { enhance_prompts: { prompt: string } }
    assert.equal(served, referee.enhance_prompts.prompt)
  })

  test('formSpecArm serves the recipe for an aliased route key and the stub for a recipe-less model', async () => {
    const aliased = (await formSpecSweep('krea-2-raw')) as { enhance_prompts?: Record<string, unknown> }
    assert.equal(typeof aliased.enhance_prompts?.['prompt'], 'string')
    const none = (await formSpecSweep('joytag')) as { enhance_prompts?: Record<string, unknown> }
    assert.equal(none.enhance_prompts?.['prompt'], null) // the no-file law: sweep → generic
  })

  test('formSpecArm serves z-image with the scalar + preprocessor modifier rows (the ip_adapter/controlnet face)', async () => {
    // z-image is the ONE live family boarding ip_adapter (scalar_key
    // 'weight') AND controlnet (preprocessor-carrying rows) — the two
    // pack-row arms no krea-2 form ever takes.
    const spec = (await formSpecSweep('z-image')) as Record<string, unknown>
    assert.equal(spec['form'], 'image-gen')
    assert.equal(spec['service'], 'z-image')
    const modifiers = (spec['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    const ip = modifiers.find((m) => m['kind'] === 'ip_adapter')
    assert.ok(ip !== undefined, 'the scalar pack serves')
    assert.equal(ip['scalar_key'], 'weight')
    assert.equal(ip['entry'], 'hybrid')
    assert.equal(ip['option_key'], 'kind')
    const ipOpts = ip['options'] as Array<Record<string, unknown>>
    assert.ok(ipOpts.length > 0, 'the retired vocabulary still serves')
    assert.deepEqual(ipOpts[0]!['defaults'], { weight: 1.0 }, 'the default rides the scalar key, never strength')
    const cn = modifiers.find((m) => m['kind'] === 'controlnet')!
    const cnOpts = cn['options'] as Array<Record<string, unknown>>
    assert.ok(cnOpts.length > 0, 'the union rows serve')
    assert.ok(
      cnOpts.some((o) => 'preprocessor' in o),
      'the upstream map rides the resolved facts: ' + JSON.stringify(cnOpts[0]),
    )
  })

  test('THE TWO CHECKPOINT FACES (the upstream table — Model names sizes: the .6 and the 1.7B; Base is a variant, never a third family)', async () => {
    const defs = await loadCardDefs()
    const svc = theService()
    const faces = (card: string, model: string): Array<Record<string, unknown>> => {
      const def = defs.get(card)
      assert.ok(def !== undefined, card + ' boards')
      return (specBody(svc, defs, { card, service: model, model })['families'] as Array<Record<string, unknown>>)
    }
    // the tts rail: two sizes, two checkpoint-honest faces, plus the
    // Base compose address (qvoice across ALL qwen3-tts, operator
    // 2026-09-23 — the rail names checkpoints, never flavors, and
    // the variant route rides for agents to name the clone lane;
    // flavors are variants in each size's matrix). The 1.7B leads
    // (the large default).
    const tts = faces('tts', 'qwen3-tts-voicedesign')
    assert.deepEqual(
      tts.map((f) => [f['id'], f['label']]),
      [['qwen3-tts-voicedesign', 'Qwen3-TTS 1.7B'], ['qwen3-tts', 'Qwen3-TTS 0.6B'], ['qwen3-tts-base', 'Qwen3-TTS 0.6B Base Native']],
    )
    // true families keep their DECL faces (the 2026-09-16 family-face law, unmoved)
    const music = faces('music', 'music3')
    assert.deepEqual(music.map((f) => [f['id'], f['label']]), [['music3', 'MiniMax Music 3'], ['yue2', 'YuE2']])
  })

  test('THE QVOICE SEAT (qvoice loads across ALL qwen3-tts — the owner and every route, operator 2026-09-23)', async () => {
    const defs = await loadCardDefs()
    const svc = theService()
    const modsOf = (model: string): Array<Record<string, unknown>> => {
      const def = defs.get('tts')
      assert.ok(def !== undefined, 'the tts card boards')
      return (specBody(svc, defs, { card: 'tts', service: 'qwen3-tts', model })['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    }
    // the owner lane offers the LOAD/USE seat (the lanpaint
    // precedent: boarded + enveloped + fired — the entry is owed)
    const owner = modsOf('qwen3-tts')
    const seat = owner.find((m) => m['kind'] === 'qvoice')
    assert.ok(seat !== undefined, 'the qvoice kind renders: ' + JSON.stringify(owner.map((m) => m['kind'])))
    // THE FIELD-KIND SHAPE (the mask precedent's shape, live): the
    // entry IS the contract object — no catalog, no option key, one
    // slot — and its param rows walk the pack envelope
    assert.deepEqual(
      (({ kind, param_key, schema_key, cardinality, max_stack, options }) =>
        ({ kind, param_key, schema_key, cardinality, max_stack, options }))(
        seat as Record<string, unknown>,
      ),
      {
        kind: 'qvoice', param_key: 'qvoice', schema_key: 'qvoice',
        cardinality: 'list', max_stack: 1, options: [],
      },
    )
    // QVOICE LOADS ON EVERY ADDRESS (operator 2026-09-23, the full
    // law — qvoice saves and loads across ALL qwen3-tts): the base
    // route's envelope arrives through the ROUTE→ATOM FOLD at the
    // spec door (owningAtom: a route composes through its owner) —
    // the pre-fold owner-scoping that starved the base lane is DEAD
    // LAW; the seat renders everywhere the family serves.
    const base = modsOf('qwen3-tts-base')
    assert.ok(base.some((m) => m['kind'] === 'qvoice'), 'the qvoice seat renders on the base route: ' + JSON.stringify(base.map((m) => m['kind'])))
  })

  test('THE DESIGN SEAT (qvoice saves across ALL qwen3-tts — the exporter fires from any lane, operator 2026-09-23)', async () => {
    const defs = await loadCardDefs()
    const svc = theService()
    const modsOf = (model: string): Array<Record<string, unknown>> => {
      const def = defs.get('tts')
      assert.ok(def !== undefined, 'the tts card boards')
      return (specBody(svc, defs, { card: 'tts', service: 'qwen3-tts-voicedesign', model })['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers
    }
    // the designer offers the SAVE seat (boarded + enveloped +
    // fired — the entry is owed)
    const designer = modsOf('qwen3-tts-voicedesign')
    const seat = designer.find((m) => m['kind'] === 'qvoice_save')
    assert.ok(seat !== undefined, 'the qvoice_save kind renders: ' + JSON.stringify(designer.map((m) => m['kind'])))
    assert.deepEqual(
      (({ kind, param_key, schema_key, cardinality, max_stack, options }) =>
        ({ kind, param_key, schema_key, cardinality, max_stack, options }))(
        seat as Record<string, unknown>,
      ),
      {
        kind: 'qvoice_save', param_key: 'qvoice_save', schema_key: 'qvoice_save',
        cardinality: 'list', max_stack: 1, options: [],
      },
    )
    // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
    // 2026-09-23, the full law): the SAVE seat renders on every
    // address — the save fires the studio exporter from any lane (it
    // loads its own variants), and the LOAD seat rides with it. The
    // base route's envelope arrives through the ROUTE→ATOM FOLD at
    // the spec door — without the fold the route's entry starved
    // (the envelope-mirror kill: a seat with no envelope is a brick).
    for (const model of ['qwen3-tts', 'qwen3-tts-base']) {
      const mods = modsOf(model)
      assert.ok(mods.some((m) => m['kind'] === 'qvoice_save'), 'the save seat renders on ' + model + ': ' + JSON.stringify(mods.map((m) => m['kind'])))
      assert.ok(mods.some((m) => m['kind'] === 'qvoice'), 'the load seat renders on ' + model + ': ' + JSON.stringify(mods.map((m) => m['kind'])))
    }
  })
