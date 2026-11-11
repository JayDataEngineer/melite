// @vitest-environment happy-dom
// construct-cuts-verb.snapshot.ts — the ONE-BENCH cut door replay
// (the types/docs/testing audit's F8-2, 2026-11-17): a recorded
// session owning one melite_construct cuts press, replayed through
// the conversation card. The tool executes for REAL against the
// stubbed estate (keyless): the stated verb expands through THE ONE
// SPLIT LAW (@melite/models-h3/timelineContract — the same bytes the
// strip's mutations ride), the wire patch carries rewritten calls
// rows and never the verb's spelling, and the settled block's bench
// meta opens the card link. The wall-spec arms
// (packages/harness/melite-tools/test/construct-cuts-verb.spec.ts)
// own the mechanism's every refusal; this scenario owns the
// SESSION-LEVEL journey: recorded row → real execute → persisted
// meta → the card's link, the tier the testing policy demands in the
// same PR as a model-visible verb.
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { meliteConstruct } from '../../../packages/harness/melite-tools/src/tools/melite-construct.ts'
import { ConstructCard } from '../../../packages/web/melite-card-view/src/client/construct-card.tsx'
import { assertSpanGrid, transitionOverlap } from '@melite/models-h3/timelineContract'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import type { ToolCallBlockView } from '../../../packages/web/melite-card-view/src/client/types.ts'

const here = dirname(fileURLToPath(import.meta.url))

/** The beach-film tiling (the proven law): first window 22+17k,
 * carried windows 17k with their 22f seam from the generation head. */
const BEACH_CALLS = [
  { text: 'w1', start_frame: 0, end_frame: 124 },
  { text: 'w2', start_frame: 124, end_frame: 243, transition: 'extend' },
  { text: 'w3', start_frame: 243, end_frame: 362, transition: 'extend' },
]

describe('construct cuts-verb (keyless replay)', () => {
  it('the recorded cuts press settles through the seam law, persists its bench meta, and the card link opens the bench address', async () => {
    // REPLAY ONLY, fail loud (the construct-flow-link law): this
    // scenario owns no record machinery — the log IS the fixture.
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.equal(mode, 'replay', `DSH_SNAPSHOT=${mode}: this scenario replays only (no record machinery)`)

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')
    const parent = selectGeneration(here)
    assert.equal(String(parent.rows[0]?.format), manifest.headerClass)
    assert.equal(parent.rows[1]?.text, 'Cut the film at two and a half seconds, carried.')

    // the recorded session's bench, stubbed keyless (the estate door
    // the real lane serves): the pre-cut tiling reads, the patch
    // verb lands, the answer names the window count.
    let sent: Record<string, unknown> | undefined
    const estate = {
      benchGet: async () => ({
        rev: 7,
        stages: [{ id: 's_0', stage: 's_0', card: 'h3-film-cuttest', params: { calls: BEACH_CALLS } }],
      }),
      benchVerb: async (_s: string, _v: string, body: unknown) => {
        sent = body as Record<string, unknown>
        return { rev: 8, stage: 's_0', patched: true, changed: true, diff: ['calls'] }
      },
    } as never
    const tool = meliteConstruct(estate)
    const out = (await tool.execute(
      { verb: 'patch', stage: 's_0', params: { cuts: '2.5' } },
      { signal: AbortSignal.timeout(5000), agent: { id: 's_cut7' } } as never,
    )) as Record<string, unknown>

    // THE SEAM LAW (operator 2026-11-17): 2.5s=60f snaps to 56; the
    // carried seam costs the right half its 22f head; downstream
    // windows keep their lattice seats — the film keeps its length.
    const params = sent?.['params'] as Record<string, unknown>
    assert.ok(Array.isArray(params['calls']), 'the patch carries the calls rows')
    assert.equal(params['cuts'], undefined, 'the verb spelling never persists — ONE storage')
    const rows = params['calls'] as Array<{ start_frame: number, end_frame: number, transition?: string }>
    assert.deepEqual(
      rows.map((r) => [r.start_frame, r.end_frame]),
      [[0, 56], [56, 124], [124, 243], [243, 362]],
      'the split lands at the lattice frame and the tiling survives the reflow',
    )
    assert.equal(rows[1]!.transition, 'extend', 'a split births CARRY — never stock (the operator\'s manual escape hatch alone)')
    // ACCURACY: the authored rows pass the schema's own span gate
    rows.forEach((r, i) => {
      const carry = i > 0 ? transitionOverlap(r.transition) : 0
      assertSpanGrid({ start: r.start_frame, end: r.end_frame }, `calls[${i}]`, carry)
    })
    // the answer names what was built (the model reads the count)
    assert.ok(JSON.stringify(out).includes('4'), 'the answer names the window count')

    // the persisted channel: the projector's payload is the bench
    // seat this exec pins — a bare uuid agent id is a DELEGATED
    // lane, so the one-seat spelling carries the delegate: prefix
    // (benchKeyOfExec's law; the recorded meta is the pre-render
    // seat the door re-seats to the parent conversation's bench)
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>
    assert.equal(meta.bench, 'delegate:s_cut7')

    // THE SETTLED BLOCK RIDES THE RECORDED ROW (the log→meta→card
    // half): select the fixture's tool-result row, narrow it through
    // the runtime's settled form, render the card from the persisted
    // bytes alone.
    const row = parent.rows.find((r): boolean => (r as { type?: string }).type === 'tool-result')
    assert.ok(row, 'the recorded session owns a tool-result row')
    const rec = row as {
      callId: string
      call: { name: string, argsRaw: string } | null
      isError: boolean
      meta: { bench?: string }
      content: readonly unknown[]
    }
    assert.equal(rec.call?.name, 'melite_construct', 'the row carries its call head')
    assert.equal(
      rec.call?.argsRaw,
      '{"verb": "patch", "stage": "s_0", "params": {"cuts": "2.5"}}',
      'the recorded press states the cuts verb verbatim',
    )
    const block: ToolCallBlockView = {
      kind: 'tool-result',
      callId: rec.callId,
      call: rec.call,
      isError: rec.isError,
      meta: rec.meta,
      content: rec.content,
    }
    const opened: string[] = []
    render(h(ConstructCard, { block, openSurface: (a: string) => { opened.push(a) } }))
    const link = screen.getByRole('button')
    assert.equal(link.getAttribute('aria-label'), 'open flow', 'the flow link renders from the persisted meta alone')
    fireEvent.click(link)
    assert.deepEqual(
      opened,
      ['dsh-resource://cards/bench/s_cut7'],
      'the link opens the address the recorded meta names (the card channel is faithful to its persisted row)',
    )
    cleanup()
  })
})
