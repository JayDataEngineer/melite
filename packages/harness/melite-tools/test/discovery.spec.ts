// @contract models-shared-quant-vocabulary
// discovery.ts walls, live plane (vitest, live card defs + live model
// registry; synthetic Maps only for the pure projections
// formsTable/cardSections, which take their defs as an argument):
// key resolution, the forms table law, section shapes, and the live
// door arms.
import "../../../../tests/helpers/boot-models.ts";
import { agentFormDoc } from '@melite/engine-agent'
import type { SamplerEnvelope } from '@melite/contracts/laneRelations'
import type { FormSpecDoc, ModifierKind } from '@melite/contracts/formSpec'
import { craftFormDoc } from '@melite/engine-craft'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, test, expect, vi } from 'vitest'
import assert from 'node:assert/strict'
import { loadCardDefs, theService } from '@melite/comfyui-cordis'

/** The registry view toggle for the absence law (the undeclaring-card
 *  fixture below): with the flag up, getModel serves a paramless
 *  declaration for the three img-to-mesh families — `params: []` ≡
 *  undeclared (the F5 law) — so the manifest arm can be judged on a
 *  card whose families declare nothing, a shape the production tree
 *  no longer carries. */
const mockFlags = vi.hoisted(() => ({ stripParamless: false, throwFam: null as string | null }))
vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...orig,
    getModel: (id: string) => {
      if (mockFlags.throwFam !== null && id === mockFlags.throwFam) {
        throw new Error(`models: no DECL named '${id}' (the unbootable-family arm)`)
      }
      return mockFlags.stripParamless && ['pixal3d', 'trellis2-native', 'transfer-rig'].includes(id)
        ? ({ id } as never)
        : orig.getModel(id)
    },
  }
})

/** The OLD tree's served-spec fixtures — the byte referee for recipe
 *  composition (infer-baseline-tmp sits beside this repo). */
const OLD_FIXTURES = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../infer-baseline-tmp/web/editor/src/__tests__/fixtures',
)
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
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
  resolveSpecKeyForTool,
  specBody,
  specVariants,
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
      // Flake item 7 (2026-10-13 audit, converted 2026-10-26): the
      // backoff sleep rides FAKE timers scoped to the sleep alone —
      // formSpecArm itself never runs under them (read first: its
      // body is fs reads + sync compose + promise awaits, zero
      // timer APIs), so a frozen clock can never wedge a real-fs
      // arm. The retry stays a bounded, rare-path backoff: only the
      // zz-cov scratch signature ever reaches it.
      vi.useFakeTimers()
      try {
        const slept = new Promise((r): void => { setTimeout(r, 200) })
        await vi.advanceTimersByTimeAsync(200)
        await slept
      } finally {
        vi.useRealTimers()
      }
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
    // No boarded families: the card IS its own service and NEVER
    // mints a model (the minted-model kill, 2026-10-12 — resolving
    // model-less cards to their own id sent the run door a phantom
    // seat it refused against the empty board).
    assert.deepEqual(resolveSpecKey('__solo__', defs, new Map()), {
      card: '__solo__',
      service: '__solo__',
      model: undefined,
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

describe('resolveSpecKeyForTool', () => {
  test('a booted-table fault rides to the caller — the tool never swallows its own census throw', () => {
    // A defs table that dies on read faults past the family catch, so
    // the tool arm meets its own catch with the seat booted and rethrows.
    class ThrowingDefs extends Map<string, CardDefinition> {
      override get(_key: string): CardDefinition | undefined {
        throw new Error('defs exploded')
      }
    }
    assert.throws(() => resolveSpecKeyForTool('krea-2', new ThrowingDefs(), new Map()), /defs exploded/)
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
    // THE MINTED-FAMILY KILL (2026-10-12): 'y' boards nothing — the
    // old test pinned the mint here (families ['y'], default 'y').
    // The kill's truth: NO family, NO default, NO resolved — the
    // card-id alias is admission's law (PROOF-13), never a served pick.
    // THE OMISSION SPELLING (the GPU tier's live catch, 2026-10-12):
    // the absent keys are OMITTED, never written null — the wire type
    // carries no null arm (default_family?: string) and the browser's
    // catalog contract reds present-but-not-a-string on every boot.
    assert.deepEqual((cards['y'] as Record<string, unknown>)['families'], [])
    assert.equal('default_family' in (capabilities['y'] as Record<string, unknown>), false)
    assert.equal('resolved' in (capabilities['y'] as Record<string, unknown>), false)
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

  test('THE SERVED QUANT AXIS SPEAKS ONE WORD (operator, 2026-11-08: "the shared vocabularity never came though" — the h3 burn: Timeline and Singularity both ride int8)', async () => {
    const doc = await formSpecSweep('h3') as FormSpecDoc | null
    assert.ok(doc, 'the served h3 form-spec answers')
    const quants = (doc.variants ?? []).filter((r) => r.group === 'Quant')
    assert.ok(quants.length > 0, 'the h3 matrix serves Quant rows')
    const minted = quants.filter((r) => r.id.includes('__'))
    assert.deepEqual(
      minted.map((r) => r.id),
      [],
      'the mint is dead — every served Quant row id IS its coordinate (the door-refused composite word serves nowhere)',
    )
    const int8s = quants.filter((r) => r.quant === 'int8')
    assert.deepEqual(
      int8s.map((r) => [r.id, r.owner]).sort(),
      [['int8', 'singularity'], ['int8', 'timeline']],
      'both variants speak the one shared int8 word — the variant axis carries the switch, the quant word never moves',
    )
  })

  test('THE MCP CARD FOLDS ON OPT-IN ONLY (error j2, dev_docs/ERRORS.md:86)', async () => {
    // The operator error (ERRORS.md:86, the unwanted-MCP-card report).
    // The fold parameter is the OPT-IN census (the
    // estate's own engines seat: the config's mcpEngines field seats
    // ids 'mcp:<server>' — the 2026-10-12 EXPERIMENTAL OPT-IN law),
    // NEVER the ambient tools census: the operator's DSH lane always
    // carries harness mcp__<server>__<tool> schemas, and ambient
    // presence is not operator intent. No opt-in → no row; an opt-in
    // folds exactly ONE self-covering row (every seated server is a
    // TILE inside the card's MCPs plus-box, never a row per server).
    const unopted = (await formsArm()) as Record<string, Record<string, unknown>>
    assert.equal('mcp' in unopted, false, 'no opt-in, no mcp row (error j2)')
    const opted = (await formsArm(['blender'])) as Record<string, Record<string, unknown>>
    assert.equal(Object.keys(opted).filter((k) => k === 'mcp').length, 1, 'ONE row on opt-in')
    assert.equal(opted['mcp']!['label'], 'MCP (experimental)')
    assert.equal(opted['mcp:blender'], undefined, 'never a row per server (the tiles ride the card)')
  })

  test('THE OFFERED-MODEL LAW (E2-5, dev_docs/ERRORS_2.md): every family row a card serves on its Model axis offers at least one pickable variant — a fully soft-retired family never serves the row', async () => {
    // The operator burn (2026-11-09): "EVEN THOUGH QWEN IMAGE EDIT
    // 2511 IS RETIRED, NO VARIANTS, IT STILL SHOWS UP IN THE MODEL
    // DROPDOWN" — the survivor arc hid every one of the family's
    // variants (hide_from_dropdown), but the Model axis still served
    // the family row: a dead dropdown door, the UI-drop class this
    // purge exists to kill. The law: the families face is the
    // OFFERED set's display fold — a family whose every variant is
    // hidden (specVariants empty at its own key) offers nothing and
    // must not serve. The bench door keeps the boarded address (old
    // drafts re-run); only the offered row goes.
    const { getModel } = await import('@melite/comfyui-cordis')
    const defs = await loadCardDefs()
    const dead: string[] = []
    for (const [cardId, def] of defs) {
      // THE BOARDED WALK: only cards that seat families serve a Model
      // axis (unboarded tool cards serve no families row). The E2-5
      // draft's `cardId !== def.identity?.lane` clause named a field
      // the identity type never carried — dead vocabulary, dropped
      // (the walk's effective scope was boarded-only all along).
      if ((def.boarded ?? []).length === 0) continue
      const doc = await formSpecArm(cardId)
      if (doc === null) continue
      const families = (doc as unknown as { families?: Array<{ id: string }> }).families ?? []
      for (const fam of families) {
        let decl: unknown
        try {
          decl = getModel(fam.id)
        } catch {
          continue // the unbootable-family arm's own voice, not this law's
        }
        const offered = specVariants(decl as never, fam.id)
        if (offered.length === 0) dead.push(`${cardId} serves '${fam.id}' with zero pickable variants`)
      }
    }
    assert.deepEqual(dead, [], 'a Model-axis row with no pickable variant is a dead door — fold it out of the offered face')
    // THE DRAFT FACE (the same arc's other half): a family-keyed
    // spec (an old draft resolving its retired family) KEEPS its own
    // row — the rail names what the draft rides; retirement folds
    // the OFFER, never the draft's identity.
    const draftFace = await formSpecArm('qwen-img-edit-2511')
    const draftFamilies = ((draftFace ?? {}) as unknown as { families?: Array<{ id: string }> }).families ?? []
    assert.ok(
      draftFamilies.some((f) => f.id === 'qwen-img-edit-2511'),
      'a 2511-keyed draft serves its own family row (addressable, never offered fresh)',
    )
    const freshFace = await formSpecArm('image-edit')
    const freshFamilies = ((freshFace ?? {}) as unknown as { families?: Array<{ id: string }> }).families ?? []
    assert.equal(
      freshFamilies.some((f) => f.id === 'qwen-img-edit-2511'),
      false,
      'the fresh card never offers the fully retired family (E2-5)',
    )
  })

  test('cardToolsArm serves one manifest per card, model-first', async () => {
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>
    const defs = await loadCardDefs()
    assert.equal(tools.length, defs.size)
    assert.deepEqual(tools.map((t) => t['name']), [...defs.keys()].sort())
    const tts = tools.find((t) => t['name'] === 'tts')!
    // THE LARGE DEFAULT (operator 2026-09-23, recut for THE QWEN FOLD
    // 2026-10-26: qwen3-tts + qwen3-tts-voicedesign merged into ONE
    // family qwen3-tts — VARIANT=flavor, QUANT=size): boarded[0] is
    // now the one Qwen atom (BOARDED + VARIANT_ADDRESSES in
    // packages/audio/tts/src/card.ts — the five cell routes survive
    // as addresses on the OFFERED set: the bench door and the tool
    // enum, pinned by discovery-doors.spec.ts). THE DISPLAY FOLD
    // (645e77e0b, the 2026-10-12 operator catch on this card's
    // display defect): this manifest's families face displays
    // OWNING ATOMS ONLY — a route is a cell selector, not a model,
    // and serving it re-expands one family into five Model-axis
    // rows.
    assert.equal(tts['model'], 'qwen3-tts')
    assert.deepEqual(tts['families'], ['qwen3-tts'])
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
    const spec = await formSpecSweep('tts')
    assert.equal(spec?.form, 'tts')
    // THE LARGE DEFAULT (operator 2026-09-23, recut for THE QWEN FOLD
    // 2026-10-26: the two TTS families merged into ONE qwen3-tts):
    // the unstated model resolves the one family atom.
    assert.equal(spec['service'], 'qwen3-tts')
    assert.equal(spec['model'], 'qwen3-tts')
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
      // THE LANES BLOCK (2026-10-10, the YOU_ARE_A_LIAR fix shape 2):
      // the served doc carries the DECL's own parameter surface +
      // relation words per lane — the form's one source for which
      // fields render and which states the door refuses.
      'lanes',
      'layout',
      'loader_info',
      'mod_schemas',
      'model',
      'model_defaults',
      'outputs',
      'packs',
      // THE DECLARED SURFACE (the drill null-set cure, 2026-11-08):
      // the served body carries the DECL's param names — the wire
      // field the switch verbs read to null the departed surface and
      // the compose mirror reads to refuse a key no lane declares.
      'params',
      'schema',
      'service',
      'size',
      // THE STUDIO CLAIM (the fallback purge, 2026-11-09): the served
      // doc names the package whose client bundle mounts the card
      // studio — null when nothing claims it.
      'stage_view',
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
    const spec = await formSpecSweep('mask')
    assert.ok(spec !== null)
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
    const mods = spec.features?.modifiers ?? []
    assert.deepEqual(mods.map((m) => m['category']), ['standalone', 'standalone', 'ordered'])
    // stroke 76: the paint leaf face serves VERBATIM on the
    // declared kind — the section offers the brush only on this row
    const paint = mods.find((m) => m.kind === 'draw')
    assert.equal(paint?.['leaf_face'], 'paint-canvas')
    // stroke 78: the bbox face rides sam3's region canvas
    assert.equal(mods.find((m) => m.kind === 'sam3')?.['leaf_face'], 'bbox-canvas')
    // THE REQUIRED-WHEN DECLARATION (2026-10-12): the sam3 prompt's
    // conditional demand serves THROUGH to the client — the leaf
    // paints the star before the press, never phase 1 (the
    // operator's catch: 'the form never declared the things it
    // needed' — their words were cruder)
    const sam3Fields = mods.find((m) => m.kind === 'sam3')?.['fields'] as ReadonlyArray<{ name: string; required_when?: string; default?: unknown }> | undefined
    assert.equal(sam3Fields?.find((f) => f.name === 'prompt')?.required_when, 'via_rtdetr!=true', 'the conditional demand serves verbatim in the one grammar')
    // and the readback's opt-in default serves (one press, one row)
    assert.equal(sam3Fields?.find((f) => f.name === 'export_boxes')?.default, false, 'the box-manifest readback serves OFF by default')
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
    const spec = await formSpecSweep('image-gen')
    assert.ok(spec !== null)
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

  test('the variant row serves the DECL sampler_envelope (turbo lives in [4,8] steps / [1,2] cfg — the DECL audit row 3)', async () => {
    // 2026-10-10: variantRow and laneContractOf both dropped the
    // envelope — the bench judged a domain every face was silent
    // about, so the composing agent learned [4,8] by refusal. The
    // row carries it now (null for absent, the row's own law).
    const spec = await formSpecSweep('image-gen')
    assert.ok(spec !== null)
    const rows = spec['variants'] ?? []
    const turbo = rows.find((r) => r.id === 'turbo')
    assert.ok(turbo, 'the turbo variant row serves')
    assert.deepEqual(turbo!.sampler_envelope, { steps: [4, 8], cfg: [1, 2] })
    // a variant that declares none serves null, never a missing key
    const realism = rows.find((r) => r.id === 'realism')
    assert.ok(realism, 'the realism row serves')
    assert.equal(realism!.sampler_envelope, null)
  })

  test('formSpecArm serves the mesh trio through the real variantRow (G2 — the served form-spec pin for img-to-mesh)', async () => {
    // 2026-10-31 drill-cure-coverage G2: the mesh tier's Recipe rows
    // had NO discovery arm — the fidelity walls judge the DECL, so if
    // variantRow dropped img-to-mesh's rows nothing reds. This arm
    // rides the SERVED spec (the real formSpecArm door).
    const spec = await formSpecSweep('img-to-mesh')
    assert.ok(spec !== null)
    assert.equal('recipes' in spec, false, 'stroke 34 — the recipe catalog layer is dead on every tier')
    const rows = spec['variants'] as Array<{ id: string; group: string; defaults: Record<string, unknown>; hint: string | null }>
    const ids = rows.filter((r) => r.group === 'Recipe').map((r) => r.id)
    // STANDARD leads (the birth stamp lands the FIRST Recipe row)
    assert.equal(ids[0], 'standard', 'the standard tier leads the Recipe rows')
    assert.deepEqual([...ids].sort(), ['fast', 'quality', 'standard'], 'the mesh trio serves complete')
    const byId = new Map(rows.filter((r) => r.group === 'Recipe').map((r) => [r.id, r]))
    assert.deepEqual(byId.get('standard')!.defaults, {}, 'standard stamps nothing — the family floors ARE the tier')
    assert.deepEqual(byId.get('fast')!.defaults, { remesh_resolution: 128, decimate_faces: 10000 }, 'fast stamps the light tail only')
    assert.deepEqual(byId.get('quality')!.defaults, { resolution: '1536', remesh_resolution: 2048, decimate_faces: 2000000 }, 'quality stamps the schema ceilings')
    assert.match(byId.get('quality')!.hint ?? '', /VRAM/i, 'the quality hint names its VRAM cost on the SERVED face')
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
    const inputs = body.inputs ?? []
    assert.equal(JSON.stringify(inputs.find((i) => i.name === 'frame')), '{"name":"frame","kind":"image"}')
    assert.equal(JSON.stringify(inputs.find((i) => i.name === 'seed')), '{"name":"seed","kind":"int"}')
    // nameless junk rides the ENVELOPE verbatim (nothing drops) — but
    // no input row ever names it
    const dict = ((body['schema'] as { refs: Record<string, { dict?: Record<string, unknown> }> }).refs['0']!.dict)
    assert.deepEqual(Object.keys(dict!).sort(), ['7', 'frame', 'junk'])
    assert.equal(inputs.some((i) => i.name === '7' || i.name === undefined), false)
    assert.equal('fields' in body, false)
  })

  test('specBody packs block scopes the family slice — an absent slice is EMPTY, never the flat union (cold-start r9)', async () => {
    // The r9 law mirrored on the discovery face: when the card
    // declares requiresByFamily, the per-family spec body's packs
    // block carries THAT family's slice — a family absent from the
    // map serves NO pack row (its install-time census is empty),
    // never the flat union (which would tell the installing agent
    // to fetch a pack the family's graph never touches).
    const svc = theService()
    const defs = new Map([['__sliced__', card({
      identity: { label: 'Sliced', description: 'slice-scoped packs', genre: 'image' },
      boarded: ['fam1', 'fam2'],
      requires: ['flat-pack'],
      requiresByFamily: { fam1: ['fam-pack'] },
    })]])
    const realFormSchemas = svc.formSchemas.bind(svc)
    const fakeSvc = {
      formSchemas: (c: string, key: string): unknown => {
        if (c !== '__sliced__') return realFormSchemas(c, key)
        return { schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } }, mods: {} }
      },
      modCatalog: (): unknown => ({ shared: false, rows: [] }),
      cardModFields: (): unknown[] => [],
      packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
        packs.map((id) => ({ id, present: null })),
    } as unknown as ReturnType<typeof theService>
    const fam1 = specBody(fakeSvc, defs, { card: '__sliced__', service: '__sliced__', model: 'fam1' })
    const fam2 = specBody(fakeSvc, defs, { card: '__sliced__', service: '__sliced__', model: 'fam2' })
    assert.deepEqual((fam1['packs'] as Array<{ id: string }>).map((p) => p.id), ['fam-pack'], 'the declared family carries its slice')
    assert.deepEqual(fam2['packs'], [], 'the slice-absent family serves NO pack row — never the flat union')
  })

  test('specBody serves card-declared mod kinds VERBATIM on the one modifiers channel (stroke 63)', async () => {
    const svc = theService()
    // CONTRACT A: the card's own action kinds ride
    // features.modifiers beside pack kinds — no
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
    const kinds = body.features?.modifiers ?? []
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
        // kindFields is an ARRAY of served rows (the declared
        // mod-kind master's wire shape — FieldRow: name/label/type)
        kindFields: [{ name: 'id', label: 'Id', type: 'string' }],
        // well-formed rows ride verbatim (the door refuses partial
        // rows — the malformed-kind test owns that refusal)
        fields: [{ name: 'x', label: 'X', type: 'string' }],
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
    const kinds = body.features?.modifiers ?? []
    assert.equal(kinds.length, 1)
    assert.deepEqual(kinds[0], {
      kind: 'pick', label: 'Pick', param_key: 'pick', cardinality: 'single',
      entry: 'option', option_key: 'id', scalar_key: 'strength', max_stack: 2,
      fields: [{ name: 'x', label: 'X', type: 'string' }],
      kindFields: [{ name: 'id', label: 'Id', type: 'string' }],
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

  // THE SERVE-NARROW REFUSALS (batch-5 closure, 2026-10-14 — O25s):
  // every engine-plane row arrives as unknown, and the served
  // contract refuses a lie at the boundary instead of riding it —
  // the malformed envelope names its card, the malformed mod
  // envelope names the same card, and the field/option rows name
  // their kind and index.
  test('specBody refuses a malformed schema envelope LOUD — the card and both shapes named', async () => {
    const svc = theService()
    const defs = new Map([['__badenv__', card({
      identity: { label: 'Env', description: 'malformed envelope', genre: 'image' },
      flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
    })]])
    const realFormSchemas = svc.formSchemas.bind(svc)
    const serve = (schemas: unknown): ReturnType<typeof theService> =>
      ({
        formSchemas: (c: string, key: string): unknown => {
          if (c !== '__badenv__') return realFormSchemas(c, key)
          return schemas
        },
        modCatalog: (): unknown => ({ shared: false, rows: [] }),
        cardModFields: (): unknown[] => [],
        packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
          packs.map((id) => ({ id, present: null })),
      }) as unknown as ReturnType<typeof theService>
    const key = { card: '__badenv__', service: '__badenv__', model: '__badenv__' }
    // 1) the MAIN envelope without refs: uid number + refs object
    assert.throws(
      () => specBody(serve({ schema: { uid: 1 }, mods: {} }), defs, key),
      /form-spec: card '__badenv__' serialized a malformed schema envelope \(uid number \+ refs object\)/,
    )
    // 2) the MOD envelope carries the same law (per pack)
    assert.throws(
      () => specBody(serve({ schema: { uid: 0, refs: {} }, mods: { packx: { uid: 1 } } }), defs, key),
      /form-spec: card '__badenv__' serialized a malformed schema envelope \(uid number \+ refs object\)/,
    )
  })

  test('specBody refuses malformed mod-kind field and option rows LOUD (the kind and index named)', async () => {
    const svc = theService()
    const mk = (row: Record<string, unknown>): { defs: Map<string, CardDefinition>, svc: ReturnType<typeof theService> } => {
      const defs = new Map([['__badrow__', card({
        identity: { label: 'Row', description: 'malformed row', genre: 'image' },
        flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
        mods: [{ kind: 'x', label: 'X', param_key: 'x_key', cardinality: 'list', ...row }] as never,
      })]])
      const realFormSchemas = svc.formSchemas.bind(svc)
      const fakeSvc = {
        formSchemas: (c: string, key: string): unknown => {
          if (c !== '__badrow__') return realFormSchemas(c, key)
          return { schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } }, mods: {} }
        },
        modCatalog: (): unknown => ({ shared: false, rows: [] }),
        cardModFields: (): unknown[] => [],
        packPresence: (packs: readonly string[]): Array<{ id: string, present: boolean | null }> =>
          packs.map((id) => ({ id, present: null })),
      } as unknown as ReturnType<typeof theService>
      return { defs, svc: fakeSvc }
    }
    const key = { card: '__badrow__', service: '__badrow__', model: '__badrow__' }
    // 1) a field row without string name/label/type
    const f = mk({ fields: [{ name: 7, label: 'L', type: 't' }] as never })
    assert.throws(
      () => specBody(f.svc, f.defs, key),
      /form-spec: mod kind x field 0 must carry string name\/label\/type/,
    )
    // 2) an option row without string value/label
    const o = mk({ options: [{ value: 7, label: 'L' }] as never })
    assert.throws(
      () => specBody(o.svc, o.defs, key),
      /form-spec: mod kind x option 0 must carry string value\/label/,
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

  // ── THE STAGE-VIEW DECLARATION (2026-11-09, the fallback
  // extermination): the served doc carries the card package's studio
  // claim, derived from the tree (stageViewPlane) — the drill's
  // loud-refusal law reads THIS; a derivation break would silently
  // downgrade every declared card back to the generic form. ──
  test('the served form-spec declares the studio claim (input-prep + h3 declare; a bare card serves null)', async () => {
    const prep = await formSpecSweep('input-prep')
    assert.ok(prep !== null)
    assert.equal(prep.stage_view, '@melite/image-input-prep',
      "the burned card's doc must declare its studio — the dispatch's refusal is dead weight without it")
    const h3 = await formSpecSweep('h3')
    assert.ok(h3 !== null)
    assert.equal(h3.stage_view, '@melite/video-h3-timeline')
    const bare = await formSpecSweep('image-gen')
    assert.ok(bare !== null)
    assert.equal(bare.stage_view ?? null, null,
      'no registration → the generic form is the designed seat, never a refusal')
  })

  // ── STEPS APPLIED (2026-09-18, the operator's plaguekind law): a
  // distill row's married step count serves in the option defaults —
  // boarding stamps {strength, steps} onto the entry. ──
  test('the h3 loras options serve their distill step counts (strength + steps in the defaults)', async () => {
    const spec = await formSpecSweep('h3')
    assert.ok(spec !== null)
    const modifiers = spec.features?.modifiers ?? []
    const lora = modifiers.find((m) => m['kind'] === 'lora')
    assert.ok(lora !== undefined, 'the loras pack serves on the h3 family')
    // THE MARRIAGE DECLARATION (#36, the recipes rework): the kind
    // serves the knob marriage VERBATIM from the family DECL — the
    // client resolver mirrors compose (lora steps > steps row,
    // Math.max) so the face shows what the film runs. THE MARRIED
    // SHIFT (SOTA limb 2): shift_video joins — the distill's own
    // sigma grid (8-step 12, 4-step 6; larryvrh declares none).
    assert.deepEqual(lora!['marries'], { steps: 'max', shift_video: 'max' }, 'the loras kind declares the steps + shift marriage (max aggregation)')
    const opts = lora!.options ?? []
    const dareties = opts.find((o) => o.value === 'h3_lightx2v_dareties')
    const turbo = opts.find((o) => o.value === 'h3_lightx2v_turbo')
    assert.ok(dareties !== undefined && turbo !== undefined, 'both distill rows serve')
    assert.deepEqual(dareties!['defaults'], { strength: 0.8, steps: 4, steps_min: 4, steps_max: 4, shift_video: 6 }, 'dareties v4: a four-step distill (fixed point, its declared domain — the value-arms ARM 12: the leaf dials the row\u2019s own span, never the generic envelope); strength 0.8 per the operator 2026-09-21 (silveroxides\u2019 documented solo range 0.6\u20130.8); married shift 6 (the 4-step grid)')
    assert.deepEqual(turbo!['defaults'], { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8, shift_video: 12 }, 'turbo 4-8: the married default rides WITH its declared range; married shift 12 (its 8-step grid)')
    // ── THE CATALOG EXPANSION (2026-09-20, operator: "add multiple
    // loras and let the user choose"): the official lightx2v turbos
    // + the Kijai Acc adapters serve as user picks — strength 1 per
    // Comfy-Org's own t2v/i2v/r2v templates, steps married. ──
    const turbo8 = opts.find((o) => o['value'] === 'h3_turbo8_v1')
    const acc8 = opts.find((o) => o['value'] === 'h3_acc8_fl2va')
    assert.ok(turbo8 !== undefined && acc8 !== undefined, 'the expansion rows serve on the picker')
    assert.deepEqual(turbo8!['defaults'], { strength: 1, steps: 8, steps_min: 8, steps_max: 8, shift_video: 12 }, 'official 8-step v1.0: full strength (the template operating point), its declared fixed domain — ARM 12; married shift 12 (the 8-step SOTA point)')
    assert.deepEqual(acc8!['defaults'], { strength: 1, steps: 8, steps_min: 8, steps_max: 8, shift_video: 12 }, 'Kijai Acc 8-Step: designed at full strength, its declared fixed domain — ARM 12; married shift 12')
    // ── THE ARENA ROWS (the 15k-vote leaderboard + authors' READMEs):
    // larryvrh #1 at 6 steps strength 1 (his README: "6–8 steps,
    // where v4 looks its best"); Parasyte #2 at the author's 1.5
    // strength / 8 steps (a strength-2 contract, not a typo);
    // TaoMate the refiner instrument (0.7 / 3 steps). ──
    const larry = opts.find((o) => o['value'] === 'h3_larryvrh_v4_ema')
    const para = opts.find((o) => o['value'] === 'h3_pk_parasyte')
    const tao = opts.find((o) => o['value'] === 'h3_taomate_3step')
    assert.ok(larry !== undefined && para !== undefined && tao !== undefined, 'the arena rows serve on the picker')
    assert.deepEqual(larry!['defaults'], { strength: 1, steps: 6, steps_min: 4, steps_max: 8 }, 'larryvrh v4-600 EMA: the crowd #1, 6 steps per README; NO married shift — his README and the research table put him at native/default (the schema default 8 owns)')
    assert.deepEqual(para!['defaults'], { strength: 1.5, steps: 8, steps_min: 6, steps_max: 8, shift_video: 12 }, 'Parasyte: the author rec — 1.5 str / 8 steps / 12-3 shift / er_sde beta57')
    assert.deepEqual(tao!['defaults'], { strength: 0.7, steps: 3, steps_min: 3, steps_max: 3, shift_video: 6 }, 'TaoMate: the refiner operating point (0.7 over 3 closing steps), its declared fixed domain — ARM 12; married shift 6 (the research table\u2019s TaoMate row)')
  })

  test('a route-owned key serves the owning family lora catalog', async () => {
    const spec = await formSpecSweep('h3-timeline')
    assert.ok(spec !== null)
    const modifiers = spec.features?.modifiers ?? []
    const lora = modifiers.find((m) => m['kind'] === 'lora')
    assert.ok(lora !== undefined)
    const options = lora!.options ?? []
    assert.ok(options.some((option) => option.value === 'h3_lightx2v_turbo'))
    assert.deepEqual(
      options.find((option) => option['value'] === 'h3_lightx2v_turbo')!['defaults'],
      { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8, shift_video: 12 },
    )
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
    const kinds = doc.features?.modifiers ?? []
    assert.deepEqual(kinds.map((k) => k['param_key']), ['mcps', 'skills', 'inputs'])
    const mcps = kinds[0]!.fields ?? []
    assert.deepEqual(mcps[0]!.options, [{ value: 'blender', label: 'blender' }])
    const skills = kinds[1]!.fields ?? []
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
    // ONE VOICE for an unknown card: this guard and the door's
    // formSchemas miss speak the same sentence (they were two).
    assert.throws(
      () => specBody(svc, new Map(), { card: '__no__', service: 's', model: 'm' }),
      /form-spec: card '__no__' unknown/,
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
    const spec = await formSpecSweep('krea-2')
    assert.ok(spec !== null)
    const served = spec.enhance_prompts?.prompt
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
    const spec = await formSpecSweep('z-image')
    assert.ok(spec !== null)
    assert.equal(spec['form'], 'image-gen')
    assert.equal(spec['service'], 'z-image')
    const modifiers = spec.features?.modifiers ?? []
    const ip = modifiers.find((m) => m['kind'] === 'ip_adapter')
    assert.ok(ip !== undefined, 'the scalar pack serves')
    assert.equal(ip['scalar_key'], 'weight')
    assert.equal(ip['entry'], 'hybrid')
    assert.equal(ip['option_key'], 'kind')
    const ipOpts = ip.options ?? []
    assert.ok(ipOpts.length > 0, 'the retired vocabulary still serves')
    assert.deepEqual(ipOpts[0]!.defaults, { weight: 1.0 }, 'the default rides the scalar key, never strength')
    const cn = modifiers.find((m) => m.kind === 'controlnet')!
    const cnOpts = cn.options ?? []
    assert.ok(cnOpts.length > 0, 'the union rows serve')
    assert.ok(
      cnOpts.some((o) => 'preprocessor' in o),
      'the upstream map rides the resolved facts: ' + JSON.stringify(cnOpts[0]),
    )
  })

  test('THE CHECKPOINT RAIL (the QWEN FOLD — one family, ONE display face since the fold; the five cell routes ride the offered set, never the display)', async () => {
    const defs = await loadCardDefs()
    const svc = theService()
    const faces = (card: string, model: string): NonNullable<FormSpecDoc['families']> => {
      const def = defs.get(card)
      assert.ok(def !== undefined, card + ' boards')
      return specBody(svc, defs, { card, service: model, model }).families ?? []
    }
    // the tts rail, recut for THE QWEN FOLD (2026-10-26: qwen3-tts +
    // qwen3-tts-voicedesign merged into ONE family qwen3-tts —
    // VARIANT=flavor customvoice/voicedesign/base, QUANT=size
    // 1_7b/0_6b; the dead package is deleted, all 5 old addresses
    // survive as cell routes): ONE declaring family, and since THE
    // DISPLAY FOLD (645e77e0b) ONE display face — the form-spec's
    // families block serves owning atoms only; the five route
    // addresses live on the offered set (bench door + tool enum,
    // discovery-doors.spec.ts) and the checkpoint labels ride the
    // variant cells (offered-cells-liveness.spec.ts). The 1.7B
    // still leads (the large default, the DECL structure below).
    const tts = faces('tts', 'qwen3-tts')
    assert.deepEqual(
      tts.map((f) => [f.id, f.label ?? null]),
      [['qwen3-tts', 'Qwen3-TTS']],
    )
    // THE FOLDED DECL STRUCTURE (not looser): one family, three
    // flavor variants, two size quants — Base is a variant, never a
    // third family.
    const { getModel } = await import('@melite/comfyui-cordis')
    const decl = getModel('qwen3-tts') as unknown as { variants?: Array<{ id: string; cells?: Array<{ quant: string }> }> }
    const flavorIds = (decl.variants ?? []).filter((v) => (v as unknown as { group?: string }).group === 'Variant' || ['customvoice', 'voicedesign', 'base'].includes(v.id)).map((v) => v.id).sort()
    assert.deepEqual(flavorIds, ['base', 'customvoice', 'voicedesign'])
    const quants = [...new Set((decl.variants ?? []).flatMap((v) => (v.cells ?? []).map((c) => c.quant)))].sort()
    assert.deepEqual(quants, ['0_6b', '1_7b'])
    // true families keep their DECL faces (the 2026-09-16 family-face law, unmoved)
    const music = faces('music', 'music3')
    assert.deepEqual(music.map((f) => [f.id, f.label ?? null]), [['music3', 'MiniMax Music 3'], ['yue2', 'YuE2']])
  })

  test('THE QVOICE SEAT (qvoice loads across ALL qwen3-tts — the owner and every route, operator 2026-09-23)', async () => {
    const defs = await loadCardDefs()
    const svc = theService()
    const modsOf = (model: string): ModifierKind[] => {
      const def = defs.get('tts')
      assert.ok(def !== undefined, 'the tts card boards')
      return specBody(svc, defs, { card: 'tts', service: 'qwen3-tts', model }).features?.modifiers ?? []
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
        seat,
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
    const modsOf = (model: string): ModifierKind[] => {
      const def = defs.get('tts')
      assert.ok(def !== undefined, 'the tts card boards')
      return specBody(svc, defs, { card: 'tts', service: 'qwen3-tts-voicedesign', model }).features?.modifiers ?? []
    }
    // the designer offers the SAVE seat (boarded + enveloped +
    // fired — the entry is owed)
    const designer = modsOf('qwen3-tts-voicedesign')
    const seat = designer.find((m) => m['kind'] === 'qvoice_save')
    assert.ok(seat !== undefined, 'the qvoice_save kind renders: ' + JSON.stringify(designer.map((m) => m['kind'])))
    assert.deepEqual(
      (({ kind, param_key, schema_key, cardinality, max_stack, options }) =>
        ({ kind, param_key, schema_key, cardinality, max_stack, options }))(
        seat,
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

// THE AGENT PLANE GETS THE LANE TOO (2026-10-10, the liar report's
// fix shape 2's last asymmetry): the form reads the DECL's surface,
// the bench door refuses on it, and the agent used to get only the
// flat union schema — so the one consumer that writes without a live
// form had to learn the law by hitting the refusal. The card-tools
// manifest now carries the SAME lane contract the form-spec serves.
describe('the agent contract carries the lane contract', () => {
  test('the tts manifest carries the one declaring family, keyed by family id', async () => {
    const tools = await cardToolsArm() as Array<Record<string, unknown>>
    const tts = tools.find((t) => t['name'] === 'tts')
    if (tts === undefined) throw new Error('the tts manifest serves')
    const lanes = tts['lanes'] as Record<string, Record<string, unknown>> | undefined
    expect(lanes, 'the tts card serves lanes to the agent').toBeDefined()
    // THE QWEN FOLD (2026-10-26: qwen3-tts + qwen3-tts-voicedesign
    // merged into ONE family qwen3-tts — the fold is the "Base is a
    // variant, never a third family" law's fulfillment): ONE
    // declaring family, keyed by the single family id; the three
    // flavors ride as variants and the two sizes as quants inside
    // it — never as sibling families.
    expect(Object.keys(lanes ?? {}).sort()).toEqual(['qwen3-tts'])
    const base = lanes!['qwen3-tts']!['base'] as string[]
    expect(base).toContain('text')
    // design_prompt is NOT a family-base param — it is the
    // voicedesign variant's declared input (its lane surface params
    // ["design_prompt"]), so the base must not carry it.
    expect(base).not.toContain('design_prompt')
    // THE EXPORT PAIR IS DEAD (operator 2026-10-22: "Qvoice. Is a
    // mod. It is not BAKED INTO THE DEFAULT CARD" — the qvoice
    // boolean law): the together row that fired "the persona export
    // needs both halves" is gone from the DECL, so the manifest
    // serves NO together rows; the name is the SAVE QVOICE mod's
    // one text field (the named-presence law), never a lane param.
    const relations = lanes!['qwen3-tts']!['relations'] as { together?: Array<{ fields: string[] }> }
    expect(relations?.together ?? [], 'the base tts lane declares NO together pair (the export pair is dead)').toEqual([])
    // the base lane adds the clone pair; the customvoice lane the persona
    const variants = lanes!['qwen3-tts']!['variants'] as Record<string, { params?: string[]; cells?: Record<string, { params?: string[] }> }>
    expect(variants['base']?.params).toEqual(['ref_audio', 'ref_text'])
    expect(variants['customvoice']?.params).toEqual(['voice'])
    // THE FOLDED DECL STRUCTURE (three variants, two quants — Base a
    // variant, never a third family): the design lane owns the
    // description alone (no name rides the lane — the save mod owns
    // the export), and the instruct split rides the 1.7B customvoice
    // cell (size-at-quant).
    expect(Object.keys(variants).sort()).toEqual(['base', 'customvoice', 'voicedesign'])
    expect(variants['voicedesign']?.params).toEqual(['design_prompt'])
    expect(variants['customvoice']?.cells?.['1_7b']?.params).toEqual(['style_instruction'])
  })

  test('an undeclaring card carries NO lanes key (an absent declaration is not an empty one), the declaring create card carries its five', async () => {
    // THE LAST UNDECLARED BOARDING CLOSED (the roadmap's "Also owed"
    // row): every production family declares its surface now, so the
    // absence law rides the synthetic registry view — the three
    // img-to-mesh families read paramless while the flag is up.
    mockFlags.stripParamless = true
    let undeclaring: Record<string, unknown>
    try {
      const tools = await cardToolsArm() as Array<Record<string, unknown>>
      undeclaring = tools.find((t) => t['name'] === 'img-to-mesh') as Record<string, unknown>
    } finally {
      mockFlags.stripParamless = false
    }
    if (undeclaring === undefined) throw new Error('the img-to-mesh manifest serves')
    expect(undeclaring['lanes'], 'a card whose families declare nothing says so by absence').toBeUndefined()
    // image-gen's six families declare their params since c8ea293f
    // (moss-image joins 2026-11-07)
    // (the DECL is the face one truth) — the manifest gate serves the
    // lane contract for every declaring family, never a hand row.
    const tools = await cardToolsArm() as Array<Record<string, unknown>>
    const create = tools.find((t) => t['name'] === 'image-gen')
    if (create === undefined) throw new Error('the image-gen manifest serves')
    const lanes = create['lanes'] as Record<string, unknown> | undefined
    expect(lanes, 'the create card serves lanes for its declaring families').toBeDefined()
    expect(Object.keys(lanes ?? {}).sort()).toEqual(['anima', 'flux-klein', 'krea-2', 'moss-image', 'qwen-img-21', 'z-image'])
  })

  test('a boarded family whose DECL cannot resolve serves no lane key — the manifest never breaks', async () => {
    // The lane walk probes each boarded family's DECL through
    // getModel; a family the models table cannot resolve is the
    // catch arm's shape (the cold-table state). The manifest must
    // degrade by lane OMISSION — never a broken row — while the
    // healthy families' lanes keep serving. The throw is scoped to
    // one family for the length of the call (the stripParamless
    // toggle's own pattern); the healthy five-key face right above
    // is the control this arm is judged against.
    mockFlags.throwFam = 'anima'
    let create: Record<string, unknown>
    try {
      const tools = await cardToolsArm() as Array<Record<string, unknown>>
      create = tools.find((t) => t['name'] === 'image-gen') as Record<string, unknown>
    } finally {
      mockFlags.throwFam = null
    }
    if (create === undefined) throw new Error('the image-gen manifest serves')
    expect(create['params_schema'], 'the row serves past the unresolvable lane').toBeDefined()
    const lanes = create['lanes'] as Record<string, unknown> | undefined
    expect(lanes, 'the surviving declaring families keep their lanes').toBeDefined()
    expect(Object.keys(lanes ?? {}).sort()).toEqual(['flux-klein', 'krea-2', 'moss-image', 'qwen-img-21', 'z-image'])
  })
})

describe('specVariants (the served projection of the one walk)', () => {
  test('a routeless family serves its lane whole, and its head claim as an alias with a null hint', () => {
    // The routeless family shape (the D4 pool-parity cure's own
    // unit face): no variant or cell carries a route, the key IS
    // the service, so the variant row and its cell serve the
    // family's own row; and since no row routes the family id, the
    // head claim fires — the alias row stamps nothing (empty
    // defaults, the lane is already the lane) and a hint-less lane
    // serves null (the all-ten-keys law), never undefined.
    const decl = {
      id: 'zz-spec-fam',
      variants: [
        {
          id: 'solo',
          label: 'Solo',
          group: 'Variant',
          cells: [{ quant: 'q8', label: 'Q8' }],
        },
      ],
      variant_groups: [],
    } as never
    const rows = specVariants(decl, 'zz-spec-fam')
    assert.deepEqual(
      rows.map((r) => [r.id, r.group]),
      [['solo', 'Variant'], ['q8', 'Quant'], ['solo__head', 'Variant']],
      'the variant, its routeless cell, and the head alias serve in walk order',
    )
    const head = rows[2]!
    assert.equal(head.route, 'zz-spec-fam', 'the family id is an address even when no row routes it')
    assert.equal(head.hint, null, 'a hint-less lane serves null — the all-ten-keys law')
    assert.deepEqual(head.defaults, {}, 'the alias stamps nothing')
    assert.equal(head.quant, null)
    assert.equal(head.owner, '', 'the alias owns no lane')
    // the routeless cell serves the family's own row (key === service)
    const quant = rows[1]!
    assert.equal(quant.route, '', 'the routeless cell IS the family lane')
    assert.equal(quant.owner, 'solo')
    assert.equal(quant.quant, 'q8')
  })

  test('THE SHARED QUANT VOCABULARY (operator, 2026-11-08: "Both singualarity and the other combined h3 models are VARIANTS that both have the quant of int8 … the shared vocabularity never came though") — one coordinate, one word, every variant', () => {
    // The serializer once minted a second quant word per variant
    // (first-seen keeps the plain coordinate, every sibling carries
    // `variant__quant`) to keep the FLAT served array unique. That
    // minted word is a word the DOOR refuses (selectCardVariant
    // matches the stated quant against the cell's raw coordinate — a
    // composite id exists nowhere in the facts row), served by the
    // very spec that must speak the door's language. The vocabulary
    // is SHARED across the family's variants: the row's id IS the
    // coordinate, at every address; the owner chain (the variant
    // axis) disambiguates the lane, and one variant's own cells never
    // share a coordinate (the door could not judge them apart).
    const decl = {
      id: 'zz-shared-quant',
      variants: [
        { id: 'alpha', label: 'Alpha', group: 'Variant', cells: [{ quant: 'q8', label: 'Q8 A' }] },
        { id: 'beta', label: 'Beta', group: 'Variant', route: 'zz-shared-beta', cells: [{ quant: 'q8', label: 'Q8 B' }] },
      ],
      variant_groups: [],
    } as never
    const rows = specVariants(decl, 'zz-shared-quant')
    const quants = rows.filter((r) => r.group === 'Quant')
    assert.deepEqual(
      quants.map((r) => [r.id, r.quant, r.owner]),
      [['q8', 'q8', 'alpha'], ['q8', 'q8', 'beta']],
      'both variants speak the SAME word for the shared coordinate — the owner is the disambiguator, never a minted second word',
    )
    for (const r of quants) {
      assert.equal(r.id.includes('__'), false, `the mint is dead — Quant row ${JSON.stringify(r.id)} carries no composite spelling`)
    }
  })
})
