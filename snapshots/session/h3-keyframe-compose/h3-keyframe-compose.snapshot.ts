import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildH3TimelineTool } from '../../../packages/video/h3-timeline/src/tool.ts'
import { schema as h3schema } from '../../../packages/models/h3/src/schema.ts'
import { film } from '../../../packages/models/h3/src/actions.ts'
import { keyframesToLanes } from '../../../packages/video/h3-timeline/src/ui/studio/docCalls.ts'
import { pinDropVerdict } from '../../../packages/video/h3-timeline/src/ui/studio/docGrid.ts'
import { studioCopy } from '../../../packages/video/h3-timeline/src/ui/studio/studioCopy.ts'
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

  it('carries the chip lane (slice 3): thumb, frame readout, drop hint over the recorded pins', async () => {
    // THE CHIP LANE (keyless, slice 3 — 2026-11-05): the same recorded
    // doc's pins, walked through the studio's UI-side derived faces —
    // the bar renders WHAT it is given (thumbUrl/readout/dropHint ride
    // the TimelineKeyframe), the words are the dictionary's, the
    // verdict is the grid law's (docGrid.pinDropVerdict — the plan
    // gate's own window predicate over GRID_STEP_FRAMES). The WRITE
    // stays the raw frame: this arm judges only display data.
    const calls = [
      { text: 'The courier pushes into the rain.', start_frame: 0, end_frame: 90 },
      { text: 'She reaches the lantern.', start_frame: 90, end_frame: 175 },
    ]
    const keyframes = [
      { image: '/assets/runs/r1/face.png', frame: 45 },
      { image: 'last-look', frame: 89 },
      { image: 'https://r/arrival.png', frame: 200 },
    ]
    // the artifact index the tenant threads (useFilmAudio's byName):
    // the bare NAME resolves, an unknown name never thumbs.
    const byName = new Map([['last-look', '/assets/runs/r1/last-look.png']])
    const lanes = keyframesToLanes(keyframes).map((l, i) => {
      const resolved = byName.get(keyframes[i]!.image)
      return resolved === undefined ? l : { ...l, thumbUrl: resolved }
    })
    // thumbs: the path and the resolved NAME display; the direct URL
    // rode verbatim through keyframesToLanes' shared isImageUrl rule.
    assert.equal(lanes[0]!.thumbUrl, '/assets/runs/r1/face.png')
    assert.equal(lanes[1]!.thumbUrl, '/assets/runs/r1/last-look.png')
    assert.equal(lanes[2]!.thumbUrl, 'https://r/arrival.png')
    // the frame readout is the DOC frame, the dictionary's word
    assert.equal(studioCopy.keyframeFrameReadout(45), '45')
    // the drop verdict over the grid law: 45 is 45/44 frames from
    // either boundary of [0,90) — interior; 89 is the window's last
    // frame — the snap seat; 200 is the gap — the plan door's refusal
    // (no hint; the strip surfaces studioCopy.gapRefusal).
    assert.equal(pinDropVerdict(calls, 45), 'interior')
    assert.equal(studioCopy.dropInteriorHint, 'interior guide')
    assert.equal(pinDropVerdict(calls, 89), 'snap')
    assert.equal(studioCopy.dropSnapHint, 'snap to window edge')
    assert.equal(pinDropVerdict(calls, 200), null)
    assert.match(studioCopy.gapRefusal, /outside every call window/)
  })
})
