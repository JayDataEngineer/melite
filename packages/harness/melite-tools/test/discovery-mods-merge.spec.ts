// discovery.ts synthetic walls for THE MODS SERVE (specModifiers
// through specBody, the discovery-synth harness: model registry +
// card defs + service scripted). The live tree carries no
// double-boarded bag, no malformed schema_key kind, and no card kind
// that omits the pack's commit shape, so the one-bag-one-row law's
// refusal arms and the F34 shape-merge arms ride synthetic fixtures
// here; live truth stays in discovery.spec.ts.
import "../../../../tests/helpers/boot-models.ts";
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mockState = vi.hoisted(() => ({
  decls: {} as Record<string, Record<string, unknown>>,
  defs: new Map() as Map<string, unknown>,
  // The service fake always rides the svc() builder below (a full
  // ComfyUIService cast from intentionally-partial fixtures) or null
  // past reset() — never a bare record.
  svc: null as null | ComfyUIService,
  // The pack envelope table (specBody's specModifiers envelope set)
  // and the per-pack catalog rows, scripted per test.
  envelopes: {} as Record<string, Record<string, unknown>>,
  catalog: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...orig,
    getModel: (id: string) => {
      if (id in mockState.decls) return mockState.decls[id]
      return orig.getModel(id)
    },
    loadCardDefs: async () => mockState.defs,
    theService: () => mockState.svc,
  }
})

import type { ComfyUIService } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import type { DeclaredModifierKind } from '../src/discovery.ts'
import type { FormSpecDoc } from '@melite/contracts/formSpec'
import { bootFactsArm, specBody as specBodyRaw } from '../src/discovery.ts'

/** THE TRANSIENT-GENRE RACE (stroke 83, the discovery.spec twin):
 * enhance-recipes.spec (comfyui-cordis) lays EPHEMERAL zz-cov-<pid>
 * genres under the real models root — a parallel worker's sweep here
 * can catch one mid-flight. Bounded retry on exactly that scratch
 * signature; any real fault fails untouched. */
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

/** A schema-envelope stand-in (the served shape — schemastery's own
 * toJSON in production; the synth tests only need the wire form). */
const ENVELOPE = { uid: 0, refs: { 0: { type: 'object', dict: {} } } }

function decl(partial: Record<string, unknown>): Record<string, unknown> {
  return { id: 'syn-fam', genre: 'image', label: 'Syn', ...partial }
}

function card(partial: Record<string, unknown>): CardDefinition {
  // THE EVERY-CARD-DECLARES LAW: real cards all carry flowKinds (the
  // loadCardDefs wall); synth fixtures mimic real cards — the edge
  // emission reads the declaration, so fixtures declare edges too.
  return {
    flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
    ...partial,
  } as unknown as CardDefinition
}

function svc(): ComfyUIService {
  // packPresence: the EXTENSION-LAW gate's read (stroke 18) — the
  // synth fake carries no engine facts, so the default marks unknown
  return {
    packPresence: (packs: readonly string[]) => packs.map((id) => ({ id, present: null })),
    formSchemas: (): unknown => ({ schema: ENVELOPE, mods: mockState.envelopes }),
    modCatalog: (pack: string): unknown => ({ shared: false, rows: mockState.catalog[pack] ?? [] }),
    cardModFields: (): unknown[] => [],
  } as unknown as ComfyUIService
}

function reset(): void {
  mockState.decls = {}
  mockState.defs = new Map()
  mockState.svc = null
  mockState.envelopes = {}
  mockState.catalog = {}
}

/** One served modifiers face: the synthetic card 'syn-card' against
 * the scripted family 'syn-fam' (the res specBody would build). */
function serve(def: Record<string, unknown>): FormSpecDoc {
  const defs = new Map([['syn-card', card(def)]])
  mockState.defs = defs
  mockState.svc = svc()
  return specBody(mockState.svc!, defs, { card: 'syn-card', service: 'syn-fam', model: 'syn-fam' })
}

const modifiersOf = (doc: FormSpecDoc): Array<Record<string, unknown>> =>
  (doc.features?.modifiers ?? []) as Array<Record<string, unknown>>

/** Two catalog rows: one carrying the designed strength (the fact
 * merge's defaults face), one bare (the honest-empty defaults arm). */
const LORA_ROWS = [
  { id: 'row-a', label: 'Row A', filename: 'loras/syn/row-a.safetensors', default_strength: 0.7 },
  { id: 'row-b', filename: 'loras/syn/row-b.safetensors' },
]

describe('specBody — the one-bag-one-row serve (F34 synthetic arms)', () => {
  test('a family that boards one bag twice refuses loud — one bag, one serving pack', () => {
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['loras', 'loras'] }) }
    mockState.envelopes = { loras: ENVELOPE }
    mockState.catalog = { loras: LORA_ROWS }
    assert.throws(
      () => serve({ identity: { label: 'Syn', genre: 'image' } }),
      /form-spec: family 'syn-fam' boards two packs onto params\.loras — one bag has one serving pack \(loras\)/,
      'a double-mapped bag is an authoring error, never a preference — the serve refuses before any doc leaves',
    )
  })

  test('a card kind with an empty schema_key refuses — the menu face names its catalog or serves none', () => {
    reset()
    const kind = {
      kind: 'swap', label: 'Swap', param_key: 'swap', cardinality: 'list', schema_key: '',
    } as DeclaredModifierKind
    assert.throws(
      () => serve({ identity: { label: 'Syn', genre: 'image' }, mods: [kind] }),
      /form-spec: card 'syn-card' declares a malformed mod kind schema_key \(a non-empty string names the catalog\)/,
    )
    const numeric = { ...kind, schema_key: 7 } as unknown as DeclaredModifierKind
    assert.throws(
      () => serve({ identity: { label: 'Syn', genre: 'image' }, mods: [numeric] }),
      /malformed mod kind schema_key/,
    )
  })

  test('a kind attributing itself to the pack the family boards serves the live catalog off the pack row', () => {
    // THE CATALOG MIRROR's out-face: the kind stores its bag under its
    // OWN param_key (no collision — the pack row rides `out`) and
    // names the pack as its catalog; the serve hands it the pack's
    // live rows, never a hand-typed copy.
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['loras'] }) }
    mockState.envelopes = { loras: ENVELOPE }
    mockState.catalog = { loras: LORA_ROWS }
    const kind = {
      kind: 'loras', label: 'LoRAs', param_key: 'my_loras', schema_key: 'loras', cardinality: 'list',
    } as DeclaredModifierKind
    const doc = serve({ identity: { label: 'Syn', genre: 'image' }, mods: [kind] })
    const served = modifiersOf(doc).find((m) => m['param_key'] === 'my_loras')
    assert.ok(served !== undefined, 'the attributed kind serves')
    const options = served['options'] as Array<Record<string, unknown>>
    assert.deepEqual(options.map((o) => o['value']), ['row-a', 'row-b'], 'the catalog rows serve on the kind')
    assert.deepEqual(options[0]!['defaults'], { strength: 0.7 }, 'the row\'s designed strength rides the defaults')
    assert.equal(options[1]!['defaults'] && Object.keys(options[1]!['defaults'] as object).length, 0, 'a bare row serves an empty defaults face')
    assert.equal(options[0]!['model'], 'loras/syn/row-a.safetensors', 'the resolved model filename rides')
  })

  test('a kind with its own options serves them verbatim — the catalog mirror never overrides the card', () => {
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['loras'] }) }
    mockState.envelopes = { loras: ENVELOPE }
    mockState.catalog = { loras: LORA_ROWS }
    const kind = {
      kind: 'loras', label: 'LoRAs', param_key: 'my_loras', schema_key: 'loras', cardinality: 'list',
      options: [{ value: 'own', label: 'Own' }],
    } as unknown as DeclaredModifierKind
    const doc = serve({ identity: { label: 'Syn', genre: 'image' }, mods: [kind] })
    const served = modifiersOf(doc).find((m) => m['param_key'] === 'my_loras')
    assert.ok(served !== undefined)
    assert.deepEqual(served['options'], [{ value: 'own', label: 'Own' }], 'the card IS the catalog — the pack rows stay out')
  })

  test('the shape merge stamps the pack vocabulary a scalar pack declares (the ip_adapter face)', () => {
    // THE ONE-BAG-ONE-ROW LAW's merge half: the card states the bag's
    // fields, the pack row owns the commit shape — entry mode, option
    // key, the scalar dial, the stack ceiling — merged card-wins. The
    // ip_adapter pack declares entry/option_key/scalar_key/max_stack
    // and NO marriage, so every merge arm stamps here.
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['ip_adapter'] }) }
    mockState.envelopes = { ip_adapter: ENVELOPE }
    mockState.catalog = { ip_adapter: [{ id: 'style-x', filename: 'ip_adapter/style-x.safetensors' }] }
    const kind = {
      kind: 'ip_adapter', label: 'IP-Adapter', param_key: 'ip_adapters', schema_key: 'ip_adapter', cardinality: 'list',
    } as DeclaredModifierKind
    const doc = serve({ identity: { label: 'Syn', genre: 'image' }, mods: [kind] })
    const served = modifiersOf(doc).find((m) => m['param_key'] === 'ip_adapters')
    assert.ok(served !== undefined, 'the colliding kind serves (the pack row is dropped, one bag one row)')
    assert.equal(modifiersOf(doc).filter((m) => m['schema_key'] === 'ip_adapter').length, 1, 'one row for the bag')
    assert.equal(served['entry'], 'hybrid', 'the pack\'s entry mode merges')
    assert.equal(served['option_key'], 'kind', 'the pack\'s option key merges')
    assert.equal(served['scalar_key'], 'weight', 'the pack\'s scalar dial merges')
    assert.equal(served['max_stack'], 5, 'the pack\'s stack ceiling merges')
    assert.equal(served['marries'], undefined, 'a pack without a marriage invents none')
    assert.equal(served['options'] && (served['options'] as unknown[]).length, 1, 'the catalog mirrors onto the kind')
  })

  test('the shape merge invents nothing a field-mode pack omits (the mask face)', () => {
    // The mask pack declares NO entry/option_key/scalar_key/marriage —
    // the merge must not mint hybrid vocabulary for a field-mode bag,
    // and the keyed-field walk falls to the 'id' default key without
    // fields to walk.
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['mask'] }) }
    mockState.envelopes = { mask: ENVELOPE }
    mockState.catalog = { mask: [{ id: 'sam2', filename: 'mask/sam2' }] }
    const kind = {
      kind: 'mask', label: 'Region Mask', param_key: 'mask', cardinality: 'list',
    } as DeclaredModifierKind
    const doc = serve({
      identity: { label: 'Syn', genre: 'image' },
      mods: [kind],
      // THE SLICE SEMANTICS mirror: a card declaring requiresByFamily
      // with no row for this family serves the EMPTY slice, never the
      // flat union.
      requiresByFamily: {},
    })
    const served = modifiersOf(doc).find((m) => m['param_key'] === 'mask')
    assert.ok(served !== undefined)
    assert.equal(served['entry'], undefined, 'a field-mode pack serves no entry mode')
    assert.equal(served['option_key'], undefined, 'a field-mode pack serves no option key')
    assert.equal(served['scalar_key'], undefined, 'a field-mode pack serves no scalar dial')
    assert.equal(served['max_stack'], 1, 'the pack\'s own ceiling still merges')
    assert.deepEqual(doc['packs'], [], 'the family\'s empty declared slice serves')
  })

  test('a kind whose keyed field names no catalog row of the pack refuses loud (F34 audit F6)', () => {
    reset()
    mockState.decls = { 'syn-fam': decl({ mods: ['loras'] }) }
    mockState.envelopes = { loras: ENVELOPE }
    mockState.catalog = { loras: LORA_ROWS }
    const kind = {
      kind: 'loras', label: 'LoRAs', param_key: 'loras', schema_key: 'loras', cardinality: 'list',
      fields: [
        { name: 'id', label: 'LoRA', type: 'select', options: ['alien-a', { value: 'alien-b', label: 'B' }] },
      ],
    } as unknown as DeclaredModifierKind
    assert.throws(
      () => serve({ identity: { label: 'Syn', genre: 'image' }, mods: [kind] }),
      /form-spec: card 'syn-card' declares params\.loras whose 'id' options name no catalog row of pack 'loras' — the bag's ids must come from the pack's own catalog/,
      'merging by a value matching nothing would leave every chip fact-free while the suite stays green',
    )
  })
})

describe('specBody — the runtimes block and the boot facts arm', () => {
  test('a boarded family\'s declared runtime serves presence-marked off the env override root', () => {
    // THE RUNTIMES BLOCK's override arm: the runtime's env key names
    // an override root; the sentinel check is the press gate's own.
    reset()
    const root = mkdtempSync(join(tmpdir(), 'melite-tools-cov-runtime-'))
    const envKey = 'MELITE_TOOLS_COV_RUNTIME_ROOT'
    const sentinelPath = join(root, 'sentinel.bin')
    mkdirSync(sentinelPath, { recursive: true })
    mockState.decls = {
      'syn-rt': decl({
        runtime: {
          name: 'external', sentinel: ['sentinel.bin'], env: envKey,
          command: 'run external', consuming_param: 'seed',
        },
      }),
    }
    const prev = process.env[envKey]
    process.env[envKey] = root
    try {
      const presentDoc = serve({ identity: { label: 'Syn', genre: 'image' }, boarded: ['syn-rt'] })
      assert.deepEqual(presentDoc['runtimes'], [{
        family: 'syn-rt', name: 'external', present: true,
        command: 'run external', env: envKey, consuming_param: 'seed',
      }], 'a walk-up hit marks the runtime present')
      rmSync(sentinelPath, { recursive: true })
      const absentDoc = serve({ identity: { label: 'Syn', genre: 'image' }, boarded: ['syn-rt'] })
      const rows = absentDoc['runtimes'] as Array<Record<string, unknown>>
      assert.equal(rows[0]!['present'], false, 'a missing sentinel marks the runtime absent — the face prompts the provision command')
    } finally {
      if (prev === undefined) delete process.env[envKey]
      else process.env[envKey] = prev
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('the boot facts arm names a mounted registry\'s staleness and an unmounted fiber\'s refusal', () => {
    const facts = { primed_at: '2026-11-30T00:00:00Z', source: 'boot', source_mtime: 'm', stale: false }
    const mounted = bootFactsArm({ factsStaleness: () => facts })
    assert.equal(mounted['model_facts'], facts, 'a mounted cardRegistry folds its own staleness row')
    assert.ok('card_defs' in mounted, 'the card defs staleness folds beside it')
    const unmounted = bootFactsArm(null)
    assert.deepEqual(unmounted['model_facts'], {
      primed_at: null,
      error: 'no cardRegistry on this fiber — the estate-card-registry provider is not mounted',
    }, 'no registry on the fiber serves the named refusal, never a silent empty')
  })
})
