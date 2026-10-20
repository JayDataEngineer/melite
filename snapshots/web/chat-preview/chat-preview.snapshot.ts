// @vitest-environment happy-dom
// chat-preview.snapshot.ts — the Q3 journey wall (operator 2026-11-09):
// a recorded session owning one SETTLED melite_flow call, replayed
// through the conversation card. The tool executes NOTHING (keyless —
// its projector is pure); the persisted presentationMeta {draft_id}
// rides the settled block; the card hydrates the draft off the
// stubbed estate; the finished video/image/audio render INLINE in
// the thread through the shared card-base heroes — FROZEN (no
// hydrate, no subscribe: the bench owns live progress, the thread
// keeps a replay-safe snapshot). Mesh stages render no hero (the
// operator named image/audio/video).
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { meliteFlow } from '../../../packages/harness/melite-tools/src/tools/melite-flow.ts'
import { FlowCards } from '../../../packages/web/melite-card-view/src/client/FlowCards.tsx'
import type { ToolCallBlockView } from '../../../packages/web/melite-card-view/src/client/types.ts'
import { mountEstateFakes } from '../../../packages/web/melite-card-view/tests/estate-harness.ts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

/** The settled estate the thread replays: three finished stages (one
 *  hero each) plus a mesh stage that stays hero-less. */
const DRAFT_STAGES: Array<Record<string, unknown>> = [
  { id: 's_vid', title: 'clip', kind: 'generation', service: 'krea-2', status: 'completed', params: {}, result: { artifacts: { output: 'https://cdn/x/clip.mp4' } } },
  { id: 's_img', title: 'still', kind: 'generation', status: 'completed', params: {}, result: { artifacts: { output: 'https://cdn/x/pic.png' } } },
  { id: 's_snd', title: 'score', kind: 'generation', status: 'completed', params: {}, result: { artifacts: { output: 'https://cdn/x/song.mp3' } } },
  { id: 's_mesh', title: 'body', kind: 'generation', status: 'completed', params: {}, result: { artifacts: { out: 'https://cdn/x/body.glb' } } },
]

describe('chat preview (keyless replay)', () => {
  it('the settled call persists its draft meta, and the card renders the finished media inline, frozen', async () => {
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

    // THE FROZEN CARD: the settled draft's own artifacts render inline
    // through the shared heroes; the mesh stage renders no hero; the
    // card opens no live tail (the thread is a snapshot, not a bench).
    const fakes = mountEstateFakes({
      draftStages: DRAFT_STAGES.map((s) => ({ ...s })),
      draftBenchRev: 3,
      draftIntent: 'the film',
    })
    try {
      render(h(FlowCards, { block }))
      const video = await screen.findByTestId('stage-preview-video-hero', {}, { timeout: 4000 })
      assert.equal(video.getAttribute('src'), 'https://cdn/x/clip.mp4')
      const image = await screen.findByTestId('stage-preview-image-hero', {}, { timeout: 4000 })
      assert.equal(image.getAttribute('src'), 'https://cdn/x/pic.png')
      const audio = await screen.findByTestId('stage-preview-audio-hero', {}, { timeout: 4000 })
      assert.equal(audio.getAttribute('src'), 'https://cdn/x/song.mp3')
      assert.equal(document.querySelectorAll('[data-chat-preview]').length, 3, 'one frozen hero per renderable stage (mesh stays out)')
      await new Promise((r) => setTimeout(r, 200))
      const methods = fakes.calls.map((c) => c.method)
      assert.ok(!methods.includes('runs/status'), 'frozen: no live hydrate')
      assert.ok(!methods.includes('runs/subscribe'), 'frozen: no live subscribe')
    } finally {
      fakes.unmount()
      cleanup()
    }
  })
})
