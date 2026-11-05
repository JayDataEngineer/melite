// @vitest-environment happy-dom
// construct-flow-link.snapshot.ts — the construct flow-link replay
// (flow-link audit item 5, 2026-11-06): a recorded session owning
// one melite_construct call, replayed through the conversation
// card. The tool executes for REAL against the stubbed estate
// (keyless), its persisted presentationMeta {bench} rides the
// settled block, and the ConstructCard's flow link opens
// dsh-resource://cards/bench/<session> — the native channel
// end-to-end at the snapshot tier, the same law the battery's
// construct-card.spec.tsx pins with fixtures and the cross-judge
// wall pins projector→reader.
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { meliteConstruct } from '../../../packages/harness/melite-tools/src/tools/melite-construct.ts'
import { ConstructCard } from '../../../packages/web/melite-card-view/src/client/construct-card.tsx'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import type { ToolCallBlockView } from '../../../packages/web/melite-card-view/src/client/types.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('construct flow-link (keyless replay)', () => {
  it('the recorded construct call settles, persists its bench meta, and the card link opens the bench address', async () => {
    // (audit-followups W5, 2026-11-06) REPLAY ONLY, fail loud:
    // this scenario owns no record machinery (the log IS the
    // fixture; re-verifying the committed log against a fresh
    // execution is the still-open refresh semantics) — accepting
    // record/refresh as silent replay-equivalents would let an
    // operator believe they re-recorded. Until the refresh
    // semantics land, any other mode refuses here.
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.equal(mode, 'replay', `DSH_SNAPSHOT=${mode}: this scenario replays only (no record machinery — see above)`)

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')
    const parent = selectGeneration(here)
    assert.equal(String(parent.rows[0]?.format), manifest.headerClass)
    assert.equal(parent.rows[1]?.text, "Read the conversation's flow bench.")

    // the recorded session's bench: the read targets the calling
    // conversation's bench (s_chat7 rides the exec context's agent id)
    const estate = {
      benchGet: async () => ({ session: 's_chat7', rev: 5, intent: 'x', stages: [{ id: 's1' }], log: [] }),
    } as never
    const tool = meliteConstruct(estate)
    const out = (await tool.execute({ verb: 'read' }, {
      signal: AbortSignal.timeout(5000),
      agent: { id: 's_chat7' },
    } as never)) as Record<string, unknown>

    // the persisted channel: the projector's payload is exactly
    // {bench}. THE ONE-SEAT SPELLING (2026-10-31, benchKeyOfExec):
    // this exec's bare uuid agent id is a DELEGATED lane, so the
    // tool forwards the seat as delegate:s_chat7 — the estate door
    // re-seats it to the parent conversation's bench (seatOf), and
    // the client address channel carries the spelling verbatim
    // (cards-resource carriedBenchKey — this replay found the client
    // falling it to 'main', the delegation split on the link
    // channel, cured the same night). The RECORDED row below
    // predates the spelling (a pre-law recording — replay-only, no
    // record machinery), so the log-round-trip arms assert the
    // recorded bytes' own fidelity and name the difference.
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>
    assert.deepEqual(meta, { bench: 'delegate:s_chat7' })

    // (audit-followups M3, 2026-11-06) the settled block rides the
    // RECORDED tool-result row — the log→meta→card half the F3 audit
    // demanded: the persisted shape must survive the log round-trip.
    // The hand-built block is GONE; this arm selects the row from the
    // fixture and narrows it through the runtime's settled form.
    const row = parent.rows.find((r): boolean => (r as { type?: string }).type === 'tool-result')
    assert.ok(row, 'the recorded session owns a tool-result row')
    const rec = row as {
      callId: string
      call: { name: string; argsRaw: string } | null
      isError: boolean
      meta: { bench?: string }
      content: readonly unknown[]
    }
    assert.equal(rec.call?.name, 'melite_construct', 'the row carries its call head')
    assert.deepEqual(rec.meta, { bench: 's_chat7' }, 'the recorded (pre-law) bytes survive the log round-trip byte-for-byte')
    // the pre-law recording's key vs the live projection: the
    // difference is EXACTLY the one-seat spelling (the delegate:
    // prefix the law added) — anything else would be drift
    assert.equal(
      'delegate:' + (rec.meta as { bench?: string }).bench,
      (meta as { bench?: string }).bench,
      'the live projection differs from the recording by exactly the one-seat delegate: spelling',
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
    // THE CARD RENDERS THE PERSISTED ROW (persistence-fidelity: the
    // link address is built from the recording's own meta bytes, not
    // the live projection) — this recording predates the one-seat
    // spelling, so its link is the pre-law address. The client carry
    // (carriedBenchKey) is proven on the pure plane: a delegate:
    // meta renders a delegate: address, verbatim.
    assert.deepEqual(opened, ['dsh-resource://cards/bench/s_chat7'], 'the link opens the address the recorded meta names (the card channel is faithful to its persisted row)')
    cleanup()
  })
})
