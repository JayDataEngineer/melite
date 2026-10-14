import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildH3TimelineTool } from '../../../packages/video/h3-timeline/src/tool.ts'
import { schema as h3schema } from '../../../packages/models/h3/src/schema.ts'
import { film } from '../../../packages/models/h3/src/actions.ts'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { instantiateAction } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

// THE KEYFRAME COMPOSE (keyless replay — the keyframe lane's snapshot,
// slice 2 2026-11-05): the recorded ask carries two pins — one
// strictly inside the first window, one on its last frame. Replay
// drives the REAL tool face (the keyframes channel must ride both
// estate doors beside calls/audio_clips) and then composes the posted
// doc through the REAL h3 build: the interior pin rides the
// MiniMaxH3AddGuide image arm at its generation-local frame, and a
// boundary-pin doc composes BYTE-IDENTICALLY to the same doc stating
// the anchor/end-anchor seats directly (the design's no-graph-change
// probe — the model-visible truth this snapshot owns).
describe('h3 keyframe compose (keyless replay)', () => {
  it('carries the keyframes channel to both estate doors and composes the pins', async () => {
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
    assert.match(String(parent.rows[1]?.text), /frame 45/)

    const calls = [
      { text: 'The courier pushes into the rain.', start_frame: 0, end_frame: 90 },
      { text: 'She reaches the lantern.', start_frame: 90, end_frame: 175 },
    ]
    const keyframes = [
      { image: '/assets/runs/r1/face.png', frame: 45 },
      { image: '/assets/runs/r1/last-look.png', frame: 89 },
    ]
    const posts: Array<{ path: string; body: Record<string, unknown> }> = []
    const tool = buildH3TimelineTool(async (_method, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> })
      if (path === '/v1/flows/drafts') return { draftId: 'd-kf-snapshot' }
      return { run_id: 'r-kf-snapshot', status: 'queued' }
    })
    const result = await tool.execute?.({
      model: 'h3',
      prompt: 'A courier runs through a rainy market.',
      calls,
      keyframes,
    }, undefined) as { run_id?: string }
    assert.equal(result.run_id, 'r-kf-snapshot')

    const draft = posts.find((post) => post.path === '/v1/flows/drafts')
    const start = posts.find((post) => post.path === '/v1/flows/start')
    const draftParams = (draft?.body.stages as Array<{ params?: Record<string, unknown> }>)[0]?.params
    assert.deepEqual(draftParams?.keyframes, keyframes, 'the draft door carries the pin channel')
    assert.deepEqual(start?.body.keyframes, keyframes, 'the start door carries the pin channel')

    // THE COMPOSE (the model-visible ride): the posted doc walks the
    // real schema and builds the real graph. Window 1 is [0, 90): the
    // pin at 45 is strictly interior → AddGuide at generation-local 45;
    // the pin at 89 is the window's last frame → the END ANCHOR seat.
    const model: ModelFacts = {
      id: 'h3', card: 'h3-timeline', defaults: {},
      lane_inputs: { unet: 'minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors' },
      variants: [], variant_groups: [], outputs: [],
    }
    const compose = (params: Record<string, unknown>): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
      const g = new GraphBuilder()
      instantiateAction(film, h3schema(params) as Record<string, unknown>, model, g, 'r-kf-snapshot')
      return g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
    }
    const graph = compose({ loras: [], seed: 7, prompt: 'A courier runs through a rainy market.', calls, keyframes })
    const guides = Object.values(graph).filter((n) => n.class_type === 'MiniMaxH3AddGuide' && n.inputs.image !== undefined)
    assert.equal(guides.length, 1, 'the interior pin rides exactly one image guide')
    assert.equal(guides[0]!.inputs.frame_idx, 45)
    assert.ok(JSON.stringify(graph).includes('/assets/runs/r1/last-look.png'), 'the end-anchor pin reaches the graph')

    // THE PROBE (byte-identical endpoints): the same doc stating the
    // END pin as the seat directly — keeping the interior pin —
    // composes the SAME graph bytes (boundary pins claim seats; the
    // interior pin rides the chain identically on both sides).
    const seats = compose({
      loras: [], seed: 7, prompt: 'A courier runs through a rainy market.',
      calls: [
        { ...calls[0], last_frame: '/assets/runs/r1/last-look.png' },
        calls[1],
      ],
      keyframes: [{ image: '/assets/runs/r1/face.png', frame: 45 }],
    })
    assert.deepEqual(graph, seats, 'the graph bytes match — no graph change for endpoint pins')
  })
})
