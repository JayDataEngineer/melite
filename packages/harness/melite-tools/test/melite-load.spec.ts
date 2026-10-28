// melite_load walls (vitest, estate mocked — no gateway, no
// network). Pins the thin load face over the load seat:
//   1. ARGS: name is required (empty refuses as a VALUE); the
//      inference_type gate admits exactly card|flow, nothing else.
//   2. WIRE: one loadCard lane call (inference_type, name, signal,
//      20s budget); the seat bundle rides the value verbatim.
//   3. REFUSALS ride the value (body text > message > 'load
//      failed'), echoing the requested name/inference_type.
//   4. PRESENTATION: Load <name> card; render names the loaded
//      bundle (REFUSED on refusal) and never throws on junk.
//
// MIGRATION LAW (F-1, 2026-11-05): the tool surface's OBSERVABLE
// behavior is byte-stable — every assertion about result text/schema/
// shape stays exactly as written; arms that asserted a URL SPELLING
// re-rolled to assert the TYPED LANE the tool rode
// (seen = { lane: 'loadCard', args: [inferenceType, name, signal, timeoutMs] }).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { meliteLoad } from '../src/tools/melite-load.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

// The typed-lane mock (F-1, 2026-11-05): the tool plane's tests stub
// the ESTATE seam, never a URL transport. `seen` records the lane a
// tool rode; loadCard is this spec's one lane.
function mockEstate(handler: (inferenceType: string, name: string) => unknown): {
  seen: Array<{ lane: string; args: unknown[] }>;
  estate: Estate;
} {
  const { estate, seen } = fakeEstate({
    loadCard: (inferenceType: string, name: string) => handler(inferenceType, name),
  })
  return { seen, estate }
}

function stubEstate(): Estate {
  return fakeEstate({ loadCard: () => ({}) }).estate
}

function exec() {
  return fakeExec(AbortSignal.timeout(5000))
}

describe('melite_load presentCall — the Load card', () => {
  test('names the requested bundle', () => {
    const tool = meliteLoad(stubEstate())
    const view = tool.presentCall!({ name: 'upscale-tools', inference_type: 'card' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Load upscale-tools')
    assert.equal(view?.kind, 'search')
  })

  test('junk names are refused by the gate (single seat — no re-attached fallback)', () => {
    const tool = meliteLoad(stubEstate())
    // (§7 P7: name/inference_type are required — the gate owns the
    // invalid face.)
    assert.equal(tool.presentCall!({}), undefined)
    assert.equal(tool.presentCall!({ name: '' }), undefined)
    assert.equal(tool.presentCall!(null), undefined)
  })
})

describe('melite_load execute — the arg gates', () => {
  test('an empty name refuses as a value (discover it first)', async () => {
    const { seen, estate } = mockEstate(() => ({ bundle: {} }))
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: '', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'name is required (discover it first)')
    assert.equal(out.name, '')
    assert.equal(out.inference_type, 'card')
    assert.equal(seen.length, 0)
  })

  test('anything but card|flow refuses as a value', async () => {
    const { seen, estate } = mockEstate(() => ({ bundle: {} }))
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'bogus' }, exec()) as Record<string, unknown>
    assert.ok(String(out.error).includes('inference_type must be card|flow'))
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'bogus')
    assert.equal(seen.length, 0)
  })
})

describe('melite_load execute — the load lane', () => {
  test('a card load rides the loadCard lane on the 20s budget and returns the bundle', async () => {
    const bundle = { kind: 'card', name: 'my card', skills: [{ id: 's1' }] }
    const { seen, estate } = mockEstate(() => ({ name: 'my card', inference_type: 'card', bundle }))
    const tool = meliteLoad(estate)
    const e = exec()
    const out = await tool.execute({ name: 'my card', inference_type: 'card' }, e) as Record<string, unknown>
    assert.deepEqual(out.bundle, bundle)
    assert.equal(out.name, 'my card')
    assert.equal(out.inference_type, 'card')
    // the tool plane speaks the typed lanes; the URL grammar is the
    // browser face's.
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.lane, 'loadCard')
    assert.deepEqual(seen[0]!.args.slice(0, 2), ['card', 'my card'])
    assert.equal(seen[0]!.args[2], e.signal)
    assert.equal(seen[0]!.args[3], 20_000)
  })

  test('a flow load rides inference_type=flow', async () => {
    const { seen, estate } = mockEstate(() => ({ name: 'f', inference_type: 'flow', bundle: { kind: 'flow' } }))
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'f', inference_type: 'flow' }, exec()) as Record<string, unknown>
    assert.equal((out.bundle as { kind: string }).kind, 'flow')
    // the tool plane speaks the typed lanes; the URL grammar is the
    // browser face's — same intent: inference_type + name ride in order.
    assert.deepEqual(seen[0]!.args.slice(0, 2), ['flow', 'f'])
  })

  test('a nullish seat answer echoes the args (never a crash)', async () => {
    const { seen, estate } = mockEstate(() => null)
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'card')
    assert.equal(out.bundle, undefined)
    assert.equal(seen.length, 1)
  })
})

describe('melite_load execute — refusals ride the value', () => {
  test('a body-carried refusal wins', async () => {
    const { estate } = mockEstate(() => { throw { body: 'seat says no', message: 'wrapped' } })
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'seat says no')
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'card')
  })

  test('an empty body falls back to the message', async () => {
    const { estate } = mockEstate(() => { throw { body: '', message: 'door message' } })
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'door message')
  })

  test('a plain Error rides its message', async () => {
    const { estate } = mockEstate(() => { throw new Error('boom') })
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'flow' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'boom')
  })

  test('a bare throw rides the default text', async () => {
    const { estate } = mockEstate(() => { throw 'bare failure' })
    const tool = meliteLoad(estate)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'load failed')
  })
})

describe('melite_load render — the loaded line', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', error: 'nope' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_load REFUSED: nope')
  })

  test('THE BUNDLE RIDES (params, models, skills, digest, agents — the follow-up call needs them)', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card', detail: true },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          skills: [{ id: 's1' }],
          model_hints: [{ description: 'MusicGen checkpoint', present: false }],
          signature: { params_schema: { properties: { prompt: {}, seed: {} }, required: ['prompt'] } },
          digest: 'abc123',
          agents: [{ path: 'AGENT.md', text: 'craft doc' }],
        },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'loaded card c — compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press\n'
      + 'weights: 0/1 boarded checkpoints present on this machine (provisioning is the estate\'s business — compose the card)\n'
      + 'params: prompt*, seed (* required)\n'
      + 'skills: 1 — read one with melite_skill_read: s1\n'
      + 'digest: abc123 (quote it to skip a reload)\n'
      + 'agents md:\n'
      + 'craft doc',
    )
  })

  test('THE CARD-OWNED CRAFT LINE (slice 6): the digest serves the style law in ONE line, and only when the card declares one', () => {
    // H5's split: the CONTENT style is one digest line (the agent used
    // to read a craft manual per request); the FORMATTING law rides the
    // write door, never this line.
    const tool = meliteLoad(stubEstate())
    const voice = (craft?: { prompt_hint?: string }): string => {
      const parts = tool.output.render(
        { name: 'c', inference_type: 'card' },
        {
          name: 'c', inference_type: 'card',
          bundle: {
            kind: 'card', name: 'c', digest: 'd1',
            ...(craft !== undefined ? { craft } : {}),
            signature: { params_schema: { properties: { prompt: {} }, required: ['prompt'] } },
          },
        } as never,
      ) as Array<{ text?: string }>
      return parts.map((p) => p?.text ?? '').join('\n')
    }
    assert.match(voice({ prompt_hint: 'prose — style suffix LAST' }), /^prompt style: prose — style suffix LAST$/m, 'the digest states the style law')
    assert.ok(!voice().includes('prompt style:'), 'a card with no craft law serves no line (the no-op law)')
  })

  test('EVERY SKILL RIDES ITS DESCRIPTION, and a prompt-enhance skill routes the prompt law (2026-10-02)', () => {
    // THE OPERATOR'S LIVE BREAK: "it chooses anima but never reads the
    // prompt guide unless I tell it too — the LLM writes plaintext
    // instead of booru tags". The bundle already carried
    // `model:anima:prompt-enhance` (proven on the live lane), but the
    // render printed bare ids, so nothing said WHICH skill carried the
    // model's prompting style or that the style changes per model. Two
    // renders pin the cure: the description rides each entry, and the
    // presence of a prompt-enhance skill states the duty.
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          skills: [
            { id: 'model:anima', description: 'Anima model row' },
            { id: 'model:anima:prompt-enhance', description: 'Anima prompt rules — comma-separated Danbooru tags, NOT prose (read before writing an anima prompt)' },
          ],
          signature: { params_schema: { properties: { prompt: {} }, required: ['prompt'] } },
        },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.match(text, /model:anima — Anima model row/)
    assert.match(text, /model:anima:prompt-enhance — Anima prompt rules — comma-separated Danbooru tags, NOT prose/)
    assert.match(text, /^prompting: read the per-model prompt rules with melite_skill_read BEFORE writing a prompt/m)
    // THE SINGLE-OWNER LAW (friction-report #12, 2026-10-28): the
    // line states the duty, never the style — the skill description
    // above owns the rule, so the echo below would rot.
    assert.doesNotMatch(text, /comma tags for the anime models/)
  })

  test('a bundle with NO prompt-enhance skill states no prompting law (the line never invents one)', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          skills: [{ id: 'card:c:craft', description: 'the craft doc' }],
          signature: { params_schema: { properties: { prompt: {} }, required: ['prompt'] } },
        },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.doesNotMatch(text, /^prompting:/m)
    assert.match(text, /card:c:craft — the craft doc/)
  })

  test('THE LANE LINE RENDERS THE ROW TYPES (required/at_most_one rows are {fields,any_of} objects; variant laws ride)', () => {
    // 2026-10-10, the DECL audit's row 1: the render cast required
    // and at_most_one to string[] — the DECL rows are {fields, cure?}
    // OBJECTS, so every tts lane line said
    // "required([object Object])" to the composing agent, and a
    // variant that tightens the law (its own relations/bounds, which
    // the serve carries) rendered nothing. The golden line below is
    // the whole contract: the words in the row's true shape, the
    // any_of one-of anchor named as one-of, and the variant's own
    // laws in brackets on the variant itself.
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'tts', inference_type: 'card', detail: true },
      {
        name: 'tts', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'tts',
          signature: {
            lanes: {
              'qwen3-tts': {
                base: ['text', 'voice'],
                relations: {
                  together: [{ fields: ['voice_name', 'design_prompt'] }],
                  conflicts: [{ a: 'voice_name', b: 'style_instruction' }],
                  required: [
                    { fields: ['text'], cure: 'the lane speaks words' },
                    { fields: ['input_images', 'image1'], any_of: true, cure: 'the anchor' },
                  ],
                  at_most_one: [{ fields: ['voice', 'qvoice'] }],
                },
                bounds: { width: { min: 512, max: 1536 } },
                variants: {
                  customvoice: {
                    params: ['ref_audio', 'ref_text'],
                    relations: { required: [{ fields: ['ref_audio'] }] },
                    bounds: { steps: { min: 4, max: 8 } },
                  },
                },
              },
            },
          },
        },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    const lane = text.split('\n').find((l) => l.startsWith('lane qwen3-tts:')) ?? ''
    assert.ok(lane.includes('base text, voice'), lane)
    assert.ok(lane.includes('together(voice_name × design_prompt)'), lane)
    assert.ok(lane.includes('conflicts(voice_name × style_instruction)'), lane)
    assert.ok(lane.includes('required(text)'), 'the row object renders its fields: ' + lane)
    assert.ok(lane.includes('required-one-of(input_images | image1)'), 'the any_of anchor renders as a one-of: ' + lane)
    assert.ok(lane.includes('at_most_one(voice | qvoice)'), lane)
    assert.ok(lane.includes('bounds(width 512…1536)'), lane)
    assert.ok(
      lane.includes('customvoice +ref_audio, ref_text [required(ref_audio), bounds(steps 4…8)]'),
      'the variant\'s own relations and bounds ride on the variant line: ' + lane,
    )
    assert.ok(!lane.includes('[object Object]'), 'the string[] cast is dead: ' + lane)
  })

  test('EVERY DECLARED WORD SPEAKS (the requires row and the variant sampler domain — the DECL audit gaps 2 + 7)', () => {
    // 2026-10-10: the render listed four of the six relation words
    // (requires and the variant's sampler_envelope were dropped), so
    // a lane that declared them still told the agent nothing. These
    // two arms are the whole difference between a contract the agent
    // can read and one it learns by refusal.
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'image-gen', inference_type: 'card', detail: true },
      {
        name: 'image-gen', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'image-gen',
          signature: {
            lanes: {
              'krea-2': {
                base: ['prompt'],
                relations: {
                  requires: [{ field: 'realism', needs: ['strength'] }],
                },
                variants: {
                  turbo: {
                    params: ['steps'],
                    // the producer's shape (the lane contract merges
                    // sampler_envelope into bounds — one spelling)
                    bounds: { steps: { min: 4, max: 8 }, cfg: { min: 1, max: 2 } },
                  },
                },
              },
            },
          },
        },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    const lane = text.split('\n').find((l) => l.startsWith('lane krea-2:')) ?? ''
    assert.ok(lane.includes('requires(realism → strength)'), 'the requires word speaks: ' + lane)
    assert.ok(
      lane.includes('bounds(steps 4…8, cfg 1…2)'),
      'the variant sampler domain speaks through its bounds span: ' + lane,
    )
  })

  test('THE EDGE CELLS RIDE (label-less hints, junk required rows, ref-fallback skills, the 9-row clamp, stages, signature model)', () => {
    const tool = meliteLoad(stubEstate())
    const skills = [{ id: 'a' }, { ref: 'r-only' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }, { id: 'h' }]
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card', detail: true },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          model_hints: [{ description: 'm1 checkpoint', present: false }],
          signature: {
            model: 'fam-x',
            params_schema: { properties: { prompt: {}, seed: {} }, required: ['prompt', 7] },
          },
          stages: [{ id: 's1', card: 'c1' }],
          skills,
          digest: 'abc123',
          agents: [{ path: 'AGENT.md', text: 'craft doc' }],
        },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'loaded card c — compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press\n'
      + 'weights: 0/1 boarded checkpoints present on this machine (provisioning is the estate\'s business — compose the card)\n'
      + 'params: prompt*, seed (* required)\n'
      + 'signature model: fam-x\n'
      + 'stages: s1:c1\n'
      + 'skills: 9 — read one with melite_skill_read: a, r-only, b, c, d, e, f, g …\n'
      + 'digest: abc123 (quote it to skip a reload)\n'
      + 'agents md:\n'
      + 'craft doc',
    )
  })

  test('a null-properties signature renders no params and no model line', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: { kind: 'card', name: 'c', signature: { params_schema: { properties: null } } },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded card c — compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })

  test('a bundless value renders the header alone', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })

  test('a nullish value still renders the header line', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render({ name: 'c', inference_type: 'card' }, null as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })
})

describe('melite_load render — THE INTERFACE LAW (the agent-mode breakdown, 2026-09-13)', () => {
  // The browser interface registers NO melite_flow (compose-only —
  // the user's Run press is the start door). A load hint naming
  // melite_flow there sends the model hunting a phantom verb until
  // it breaks down (the caught trajectory: load → add_stage lands →
  // no run verb anywhere → flailing into comfy_manage). The hint
  // names the door THIS agent actually has.
  test('the browser face (default) never names melite_flow', () => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c' } } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(!text.includes('melite_flow'), 'the browser face must not name the headless verb: ' + text)
    assert.ok(text.includes('melite_construct') && text.includes("live in the user's cards tab") && text.includes("user's Run press"), text)
  })

  test('the headless face keeps the execution verb', () => {
    const tool = meliteLoad(stubEstate(), { headless: true })
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c' } } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(text.startsWith('loaded card c — open with melite_flow'), text)
  })

  // THE FLOW SENTENCE (batch-5 closure, 2026-10-14 — O25l): a flow
  // load in the compose face tells the agent the honest split — run
  // doors, not add_stage hunting — while its card stages stay
  // benchable. The empty lane and the bare signature model ride the
  // same render block.
  test('a flow load speaks the run-door split; an empty lane speaks its refusal law; a bare model speaks', () => {
    const tool = meliteLoad(stubEstate())
    const render = (bundle: unknown): string =>
      (tool.output.render({ name: 'x', inference_type: 'flow', detail: true }, { name: 'x', inference_type: 'flow', bundle } as never) as Array<{ text?: string }>)
        .map((p) => p?.text ?? '').join('\n')
    // 1) the flow split, verbatim
    const flow = render({ kind: 'flow', name: 'f' })
    assert.ok(flow.startsWith('loaded flow f — it is a flow, not a card — drive it through the run doors; its card stages may also be benched with melite_construct (add_stage), and its family.action stages compose when the flow runs'), flow)
    // 2) a lane that declares NOTHING still names the refusal law
    const empty = render({ kind: 'card', name: 'c', signature: { lanes: { fam: {} } } })
    const laneLine = empty.split('\n').find((l) => l.startsWith('lane fam:')) ?? ''
    assert.equal(laneLine, 'lane fam: no declared base — a field outside this lane REFUSES at the bench door (add_stage/patch), named, with the cure')
    // 3) a signature with only a model: the model line serves, and
    //    no lane line renders when lanes are absent
    const model = render({ kind: 'card', name: 'c', signature: { model: 'qwen-x' } })
    assert.ok(model.includes('signature model: qwen-x'), model)
    assert.equal(model.split('\n').some((l) => l.startsWith('lane ')), false)
  })
})

test('THE MODS LINE RIDES (stroke 79 — the agent sees the kinds beside params)', () => {
  const tool = meliteLoad(stubEstate())
  const parts = tool.output.render(
    { name: 'mask', inference_type: 'card', detail: true },
    {
      name: 'mask', inference_type: 'card',
      bundle: {
        kind: 'card', name: 'mask',
        signature: {
          params_schema: { properties: { input_image: {} }, required: ['input_image'] },
          modifiers: [
            { kind: 'sam3', category: 'standalone', fields: ['prompt'] },
            { kind: 'draw', category: 'ordered', fields: ['payload'] },
            null,
          ],
        },
      },
    } as never,
  ) as Array<{ text?: string }>
  const text = parts.map((p) => p?.text ?? '').join('\n')
  assert.ok(text.includes('params: input_image* (* required)'), 'params still ride')
  // THE FAMILY-PACK SEATS (022's self-critique #3): the mods line
  // carries each kind's FIELD names beside the category — the
  // compose grammar the maker had to grep card.ts for.
  assert.ok(text.includes('mods: sam3[] (standalone; fields: prompt), draw[] (ordered; fields: payload)'), 'the kinds + categories + fields ride')
  // THE BENCH-GRAMMAR-FIRST LAW (032/033, 2026-09-24): the bench
  // grammar leads (makers compose on melite_construct, whose door
  // REFUSES arrays under kind keys) and quotes the door's own
  // voice; bag-mode is scoped to flow_inline/ad-hoc ONLY.
  assert.ok(text.includes('THE BENCH GRAMMAR (melite_construct add_stage/patch, where you compose)'), 'the bench grammar leads')
  assert.ok(text.includes('its fields ride flat top-level'), 'the door voice is quoted')
  assert.ok(text.includes('bag-mode arrays under the kind keys exist ONLY for flow_inline/ad-hoc stages (melite_flow {flow}, never the bench)'), 'bag-mode is scoped, never leading')
  // THE CARD-DECLARED ORDERED EXCEPTION (friction-report #2,
  // 2026-10-28): pack-mod fields ride flat, but a card's OWN
  // ordered kinds ride params.<param_key> as an array on every
  // door — the agent that flattens a bag seat (replace's entry
  // fields) burns an unknown-param(s) refusal it can never fix by
  // reading the flat law. The bundle states the exception beside
  // the bag-mode scope, with the container spelling.
  assert.ok(text.includes('CARD-DECLARED ORDERED EXCEPTION'), 'the ordered-bag exception rides')
  assert.ok(text.includes('params {replace: [{source_clip, still, mannequin, mask, swap_prompt, ...}]}'), 'the bag container spelling is stated')
  // THE VARIANT SEAT (025's self-critique #4): the lane select
  // rides inside card-mode params — stated, never guessed.
  assert.ok(text.includes('card-mode lane select'), 'the variant seat is stated')
  assert.ok(text.includes("params {variant: 'customvoice'}"), 'the seat shape is spelled')
  // 026#3: model rides top-level while variant rides inside —
  // both seats stated, the params.model misread dies here.
  // (batch U: the grammar now names the tts exception — the model
  // seat is stated AND the one card-family that reads it from
  // params is named beside it, so the seats cannot conflate.)
  assert.ok(text.includes('`model` selector rides top-level'), 'the model seat is stated')
  assert.ok(text.includes('ONE named exception'), 'the tts params.model exception is named')
  assert.ok(text.includes("params {model: 'qwen3-tts-large'}"), 'the exception seat shape is spelled')
  // kindless cards stay line-less (never an empty mods line)
  const plain = tool.output.render(
    { name: 'c', inference_type: 'card' },
    { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c', signature: { params_schema: { properties: { p: {} } } } } },
  ) as Array<{ text?: string }>
  assert.ok(!(plain.map((p) => p?.text ?? '').join('\n').includes('mods:')), 'no mods line without kinds')
})

// THE LANE LINE RIDES THE LOAD BUNDLE (2026-10-10): the agent's read
// surface states which fields each declared lane accepts and which
// pairs the relation words bind — the same declaration the form
// renders and the bench door refuses on, so the agent composes from
// it instead of learning it from a refusal.
describe('melite_load render — the lane line', () => {
  const bundleWithLanes = {
    kind: 'card',
    name: 'tts',
    signature: {
      model: 'qwen3-tts-voicedesign',
      params_schema: { properties: { text: {} }, required: [] },
      lanes: {
        'qwen3-tts': {
          base: ['text', 'design_prompt', 'voice_name'],
          relations: {
            together: [{ fields: ['voice_name', 'design_prompt'] }],
            conflicts: [{ a: 'voice_name', b: 'qvoice' }],
            either_or: [{ groups: [['ref_audio', 'ref_text'], ['qvoice']] }],
          },
          variants: {
            customvoice: { params: ['voice'] },
            base: { params: ['ref_audio', 'ref_text'] },
          },
        },
      },
    },
  }
  const text = (bundle: unknown): string => {
    const tool = meliteLoad(stubEstate())
    const parts = tool.output.render(
      { name: 'tts', inference_type: 'card', detail: true },
      { name: 'tts', inference_type: 'card', bundle } as never,
    ) as Array<{ text?: string }>
    return parts.map((p) => p?.text ?? '').join('\n')
  }
  test('the declared lane rides as one line with its base, its variants, and its laws', () => {
    const t = text(bundleWithLanes)
    assert.ok(t.includes('lane qwen3-tts'), t.slice(0, 400))
    assert.ok(t.includes('base text, design_prompt, voice_name'), t.slice(0, 600))
    assert.ok(t.includes('customvoice +voice'), t.slice(0, 600))
    assert.ok(t.includes('base +ref_audio, ref_text'), t.slice(0, 600))
    assert.ok(t.includes('together(voice_name × design_prompt)'), t.slice(0, 800))
    assert.ok(t.includes('conflicts(voice_name × qvoice)'), t.slice(0, 800))
    assert.ok(t.includes('either_or((ref_audio × ref_text) | (qvoice))'), t.slice(0, 900))
    assert.ok(t.includes('REFUSES at the bench door'), t.slice(0, 900))
  })
  test('a legacy bundle states no lane line at all (absence is the legacy truth)', () => {
    const t = text({ kind: 'card', name: 'image-gen', signature: { model: 'krea-2', params_schema: { properties: { prompt: {} }, required: [] } } })
    assert.ok(!t.includes('lane '), t.slice(0, 300))
  })
})
