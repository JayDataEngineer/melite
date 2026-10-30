// melite_flow walls for THE PASS ARMS the live fixtures never reach
// (vitest, fetch mocked — no gateway, no GPU). The registry stays
// UNBOOTED here on purpose: the card census degrades to its alias arm
// and the tool's own refusal voices, which is exactly the faces under
// test. Live pass truth stays in melite-flow.spec.ts (F18, the wire
// resolution law).
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { meliteFlow } from '../src/tools/melite-flow.ts'
import { fakeEstateStatus } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

const mockState = vi.hoisted(() => ({
  // Synthetic family DECLs served by getModel; every other id falls
  // through to the real registry probe (unbooted → the negative).
  decls: {} as Record<string, Record<string, unknown>>,
  // Synthetic card defs; null rides the real tree.
  defs: null as null | Map<string, unknown>,
}))

vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...orig,
    getModel: (id: string) => {
      if (id in mockState.decls) return mockState.decls[id]
      return (orig as unknown as { getModel(id: string): unknown }).getModel(id)
    },
    loadCardDefs: async () =>
      (mockState.defs ?? (await orig.loadCardDefs())) as unknown as Map<string, unknown>,
  }
})

const noLanes = () => fakeEstateStatus([])

/** One bench draft with the given stage rows (the benchGet face). */
const benchWith = (stages: Array<Record<string, unknown>>) => ({
  draft_id: 'd_arms', rev: 1, stages,
})

/** The four lanes a settled stage pass rides (F18's shapes). */
const settledLanes = (runId: string, url: string) => [
  (lane: string, _args: unknown[]) => {
    if (lane === 'runsStart') return { status: 202, body: { run_id: runId, status: 'queued' } }
    if (lane === 'runsStatus') {
      return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url }] } }
    }
    if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
    return undefined
  },
]

const run = async (
  handlers: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined>,
): Promise<Record<string, unknown>> => {
  const fake = fakeEstateStatus(handlers)
  const tool = meliteFlow(fake.estate)
  return await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
}

describe('melite_flow card — the model derive\'s honest edges (the tool\'s own voice, never the table\'s)', () => {
  test('a card id no census has heard of refuses BEFORE any estate call — nothing written to the bench', async () => {
    const fake = noLanes()
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ card: 'zz-ghost-card' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.deepEqual(out, {
      mode: 'card', target: 'zz-ghost-card',
      error: 'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card)',
    }, 'the refusal names where the family lives — the operator knows the cure without a second turn')
    assert.equal(fake.calls.length, 0, 'an unknown card never touches the estate — no draft, no bench pollution')
  })

  test('an explicit empty params.model is NO model — the derive still runs and a card boarding nothing still refuses', async () => {
    // 'frames' boards nothing (the minted-model kill): the empty
    // string must fall THROUGH the derive's first check, not satisfy
    // it — the refusal is the honest answer, not a phantom seat.
    const fake = noLanes()
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute(
      { card: 'frames', params: { model: '' } },
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.equal(
      out.error,
      'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card)',
    )
    assert.equal(fake.calls.length, 0, 'the refusal precedes every lane')
  })

  test('a family-keyed card whose owning atom cannot mint degrades to the familyless refusal — the table\'s throw never rides the tool', async () => {
    // The card id IS a served family key (the registry answers the
    // probe), but the owning atom can't resolve on this fiber: the
    // tool arm stays SILENT about the table's state and speaks its
    // own refusal — never the registry's stack.
    mockState.decls = { 'syn-fam': { id: 'syn-fam', genre: 'image', label: 'Syn' } }
    mockState.defs = new Map([['syn-fam', {
      flowKinds: { inputs: {}, outputs: {}, requiresModel: false },
      boarded: ['syn-fam'],
    }]])
    try {
      const fake = noLanes()
      const tool = meliteFlow(fake.estate)
      const out = await tool.execute({ card: 'syn-fam' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
      assert.equal(
        out.error,
        'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card)',
        'the tool\'s voice, not the models table\'s throw',
      )
      assert.equal(fake.calls.length, 0)
    } finally {
      mockState.decls = {}
      mockState.defs = null
    }
  })
})

describe('melite_flow bench — the cross-regime admission\'s quiet edges (F18)', () => {
  const h3Stage = (params: Record<string, unknown>) => [
    { id: 's_0', card: 'h3-timeline', params },
  ]

  test('an h3 stage with no armed mod bag never speaks', async () => {
    const out = await run([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith(h3Stage({})) }
        return undefined
      },
      ...settledLanes('r_quiet', '/runs/quiet.mp4'),
    ])
    assert.equal(out.status, 'done')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['warning'], undefined, 'no bag, no admission — the admission never invents a join')
  })

  test('an armed bag whose row carries no plan tier never speaks', async () => {
    const out = await run([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith(h3Stage({ replace: [{ source_clip: 'film_a' }] })) }
        }
        return undefined
      },
      ...settledLanes('r_notier', '/runs/notier.mp4'),
    ])
    assert.equal(out.status, 'done')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['warning'], undefined, 'a tier-less bag renders the doc\'s own shape — nothing to admit')
  })

  test('the admission fires off the doc\'s own defaults when the stage pins no shape', async () => {
    const out = await run([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith(h3Stage({
            extend: [{ source_clip: 'film_a', resolution: '736p' }],
          })) }
        }
        return undefined
      },
      ...settledLanes('r_defaults', '/runs/defaults.mp4'),
    ])
    assert.equal(out.status, 'done', 'the admission never refuses')
    const pass = out.pass as Array<Record<string, unknown>>
    const warning = String(pass[0]!['warning'] ?? '')
    assert.ok(warning.startsWith('h3-timeline: CROSS-REGIME JOIN'), warning)
    assert.ok(warning.includes("tier '736p' renders 1280×736"), 'the tier math reads the film defaults 1344×768')
    assert.ok(warning.includes("pin the bag's resolution 768p"), 'the pin names the shape-true tier for the default height')
  })
})

describe('melite_flow bench — the wire law\'s refusal and substitution edges', () => {
  test('a wire whose binding is not a stage ref refuses naming the raw binding — never a doomed run', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_1', card: 'image-gen', params: { model: 'anima' }, inputs: { img: { output: 'default' } } },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_1')
    assert.equal(
      out.error,
      'input "img" is neither {stage, output} nor a resolvable binding — the bench pass maps only stage wires (got {"output":"default"})',
      'the raw binding rides the refusal — the operator sees exactly what to fix',
    )
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0)
  })

  test('a null wire binding refuses in the same voice, quoting null', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_1', card: 'image-gen', params: { model: 'anima' }, inputs: { img: null } },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.ok(
      String(out.error).includes('(got null)'),
      'a null binding is named as null, not stringified into a lie: ' + String(out.error),
    )
  })

  test('an upstream whose last result is NULL is a no-output upstream — the pass stops naming the wire', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', runStatus: 'done', params: { model: 'anima' }, result: null },
            {
              id: 's_1', card: 'image-edit', params: { model: 'qwen-img-edit-21', image1: '$image1' },
              inputs: { image1: { stage: 's_0', output: 'default' } },
            },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_1')
    assert.match(
      String(out.error),
      /input "image1" is wired to stage "s_0" which has no output yet — run it first \(or clear the wire\)/,
      'the same voice a missing url answers with — a null result is no output',
    )
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0)
  })

  test('the substitution walks arrays and nested objects to the resolved url — scalar rows ride untouched', async () => {
    const url = '/melite-media/runs/r_up/generate/SaveImage.0.png'
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', runStatus: 'done', params: { model: 'anima' }, result: { run_id: 'r_up', url } },
            {
              id: 's_1', card: 'image-edit',
              params: {
                model: 'qwen-img-edit-21', image1: '$image1',
                stack: { deep: ['$image1'] },
                loras: [{ id: 'x', strength: 1 }],
              },
              inputs: { image1: { stage: 's_0', output: 'default' } },
            },
          ]) }
        }
        return undefined
      },
      ...settledLanes('r_sub', '/runs/sub.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const start = fake.calls.find((c) => c.lane === 'runsStart')
    assert.ok(start, 'the wired stage started')
    const body = start!.args[0] as Record<string, unknown>
    assert.equal(body['image1'], url, 'the bare spell resolved')
    assert.deepEqual(body['stack'], { deep: [url] }, 'the spell inside a nested array resolved')
    assert.deepEqual(body['loras'], [{ id: 'x', strength: 1 }], 'scalar rows without the spell rode untouched')
    assert.ok(!JSON.stringify(body).includes('$image1'), 'no spell rides the start body')
  })

  test('a start that throws a BARE STRING records the string verbatim and the pass presses the remaining stages', async () => {
    const fake = fakeEstateStatus([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'h3-timeline', params: {} },
            { id: 's_1', card: 'h3-timeline', params: {} },
          ]) }
        }
        if (lane === 'runsStart') {
          // A transport death is not obliged to be an Error — the
          // queue's own string rides the pass row verbatim.
          if ((args[0] as Record<string, unknown>)['bench_stage_id'] === 's_0') throw 'queue died'
          return { status: 202, body: { run_id: 'r_1', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: '/runs/second.mp4' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.deepEqual(pass[0], { stage: 's_0', card: 'h3-timeline', thrown: 'queue died' },
      'the thrown string rides verbatim — String(thrown), never "[object Object]"')
    assert.ok('run_id' in pass[1]!, 'the pass pressed the remaining stage')
    assert.equal(
      out.error,
      'stage s_0 (h3-timeline) threw (a transport or resolution error — read pass[] for the rest) (the pass still pressed the remaining stages)',
    )
  })
})
