import { beforeEach, describe, expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({
  serviceThrows: false,
  decls: {} as Record<string, unknown>,
  fields: {} as Record<string, string[]>,
}))

vi.mock('@melite/comfyui-cordis', () => ({
  registryModel: (id: string): unknown => {
    if (id === 'throws') throw new Error('registry miss')
    return state.decls[id]
  },
  theService: () => {
    if (state.serviceThrows) throw new Error('service absent')
    return {
      packFieldNames: (pack: string): string[] => state.fields[pack] ?? [],
    }
  },
}))

vi.mock('../src/discovery.ts', () => ({
  MODIFIER_PACKS: {
    qvoice: { kind: 'qvoice', label: 'Voice', cardinality: 'list' },
    controlnet: { kind: 'controlnet', label: 'ControlNet', cardinality: 'list', param_key: 'controlnets' },
    loras: { kind: 'lora', label: 'LoRAs', cardinality: 'list' },
  },
}))

import { meliteLoad } from '../src/tools/melite-load.ts'
import { fakeEstate } from './fake-estate.ts'

// The typed-lane stub (F-1, 2026-11-05): the tool plane's tests stub
// the ESTATE seam — this spec drives render only, so the loadCard
// lane never fires.
const estate = fakeEstate({ loadCard: () => ({}) }).estate
const exec = { signal: new AbortController().signal }

function render(bundle: Record<string, unknown>, modifiers: unknown[] = []): string {
  const tool = meliteLoad(estate)
  // detail: true — these arms judge the FULL lane/mods surface, which
  // the digest withholds by default (slice 4).
  return (tool.output.render({ detail: true }, { bundle: { kind: 'card', name: 'card', ...bundle }, error: undefined } as never) as Array<{ text?: string }>)
    .map((part) => part.text ?? '')
    .join('\n')
}

beforeEach(() => {
  state.serviceThrows = false
  state.fields = {
    qvoice: ['voice_name', 'voice_id'],
    controlnet: ['image', 'strength'],
  }
  state.decls = {
    rich: { mods: ['qvoice', { pack: 'controlnet' }, 'unknown-pack', 7, { missing: true }, { pack: '' }] },
    emptyFields: { mods: ['qvoice'] },
    noMods: { label: 'no mods' },
    nullMods: { mods: null },
  }
})

describe('melite_load family pack seats', () => {
  test('projects valid family packs, keyed grammars, and every defensive skip', () => {
    const text = render({
      signature: {
        model: 'rich:base:fp16',
        params_schema: { properties: { model: { enum: ['rich:base:fp16', 'rich:base:fp16', 'emptyFields:base:fp16', 'noMods:base:fp16', 'nullMods:base:fp16', 'throws:base:fp16', '', 7, null] } } },
        modifiers: [],
      },
    })
    expect(text).toContain('qvoice[] (list; fields: voice_name, voice_id)')
    expect(text).toContain('controlnet[] (list; fields: image, strength)')
    expect(text).toContain('mod param_keys: controlnet → controlnets')
    expect(text).not.toContain('unknown-pack')
  })

  test('a kind already served by the card is not repeated', () => {
    const text = render({
      signature: {
        model: 'rich:base:fp16',
        params_schema: { properties: {} },
        modifiers: [{ kind: 'qvoice', category: 'standalone', fields: ['voice_name'] }],
      },
    })
    expect(text).toContain('qvoice[] (standalone; fields: voice_name)')
    expect(text.match(/qvoice\[\]/g)).toHaveLength(1)
    expect(text).toContain('controlnet[] (list; fields: image, strength)')
  })

  test('an absent service drops family pack fields without inventing them', () => {
    state.serviceThrows = true
    const text = render({
      signature: { model: 'rich:base:fp16', params_schema: { properties: {} }, modifiers: [] },
    })
    expect(text).not.toContain('qvoice[]')
    expect(text).not.toContain('controlnet[]')
  })
})

// The lane-law words are rendered from DECL-declared relation rows, and
// every word arm is a shape arm: a row whose fields are not an array,
// an empty field list, a bounds row with no floor. A JSON-authored
// bundle can carry all of them, so the renderer's tolerance is the
// behavior under test — an agent composing from this bundle must be
// told the laws that ARE declared and never handed a crash or a word
// built from undefined.
describe('the lane-law words render from sparse relation rows', () => {
  test('a declared word with its full shape rides the line', () => {
    const text = render({
      signature: {
        params_schema: { properties: {} },
        modifiers: [],
        lanes: {
          qwen3_tts: {
            base: ['text'],
            relations: {
              requires: [{ field: 'voice', needs: ['vivian'] }],
              together: [{ fields: ['steps', 'cfg'] }],
              conflicts: [{ a: 'ref_audio', b: 'ref_video' }],
              either_or: [{ groups: [['steps'], ['cfg']] }],
              required: [{ fields: ['text'] }],
              at_most_one: [{ fields: ['loft', 'depth'] }],
            },
            bounds: { steps: { min: 4, max: 8 } },
          },
        },
      },
    })
    expect(text).toContain('requires(voice → vivian)')
    expect(text).toContain('together(steps × cfg)')
    expect(text).toContain('conflicts(ref_audio × ref_video)')
    expect(text).toContain('either_or((steps) | (cfg))')
    expect(text).toContain('required(text)')
    expect(text).toContain('at_most_one(loft | depth)')
    expect(text).toContain('bounds(steps 4…8)')
  })

  test('a sparse row never becomes a word built from undefined', () => {
    // each row here breaks one shape: needs not an array, fields not an
    // array, groups not an array, an EMPTY field list, and a bounds row
    // with neither a floor nor a ceiling
    const text = render({
      signature: {
        params_schema: { properties: {} },
        modifiers: [],
        lanes: {
          qwen3_tts: {
            base: ['text'],
            relations: {
              requires: [{ field: 'voice', needs: 'vivian' }],
              together: [{ fields: 'steps' }],
              either_or: [{ groups: 'nope' }],
              required: [{ fields: [] }, { fields: 'text' }],
              at_most_one: [{ fields: [] }, { fields: 'loft' }],
            },
            bounds: { top_p: {} },
          },
        },
      },
    })
    expect(text).toContain("requires(voice → )")
    expect(text).not.toContain('together(')
    expect(text).not.toContain('either_or(')
    expect(text).not.toContain('required(')
    expect(text).not.toContain('at_most_one(')
    expect(text).toContain('bounds(top_p ..…..)')
  })

  test('a variant with an EMPTY bounds map says no bounds at all', () => {
    // an empty object is not a span: the word would read "bounds()"
    const text = render({
      signature: {
        params_schema: { properties: {} },
        modifiers: [],
        lanes: {
          qwen3_tts: {
            base: [],
            variants: { turbo: { bounds: {} } },
          },
        },
      },
    })
    expect(text).toContain('turbo')
    expect(text).not.toContain('bounds(')
  })

  test('a variant row with no params rides as its bare name', () => {
    const text = render({
      signature: {
        params_schema: { properties: {} },
        modifiers: [],
        lanes: {
          qwen3_tts: {
            base: [],
            variants: {
              turbo: { bounds: { speed: { min: 1, max: 3 } } },
              plain: { params: 'not-a-list', relations: {} },
            },
          },
        },
      },
    })
    expect(text).toContain('turbo')
    expect(text).toContain('bounds(speed 1…3)')
    expect(text).not.toContain('+not-a-list')
  })
})
