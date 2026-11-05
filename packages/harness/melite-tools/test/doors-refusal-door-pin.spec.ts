// @contract flows-refusal-door-pin
// doors-refusal-door-pin.spec.ts — THE NAMED-DOOR WALL (the F20 canon:
// "a refusal naming a door must have the door"; the qa8 F22 residual,
// 2026-11-01: utility cards board [] by design and card-mode
// melite_flow refuses them with a cure voice — the wall pins that the
// cure voice's doors are real).
//
// Three arms, one law: the REAL refusal names its cure doors (the
// family pick through melite_load AND the bench path through
// melite_construct); the named doors sit in the SAME toolset the
// refusing tool sits in (reachability — an agent that can press
// melite_flow can open both named doors); and the family door
// DELIVERS what the refusal promises (melite_load lists the boarded
// families on the card).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { meliteFlow } from '../src/tools/melite-flow.ts'
import { meliteLoad } from '../src/tools/melite-load.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'
import { apply, RUN_DOOR_NAMES, EAGER_TOOL_NAMES } from '../src/index.ts'
import { writeRunsDelegation } from '../src/runsDelegation.ts'

const exec = () => fakeExec(AbortSignal.timeout(15000))

/** A REAL card whose board is empty — the refusal's actual subject
 *  (the qa8 burn rode the utility cards), derived live off the real
 *  card defs, never a hand-baked id list. */
async function familylessCard(): Promise<string> {
  const defs = await loadCardDefs()
  for (const [id, def] of defs) {
    if (Array.isArray(def.boarded) && def.boarded.length === 0) return id
  }
  throw new Error('no familyless card in the live defs — the wall needs its subject')
}

describe('the model-required refusal names real doors', () => {
  test('the real refusal ride names both cure doors (the family pick and the bench path)', async () => {
    const card = await familylessCard()
    const { estate } = fakeEstate({})
    const out = await meliteFlow(estate).execute({ card }, exec()) as { mode?: string; target?: string; error?: string }
    assert.equal(out.mode, 'card', 'the card-mode refusal echoes its mode')
    assert.equal(out.target, card)
    assert.match(String(out.error), /model is required/)
    assert.match(String(out.error), /melite_load lists the boarded families/,
      'the family-pick door is named')
    assert.match(String(out.error), /melite_construct add_stage/,
      'the bench path is named (the qa8 residual: utility cards run as bench stages)')
  })

  test('the named doors sit in the toolset the refusing tool sits in (delegated co-seat)', async () => {
    // the isolated-home rig (index.spec's law): apply reads persisted
    // runs-delegation state — never off the spec's own DSH_HOME.
    const previousHome = process.env.DSH_HOME
    const home = mkdtempSync(join(tmpdir(), 'doors-refusal-pin-'))
    process.env.DSH_HOME = home
    try {
      const registered: Array<{ name: string }> = []
      const ctx = {
        logger: { info: () => {}, warn: () => {} },
        effect: (fn: () => void) => { fn(); return () => {} },
        inject: () => {},
        tools: { register: (def: { name: string }) => { registered.push(def); return () => {} }, schemas: () => [] },
        get: () => undefined,
      }
      assert.equal(writeRunsDelegation({ delegated: true }), undefined)
      await apply(ctx as never)
      const names = registered.map((r) => r.name)
      for (const door of ['melite_load', 'melite_construct', ...RUN_DOOR_NAMES]) {
        assert.ok(names.includes(door), 'the named door ' + door + ' is registered beside the refusing tool')
      }
      assert.ok(RUN_DOOR_NAMES.includes('melite_flow'), 'the refusing tool is the delegated boot\'s run door')
      assert.ok(EAGER_TOOL_NAMES.includes('melite_load') && EAGER_TOOL_NAMES.includes('melite_construct'),
        'the named doors are eager — seated at boot, never deferred behind a catalog touch')
    } finally {
      if (previousHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previousHome
      rmSync(home, { recursive: true, force: true })
    }
  })

  test('the family door delivers what the refusal promises — the load lists the boarded family', async () => {
    // the card bundle's signature carries the boarded families as the
    // semantic model style (family:variant:cell) + the model enum —
    // the seat the refusal's promise points at (melite-load.ts, the
    // seatFams derivation + the signature model line). The render arm
    // is the model-facing face (the melite-load.spec rig).
    const tool = meliteLoad(fakeEstate({}).estate)
    const parts = tool.output.render(
      { name: 'image-gen', inference_type: 'card' },
      {
        name: 'image-gen', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'image-gen',
          signature: {
            model: 'qwen-image:base:cell',
            params_schema: { properties: { model: { enum: ['qwen-image:base:cell', 'qwen-image-edit:base:cell'] } } },
          },
        },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.match(text, /signature model: qwen-image:base:cell/, 'the boarded family is listed on the card')
  })
})
