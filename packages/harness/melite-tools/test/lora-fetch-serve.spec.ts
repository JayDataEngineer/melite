// lora-fetch-serve.spec.ts — THE MODS-BUCKET UNION + THE EXPANSION
// LOAD ARM (the operator's 2026-11-09 order, design B: "the lora
// appears in MODS"). Walls, per the canon:
//
//   1. THE RECIPE ON THE TOOL FACE — comfy_manage's description and
//      action enum carry lora_fetch and the operator's recipe
//      verbatim (an agent that never saw the burn can still execute
//      it).
//   2. THE UNION — the picker's candidate options for a family are
//      the DECL rows UNION the engine's own loras/<family>/ listing,
//      so a LoRA fetched by lora_fetch appears in mods with NO DECL
//      edit (the engine is the truth about what it will load).
//      Family-scoped by construction: only <family>/-prefixed names
//      union; DECL-served names do not duplicate; an absent engine
//      listing changes nothing (honest-absent — the picker serves its
//      DECL rows alone).
//   3. THE EXPANSION LOAD ARM — melite_load's execute re-seats the
//      deferred doors (comfy_manage among them) on EVERY call, not
//      only the discover touch (the seat the lora recipe rides: a
//      session that loads a card and then fetches a lora for it needs
//      comfy_manage seated by the load, too).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import type { Context } from '@deepseek-ai/cordis'
import { formSpecArm } from '../src/discovery.ts'
import { engineLorasListing } from '../src/discovery.ts'
import { comfyManage } from '../src/tools/comfy-manage.ts'
import { apply } from '../src/index.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate } from './fake-estate.ts'
import { cascadeInit } from '@melite/comfyui-cordis'

const FETCHED = 'krea-2/krea2_fetched.safetensors'
const FOREIGN = 'z-image/z_other.safetensors'

/** The lora options entry of a served form spec (the picker's
 *  candidate feed — the lora LAW: the ONE projection the lora
 *  picker reads; the entry rides features.modifiers). */
function loraOptions(spec: unknown): Array<Record<string, unknown>> {
  const doc = spec as { features?: { modifiers?: Array<Record<string, unknown>> } }
  const entry = (doc.features?.modifiers ?? []).find((m) => m['kind'] === 'lora')
  assert.ok(entry !== undefined, 'the krea-2 spec serves a lora modifier entry')
  const options = entry['options'] as Array<Record<string, unknown>>
  assert.ok(Array.isArray(options) && options.length > 0, 'the lora entry carries candidate options')
  return options
}

function stubEstate(): Estate {
  return fakeEstate({ manageAct: () => ({}) }).estate
}

describe('the comfy_manage tool face — the lora_fetch recipe', () => {
  test('the recipe rides the description verbatim and the action enum carries the verb', () => {
    const def = comfyManage(stubEstate()) as unknown as {
      description: string
      parameters: { properties: { action: { enum: readonly string[] } } }
    }
    // THE OPERATOR'S ORDER, VERBATIM (the tool description is the
    // agent's only curriculum — the burn's recipe rides it or no
    // agent ever executes it)
    assert.match(
      def.description,
      /add a lora to <family>: lora_fetch url → auto restart → the mod appears in the family's mods/,
    )
    assert.ok(def.parameters.properties.action.enum.includes('lora_fetch'), 'lora_fetch is a dispatchable action')
    // THE GATE PARAM IS DESCRIBED FOR THE NEW VERB TOO (never
    // self-asserted)
    assert.match(def.parameters.properties.operator_confirmed.description, /lora_fetch/)
  })
})

describe('the mods-bucket union — the engine listing joins the picker candidates', () => {
  test('a fetched engine name appears among the krea-2 candidates with NO DECL edit', async () => {
    await cascadeInit()
    const spec = await formSpecArm('krea-2', undefined, [FETCHED, FOREIGN])
    assert.ok(spec !== null, 'krea-2 resolves to a form spec')
    const options = loraOptions(spec)
    // THE FETCHED NAME IS A CANDIDATE
    const fetched = options.find((o) => o['value'] === FETCHED)
    assert.ok(fetched !== undefined, 'the fetched lora is among the candidates')
    // THE OPTION FACE: the model fact is the engine name the engine
    // will load; the tooltip names the verb that landed it
    assert.equal(fetched['model'], FETCHED)
    assert.match(String(fetched['tooltip']), /lora_fetch/)
  })

  test('the union is family-scoped: another family\u2019s files never leak into krea-2', async () => {
    await cascadeInit()
    const spec = await formSpecArm('krea-2', undefined, [FETCHED, FOREIGN])
    const options = loraOptions(spec)
    assert.equal(
      options.find((o) => o['value'] === FOREIGN),
      undefined,
      'a z-image file is not a krea-2 candidate',
    )
  })

  test('names a DECL row already serves do not duplicate', async () => {
    await cascadeInit()
    // krea2_realism_lora is a DECLARED row (packages/models/krea-2/
    // mods/loras.ts) — the engine listing carrying it must not mint a
    // second candidate; the DECL row wins (its label/default face is
    // the richer one).
    const spec = await formSpecArm('krea-2', undefined, ['krea-2/krea2_realism_lora.safetensors', FETCHED])
    const options = loraOptions(spec)
    const rows = options.filter((o) => String(o['value']).includes('krea2_realism_lora'))
    assert.equal(rows.length, 1, 'the declared row serves exactly once')
    assert.notEqual(String(rows[0]?.['value']), 'krea-2/krea2_realism_lora.safetensors', 'the surviving row is the DECL row\u2019s own id, not a union mint')
  })

  test('honest-absent: no engine listing (or an absent one) leaves the DECL-only candidates untouched', async () => {
    await cascadeInit()
    const alone = await formSpecArm('krea-2')
    const withAbsent = await formSpecArm('krea-2', undefined, Promise.resolve(undefined))
    assert.ok(alone !== null && withAbsent !== null)
    assert.deepEqual(loraOptions(withAbsent), loraOptions(alone))
  })

  test('the live reader: engineLorasListing answers the engine\u2019s own combo names, honestly absent when the engine is not', async () => {
    // No engine in this process — the honest-absent contract: the
    // listing is undefined, never a thrown refusal and never an
    // invented roster.
    const listing = await engineLorasListing(50)
    assert.equal(listing, undefined)
  })
})

describe('the expansion law — the load arm re-seats the deferred doors', () => {
  test('melite_load\u2019s execute seats comfy_manage (the recipe\u2019s own door)', async () => {
    const registered: Array<{ name: string }> = []
    const ctx = {
      logger: { info: (..._args: unknown[]) => {}, warn: () => {} },
      effect: (fn: () => void) => { fn(); return () => {} },
      inject: (_names: readonly string[], _fn: (ctx: unknown) => void) => {},
      tools: {
        register: (def: { name: string }) => { registered.push(def); return () => {} },
        schemas: () => registered.map((d) => ({ name: d.name })),
      },
      get: (_name: string) => undefined,
    }
    await apply(ctx as unknown as Context)
    assert.ok(!registered.map((r) => r.name).includes('comfy_manage'), 'deferred doors stay unseated at apply')
    // THE LOAD ARM: melite_load's execute calls the expansion seat
    // FIRST (before arg validation) — a session that loads a card can
    // then fetch a lora for it with comfy_manage seated. The execute
    // itself may refuse on the fake host (no estate); the seat does
    // not care.
    const load = registered.find((r) => r.name === 'melite_load') as unknown as {
      execute?: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown>
    }
    assert.ok(load?.execute !== undefined, 'melite_load is seated')
    // VALID ARGS — defineTool's wrapper validates required params
    // (name / inference_type) BEFORE the body runs, so the arm must
    // pass the wrapper to reach the expansion call the body opens
    // with. The execute itself may still refuse on the fake host (no
    // estate service); the seat does not care.
    await load
      .execute({ name: 'krea-2', inference_type: 'card' }, { signal: new AbortController().signal })
      .catch(() => {})
    assert.ok(
      registered.map((r) => r.name).includes('comfy_manage'),
      'the load arm seated the deferred doors (comfy_manage among them)',
    )
  })
})
