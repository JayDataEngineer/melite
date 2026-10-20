// chat-preview.snapshot.ts — the Q3 journey wall (operator 2026-11-09):
// a recorded session owning one SETTLED melite_flow call, replayed
// through the conversation card. The tool executes NOTHING (keyless —
// its projector is pure); the persisted presentationMeta {draft_id}
// rides the settled block. THE RENDER LAW LIVES AT THE DOM TIER —
// flow-cards-chat-preview.spec.tsx (inline heroes, mesh no-hero,
// frozen no-hydrate/no-subscribe): this class is keyless REPLAY
// (snapshots assert recorded truth against the live projection, they
// never mount React — the web tier resolves no test renderer, and a
// snapshot that rendered was a dom spec wearing this class's path).
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { meliteFlow } from '../../../packages/harness/melite-tools/src/tools/melite-flow.ts'
import type { ToolCallBlockView } from '../../../packages/web/melite-card-view/src/client/types.ts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('chat preview (keyless replay)', () => {
  it('the settled call persists its draft meta and replays byte-identical through the pure projection', async () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.equal(mode, 'replay', `DSH_SNAPSHOT=${mode}: this scenario replays only (no record machinery)`)

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')
    const parent = selectGeneration(here)
    assert.equal(String(parent.rows[0]?.format), manifest.headerClass)
    assert.equal(parent.rows[1]?.text, 'Make me a short film: a clip, a still, and a score.')

    // THE LIVE PROJECTION (the projector is pure — live streaming AND
    // session-log replay call it with the frozen value alone): the
    // settled value's tile handle is exactly {draft_id, …}.
    const tool = meliteFlow({} as never)
    const meta = tool.output!.presentationMeta!({} as never, {
      mode: 'flow', target: 'film', model: 'krea-2',
      draft_id: 'draft-7', run_id: 'r_9', status: 'completed',
    } as never) as Record<string, unknown>

    // THE LOG ROUND-TRIP (the F3 law): the recorded meta equals the
    // live projection byte-for-byte — the hand-built block is gone.
    const row = parent.rows.find((r): boolean => (r as { type?: string }).type === 'tool-result')
    assert.ok(row, 'the recorded session owns a tool-result row')
    const rec = row as {
      callId: string
      call: { name: string; argsRaw: string } | null
      isError: boolean
      meta: Record<string, unknown>
      content: readonly unknown[]
    }
    assert.equal(rec.call?.name, 'melite_flow', 'the row carries its call head')
    assert.deepEqual(rec.meta, meta, 'the recorded meta equals the live projection')
    const block: ToolCallBlockView = {
      kind: 'tool-result',
      callId: rec.callId,
      call: rec.call,
      isError: rec.isError,
      meta: rec.meta,
      content: rec.content,
    }
    // THE BLOCK IS THE THREAD'S OWN SHAPE (the replay contract): the
    // recorded row rebuilds the view block losslessly — the same
    // object the dom tier's FlowCards renders in
    // flow-cards-chat-preview.spec.tsx (the render witness; the
    // frozen-hero law fires there, at its own tier).
    assert.equal(block.kind, 'tool-result')
    assert.equal(block.call?.name, 'melite_flow')
    assert.equal((block.meta as { draft_id?: string }).draft_id, 'draft-7')
  })
})
