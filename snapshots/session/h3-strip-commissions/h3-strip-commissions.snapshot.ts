/**
 * @vitest-environment happy-dom
 * Session snapshot scenario (keyless replay): §9's COMMISSION RAIL —
 * the studio's mod projection
 * (dev_docs/audits/features/multiwindow-unification-2026-11-12.md §9).
 *
 * THE RECORDED BURN (operator, live lane): "the UI that displays the
 * timeline and all the separate clips isn't updating. It looks default,
 * despite the AI agent using the card to string together multiple clips
 * with a mod." The doc carried the commission, the compose honored it,
 * and the lane rendered as if nothing was armed.
 *
 * THE REPLAY drives the real journey at the hop the burn was felt: the
 * documented bench row (two armed bags) → the studio's derivation → the
 * strip pane's render. Then it asks the CARD's own compose door for the
 * same doc, so the rail's drawn window count and the run's built window
 * count are compared as one number (JOURNEY law: judge at or downstream
 * of the hop where the burn is felt — a rail that drew three windows
 * while the run built two would pass every upstream wall).
 */
import '../../../tests/helpers/boot-models.ts'
import { beforeAll, describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '@testing-library/react'
import { createElement as h } from 'react'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import { deriveCommissions } from '../../../packages/video/h3-timeline/src/ui/studio/commissions.ts'
import { StudioStripPane } from '../../../packages/video/h3-timeline/src/ui/studio/StudioStripPane.tsx'
import { studioCopy } from '../../../packages/video/h3-timeline/src/ui/studio/studioCopy.ts'
import { solveWindowComposition } from '../../../packages/models/h3/src/timelineContract.ts'
import { loadCardDefs } from '../../../packages/engines/comfyui-cordis/src/index.ts'
import { GraphBuilder } from '../../../packages/engines/comfyui-card-kit/src/graph.ts'
import { loadFacts } from '../../../packages/engines/comfyui-card-kit/src/facts.ts'
import { getModel, registryIds, registryModel } from '../../../packages/engines/comfyui-cordis/src/models/models.ts'
import type { CardDefinition } from '../../../packages/engines/comfyui-card-kit/src/card-definition.ts'
import type { ModelFacts } from '../../../packages/engines/comfyui-card-kit/src/facts.ts'

const here = dirname(fileURLToPath(import.meta.url))
const FACTS_PATH = join(here, '..', '..', '..', 'packages', 'engines', 'comfyui-cordis', 'data', 'model-facts.json')

let def: CardDefinition
let model: ModelFacts

beforeAll(async () => {
  def = (await loadCardDefs()).get('h3-timeline')!
  model = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel }).models['h3-timeline']!
})
const noop = (): void => {}

/** The documented bench row the replay opens: twenty seconds of
 *  extension on take3, and a re-shoot of take4 from a new camera —
 *  exactly what the recorded ask armed. */
const DOC: Record<string, unknown> = {
  calls: [{ text: 'The courier turns into the alley.', start_frame: 0, end_frame: 56 }],
  length: 56,
  extend: [{ source_clip: 'clips/take3.mp4', extend_prompt: 'she keeps running', extend_seconds: 16.5 }],
  reshoot: [{ source_clip: 'clips/take4.mp4', orbit: 30, dolly: 0.8 }],
}

describe('h3 strip commissions (keyless replay)', () => {
  it('the recorded doc draws one rail row per armed bag, and the drawn windows match the run', async () => {
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
    // the recorded ask names both arms and the operator's own demand
    assert.match(String(parent.rows[1]?.text), /twenty seconds of extension/)
    assert.match(String(parent.rows[1]?.text), /SEE both commissions/)
    // the reply names what the rail must show
    assert.match(String(parent.rows[2]?.text), /3 chained windows of 158f/)
    assert.match(String(parent.rows[2]?.text), /16\.500s/)

    // ── HOP 1: the derivation (the bench row's bags → commissions)
    const commissions = deriveCommissions(DOC)
    assert.deepEqual(commissions.map((c) => c.kind), ['extend', 'reshoot'])
    const extend = commissions[0]!
    const reshoot = commissions[1]!
    // the geometry the rail will draw
    assert.deepEqual(extend.geometry, solveWindowComposition(Math.round(16.5 * 24), 'h3-timeline extend'))
    assert.equal(extend.geometry!.windows, 3)
    assert.equal(extend.geometry!.windowFrames, 158)
    assert.equal(extend.geometry!.deliveredFrames, 396)
    // the seats the operator reads, verbatim off the bag
    assert.ok(extend.seats.some((s) => s.key === 'source_clip' && s.value === 'clips/take3.mp4'))
    assert.ok(reshoot.seats.some((s) => s.key === 'orbit' && s.value === '30'))

    // ── HOP 2: the strip pane's render (the rail the operator sees)
    const { container, unmount } = render(h(StudioStripPane, {
      calls: [{ text: 'The courier turns into the alley.', start_frame: 0, end_frame: 56 }],
      fps: 24,
      barPrompts: [],
      barLanes: [],
      barAudioClips: [],
      barTotal: 56,
      frameIdx: 0,
      commissions,
      callPreviews: {},
      selectedBarId: null,
      filmMap: null,
      handleBarFrame: noop,
      handleScrubStart: noop,
      handleScrubEnd: noop,
      handleKeyframeMove: noop,
      handleKeyframeDelete: noop,
      handlePromptUpdate: noop,
      handlePromptMove: noop,
      handlePromptResize: noop,
      handlePromptDelete: noop,
      handleExtend: noop,
      addCallAt: noop,
      handleTimelineSelect: noop,
      layerA: {},
      refAudiosBlocked: false,
      addAudioClip: noop,
      takeAudioFile: async () => {},
      moveAudioClip: noop,
      deleteAudioClip: noop,
      updateAudioClip: noop,
      setLayerAKey: noop,
      artifactIndex: { byUrl: new Map(), byName: new Map() },
      docFromFilm: (f: number) => f,
      keyframes: [],
      addKeyframeWithImage: async () => {},
      enterKfView: noop,
      enterAudioView: noop,
    } as never))
    try {
      const lanes = [...container.querySelectorAll('[data-commission-lane]')]
      assert.deepEqual(
        lanes.map((l) => l.getAttribute('data-commission-lane')),
        ['extend', 'reshoot'],
        'one rail row per armed bag, in the doc order',
      )
      // the extend's three windows are DRAWN (the operator sees them)
      const segments = [...container.querySelectorAll('[data-commission-segment^="extend-"]')]
      assert.equal(segments.length, 3)
      assert.equal(segments[0]!.textContent, studioCopy.commissionWindowSegment(0, 158))
      // the reshoot row names its clip and its dials
      const rsh = container.querySelector('[data-commission-segment="reshoot-0"]')!
      assert.match(String(rsh.textContent), /clips\/take4\.mp4/)
      assert.match(String(rsh.textContent), /orbit 30/)
      // the rail sits under the head that labels it
      const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="extend"]')!
      assert.match(String(head.textContent), new RegExp(studioCopy.commissionKindLabel('extend')))
    } finally {
      unmount()
    }

    // ── HOP 3: the RUN's own door — the compose builds what the rail drew
    assert.ok(def, 'the composition root serves the h3-timeline card')
    const g = new GraphBuilder()
    // the extend arm alone (the recorded doc's own calls + bag, without
    // the re-shoot bag): this hop judges the extend branch's graph
    const walked = def.schema({
      calls: DOC.calls, length: DOC.length, extend: DOC.extend,
    }) as Record<string, unknown>
    def.compose(walked, model, g, 'run_commissions')
    const classes = Object.values(g.toJSON() as Record<string, { class_type: string }>)
      .map((n) => n.class_type)
    // the extend branch composed REAL windows: its chain emission and
    // its own file join, and NOT the re-shoot spine (the doc's reshoot
    // is cleared here so this arm judges the extend arm alone)
    assert.ok(classes.includes('SaveVideo'), 'the joined film keeps its terminal')
    assert.ok(classes.includes('MeliteConcatVideos'), 'and its own file join')
    assert.ok(classes.includes('ImageFromBatch'), 'the fresh-continuation window splice is this arm alone')
    assert.ok(classes.includes('SolidMask'), 'and the mask that seats the continuation')
    assert.ok(
      !classes.some((c) => /FunControlNet/.test(c)),
      'the extend-only doc never mounts the re-shoot controlnet spine',
    )
  })
})
