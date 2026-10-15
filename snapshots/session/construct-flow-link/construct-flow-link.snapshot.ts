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
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

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

    // the persisted channel: the projector's payload is exactly {bench}
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>
    assert.deepEqual(meta, { bench: 's_chat7' })

    // the settled block the conversation card replays
    const block: ToolCallBlockView = {
      kind: 'tool-result',
      callId: 'c1',
      call: { name: 'melite_construct', argsRaw: JSON.stringify({ verb: 'read' }) },
      isError: false,
      meta,
      content: [{ type: 'text', text: 'bench read → rev 5' }],
    } as unknown as ToolCallBlockView

    const opened: string[] = []
    render(h(ConstructCard, { block, openSurface: (a: string) => { opened.push(a) } }))
    const link = screen.getByRole('button')
    assert.equal(link.getAttribute('aria-label'), 'open flow', 'the flow link renders from the persisted meta alone')
    fireEvent.click(link)
    assert.deepEqual(opened, ['dsh-resource://cards/bench/s_chat7'], 'the link opens the conversation bench address')
    cleanup()
  })
})
