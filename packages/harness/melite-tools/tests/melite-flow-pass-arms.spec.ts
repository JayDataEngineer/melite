// melite_flow walls for THE PASS ARMS the live fixtures never reach
// (vitest, fetch mocked — no gateway, no GPU). The registry stays
// UNBOOTED here on purpose: the card census degrades to its alias arm
// and the tool's own refusal voices, which is exactly the faces under
// test. Live pass truth stays in melite-flow.spec.ts (F18, the wire
// resolution law).
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { meliteFlow, pressBudgetMs } from '../src/tools/melite-flow.ts'
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

// The h3 lane seats, spied for the absent-lane arm below: every
// other test rides the REAL seats (the spy's original IS the
// module's own export, memoization and all); the absent-lane arm
// overrides both to resolve null for exactly its own press.
vi.mock('../src/tools/h3-lane-seats.ts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/tools/h3-lane-seats.ts')>()
  return {
    ...orig,
    h3ModelSeat: vi.fn(orig.h3ModelSeat),
    h3CardSeat: vi.fn(orig.h3CardSeat),
  }
})

const noLanes = () => fakeEstateStatus([])

/** One bench draft with the given stage rows (the benchGet face). */
const benchWith = (stages: Array<Record<string, unknown>>) => ({
  draft_id: 'd_arms', rev: 1, stages,
})

/** The same bench with a history: one non-reverted load entry (the
 *  retired press's landing — the marker doc the ghost wall seeds in
 *  exactly this shape). */
const benchWithLog = (stages: Array<Record<string, unknown>>) => ({
  draft_id: 'd_arms', rev: 1, stages,
  log: [{ rev: 1, at: 1, author: 'agent', kind: 'load', summary: 'load 1 stages' }],
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
  return await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
}

describe('melite_flow card — the model derive\'s honest edges (the tool\'s own voice, never the table\'s)', () => {
  test('a card id no census has heard of refuses BEFORE any estate call — nothing written to the bench', async () => {
    const fake = noLanes()
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ card: 'zz-ghost-card' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.deepEqual(out, {
      mode: 'card', target: 'zz-ghost-card',
      error: 'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card); a card with no family runs as a bench stage instead (melite_construct add_stage composes it without a family)',
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
    ) as Record<string, unknown>
    assert.equal(
      out.error,
      'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card); a card with no family runs as a bench stage instead (melite_construct add_stage composes it without a family)',
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
      const out = await tool.execute({ card: 'syn-fam' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
      assert.equal(
        out.error,
        'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card); a card with no family runs as a bench stage instead (melite_construct add_stage composes it without a family)',
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

  test('an absent h3 lane quiets the admission — the plugin law, tools side: a null seat is quiet, never a refusal', async () => {
    // The seats resolve null when @melite/models-h3 or the
    // h3-timeline card package is absent from the install. The
    // admission NEVER speaks without its lanes (with the lane
    // absent there is no stage to warn about) — and the press
    // itself proceeds: the flow's own door owns any real refusal.
    const { h3ModelSeat, h3CardSeat } = await import('../src/tools/h3-lane-seats.ts')
    vi.mocked(h3ModelSeat).mockResolvedValue(null)
    vi.mocked(h3CardSeat).mockResolvedValue(null)
    try {
      const out = await run([
        (lane: string) => {
          if (lane === 'benchGet') {
            return { status: 200, body: benchWith(h3Stage({
              extend: [{ source_clip: 'film_a', resolution: '736p' }],
            })) }
          }
          return undefined
        },
        ...settledLanes('r_lane_gone', '/runs/lane-gone.mp4'),
      ])
      assert.equal(out.status, 'done', 'the absent lane never refuses the press')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass[0]!['warning'], undefined, 'a null seat admits nothing — the same armed bag that fires with the lane seated stays quiet without it')
    } finally {
      vi.mocked(h3ModelSeat).mockRestore()
      vi.mocked(h3CardSeat).mockRestore()
    }
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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

describe('melite_flow bench — the done mark requires a last run (qa8 GAPS-12/F19)', () => {
  const textOf = (tool: ReturnType<typeof meliteFlow>, out: Record<string, unknown>): string =>
    (tool.output?.render?.({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')

  test('a done row WITH result memory skips carrying last_run — the unchanged claim is earned', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'tts', runStatus: 'done', params: {}, result: { run_id: 'r_old', url: '/runs/old.flac' } },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.deepEqual(out.pass, [{ stage: 's_0', card: 'tts', skipped: 'done', last_run: 'r_old' }])
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'the grounded mark still skips — no re-run')
    assert.ok(
      textOf(tool, out).includes('s_0 tts [skipped done — unchanged since its last run; patch a param VALUE to re-run]'),
      'a mark WITH a run behind it earns the unchanged claim',
    )
  })

  test('W-9 arm 3 (THE WALL): the skip teacher names the VALUE — the any-patch reading dies at this seat', async () => {
    // RG-P4-1b (2026-11-05): the old "patch params to re-run" taught
    // any-patch-re-runs, but the estate keeps the done mark on a
    // same-value patch (bench.ts:1376 clears runStatus only on a real
    // canonical-spelling change). The teacher recut names the VALUE:
    // only a param VALUE change (or a clear) re-arms the stage — and
    // the old any-patch wording never prints.
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'tts', runStatus: 'done', params: {}, result: { run_id: 'r_old', url: '/runs/old.flac' } },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const text = textOf(tool, out)
    assert.ok(
      text.includes('patch a param VALUE to re-run'),
      'the skip voice teaches the VALUE law: ' + text,
    )
    assert.ok(
      !text.includes('patch params to re-run'),
      'the any-patch reading is dead at this seat — the old wording never prints: ' + text,
    )
  })

describe('melite_flow bench — the foreign-row voice (the compose-plane cure: a card-less ref_flow row is a retired press\'s marker, never the bench pass)', () => {
  test('a card-less row carrying ref_flow stops with the retired-marker voice — the flow runs through its own start door', async () => {
    // The retired template press minted exactly this marker row ({id,
    // engine, ref_flow, params} — no card surface); the bench write
    // doors refuse the shape now (the flows-are-compositions law,
    // 2026-11-14), but a doc the old door wrote still serves. A bench
    // holding it pressed through the bench arm must name the origin
    // and the removal path, never "patch the stage" (a row with no
    // card surface has no patch cure).
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', params: {}, ref_flow: 'my-flow' },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(
      out.error,
      'stage s_0 is the "my-flow" flow template reference (a retired melite_flow press landed it — the bench doors refuse the shape now; the flow runs through its own start door, not this bench pass); remove it with melite_construct remove_stage s_0 if the bench should run without the flow',
      'the voice names the flow, the retired press, and the removal path — never a patch cure for a card-less row',
    )
    assert.deepEqual(out.pass, [], 'the pass stops before the foreign row — nothing pressed')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'the foreign row never starts')
  })

  test('THE RESTORE CURE rides the voice when the history holds the load (F60b, slice E)', async () => {
    // A marker doc whose log carries a non-reverted load entry: the
    // landing's own history is the undo proof, and the voice names
    // the STRONGER cure — undo rewinds to the bench the press
    // replaced, remove_stage drops the row alone. A doc with no
    // load entry (the test above) promises no undo.
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWithLog([
            { id: 's_0', params: {}, ref_flow: 'my-flow' },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.ok(String(out.error).includes('melite_construct remove_stage s_0'), String(out.error))
    assert.ok(
      String(out.error).includes('melite_construct undo to restore the bench the retired press replaced'),
      'the voice names the restore cure when the history holds the load: ' + String(out.error),
    )
  })

  test('a present-but-empty ref_flow is no template reference — the generic card-less voice answers', async () => {
    // the && boundary: ref_flow '' evaluates the right operand false,
    // so the row falls through to the card-less voice the 1817 arm
    // pins for the absent key — empty claims no flow.
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', params: {}, ref_flow: '' },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 names no card — nothing to compose (melite_construct patch)')
  })
})

describe('melite_flow bench — the abort faces (D-7, defect board 2026-11-18: four runs completed on the queue while the agent read `Error: tool call aborted` — a dead signal must press NOTHING and never record phantom rows)', () => {
  const twoLive = (): Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> => [
    (lane: string) => {
      if (lane === 'benchGet') {
        return { status: 200, body: benchWith([
          { id: 's_0', card: 'h3-timeline', params: {} },
          { id: 's_1', card: 'h3-timeline', params: {} },
        ]) }
      }
      if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_abort', status: 'queued' } }
      return undefined
    },
  ]
  test('a PRE-ABORTED signal presses NOTHING — no run minted, no phantom rows, the re-press counsel rides', async () => {
    // D-7: the old pass minted real runs against a dead session (the
    // fake lanes do not honor the signal) and recorded phantom
    // `thrown` rows for stages whose start never flew — the agent
    // re-pressed and doubled the queue. The guard returns before any
    // estate call: nothing is on the queue, re-press is safe.
    const controller = new AbortController()
    controller.abort(new Error('stage fright'))
    const fake = fakeEstateStatus(twoLive())
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.deepEqual(out.pass, [], 'no stage row — nothing was pressed, so nothing is recorded')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'no run was ever minted')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStatus').length, 0, 'the observer never polled')
    assert.match(String(out.error), /aborted before stage s_0 was pressed/)
    assert.match(String(out.error), /stage fright/)
    assert.match(String(out.error), /no stage was pressed — nothing is on the queue; re-press is safe/)
  })
  test('a non-Error abort reason rides the same face verbatim — the bare string is never dropped', async () => {
    // signal.reason is ANY value: abort('flat reason') carries the
    // string itself — the face's why arm answers with the String()
    // voice (never "[object Object]", never a crash on .message).
    const controller = new AbortController()
    controller.abort('flat abort reason')
    const fake = fakeEstateStatus(twoLive())
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.match(String(out.error), /flat abort reason/)
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'no run was ever minted')
  })
  test('an abort MID-START names the unknown outcome and never presses the rest — ledger_tail before re-press', async () => {
    // the fetch died mid-flight: the queue may or may not have taken
    // the run, so the face points at ledger_tail (the doubled-queue
    // trap) and the sibling stage is never sent.
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'h3-timeline', params: {} },
            { id: 's_1', card: 'h3-timeline', params: {} },
          ]) }
        }
        if (lane === 'runsStart') throw new Error('socket died')
        return undefined
      },
    ]
    const controller = new AbortController()
    const fake = fakeEstateStatus(lanes)
    const origStart = fake.estate.runsStart.bind(fake.estate)
    fake.estate.runsStart = ((_body: unknown, signal: AbortSignal) => {
      controller.abort(new Error('lane died'))
      return origStart(_body, signal)
    }) as typeof fake.estate.runsStart
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.match(String(out.error), /aborted mid-start at stage s_0/)
    assert.match(String(out.error), /the run's existence is unknown/)
    assert.match(String(out.error), /read ledger_tail/)
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, "only the first stage's start flew")
  })
  test('an abort MID-OBSERVE returns the pending face WITH the run_id — the run is durable, the sibling never sent', async () => {
    // THE BOARD'S OWN CASE: the run started (durable on the queue)
    // and the observation died with the session. The receipt is
    // pending + run_id (run_status owns the wait), never a `thrown`
    // stage row, never a phantom press of the remaining stage.
    const controller = new AbortController()
    let polls = 0
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'h3-timeline', params: {} },
            { id: 's_1', card: 'h3-timeline', params: {} },
          ]) }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_durable', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          if (polls === 1) {
            controller.abort(new Error('session teardown'))
            throw new Error('observer transport died')
          }
          // settle the re-armed background link's later polls so it
          // terminates instead of spinning on an aborted signal
          return { status: 200, body: { status: 'failed', stages: [], error: 'gone' } }
        }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'pending', "the durable run's receipt is pending, never stopped")
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.run_id, 'r_durable')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1, 'the sibling stage was never pressed')
    assert.equal(pass[0]!['run_id'], 'r_durable')
    assert.equal(pass[0]!['status'], 'queued')
    assert.ok(!('thrown' in pass[0]!), 'an aborted observe is not a thrown stage — the run lives')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the sibling was never minted')
  })
  test('the PRESS BUDGET bounds the whole synchronous window (D-7): a stage that outlives it returns pending + run_id and the sibling is never pressed', async () => {
    // fake clock owns time; the run never settles. The first stage's
    // observation spends the whole press budget and returns the
    // pending receipt — long before any caller-side aborter could
    // strike (the 15-minute observe WAS the abort lie's window).
    vi.useFakeTimers()
    try {
      const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
        (lane: string) => {
          if (lane === 'benchGet') {
            return { status: 200, body: benchWith([
              { id: 's_0', card: 'h3-timeline', params: {} },
              { id: 's_1', card: 'h3-timeline', params: {} },
            ]) }
          }
          if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_slow', status: 'queued' } }
          if (lane === 'runsStatus') return { status: 200, body: { status: 'running', stages: [] } }
          if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
          return undefined
        },
      ]
      const fake = fakeEstateStatus(lanes)
      const tool = meliteFlow(fake.estate)
      const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
      const runP = tool.execute({ bench: true }, exec) as Promise<Record<string, unknown>>
      // one full poll cadence past the SCALED window (D-7 base 110 s
      // + one share for the sibling row = 200 s): the deadline
      // check rides the tick AFTER the budget boundary
      await vi.advanceTimersByTimeAsync(201_600)
      const out = await runP
      assert.equal(out.status, 'pending')
      assert.equal(out.run_id, 'r_slow')
      assert.equal(out.stoppedAt, 's_0')
      assert.equal(out.remaining, 1, 'the receipt names the unpressed tail — the re-press contract')
      assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, "the sibling was never pressed — the budget is the press's, not the stage's")
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass[0]!['status'], 'queued')
    } finally {
      vi.useRealTimers()
    }
  })
  test('a null abort reason rides the face\u2019s default voice — the receipt names the intent and the pressed stage', async () => {
    // abort(null) carries a reason that is neither an Error nor a
    // string: the face's why arm falls to its default voice ('the
    // call was aborted') — never "[object Object]", never "null" —
    // and the receipt still names the bench intent and the stage the
    // dead signal stopped at (the only-staged press).
    const controller = new AbortController()
    controller.abort(null)
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: {
            draft_id: 'd_arms', rev: 3, intent: 'press the duo',
            stages: [
              { id: 's_0', card: 'h3-timeline', params: {} },
              { id: 's_1', card: 'h3-timeline', params: {} },
            ],
          } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ stage: 's_1' }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_1', 'the only-staged press stops at the asked stage')
    assert.equal(out.intent, 'press the duo', 'the bench intent rides the abort receipt')
    assert.equal(out.stage, 's_1', 'the pressed stage rides the abort receipt')
    assert.match(String(out.error), /aborted before stage s_1 was pressed \(the call was aborted\)/,
      'a null reason speaks the default why voice: ' + String(out.error))
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a dead signal presses nothing')
  })
  test('an abort BETWEEN stages names the durable pressed run(s) — the re-press counsel counts what is on the queue', async () => {
    // The guard's own census: stage s_0 pressed and observed to done,
    // the signal dies before s_1 — the receipt's counsel names the
    // pressed run as DURABLE (poll run_status before re-pressing; a
    // blind re-press doubles the queue).
    const controller = new AbortController()
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: {
            draft_id: 'd_arms', rev: 4, intent: 'press the duo',
            stages: [
              { id: 's_0', card: 'h3-timeline', params: {} },
              { id: 's_1', card: 'h3-timeline', params: {} },
            ],
          } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_between', status: 'queued' } }
        if (lane === 'runsStatus') {
          controller.abort(new Error('sheet tear'))
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out.png' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_1', 'the receipt names the stage the dead signal stopped')
    assert.equal(out.intent, 'press the duo', 'the bench intent rides this abort face too')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1, 'only s_0 pressed — the sibling was never sent')
    assert.equal(pass[0]!['run_id'], 'r_between')
    assert.equal(pass[0]!['status'], 'done')
    assert.match(String(out.error), /the 1 pressed run\(s\) are durable on the queue: watch them with run_status/,
      'the durable-run counsel names the count and the adopt drain: ' + String(out.error))
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the sibling was never minted')
  })
  test('a mid-start abort carrying a NON-Error throw names the flat reason — the receipt still points at ledger_tail', async () => {
    // The start lane's death is whatever the transport threw: a bare
    // string rides String(thrown) verbatim (the same voice the
    // non-aborted thrown-start face speaks), and the receipt carries
    // the bench intent and the pressed stage name beside the counsel.
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: {
            draft_id: 'd_arms', rev: 5, intent: 'press the duo',
            stages: [
              { id: 's_0', card: 'h3-timeline', params: {} },
              { id: 's_1', card: 'h3-timeline', params: {} },
            ],
          } }
        }
        if (lane === 'runsStart') throw 'socket died flat'
        return undefined
      },
    ]
    const controller = new AbortController()
    const fake = fakeEstateStatus(lanes)
    const origStart = fake.estate.runsStart.bind(fake.estate)
    fake.estate.runsStart = ((_body: unknown, signal: AbortSignal) => {
      controller.abort(new Error('lane died'))
      return origStart(_body, signal)
    }) as typeof fake.estate.runsStart
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.intent, 'press the duo', 'the bench intent rides the mid-start receipt')
    assert.equal(out.stage, 's_0', 'the only-staged press names its stage')
    assert.match(String(out.error), /aborted mid-start at stage s_0 \(socket died flat\)/,
      'the flat throw rides String(thrown) verbatim: ' + String(out.error))
    assert.match(String(out.error), /read ledger_tail/)
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, "only the first stage's start flew")
  })
  test('a mid-observe abort carrying a NON-Error reason keeps the run durable — the pending receipt rides the flat reason', async () => {
    // The poller's only escape is the signal's own reason: abort with
    // a bare string and the catch's String(thrown) arm voices it on
    // the queued pass row — the run_id still rides (the run lives),
    // the sibling is never sent, and the receipt names intent + stage.
    const controller = new AbortController()
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: {
            draft_id: 'd_arms', rev: 6, intent: 'press the duo',
            stages: [{ id: 's_0', card: 'h3-timeline', params: {} }],
          } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_flat', status: 'queued' } }
        if (lane === 'runsStatus') {
          controller.abort('flat death')
          return { status: 200, body: { status: 'running', stages: [] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'pending', "the durable run's receipt is pending, never stopped")
    assert.equal(out.run_id, 'r_flat')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.intent, 'press the duo', 'the bench intent rides the mid-observe receipt')
    assert.equal(out.stage, 's_0', 'the only-staged press names its stage')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1)
    assert.equal(pass[0]!['aborted'], 'flat death', 'the flat reason rides the queued row verbatim')
    assert.ok(!('thrown' in pass[0]!), 'an aborted observe is not a thrown stage — the run lives')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'nothing else was minted')
  })
  test('the press budget bounds the NEXT stage\u2019s start — the pre-observe check returns the pending receipt with the queued note', async () => {
    // The budget face the observe-expiry receipt does not own: s_0
    // observes to DONE while its stamp takes burn the budget past the
    // press deadline, so s_1 — started, durable — hits the pre-observe
    // check with nothing remaining and returns NOW: the queued note on
    // its own pass row, the receipt carrying s_1's fresh run_id. Two
    // presses: one with a bench intent (the receipt carries it), one
    // without (the receipt stays quiet) — the intent word is the
    // bench's, never the caller's.
    const press = async (intent: string | undefined): Promise<Record<string, unknown>> => {
      let starts = 0
      let polls = 0
      const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
        (lane: string) => {
          if (lane === 'benchGet') {
            const doc: Record<string, unknown> = {
              draft_id: 'd_budget', rev: 7,
              stages: [
                { id: 's_0', card: 'h3-timeline', params: {} },
                { id: 's_1', card: 'h3-timeline', params: {} },
              ],
            }
            if (intent !== undefined) doc['intent'] = intent
            return { status: 200, body: doc }
          }
          if (lane === 'runsStart') {
            starts += 1
            return { status: 202, body: { run_id: 'r_budget_' + starts, status: 'queued' } }
          }
          if (lane === 'runsStatus') {
            polls += 1
            // 132 poll cadences (198 s) hold s_0 live; the completed
            // poll + its stamp takes land the terminal stamp past the
            // SCALED 2-row window (200 s), before s_1's pre-observe
            // check spends what remains.
            if (polls < 133) return { status: 200, body: { status: 'running', stages: [] } }
            return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'done.png' }] } }
          }
          if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: false, reason: 'tab closed' } }
          if (lane === 'runsAttribute') return { status: 200, body: { ok: true } }
          return undefined
        },
      ]
      const fake = fakeEstateStatus(lanes)
      const tool = meliteFlow(fake.estate)
      const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
      const runP = tool.execute({ bench: true }, exec) as Promise<Record<string, unknown>>
      // 72 poll cadences (108 s) + the completed poll's stamp takes
      // (two 1.2 s refusals) land the terminal stamp at ~111.9 s —
      // past the 110 s press budget, before s_1's pre-observe check.
      await vi.advanceTimersByTimeAsync(210_000)
      const out = await runP
      assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 2, 's_1\u2019s start flew before the check — the run is durable')
      return out
    }
    vi.useFakeTimers()
    try {
      const withIntent = await press('press the duo')
      assert.equal(withIntent.status, 'pending')
      assert.equal(withIntent.stoppedAt, 's_1')
      assert.equal(withIntent.run_id, 'r_budget_2', "the receipt carries s_1's fresh run_id")
      assert.equal(withIntent.intent, 'press the duo', 'the bench intent rides the budget receipt')
      const pass = withIntent.pass as Array<Record<string, unknown>>
      assert.equal(pass.length, 2)
      assert.equal(pass[0]!['status'], 'done', 's_0 observed to its end before the budget died')
      assert.equal(pass[1]!['status'], 'queued')
      assert.equal(pass[1]!['note'], 'the press budget spent — the run is durable on the queue; re-press to drain the tail: a live run is adopted (never re-sent), settled stages skip',
        'the queued note names the budget and the drain verb, never a failure — s_1 IS the tail, so no remainder clause')
      assert.equal(withIntent.remaining, 0, 'the receipt names the unpressed tail: zero rows behind the last one')
      const noIntent = await press(undefined)
      assert.equal(noIntent.status, 'pending')
      assert.equal(noIntent.intent, undefined, 'a bench with no intent rides no intent key — the word is the bench\u2019s')
    } finally {
      vi.useRealTimers()
    }
  })

  test('a single-stage only-press that starts past the deadline rides the budget receipt with its stage named', async () => {
    // The budget receipt's `only` arm: the prior test spends the
    // budget through s_0's observation and receipts at s_1 with no
    // stage key; here the caller names the stage themselves
    // (execute {stage}), the bench holds one row, and the start's
    // own handler jumps the clock past the 110 s deadline — so the
    // pre-observe check receipts with `stage` riding the caller's
    // word, the same note, and the minted run durable.
    vi.useFakeTimers()
    try {
      const fake = fakeEstateStatus([
        (lane: string) => {
          if (lane === 'benchGet') {
            return { status: 200, body: { draft_id: 'd_budget_only', rev: 3, stages: [
              { id: 's_0', card: 'h3-timeline', params: {} },
            ] } }
          }
          if (lane === 'runsStart') {
            // the start itself eats the whole window — the pre-observe
            // check lands with the budget already spent (a slow queue
            // take; the run is durable either way)
            vi.advanceTimersByTime(111_000)
            return { status: 202, body: { run_id: 'r_budget_only', status: 'queued' } }
          }
          return undefined
        },
      ])
      const tool = meliteFlow(fake.estate)
      const runP = tool.execute({ stage: 's_0' }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Promise<Record<string, unknown>>
      const out = await runP
      assert.equal(out.status, 'pending', 'the spent budget receipts pending, never stopped')
      assert.equal(out.stoppedAt, 's_0')
      assert.equal(out.run_id, 'r_budget_only', 'the durable run rides the receipt')
      assert.equal(out.stage, 's_0', 'the only-press names its stage on the budget receipt too')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass.length, 1)
      assert.equal(pass[0]!['status'], 'queued')
      assert.equal(pass[0]!['note'], 'the press budget spent — the run is durable on the queue; re-press to drain the tail: a live run is adopted (never re-sent), settled stages skip')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('melite_flow bench — the run-id-less start (the empty-error trap’s twin: a gateway that names no run and no error still observes)', () => {
  test('a start answering run_id "" with no error observes through the empty rid — bare host spellings ride verbatim', async () => {
    // startRun maps a missing run_id to '' (not a refusal); the bench
    // pass — unlike the card arm — carries no empty guard, so the
    // observation rides with rid ''. canonicalHostPath then walks its
    // `rid === ''` arms: './' still strips, the rooted join is
    // skipped, the bare spelling rides verbatim.
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', params: { model: 'anima' } },
          ]) }
        }
        if (lane === 'runsStart') return { status: 202, body: { status: 'queued', run_id: '' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: './clip.mp4' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'no error rode — the pass observed and settled')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.deepEqual(pass[0]!['host_paths'], ['clip.mp4'], 'the ./ strips, the empty rid roots nothing — the bare spelling rides')
  })

  test('the legacy-double collapse still fires off an empty-adjacent rid: a <rid>/<rid>/ artifact folds under its single root', async () => {
    // the collapse needs a NON-empty rid (rid !== '' guards it) — a
    // legacy row served before the run-dir-relative fix spells
    // <rid>/<rid>/… and folds to <rid>/… under the estate root.
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', params: { model: 'anima' } },
          ]) }
        }
        if (lane === 'runsStart') return { status: 202, body: { status: 'queued', run_id: 'r_leg' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'a.mp4' }], artifacts: ['r_leg/r_leg/dup.mp4'] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.ok(
      (pass[0]!['host_paths'] as string[]).includes('output/r_leg/dup.mp4'),
      'the doubled prefix collapsed to the single root: ' + JSON.stringify(pass[0]!['host_paths']),
    )
  })
})

  test('a done row with NO result memory skips honestly — last_run null never prints the unchanged claim', async () => {
    // THE PHANTOM-DONE SHAPE (qa8 §5.4): a bare runStatus write — the
    // drafts/patch door admits runStatus WITHOUT result, so a done
    // word can exist with no run behind it. The construct door reads
    // exactly this shape as last_run: null (withLastRun stamps null
    // for stages no run digest names); the pass must read it the
    // same honest way, and the prose must never claim "unchanged".
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'tts', runStatus: 'done', params: {} },
          ]) }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.deepEqual(out.pass, [{ stage: 's_0', card: 'tts', skipped: 'done', last_run: null }])
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'the mark stands — the row still skips, honestly')
    const text = textOf(tool, out)
    assert.ok(!text.includes('unchanged since its last run'), 'a last_run-null row cannot print the unchanged claim')
    assert.ok(
      text.includes('s_0 tts [skipped done — done on record but no last run behind it; patch params to force a run]'),
      'the honest voice names the missing run and the force-run cure',
    )
  })
})

// R-4 (2026-11-05, D3-04 — FRICTION_3.md:79-80 + :491): the press
// census + the rev-confirm landing admission. The burn: s_89 + s_90
// were minted back-to-back and pressed together — the run held only
// s_89, and "s_90 sat unrun with no warning anywhere in the press
// receipt". Registry row harness-flow-press-census.
describe('melite_flow bench — the press census + the rev-confirm landing admission (R-4 / D3-04)', () => {
  /** A fresh image-gen row the pass will press. */
  const freshRow = { id: 's_1', card: 'image-gen', params: { model: 'anima' } }
  /** A settled done row the pass will skip. */
  const doneRow = { id: 's_0', card: 'tts', runStatus: 'done', params: {}, result: { run_id: 'r_old', url: '/runs/old.flac' } }

  test('R-4 arm 1 (THE WALL): a press receipt carries every PRESSED stage id + the snapshot rev — the bench pass and the W-8 per-stage press alike', async () => {
    let reads = 0
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          reads += 1
          return { status: 200, body: { draft_id: 'd_arms', rev: 12, stages: [doneRow, freshRow] } }
        }
        return undefined
      },
      ...settledLanes('r_census', '/runs/census.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.deepEqual(out.pressed, ['s_1'],
      'the census names the pressed ids — a skipped-done row is not a press (the D3-04 caller compares this against its own mint answers)')
    assert.equal(out.rev, 12, 'the snapshot rev rides machine-readable (the `@ rev N` prose already carried it)')
    // the W-8 per-stage press rides the same return
    const fake2 = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 12, stages: [doneRow, freshRow] } }
        return undefined
      },
      ...settledLanes('r_census', '/runs/census.png'),
    ])
    const tool2 = meliteFlow(fake2.estate)
    const out2 = await tool2.execute({ stage: 's_1' }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out2.status, 'done')
    assert.deepEqual(out2.pressed, ['s_1'], 'the per-stage press carries the same census face')
    assert.equal(out2.rev, 12)
  })

  test('R-4 arm 2 (THE WALL): a rev that moved between the snapshot read and the press warns on the pressed row — and the press STILL runs', async () => {
    let reads = 0
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          reads += 1
          // the mid-settle shape: the mint door answered `landing:
          // landed_and_compiling` and the bench moved under the press
          return { status: 200, body: { draft_id: 'd_arms', rev: reads === 1 ? 431 : 432, stages: [freshRow] } }
        }
        return undefined
      },
      ...settledLanes('r_race', '/runs/race.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the warning is an ADMISSION, never a gate — the press ran')
    const pass = out.pass as Array<Record<string, unknown>>
    const warning = String(pass[0]!['warning'] ?? '')
    assert.match(warning, /bench rev moved between the snapshot read and this press \(rev 431 → rev 432\)/, warning)
    assert.match(warning, /something may still be landing/, 'the warning names the D3-04 race, not a generic bench move')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the press still ran')
    assert.equal(out.rev, 431, 'the receipt names the SNAPSHOT the press judged against')
  })

  test('R-4 arm 2b (the joined voice): an h3 admission and a landing race share the row — neither voice shadows the other', async () => {
    let reads = 0
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          reads += 1
          return { status: 200, body: { draft_id: 'd_arms', rev: reads === 1 ? 1 : 2, stages: [
            { id: 's_1', card: 'h3-timeline', params: { extend: [{ source_clip: 'film_a', resolution: '736p' }] } },
          ] } }
        }
        return undefined
      },
      ...settledLanes('r_join', '/runs/join.mp4'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const warning = String((out.pass as Array<Record<string, unknown>>)[0]!['warning'] ?? '')
    assert.ok(warning.startsWith('h3-timeline: CROSS-REGIME JOIN'), 'the F18 admission leads the row voice')
    assert.ok(warning.includes('bench rev moved between the snapshot read and this press'), 'the landing race follows — joined, never shadowed')
  })

  test('R-4 arm 2c (the advisory face): a confirm read that DIES in transport never gates the press — no warning is the honest face', async () => {
    let reads = 0
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') {
          reads += 1
          if (reads > 1) throw new Error('confirm read transport down')
          return { status: 200, body: { draft_id: 'd_arms', rev: 7, stages: [freshRow] } }
        }
        return undefined
      },
      ...settledLanes('r_advisory', '/runs/advisory.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the advisory confirm swallowed its own transport death — the press ran on the snapshot it holds')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['warning'], undefined, 'a confirm that cannot read admits nothing')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1)
  })

  test('R-4 arm 3 (guard): a settled bench presses WARNING-FREE — the rev-confirm never makes the settle mandatory', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 90, stages: [freshRow] } }
        return undefined
      },
      ...settledLanes('r_settled', '/runs/settled.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['warning'], undefined,
      'no false warning: the rev stood still between the snapshot read and the press — a settled bench is silent')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the press ran normally')
  })

  test('R-4 arm 4 (THE WALL, D3-04 (c) persisted stamp): a row YOUNGER than the settle window warns on the SAME-REV leg the confirm cannot see — and the press STILL runs', async () => {
    // THE BURN'S REMAINING HALF: mint → press with the rev already
    // still. The rev-confirm admits nothing (nothing moved between
    // the snapshot read and the confirm); the persisted
    // compiled_at stamp is the ONLY signal this row is mid-settle.
    const justMinted = { id: 's_1', card: 'image-gen', params: { model: 'anima' }, compiled_at: Date.now() - 2_000 }
    const fake = fakeEstateStatus([
      (lane: string) => {
        // the SAME rev on both reads — the rev-race voice stays
        // silent by construction, so any warning below is the
        // stamp's own voice
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 431, stages: [justMinted] } }
        return undefined
      },
      ...settledLanes('r_stamp', '/runs/stamp.png'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the stamp warning is an ADMISSION, never a gate — the press ran')
    const pass = out.pass as Array<Record<string, unknown>>
    const warning = String(pass[0]!['warning'] ?? '')
    assert.match(warning, /stage s_1 was written \d+s before this press \(compiled_at fresh\)/, warning)
    assert.match(warning, /it may still be landing/, 'the warning names the D3-04 settle race in the stamp\'s own voice')
    assert.doesNotMatch(warning, /bench rev moved/, 'the rev stood still — this voice is the stamp\'s alone')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the press still ran')
  })

  test('R-4 arm 4b (stamp guard): a row OLDER than the settle window presses warning-free — the stamp never makes the settle mandatory; an ABSENT stamp admits nothing', async () => {
    const aged = { id: 's_1', card: 'image-gen', params: { model: 'anima' }, compiled_at: Date.now() - 60_000 }
    for (const row of [aged, freshRow]) {
      const fake = fakeEstateStatus([
        (lane: string) => {
          if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 90, stages: [row] } }
          return undefined
        },
        ...settledLanes('r_aged', '/runs/aged.png'),
      ])
      const tool = meliteFlow(fake.estate)
      const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
      assert.equal(out.status, 'done')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass[0]!['warning'], undefined,
        `no false warning from the stamp (row compiled_at: ${String('compiled_at' in row ? row.compiled_at : undefined)}) — a settled or pre-law row presses silent`)
    }
  })

  test('R-4 arm 4c (joined voice): a fresh stamp under an h3 admission shares the row — the F18 admission leads, the stamp follows', async () => {
    const fake = fakeEstateStatus([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 5, stages: [
          { id: 's_1', card: 'h3-timeline', params: { extend: [{ source_clip: 'film_a', resolution: '736p' }] }, compiled_at: Date.now() - 1_000 },
        ] } }
        return undefined
      },
      ...settledLanes('r_stamph3', '/runs/stamph3.mp4'),
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const warning = String((out.pass as Array<Record<string, unknown>>)[0]!['warning'] ?? '')
    assert.ok(warning.startsWith('h3-timeline: CROSS-REGIME JOIN'), 'the F18 admission still leads the row voice')
    assert.ok(warning.includes('compiled_at fresh'), 'the stamp voice follows — joined, never shadowed')
  })
})

// THE BRANCH-EDGE BURN (scope C, 2026-11-06): every stop face spreads
// the bench's settle-time intent and the pressed stage — the per-stage
// press rides them through every refusal voice, and a failed pass
// carries the DEDUPED host set. Arms pinned to the exact spread faces
// the coverage reporter named.
describe('melite_flow bench — the stop faces carry the intent + the pressed stage (the branch-edge burn)', () => {
  const INTENT = 'the gauntlet film'

  /** An intent-bearing bench with the given stage rows. */
  const intentBenchWith = (stages: Array<Record<string, unknown>>) => ({
    draft_id: 'd_intent', rev: 4, intent: INTENT, stages,
  })

  /** A per-stage press over the given lanes. */
  const runStage = async (
    stage: string,
    handlers: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined>,
  ): Promise<Record<string, unknown>> => {
    const fake = fakeEstateStatus(handlers)
    const tool = meliteFlow(fake.estate)
    return await tool.execute({ stage }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
  }

  test('the retired-marker stop carries the intent + the pressed stage', async () => {
    const out = await runStage('s_0', [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: intentBenchWith([{ id: 's_0', params: {}, ref_flow: 'my-flow' }]) }
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.intent, INTENT, 'the bench intent at settle rides the refusal receipt')
    assert.equal(out.stage, 's_0', 'the pressed row rides its own stop')
    assert.match(String(out.error), /stage s_0 is the "my-flow" flow template reference/)
  })

  test('the no-card stop carries the intent + the pressed stage', async () => {
    const out = await runStage('s_0', [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: intentBenchWith([{ id: 's_0', params: {} }]) }
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.intent, INTENT)
    assert.equal(out.stage, 's_0')
    assert.match(String(out.error), /stage s_0 names no card — nothing to compose/)
  })

  test('the not-a-stage-wire stop carries the intent + the pressed stage', async () => {
    const out = await runStage('s_0', [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: intentBenchWith([
            { id: 's_0', card: 'image-gen', params: { model: 'anima' }, inputs: { img: { output: 'default' } } },
          ]) }
        }
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.intent, INTENT)
    assert.equal(out.stage, 's_0')
    assert.match(String(out.error), /input "img" is neither \{stage, output\} nor a resolvable binding/)
  })

  test('the no-output-upstream stop carries the intent + the pressed stage', async () => {
    const out = await runStage('s_1', [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: intentBenchWith([
            { id: 's_0', card: 'image-gen', runStatus: 'done', params: { model: 'anima' }, result: null },
            { id: 's_1', card: 'image-edit', params: { model: 'qwen-img-edit-21', image1: '$image1' },
              inputs: { image1: { stage: 's_0', output: 'default' } } },
          ]) }
        }
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.intent, INTENT)
    assert.equal(out.stage, 's_1')
    assert.match(String(out.error), /input "image1" is wired to stage "s_0" which has no output yet/)
  })

  test('a refused start stops the per-stage press carrying the intent + the pressed stage — nothing pressed', async () => {
    const out = await runStage('s_0', [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: intentBenchWith([{ id: 's_0', card: 'image-gen', params: { model: 'anima' } }]) }
        }
        if (lane === 'runsStart') return { status: 200, body: { run_id: '', error: 'the queue refused the start' } }
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.intent, INTENT)
    assert.equal(out.stage, 's_0')
    assert.equal(out.error, 'the queue refused the start')
    assert.deepEqual(out.pressed, ['s_0'], 'the census names the press the refusal refused — the attempt is the receipt')
  })

  test('a thrown start stops the per-stage press carrying the intent + the pressed stage', async () => {
    const out = await runStage('s_0', [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: intentBenchWith([{ id: 's_0', card: 'image-gen', params: { model: 'anima' } }]) }
        }
        if (lane === 'runsStart') throw 'queue died'
        return undefined
      },
    ])
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.intent, INTENT)
    assert.equal(out.stage, 's_0')
    assert.match(String(out.error), /stage s_0 \(image-gen\) threw \(a transport or resolution error/)
  })

  test('a per-stage press that outlives the budget returns pending carrying the intent + the pressed stage', async () => {
    // the fake clock owns time — a wall-clock timeout signal would
    // fire inside the 900s advance (the melite-flow pending arm's law)
    vi.useFakeTimers()
    try {
      const fake = fakeEstateStatus([
        (lane: string) => {
          if (lane === 'benchGet') {
            return { status: 200, body: intentBenchWith([{ id: 's_0', card: 'image-gen', params: { model: 'anima' } }]) }
          }
          if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_slow', status: 'queued' } }
          if (lane === 'runsStatus') return { status: 200, body: { status: 'running', stages: [] } }
          if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
          return undefined
        },
      ])
      const tool = meliteFlow(fake.estate)
      const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
      const runP = tool.execute({ stage: 's_0' }, exec) as Promise<Record<string, unknown>>
      await vi.advanceTimersByTimeAsync(900_100)
      const out = await runP
      assert.equal(out.status, 'pending', 'a live run is pending, never failed')
      assert.equal(out.stoppedAt, 's_0')
      assert.equal(out.run_id, 'r_slow')
      assert.equal(out.intent, INTENT, 'the settle-time intent rides the pending receipt')
      assert.equal(out.stage, 's_0', 'the pressed row rides the pending receipt')
      assert.ok(!('error' in out), 'a pending receipt is not a refusal')
    } finally {
      vi.useRealTimers()
    }
  })

  test('a failed pass carries the DEDUPED host set — two rows naming one absolute file print it once', async () => {
    // the absolute url rides verbatim as its own host path (no run
    // root joins), so two settled rows CAN name the same file — the
    // collector dedupes, and the intent rides the failure receipt.
    const fake = fakeEstateStatus([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: intentBenchWith([
            { id: 's_0', card: 'image-gen', params: { model: 'anima' } },
            { id: 's_1', card: 'image-gen', params: { model: 'anima' } },
            { id: 's_2', card: 'image-gen', params: { model: 'anima' } },
          ]) }
        }
        if (lane === 'runsStart') {
          const id = (args[0] as Record<string, unknown>)['bench_stage_id']
          if (id === 's_2') throw 'queue died on the third'
          return { status: 202, body: { run_id: id === 's_0' ? 'r_a' : 'r_b', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          const rid = args[0]
          return { status: 200, body: { status: 'completed', stages: [{ id: rid === 'r_a' ? 's_0' : 's_1', url: '/abs/clip.mp4' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_2')
    assert.equal(out.intent, INTENT, 'the intent rides even a failed press')
    assert.deepEqual(out.host_paths, ['/abs/clip.mp4'],
      'the absolute host path prints once — the second row\u2019s duplicate is dropped')
  })
})

// THE ADOPT LAW (the three-press burn, 2026-11-18: one agent call
// pushes ~9 takes — the press budget ends the observation AND the
// dispatch with it, and the old receipt's counsel named an escape
// hatch that could never drain the pass: a re-press re-sent whatever
// was still queued). A row that already owns a run is NEVER re-sent —
// the press ADOPTS it: one cheap status read classifies the row's
// own memory, live and terminal runs observe inside the remaining
// budget, a gone run heals to a fresh press, and an unreadable one
// stops the press naming ledger_tail — never a double.
describe('melite_flow bench — THE ADOPT LAW (a row owning a run is adopted, never re-sent)', () => {
  const liveRow = (id: string, runId: string): Record<string, unknown> => ({
    id, card: 'h3-timeline', params: {},
    runStatus: 'running', result: { run_id: runId },
  })
  const freshRow = (id: string): Record<string, unknown> => ({ id, card: 'h3-timeline', params: {} })

  test('a live prior run is ADOPTED — observed to terminal, never re-sent, and the tail presses on', async () => {
    // probe (call 1) answers running; the adopted observation's
    // polls (calls 2+) answer completed — the window the first
    // press lost, reclaimed without a second start.
    let statusReads = 0
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_live'), freshRow('s_1')]) }
        return undefined
      },
      (lane: string, args: unknown[]) => {
        if (lane !== 'runsStatus') return undefined
        const id = String(args[0])
        if (id === 'r_live') {
          statusReads += 1
          return statusReads === 1
            ? { status: 200, body: { status: 'running', stages: [] } }
            : { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/final.png' }] } }
        }
        return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'out/next.png' }] } }
      },
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: `r_${String((args[0] as Record<string, unknown>)['bench_stage_id'] ?? 'x')}`, status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the adopted run settles and the tail drains in the same press')
    const starts = fake.calls.filter((c) => c.lane === 'runsStart')
    assert.deepEqual(starts.map((c) => (c.args[0] as Record<string, unknown>)['bench_stage_id']), ['s_1'], 's_0 was NEVER re-sent — the doubling dies here')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['stage'], 's_0')
    assert.equal(pass[0]!['run_id'], 'r_live')
    assert.equal(pass[0]!['status'], 'done')
    assert.equal(pass[0]!['adopted'], true, 'the pass row names the adoption — the operator reads why no start flew')
    assert.equal(pass[1]!['stage'], 's_1')
    assert.equal(pass[1]!['status'], 'done')
    assert.deepEqual(out.pressed, ['s_1'], 'R-4: the census names the stages this press STARTED — the adopted row never reached a start lane')
  })

  test('a prior run the SERVER already settled is adopted and stamped on the first poll — the mark the window cut short', async () => {
    // the background attribution's re-arms ran out before the run
    // settled: the row still says running, the queue says completed.
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_settled')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/late.png' }] } }
        return undefined
      },
      (lane: string) => {
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a settled run is observed, never re-minted')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['status'], 'done')
    assert.equal(pass[0]!['adopted'], true)
    assert.ok(out.status === 'done', 'the press finishes — the row is whole again')
  })

  test('a prior run the queue no longer knows HEALS to a fresh press — stale row memory never strands the stage', async () => {
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_gone')]) }
        return undefined
      },
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus' && String(args[0]) === 'r_gone') return { status: 404, body: { error: 'unknown run_id "r_gone" (the queue no longer holds it)' } }
        if (lane === 'runsStatus') return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/fresh.png' }] } }
        return undefined
      },
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_new', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const starts = fake.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'the gone run heals into exactly one fresh press')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['run_id'], 'r_new')
    assert.ok(!('adopted' in pass[0]!), 'a fresh press carries no adoption mark')
    assert.equal(pass[0]!['status'], 'done')
  })

  test('a CLEARED done mark never adopts — the old result keeps its terminal evidence and the row re-runs (the W-2 counter-class)', async () => {
    // the patch door cleared the mark to pending for a re-run; the
    // old result still carries its url. The live-folded word plus
    // terminal evidence is the RE-RUN shape, never an in-flight
    // observation (the observer's live stamp writes run_id ALONE).
    const clearedRow = (id: string, runId: string): Record<string, unknown> => ({
      id, card: 'h3-timeline', params: {},
      runStatus: 'pending', result: { run_id: runId, url: '/melite-media/runs/' + runId + '/out/final.png' },
    })
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([clearedRow('s_0', 'r_old')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/final.png' }] } }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_fresh', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const starts = fake.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'the cleared row re-runs — its live-folded word is the patch door’s, never an observation’s')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['run_id'], 'r_fresh')
    assert.ok(!('adopted' in pass[0]!), 'terminal evidence on the row means re-run intent, never adoption')
  })
  test('an UNREADABLE prior run stops the press naming ledger_tail — nothing is sent on an unknown existence', async () => {
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_opaque'), freshRow('s_1')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') throw new Error('socket hang up')
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.match(String(out.error), /unreadable/, 'the refusal names the unknown state')
    assert.match(String(out.error), /ledger_tail/, 'the counsel names the read-before-press door')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'an unknown existence sends NOTHING — not this stage, not the tail')
  })

  test('an abort MID-OBSERVE of an ADOPTED run returns the pending face — the adoption mark rides the queued row, the run stays durable', async () => {
    // the session died while the press observed the run it had just
    // adopted: the receipt is pending + run_id (the run lives on the
    // queue), the pass row carries BOTH the adoption mark and the
    // abort's word — the operator reads why no start flew and why
    // the observation ended, and the sibling is never pressed.
    const controller = new AbortController()
    let adoptReads = 0
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_adopted'), freshRow('s_1')]) }
        return undefined
      },
      (lane: string, args: unknown[]) => {
        if (lane !== 'runsStatus') return undefined
        if (String(args[0]) !== 'r_adopted') return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'out/next.png' }] } }
        adoptReads += 1
        if (adoptReads === 1) return { status: 200, body: { status: 'running', stages: [] } }
        controller.abort(new Error('session teardown'))
        throw new Error('observer transport died')
      },
      (lane: string) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_never', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'pending', 'the adopted run is durable — an aborted observation is pending, never stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.run_id, 'r_adopted')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1, 'the sibling stage was never pressed')
    assert.equal(pass[0]!['run_id'], 'r_adopted')
    assert.equal(pass[0]!['status'], 'queued')
    assert.equal(pass[0]!['adopted'], true, 'the aborted row keeps its adoption mark — no start flew for this run')
    assert.match(String(pass[0]!['aborted']), /session teardown/, 'the abort word rides the row verbatim')
    assert.ok(!('thrown' in pass[0]!), 'an aborted observe is not a thrown stage — the run lives')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'nothing was ever sent — adoption observed, the abort ended the press')
  })

  test('a TERMINAL word on the minimal stamp never adopts — a failed run is not live memory; the row re-runs', async () => {
    // the adopt gate trusts the observer's LIVE vocabulary
    // (running/queued) alone. A row whose fold word is terminal
    // ('failed') carrying the minimal stamp is a run that already
    // ENDED — there is nothing to observe to terminal, so the press
    // sends fresh rather than probing a corpse.
    const deadRow = (id: string, runId: string): Record<string, unknown> => ({
      id, card: 'h3-timeline', params: {},
      runStatus: 'failed', result: { run_id: runId },
    })
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([deadRow('s_0', 'r_dead')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/again.png' }] } }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_fresh2', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const starts = fake.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'a terminal fold re-runs — the press never probes a dead run for liveness')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStatus').length, 1, 'the single status read belongs to the fresh run observation — no adoption probe flew')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['run_id'], 'r_fresh2')
    assert.ok(!('adopted' in pass[0]!), 'a re-run carries no adoption mark')
  })

  test('a non-Error probe throw rides the stopped face verbatim — and the receipt carries the bench intent and the pressed stage', async () => {
    // the estate lane can throw bare values (a torn-down transport
    // surfacing a string): the unreadable face must carry the word
    // verbatim, never drop it to "[object Object]" or a generic —
    // and the stopped receipt names whose press it was (intent +
    // the named stage, the same fields the pending receipt carries).
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_arms', rev: 1, intent: 'the evening set', stages: [liveRow('s_0', 'r_opaque2')] } }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') throw 'lane torn down'
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.match(String(out.error), /unreadable \(lane torn down\)/, 'the bare-string throw rides the face verbatim')
    assert.equal(out.intent, 'the evening set', 'the stopped receipt carries the bench intent — the operator knows whose press died')
    assert.equal(out.stage, 's_0', 'the stopped receipt carries the named stage — a per-stage press reads its own face')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'an unknown existence sends NOTHING')
  })

  test('an adoption that outlives the press budget returns pending — the queued row keeps the adoption mark and the drain counsel', async () => {
    // THE PRESS BUDGET bounds adoption's observation too: the row
    // was adopted (the probe flew, the run is live), but the budget
    // the earlier stage spent leaves nothing to observe with — the
    // receipt is pending NOW, carrying run_id and the re-press
    // counsel, and the queued pass row keeps its adoption mark.
    vi.useFakeTimers()
    try {
      const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
        (lane: string) => {
          if (lane === 'benchGet') return { status: 200, body: benchWith([{ id: 's_0', card: 'h3-timeline', params: {} }, liveRow('s_1', 'r_adopted2')]) }
          return undefined
        },
        (lane: string, args: unknown[]) => {
          if (lane !== 'runsStatus') return undefined
          if (String(args[0]) === 'r_adopted2') {
            // the probe answers — and the wall clock the budget
            // reads has moved past the deadline while the first
            // stage's observation ran: the adoption is honest, the
            // window to observe it is gone (210 s: past the SCALED
            // 2-row window of 200 s)
            vi.setSystemTime(Date.now() + 210_000)
            return { status: 200, body: { status: 'running', stages: [] } }
          }
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/first.png' }] } }
        },
        (lane: string, args: unknown[]) => {
          if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_first', status: 'queued' } }
          if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
          return undefined
        },
      ]
      const fake = fakeEstateStatus(lanes)
      const tool = meliteFlow(fake.estate)
      const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
      const runP = tool.execute({ bench: true }, exec) as Promise<Record<string, unknown>>
      await vi.advanceTimersByTimeAsync(10_000)
      const out = await runP
      assert.equal(out.status, 'pending', 'the adopted run is durable — the spent budget is pending, never failed')
      assert.equal(out.stoppedAt, 's_1')
      assert.equal(out.run_id, 'r_adopted2')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass[0]!['stage'], 's_0')
      assert.equal(pass[0]!['status'], 'done')
      assert.equal(pass[1]!['stage'], 's_1')
      assert.equal(pass[1]!['run_id'], 'r_adopted2')
      assert.equal(pass[1]!['status'], 'queued')
      assert.equal(pass[1]!['adopted'], true, 'the budget-spent row keeps its adoption mark — the run was adopted, never re-sent')
      assert.match(String(pass[1]!['note']), /re-press to drain/, 'the drain counsel rides the row')
      assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'only the first stage ever started — the adopted stage never re-sent')
    } finally {
      vi.useRealTimers()
    }
  })

  test('the gone voice is the TYPED CODE, never the prose — a message-regex shape (unknown run, 404) on a WRONG code stops the press', async () => {
    // THE CLASSIFIER COUNTER-ARM: the probe's refusal below carries
    // the registry's exact gone WORDS on a code the queue never uses
    // for a gone run (runs/flow-compile is a validation refusal —
    // it cannot classify row memory). The old classifier matched
    // /unknown run|404/ against the prose and would have healed;
    // the law is the RemoteError's code: runs/unknown-run heals,
    // every other voice is an unknown state — nothing is sent.
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_lie')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') throw new RemoteError('runs/flow-compile', 'unknown run_id "r_lie" — 404', { loc: 'flow' })
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped', 'the prose said gone, the code said otherwise — the code wins and nothing is sent')
    assert.match(String(out.error), /unreadable/, 'the refusal still names the unknown state')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a wrong-code voice NEVER heals into a fresh press — that is how doubles are born')
  })

  test('a wordless 2xx probe body STOPS the press naming the wordless answer — the conservative face, never a silent adoption', async () => {
    // THE UNREADABLE-BODY EDGE (code-audit round 2, P3): the probe
    // can RESOLVE 2xx with no status word at all (a body shaped
    // `{ok: true}`, a truncated row) — not gone (no typed 404
    // code), not readable (no word to fold). The law is
    // conservative: nothing is adopted forward, nothing re-sent —
    // the stopped receipt names the WORDLESS answer verbatim so the
    // operator reads what the registry actually said, never an
    // empty "unreadable ()".
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_silent')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') return { status: 200, body: { ok: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped', 'a wordless body is an unknown state — the press stops, it never guesses')
    assert.match(String(out.error), /unreadable \(the probe answered 2xx with no status word\)/, 'the face names the wordless answer verbatim — never an empty paren')
    assert.match(String(out.error), /r_silent/, 'the receipt carries the run id — the row memory stays addressable')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a wordless body NEVER heals into a fresh press or an adoption settle')
  })

  test('a QUEUED fold adopts too — pending row memory is live memory (the patch word folds to the queue\u2019s own live vocabulary)', async () => {
    // the drafts/patch door clears a done mark to 'pending' for a
    // re-run; when the run behind the row is STILL in flight the row
    // is adoptable — the fold word joins the live vocabulary
    // (running/queued) while terminal words (failed/error) keep the
    // re-run gate. This arm pins the SECOND live word so a future
    // fold-vocabulary edit cannot silently strand queued memory.
    const queuedRow = (id: string, runId: string): Record<string, unknown> => ({
      id, card: 'h3-timeline', params: {},
      runStatus: 'pending', result: { run_id: runId },
    })
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([queuedRow('s_0', 'r_q'), freshRow('s_1')]) }
        return undefined
      },
      (lane: string, args: unknown[]) => {
        if (lane !== 'runsStatus') return undefined
        if (String(args[0]) === 'r_q') return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/q.png' }] } }
        return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'out/tail.png' }] } }
      },
      (lane: string) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_never_q', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const starts = fake.calls.filter((c) => c.lane === 'runsStart')
    assert.deepEqual(starts.map((c) => (c.args[0] as Record<string, unknown>)['bench_stage_id']), ['s_1'], 'the queued-fold row was ADOPTED, never re-sent — only the fresh tail pressed')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['run_id'], 'r_q')
    assert.equal(pass[0]!['adopted'], true, 'the queued fold carries the adoption mark — live memory is live memory under either word')
  })

  test('an ADOPTED settle stamps NO input_runs snapshot — the drain-time wire resolution is not what the run consumed; the next press re-runs once (safe-on-stale)', async () => {
    // THE W-2 × ADOPT SEAM: a wired row whose prior run is still in
    // flight is adopted; its identities resolved at the ORIGINAL
    // press, and the wire resolution this press computes names the
    // CURRENT upstream — stamping it would forge the evidence the
    // next press's skip test judges (the snapshot would claim the
    // adopted run consumed an upstream it never saw). The exemption
    // leaves the settled row snapshot-less, and W-2's own law then
    // makes the row re-run ONCE to record its real consumption —
    // the safe-on-stale doctrine, same as a legacy snapshot-less row.
    const bench: Record<string, unknown> = {
      draft_id: 'd_adoptw2', rev: 3, intent: 'adopt then re-derive', log: [],
      stages: [
        { id: 's_0', card: 'image-gen', params: { model: 'krea-2', seed: 11 } },
        { id: 's_1', card: 'upscale-tools', runStatus: 'running', params: { model: 'seedvr2-ema', input_image: '$input_image' },
          inputs: { input_image: { stage: 's_0', output: 'default' } }, result: { run_id: 'r_up_live' } },
      ],
    }
    const runStage = new Map<string, string>([['r_up_live', 's_1']])
    let genSeq = 1
    const stateful = (lane: string, args: unknown[]): { status: number; body: unknown } | undefined => {
      if (lane === 'benchGet') return { status: 200, body: bench }
      if (lane === 'runsStart') {
        const stage = String((args[0] as Record<string, unknown>)['bench_stage_id'])
        if (stage === 's_0') { genSeq += 1; runStage.set(`r_gen_${genSeq}`, 's_0'); return { status: 202, body: { run_id: `r_gen_${genSeq}`, status: 'queued' } } }
        runStage.set(`r_up_${genSeq}`, 's_1'); return { status: 202, body: { run_id: `r_up_${genSeq}`, status: 'queued' } }
      }
      if (lane === 'runsStatus') {
        const stage = runStage.get(String(args[0])) ?? ''
        return { status: 200, body: { status: 'completed', stages: [{ id: stage, url: stage === 's_0' ? 'gen/out.png' : 'upscale/out.png' }] } }
      }
      if (lane === 'draftsStagePatch') {
        const row = (bench.stages as Array<Record<string, unknown>>).find((s) => s['id'] === args[1])
        const body = args[2] as Record<string, unknown>
        if (row !== undefined) {
          if (typeof body['runStatus'] === 'string') row['runStatus'] = body['runStatus']
          if (body['result'] !== undefined) row['result'] = body['result']
        }
        return { status: 200, body: { delivered: true } }
      }
      return undefined
    }
    const press = async (): Promise<Record<string, unknown>> => {
      const fake = fakeEstateStatus([stateful])
      const tool = meliteFlow(fake.estate)
      const out = await tool.execute({ bench: true }, fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
      return { out, patches: fake.calls.filter((c) => c.lane === 'draftsStagePatch').map((c) => c.args) } as unknown as Record<string, unknown>
    }
    const first = await press() as { out: Record<string, unknown>; patches: Array<unknown[]> }
    assert.equal(first.out.status, 'done', String(first.out.error))
    const s1Terminal = first.patches
      .filter((p) => p[1] === 's_1')
      .map((p) => p[2] as Record<string, unknown>)
      .find((p) => p['runStatus'] === 'done')
    assert.ok(s1Terminal !== undefined, 'the adopted run settled')
    assert.ok(!('input_runs' in (s1Terminal!['result'] as Record<string, unknown>)),
      'THE EXEMPTION: an adopted settle stamps NO input_runs — the drain-time resolution would forge the consumption evidence')
    const pass1 = first.out.pass as Array<Record<string, unknown>>
    assert.equal(pass1.find((p) => p['stage'] === 's_1')!['adopted'], true)
    // PRESS TWO: the settled row has wired inputs and NO snapshot —
    // W-2's own law re-runs it ONCE to record what it consumes, and
    // THAT settle stamps the real snapshot (upstream unmoved: s_0
    // skipped-done, so the wire resolves to the same run).
    const second = await press() as { out: Record<string, unknown>; patches: Array<unknown[]> }
    assert.equal(second.out.status, 'done', String(second.out.error))
    const pass2 = second.out.pass as Array<Record<string, unknown>>
    const s1Row2 = pass2.find((p) => p['stage'] === 's_1')!
    assert.match(String(s1Row2['stale']), /input snapshot missing/, 'the re-run names the W-2 voice — safe-on-stale, never a silent skip')
    const s1Terminal2 = second.patches
      .filter((p) => p[1] === 's_1')
      .map((p) => p[2] as Record<string, unknown>)
      .find((p) => p['runStatus'] === 'done')
    assert.deepEqual((s1Terminal2!['result'] as Record<string, unknown>)['input_runs'],
      { input_image: `r_gen_${genSeq}` }, 'the re-run\u2019s own settle stamps the REAL snapshot — evidence earned, never forged')
  })

  test('an abort MID-PROBE of an adoptable row returns the pending face — the run the row names is durable, never an unreadable stop', async () => {
    // the session died while the ADOPT PROBE itself was in flight:
    // the run on the row was minted by a PRIOR press (durable on the
    // queue), so the D-7 face is pending + run_id + the adoption
    // mark — NOT the unreadable stopped receipt, which names
    // ledger_tail for a run whose existence the row already records.
    const controller = new AbortController()
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: benchWith([liveRow('s_0', 'r_probe_abort'), freshRow('s_1')]) }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') {
          controller.abort(new Error('session teardown'))
          throw new Error('probe transport died')
        }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_never_pa', status: 'queued' } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ bench: true }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'pending', 'the row\u2019s run is durable — an aborted probe is pending, never stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.run_id, 'r_probe_abort')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1, 'the sibling was never pressed')
    assert.equal(pass[0]!['run_id'], 'r_probe_abort')
    assert.equal(pass[0]!['status'], 'queued')
    assert.equal(pass[0]!['adopted'], true, 'the row keeps its adoption mark — no start flew for this run')
    assert.match(String(pass[0]!['aborted']), /session teardown/, 'the abort word rides the row verbatim')
    assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 0, 'nothing was sent — the probe never classified, the press never pressed')
  })

  test('a NON-ERROR abort reason rides the per-stage probe-abort face verbatim — the receipt carries the bench intent and the named stage', async () => {
    // the signal's reason can be a bare value (a teardown lane
    // aborting with a string): the pending face carries it verbatim
    // (never "[object Object]"-mangled), and a PER-STAGE press names
    // its own stage + the bench's intent — the same fields the
    // aborted-observe receipt carries.
    const controller = new AbortController()
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_probe_ab', rev: 1, intent: 'the night set', stages: [liveRow('s_0', 'r_probe_str')] } }
        return undefined
      },
      (lane: string) => {
        if (lane === 'runsStatus') {
          controller.abort('lane teardown')
          throw new Error('probe transport died')
        }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(controller.signal, { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'pending', 'the row\u2019s run is durable — pending, never stopped')
    assert.equal(out.run_id, 'r_probe_str')
    assert.equal(out.intent, 'the night set', 'the per-stage face carries the bench intent')
    assert.equal(out.stage, 's_0', 'the per-stage face carries the named stage')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.match(String(pass[0]!['aborted']), /lane teardown/, 'a bare-string reason rides verbatim, never mangled')
    assert.equal(pass[0]!['adopted'], true)
  })

  test('THE BENCH-SCALED WINDOW (the 9-at-a-time burn, 2026-11-20): the press window grows with the bench and ceilings at the observe budget', () => {
    // Operator: "it can only do 9 at a time instead of the full
    // bench" — D-7's 110 s window was sized for ONE render; a bench
    // pass spent it in ~9 fast rows. The unit law: one pressed
    // stage rides the D-7 base UNCHANGED; each additional row adds
    // its share; the ceiling is the observation budget's own number.
    assert.equal(pressBudgetMs(1), 110_000, 'a single pressed stage keeps D-7\u2019s exact shape')
    assert.equal(pressBudgetMs(2), 200_000, 'one share per additional row')
    assert.equal(pressBudgetMs(6), 560_000, 'the share scales linearly inside the ceiling')
    assert.equal(pressBudgetMs(9), 830_000, 'nine rows: the last full share before the ceiling')
    assert.equal(pressBudgetMs(10), 900_000, 'the ceiling holds — the window never exceeds the observe budget')
    assert.equal(pressBudgetMs(99), 900_000, 'a restored 99-stage bench rides the ceiling, and the pending receipt drains the tail')
  })

  test('THE BENCH-SCALED WINDOW, behavioral: a 6-row bench holds its observe 560 s — the 110 s cutoff is gone, the tail never sent past it', async () => {
    // The D-7 sibling law under the SCALED window: the fake clock
    // walks past the OLD 110 s boundary once, mid-press — the press
    // must STILL be observing (under the flat window it died pending
    // at s_1 here) — and the whole 6-row bench drains in one press.
    let runsStatusCalls = 0
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'image-gen', params: {} },
            { id: 's_2', card: 'image-gen', params: {} },
            { id: 's_3', card: 'image-gen', params: {} },
            { id: 's_4', card: 'image-gen', params: {} },
            { id: 's_5', card: 'image-gen', params: {} },
          ]) }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_six', status: 'queued' } }
        if (lane === 'runsStatus') {
          // ONE bump on the FIRST poll: the clock lands BETWEEN the
          // windows — 150 s, past D-7's flat 110 s cutoff, deep
          // inside the scaled 560 s window. Under the flat window
          // the pass died pending at s_1 here; under the scaled law
          // every row completes — the wall's discriminating arm.
          if (runsStatusCalls++ === 0) vi.setSystemTime(Date.now() + 150_000)
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'out/zero.png' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
    vi.useFakeTimers()
    try {
      const runP = tool.execute({ bench: true }, exec) as Promise<Record<string, unknown>>
      await vi.advanceTimersByTimeAsync(60_000)
      const out = await runP
      assert.equal(out.status, 'done', 'the whole bench drained in one press — the 110 s cutoff that stopped it at nine rows is gone')
      assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 6, 'every row started — none stranded by the old flat window')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass.length, 6)
      assert.equal(pass[0]!['status'], 'done', 's_0 settled inside the scaled window')
    } finally {
      vi.useRealTimers()
    }
  })

  test('THE BENCH-SCALED WINDOW, spent: past the scaled window the pending face names the tail — the D-7 law still holds at the ceiling', async () => {
    // The OTHER half of the law: the scaled window is still a
    // window. A 6-row bench whose rows never settle spends 560 s,
    // then the receipt is pending with the tail named and never
    // sent — D-7's shape, ceilinged.
    const lanes: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> = [
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: benchWith([
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'image-gen', params: {} },
            { id: 's_2', card: 'image-gen', params: {} },
            { id: 's_3', card: 'image-gen', params: {} },
            { id: 's_4', card: 'image-gen', params: {} },
            { id: 's_5', card: 'image-gen', params: {} },
          ]) }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_six_live', status: 'queued' } }
        if (lane === 'runsStatus') return { status: 200, body: { status: 'running', stages: [] } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ]
    const fake = fakeEstateStatus(lanes)
    const tool = meliteFlow(fake.estate)
    const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
    vi.useFakeTimers()
    try {
      const runP = tool.execute({ bench: true }, exec) as Promise<Record<string, unknown>>
      await vi.advanceTimersByTimeAsync(561_600)
      const out = await runP
      assert.equal(out.status, 'pending')
      assert.equal(out.stoppedAt, 's_0')
      assert.equal(out.remaining, 5, 'the five-row tail is named — the re-press contract at the ceiling')
      assert.equal(fake.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the tail was never sent past the window')
      const pass = out.pass as Array<Record<string, unknown>>
      assert.equal(pass[0]!['status'], 'queued')
    } finally {
      vi.useRealTimers()
    }
  })
})
