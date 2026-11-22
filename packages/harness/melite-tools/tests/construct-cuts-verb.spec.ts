// construct-cuts-verb.spec.ts — THE ONE-BENCH WALL (operator
// 2026-11-10: "THE AGENT, AND THE USER UI. SHARE ONE BENCH. ONE.").
// Windows ARE the doc's calls rows — the ONE storage the strip's
// Add cut, the leaf form, and the run all read. The agent had ZERO
// doors into them and GUESSED three spellings (clip_seconds, two
// edit[] entries, typed overlap_frames — one accepted by accident;
// the card UI showed the truth: one window). This wall pins the
// cure's whole journey at the patch arm:
//   agent states {cuts: "seconds"} → the door expands them through
//   the ONE split law (@melite/contracts/timelineContract — the same
//   bytes the strip's mutations ride) → the wire patch carries the
//   rewritten calls rows and NO cuts key (the verb never persists —
//   ONE storage, zero second spellings) → the answer names the
//   window count (a payload key nobody prints is a voice nobody
//   hears) → the refusal arms fire loud, never a silent drop.
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { meliteConstruct } from '../src/tools/melite-construct.ts'
import { admitSpanGrid, transitionOverlap } from '@melite/contracts/timelineContract'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

const SIG = AbortSignal.timeout(5000)

// THE CARD-DEF SEAT (flag-gated: null rides the real tree). The one
// arm that needs a card def — the craft-rewrite face — seeds its def
// here and resets in its own finally; every other test reads the real
// defs exactly as before.
const mockState = vi.hoisted(() => ({
  defs: null as null | Record<string, Record<string, unknown>>,
}))

vi.mock('@melite/comfyui-cordis', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@melite/comfyui-cordis')>()
  return {
    ...orig,
    loadCardDefs: async () => {
      const real = await (orig as unknown as { loadCardDefs(): Promise<Map<string, unknown>> }).loadCardDefs()
      if (mockState.defs === null) return real
      return new Map<string, unknown>([...real, ...Object.entries(mockState.defs)])
    },
  }
})

/** The beach-film tiling (the proven law): first window 22+17k,
 * carried windows 17k with their 22f seam from the generation head. */
const BEACH_CALLS = [
  { text: 'w1', start_frame: 0, end_frame: 124 },
  { text: 'w2', start_frame: 124, end_frame: 243, transition: 'extend' },
  { text: 'w3', start_frame: 243, end_frame: 362, transition: 'extend' },
]

const benchWith = (calls: unknown) => async () => ({
  rev: 7,
  stages: [{ id: 's_0', stage: 's_0', card: 'h3-film-cuttest', params: { calls } }],
})

describe('THE CUTS VERB — the agent\'s door into the one storage', () => {
  test('a stated cuts verb lands as rewritten calls rows and never persists the spelling', async () => {
    let sent: Record<string, unknown> | undefined
    const { estate, seen } = fakeEstate({
      benchGet: benchWith(BEACH_CALLS),
      benchVerb: async (_s: string, _v: string, body: unknown) => {
        sent = body as Record<string, unknown>
        return { rev: 8, stage: 's_0', patched: true, changed: true, diff: ['calls'] }
      },
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: { cuts: '2.5' } },
      fakeExec(SIG, { agent: { id: 'session-cut1' } }),
    ) as Record<string, unknown>

    // the wire patch: calls rows rewritten, the verb's spelling GONE
    const params = sent?.['params'] as Record<string, unknown>
    assert.ok(Array.isArray(params['calls']), 'the patch must carry the calls rows')
    assert.equal(params['cuts'], undefined, 'the cuts spelling never persists — ONE storage')
    // the split at 2.5s=60f snaps to 56: [0→56] + the rebased tiling
    const rows = params['calls'] as Array<{ start_frame: number; end_frame: number; transition?: string }>
    assert.equal(rows.length, 4, 'one cut, one more window')
    assert.deepEqual(
      rows.map((r) => [r.start_frame, r.end_frame]),
      [[0, 56], [56, 124], [124, 243], [243, 362]],
      'THE SEAM LAW: the carried seam costs the right half its 22f head (17k span), ' +
      'and the downstream windows keep their own lattice seats — the film keeps its length',
    )
    assert.equal(rows[1]!.transition, 'extend', 'THE SEAM LAW (operator 2026-11-17): a split births CARRY — never stock; stock is the operator\'s manual escape hatch alone')
    // ACCURACY (the contract canon): the rows the verb authors must
    // pass the schema's OWN span gate — the split never writes a doc
    // the walk would refuse (the 141f off-lattice defect this wall
    // caught when the carry default landed: sliding a downstream
    // start without its end authored an illegal carried span).
    rows.forEach((r, i) => {
      const carry = i > 0 ? transitionOverlap(r.transition) : 0
      admitSpanGrid({ start: r.start_frame, end: r.end_frame }, `calls[${i}]`, carry)
    })
    // the tiling law survives the reflow (end of i = start of i+1)
    for (let i = 1; i < rows.length; i++) {
      assert.equal(rows[i]!.start_frame, rows[i - 1]!.end_frame, `the seam at row ${i} tiles`)
    }
    // the answer names what was built (the model reads the count)
    assert.equal(out['cuts_windows'], 4)
    // and the count PRINTS at the model's read — a payload key nobody
    // prints is a voice nobody hears: the render carries the one
    // storage's new window face.
    const blocks = tool.output!.render!({ verb: 'patch', stage: 's_0' } as never, out as never) as Array<{ type?: string, text?: string }>
    const rendered = blocks.map((b) => b.text ?? '').join('\n')
    assert.ok(rendered.includes('cuts → 4 windows: the calls rows are rewritten'),
      'the render names the window count the verb built: ' + rendered)
    // the refusal never fired: the write lane was reached exactly once
    assert.equal(seen.filter((c) => c.lane === 'benchVerb').length, 1)
  })

  test('a stage with no calls rows refuses loud naming the one storage', async () => {
    const { estate, seen } = fakeEstate({ benchGet: benchWith(undefined) })
    const out = await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's_0', params: { cuts: '2.5' } },
      fakeExec(SIG, { agent: { id: 'session-cut2' } }),
    ) as Record<string, unknown>
    assert.match(String(out['error']), /no calls rows to split/)
    assert.match(String(out['error']), /ONE storage/)
    assert.equal(seen.filter((c) => c.lane === 'benchVerb').length, 0, 'a refusal never writes')
  })

  test('malformed calls rows refuse naming the calls law', async () => {
    const { estate } = fakeEstate({ benchGet: benchWith([{ text: 'broken' }]) })
    const out = await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's_0', params: { cuts: '2.5' } },
      fakeExec(SIG, { agent: { id: 'session-cut3' } }),
    ) as Record<string, unknown>
    assert.match(String(out['error']), /malformed/)
    assert.match(String(out['error']), /start_frame/)
  })

  test('garbage seconds and empty split points refuse, never parse-to-zero', async () => {
    for (const bad of ['soon', '2.5,,5']) {
      const { estate } = fakeEstate({ benchGet: benchWith(BEACH_CALLS) })
      const out = await meliteConstruct(estate).execute(
        { verb: 'patch', stage: 's_0', params: { cuts: bad } },
        fakeExec(SIG, { agent: { id: 'session-cut4' } }),
      ) as Record<string, unknown>
      assert.match(String(out['error']), /seconds/, `cuts '${bad}' must refuse as a spelling fault`)
    }
  })

  test('a cuts patch on a stage the bench does not list reads no held windows — the one-storage refusal precedes any write', async () => {
    // heldParams is the named row's OWN params, read off the projected
    // bench: a stage the doc does not list holds no windows for the
    // verb to split (and the projection always heals a listed row to a
    // params record, so the held bag is undefined only here). The
    // refusal is the one-storage voice, and the write lane never flew.
    const { estate, seen } = fakeEstate({ benchGet: benchWith(BEACH_CALLS) })
    const out = await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's_ghost', params: { cuts: '2.5' } },
      fakeExec(SIG, { agent: { id: 'session-cut5' } }),
    ) as Record<string, unknown>
    assert.match(String(out['error']), /no calls rows to split/, 'an unlisted stage splits nothing: ' + String(out['error']))
    assert.match(String(out['error']), /ONE storage/)
    assert.equal(seen.filter((c) => c.lane === 'benchVerb').length, 0, 'a refusal never writes')
  })

  test('a card whose craft law rewrites params away from the cuts spelling refuses — the verb reads the merged bag, never guesses', async () => {
    // The split law reads the bag the write will LAND (deriveParams'
    // output), not the caller's spelling alone: a craft normalize that
    // folds params can drop the verb's key mid-derive, and the honest
    // answer is the empty-split-point refusal — never a silent pass
    // typed as frames (the run-e79f3b304e4b law).
    mockState.defs = {
      'h3-film-cuttest': {
        craft: { normalize: (p: Record<string, unknown>) => ({ params: { ...p, cuts: undefined }, fixed: [] }) },
      },
    }
    try {
      const { estate, seen } = fakeEstate({ benchGet: benchWith(BEACH_CALLS) })
      const out = await meliteConstruct(estate).execute(
        { verb: 'patch', stage: 's_0', params: { cuts: '2.5' } },
        fakeExec(SIG, { agent: { id: 'session-cut6' } }),
      ) as Record<string, unknown>
      assert.match(String(out['error']), /states an empty split point/,
        'the derive-dropped spelling degrades to the empty-split refusal, loud: ' + String(out['error']))
      assert.equal(seen.filter((c) => c.lane === 'benchVerb').length, 0, 'the write lane never flew — a refusal precedes every write')
    } finally {
      mockState.defs = null
    }
  })

  test('the schema\'s params seat teaches the verb (a law nobody reads is a door nobody finds)', () => {
    const tool = meliteConstruct(fakeEstate({}).estate)
    const desc = (tool.parameters as unknown as {
      properties: { params: { description?: string } }
    }).properties.params.description ?? ''
    assert.ok(desc.includes('cuts'), 'the params seat must name the cuts verb')
    assert.ok(desc.includes('calls rows') || desc.includes('params.calls'), 'the params seat must name the one storage')
    assert.ok(desc.includes('clip_seconds') || desc.includes('NOT windows'), 'the params seat must name the false spellings')
  })
})
