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
import type { EstateRequest } from '../src/estate.ts'

const request = (async () => ({})) as EstateRequest
const exec = { signal: new AbortController().signal }

function render(bundle: Record<string, unknown>, modifiers: unknown[] = []): string {
  const tool = meliteLoad(request)
  return (tool.output.render({}, { bundle: { kind: 'card', name: 'card', ...bundle }, error: undefined } as never) as Array<{ text?: string }>)
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
      model_hints: [
        { id: 'rich' },
        { id: 'rich' },
        { id: 'emptyFields' },
        { id: 'noMods' },
        { id: 'nullMods' },
        { id: 'throws' },
        { id: '' },
        { id: 7 },
        null,
      ],
      signature: { params_schema: { properties: {} }, modifiers: [] },
    })
    expect(text).toContain('qvoice[] (list; fields: voice_name, voice_id)')
    expect(text).toContain('controlnet[] (list; fields: image, strength)')
    expect(text).toContain('mod param_keys: controlnet → controlnets')
    expect(text).not.toContain('unknown-pack')
  })

  test('a kind already served by the card is not repeated', () => {
    const text = render({
      model_hints: [{ id: 'rich' }],
      signature: {
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
      model_hints: [{ id: 'rich' }],
      signature: { params_schema: { properties: {} }, modifiers: [] },
    })
    expect(text).not.toContain('qvoice[]')
    expect(text).not.toContain('controlnet[]')
  })
})
