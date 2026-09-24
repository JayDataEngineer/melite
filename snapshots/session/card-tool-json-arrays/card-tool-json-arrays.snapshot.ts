import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildH3TimelineTool } from '../../../packages/video/h3-timeline/src/tool.ts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('card-tool JSON arrays (keyless replay)', () => {
  it('carries recorded calls and audio_clips as arrays to both estate doors', async () => {
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
    assert.equal(parent.rows[1]?.text, 'Create a two-shot film and carry one dialogue clip.')

    const posts: Array<{ path: string; body: Record<string, unknown> }> = []
    const tool = buildH3TimelineTool(async (_method, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> })
      if (path === '/v1/flows/drafts') return { draftId: 'd-snapshot' }
      return { run_id: 'r-snapshot', status: 'queued' }
    })
    const calls = [
      { text: 'The courier pushes into the rain.', start_frame: 0, end_frame: 124 },
      { text: 'She reaches the lantern.', start_frame: 124, end_frame: 243 },
    ]
    const audioClips = [{ src: '/v1/assets/runs/r1/line.flac', start_frame: 12, dur_frames: 48, text: 'Run.' }]
    const result = await tool.execute?.({
      model: 'h3',
      prompt: 'A courier runs through a rainy market.',
      calls: JSON.stringify(calls),
      audio_clips: JSON.stringify(audioClips),
    }, undefined) as { run_id?: string }
    assert.equal(result.run_id, 'r-snapshot')

    const draft = posts.find((post) => post.path === '/v1/flows/drafts')
    const start = posts.find((post) => post.path === '/v1/flows/start')
    const draftParams = (draft?.body.stages as Array<{ params?: Record<string, unknown> }>)[0]?.params
    assert.deepEqual(draftParams?.calls, calls)
    assert.deepEqual(draftParams?.audio_clips, audioClips)
    assert.deepEqual(start?.body.calls, calls)
    assert.deepEqual(start?.body.audio_clips, audioClips)
  })
})
