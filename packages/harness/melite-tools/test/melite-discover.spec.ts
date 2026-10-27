// melite_discover walls (vitest, estate mocked — no gateway, no
// network). Pins the thin discover face over the disclose seat:
//   1. FILTERS: lookup defaults to all; empty q/tags ride omitted
//      (never as empty query params).
//   2. COUNTS-FIRST: past CLAMP (12) lines on either plane the
//      answer clamps (counts + tag vocabulary + first rows + hint);
//      detail=true returns every line.
//   3. REFUSALS ride the value (body text > message > 'discover
//      failed').
//   4. PRESENTATION: Discover[: bits] search card; the render
//      counts flows/cards (REFUSED on refusal), never throwing.
//
// MIGRATION LAW (F-1, 2026-11-05): the tool surface's OBSERVABLE
// behavior is byte-stable — every assertion about result text/schema/
// shape stays exactly as written; arms that asserted a URL SPELLING
// re-rolled to assert the TYPED LANE the tool rode
// (seen = { lane: 'discover', args: [lookup, q, tags, signal, timeoutMs] }).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { meliteDiscover } from '../src/tools/melite-discover.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

// The typed-lane mock (F-1, 2026-11-05): the tool plane's tests stub
// the ESTATE seam, never a URL transport. `seen` records the lane a
// tool rode; discover is this spec's one lane.
function mockEstate(handler: (lookup: string, q: string, tags: string) => unknown): {
  seen: Array<{ lane: string; args: unknown[] }>;
  estate: Estate;
} {
  const { estate, seen } = fakeEstate({
    discover: (lookup: string, q: string, tags: string) => handler(lookup, q, tags),
  })
  return { seen, estate }
}

function exec() {
  return fakeExec(AbortSignal.timeout(5000))
}

function stubEstate(): Estate {
  return fakeEstate({ discover: () => ({}) }).estate
}

function flowLine(i: number): Record<string, unknown> {
  return { name: 'flow-' + i, title: 'Flow ' + i, description: 'd', stages: 2, skillRefs: [] }
}

function cardLine(i: number, tags?: unknown): Record<string, unknown> {
  return tags === undefined
    ? { id: 'card-' + i, label: 'Card ' + i, description: 'd' }
    : { id: 'card-' + i, label: 'Card ' + i, description: 'd', tags }
}

describe('melite_discover presentCall — the Discover card', () => {
  test('lists every salient filter bit', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const view = tool.presentCall!({ lookup: 'cards', tags: 'image,upscale', q: 'hi' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Discover: cards · image,upscale · hi')
    assert.equal(view?.kind, 'search')
  })

  test('empty filters ride omitted', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    assert.equal(tool.presentCall!({ lookup: '', tags: '', q: '' })?.title, 'Discover')
    assert.equal(tool.presentCall!({ tags: 'x' })?.title, 'Discover: x')
  })

  test('junk args ride the gate (single seat — no re-attached fallback)', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    // (§7 P7: all params optional — {} renders; null is refused.)
    assert.equal(tool.presentCall!({})?.title, 'Discover')
    assert.equal(tool.presentCall!(null), undefined)
  })
})

describe('melite_discover execute — the filter lane', () => {
  test('defaults ride lookup "all" with empty q/tags on the 15s budget', async () => {
    const flows = [flowLine(0), flowLine(1)]
    const cards = [cardLine(0, ['image']), cardLine(1, ['upscale'])]
    const { seen, estate } = mockEstate(() => ({ flows, cards }))
    const tool = meliteDiscover(estate, () => {})
    const e = exec()
    const out = await tool.execute({}, e) as Record<string, unknown>
    assert.deepEqual(out.flows, flows)
    assert.deepEqual(out.cards, cards)
    // the tool plane speaks the typed lanes; the URL grammar is the
    // browser face's.
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.lane, 'discover')
    assert.deepEqual(seen[0]!.args.slice(0, 3), ['all', '', ''])
    assert.equal(seen[0]!.args[3], e.signal)
    assert.equal(seen[0]!.args[4], 15_000)
  })

  test('set filters ride the typed lane', async () => {
    const { seen, estate } = mockEstate(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(estate, () => {})
    await tool.execute({ lookup: 'cards', tags: 'image', q: 'up' }, exec())
    // the tool plane speaks the typed lanes; the URL grammar is the
    // browser face's — same intent: the filters the caller set ride.
    assert.deepEqual(seen[0]!.args.slice(0, 3), ['cards', 'up', 'image'])
  })

  test('empty-string filters ride omitted (lookup falls back to all)', async () => {
    const { seen, estate } = mockEstate(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(estate, () => {})
    await tool.execute({ lookup: '', tags: '', q: '' }, exec())
    assert.deepEqual(seen[0]!.args.slice(0, 3), ['all', '', ''])
  })

  test('a partial gateway answer still returns verbatim (missing planes default empty)', async () => {
    const flows = [flowLine(0)]
    const { estate: estA } = mockEstate(() => ({ flows }))
    const toolA = meliteDiscover(estA, () => {})
    const outA = await toolA.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(outA, { flows })
    const cards = [cardLine(0, ['image'])]
    const { estate: estB } = mockEstate(() => ({ cards }))
    const toolB = meliteDiscover(estB, () => {})
    const outB = await toolB.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(outB, { cards })
  })
})

describe('melite_discover execute — counts-first clamp', () => {
  test('a large flow plane clamps with counts + vocabulary + hint', async () => {
    const flows = Array.from({ length: 13 }, (_, i) => flowLine(i))
    const cards = [
      cardLine(0, ['upscale', 'image', '', 7]),
      cardLine(1),
    ]
    const { estate } = mockEstate(() => ({ flows, cards }))
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(out.counts, { flows: 13, cards: 2 })
    // the vocabulary keeps declared string tags only, sorted.
    assert.deepEqual(out.tag_vocabulary, ['image', 'upscale'])
    assert.equal((out.flows as unknown[]).length, 12)
    assert.equal((out.cards as unknown[]).length, 2)
    assert.ok(String(out.hint).includes('clamped'), String(out.hint))
  })

  test('a large card plane alone clamps too', async () => {
    const flows = [flowLine(0)]
    const cards = Array.from({ length: 13 }, (_, i) => cardLine(i, ['t' + (i % 3)]))
    const { estate } = mockEstate(() => ({ flows, cards }))
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(out.counts, { flows: 1, cards: 13 })
    assert.equal((out.cards as unknown[]).length, 12)
    assert.deepEqual(out.tag_vocabulary, ['t0', 't1', 't2'])
  })

  test('detail=true returns every line past the clamp', async () => {
    const flows = Array.from({ length: 13 }, (_, i) => flowLine(i))
    const cards = Array.from({ length: 13 }, (_, i) => cardLine(i))
    const { estate } = mockEstate(() => ({ flows, cards }))
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({ detail: true }, exec()) as Record<string, unknown>
    assert.equal((out.flows as unknown[]).length, 13)
    assert.equal((out.cards as unknown[]).length, 13)
    assert.equal(out.counts, undefined)
  })
})

describe('melite_discover execute — refusals ride the value', () => {
  test('a body-carried refusal wins', async () => {
    const { estate } = mockEstate(() => { throw { body: 'seat says no', message: 'wrapped' } })
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'seat says no')
  })

  test('an empty body falls back to the message', async () => {
    const { estate } = mockEstate(() => { throw { body: '', message: 'door message' } })
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'door message')
  })

  test('a plain Error rides its message', async () => {
    const { estate } = mockEstate(() => { throw new Error('boom') })
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'boom')
  })

  test('a bare throw rides the default text', async () => {
    const { estate } = mockEstate(() => { throw 'bare failure' })
    const tool = meliteDiscover(estate, () => {})
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'discover failed')
  })
})

describe('melite_discover render — the counts line', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render({}, { error: 'nope' } as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_discover REFUSED: nope')
  })

  test('THE ROWS RIDE (melite_load demands a name "exactly as discovered")', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render(
      {},
      {
        flows: [flowLine(0), flowLine(1)],
        cards: [cardLine(0, ['image', 'upscale'])],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      "discover: 2 flows, 1 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load\n"
      + 'flows:\n'
      + '  flow-0 — Flow 0 (2 stages)\n'
      + '  flow-1 — Flow 1 (2 stages)\n'
      + 'cards:\n'
      + '  card-0 — Card 0 [image,upscale]',
    )
  })

  test('every ranked row says WHY it surfaced (slice 3: the ranked-answer law)', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render(
      {},
      {
        flows: [],
        cards: [{ id: 'image-gen', label: 'Generate Image', tags: ['image'], matched_by: 'tags=image; modality:image', score: 2 }],
      } as never,
    ) as Array<{ text?: string }>
    const out = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(out.includes('  image-gen — Generate Image [image] · why: tags=image; modality:image'), out)
  })

  test('the clamped shape renders counts over truncated rows + vocabulary + hint', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render(
      {},
      {
        counts: { flows: 0, cards: 20 },
        tag_vocabulary: ['image', 'video'],
        hint: 'clamped — narrow with tags/q, or detail=true for every line',
        flows: [],
        cards: Array.from({ length: 8 }, (_v, i) => cardLine(i)),
      } as never,
    ) as Array<{ text?: string }>
    const out = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(out.startsWith("discover: 0 flows, 20 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load"), 'counts come from counts (not the truncated array)')
    assert.ok(out.includes('+12 more — narrow with tags/q, or detail=true'), 'the clamp tail counts the rest')
    assert.ok(out.includes('tag vocabulary: image, video'), 'the vocabulary rides')
    assert.ok(out.includes('hint: clamped — narrow with tags/q, or detail=true for every line'), 'the hint rides')
  })

  test('over RENDER_CLAMP per plane the rows clamp with a +N more tail', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const flows = Array.from({ length: 10 }, (_v, i) => flowLine(i))
    const parts = tool.output.render({}, { flows, cards: [] } as never) as Array<{ text?: string }>
    const out = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(out.includes('  flow-7 —'), 'clamp boundary rides')
    assert.ok(!out.includes('  flow-8 —'), 'past the clamp nothing rides')
    assert.ok(out.includes('+2 more — detail=true lists every line'), 'the tail counts the rest')
  })

  test('missing lines render as zeroes', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render({}, {} as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      "discover: 0 flows, 0 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load\n"
      + "no match. q is ranked (tag/word/modality/trigram) — try the MODALITY as tags= (video, image, audio, 3d, generate, edit), fewer words, or lookup=all for the estate-wide first pass.",
    )
  })

  test('a nullish value still renders the counts line', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render({}, null as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      "discover: 0 flows, 0 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load\n"
      + "no match. q is ranked (tag/word/modality/trigram) — try the MODALITY as tags= (video, image, audio, 3d, generate, edit), fewer words, or lookup=all for the estate-wide first pass.",
    )
  })

  test('non-string flow cells render honest placeholders (never a crash)', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render(
      {},
      { flows: [{ name: 7, title: 'T', stages: 'many' }], cards: [] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      "discover: 1 flows, 0 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load\n"
      + 'flows:\n'
      + '   — T (? stages)',
    )
  })

  test('an empty tag vocabulary renders no vocabulary line', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render({}, { flows: [], cards: [], tag_vocabulary: [] } as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      "discover: 0 flows, 0 cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load\n"
      + "no match. q is ranked (tag/word/modality/trigram) — try the MODALITY as tags= (video, image, audio, 3d, generate, edit), fewer words, or lookup=all for the estate-wide first pass.",
    )
  })
})

describe('melite_discover — the empty-AND hint (attempt-4 gap, verified)', () => {
  test('a zero result with MULTI-tag query names the AND law', async () => {
    const mock = mockEstate(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(mock.estate, () => {})
    const out = await tool.execute({ tags: 'image,video,audio' }, fakeExec(AbortSignal.timeout(4000))) as Record<string, unknown>
    assert.match(String(out['hint']), /tags is an AND/)
  })
  test('a zero result with a SINGLE tag stays the gateway answer (no nag)', async () => {
    const mock = mockEstate(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(mock.estate, () => {})
    const out = await tool.execute({ tags: 'video' }, fakeExec(AbortSignal.timeout(4000))) as Record<string, unknown>
    assert.equal(out['hint'], undefined)
  })

  test('a zero result without tags takes the ordinary empty answer', async () => {
    const mock = mockEstate(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(mock.estate, () => {})
    const out = await tool.execute({}, fakeExec(AbortSignal.timeout(4000))) as Record<string, unknown>
    assert.equal(out.hint, undefined)
  })

  test('detail rendering keeps every line past the presentation clamp', () => {
    const tool = meliteDiscover(stubEstate(), () => {})
    const parts = tool.output.render({ detail: true }, {
      flows: Array.from({ length: 10 }, (_v, i) => flowLine(i)),
      cards: [],
    } as never) as Array<{ text?: string }>
    const text = parts.map((part) => part.text ?? '').join('\n')
    assert.ok(text.includes('flow-9'))
    assert.ok(!text.includes('+2 more'))
  })
});
