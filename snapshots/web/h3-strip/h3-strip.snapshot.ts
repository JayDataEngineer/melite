// @vitest-environment happy-dom
/**
 * Web snapshot scenario (DSH tier 7): THE V2V PROMPT SEAT — the
 * studio strip's video-to-video face, the surface the user lives on
 * when an edit mod is armed. This scenario closes the types/docs/
 * testing audit's F8-1 (2026-11-17): the seat landed (20974b9d2,
 * 2026-11-10) with unit specs only — no keyless recorded-session
 * snapshot in the same change, the testing policy's own law for a
 * product-user-visible face.
 *
 * KEYLESS (the cards-tab law, same as web/media-panel): borrows the
 * canonical session from snapshots/session/hello and reads that
 * owner's selected parent generation read-only; the face itself is a
 * happy-dom mount of the REAL StudioStripPane over the edit bag's
 * derived commissions — the same component the lane serves, no host,
 * no engine, no key. The wall-spec arm
 * (packages/video/h3-timeline/tests/studio-v2v-cut-door.spec.tsx)
 * owns the mechanism's every branch; this scenario owns the PRODUCT
 * FACE: the strings the operator reads on the strip under v2v — the
 * face's own label, the ADD CUT door the burn demanded ("NO WAY I
 * CAN EVEN ADD CUTS AT ALL AS A USER"), and the split control's
 * resting CARRY (the seam law's product voice, operator 2026-11-17:
 * context carry is the default, stock never).
 */
import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, cleanup } from '@testing-library/react'
import { createElement as h } from 'react'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import { StudioStripPane } from '../../../packages/video/h3-timeline/src/ui/studio/StudioStripPane.tsx'
import { callsLaneFace, deriveCommissions } from '../../../packages/video/h3-timeline/src/ui/studio/commissions.ts'
import { studioCopy } from '../../../packages/video/h3-timeline/src/ui/studio/studioCopy.ts'
import '../../../tests/helpers/boot-models.ts'

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsRoot = resolve(here, '..', '..')

// happy-dom returns zero rects (no layout) — the bar's ClientX→frame
// doors need a viewport width, as every real browser provides.
window.Element.prototype.getBoundingClientRect = function () {
  return {
    width: 800, height: 200, top: 0, left: 0, right: 800, bottom: 200,
    x: 0, y: 0, toJSON() {},
  } as DOMRect
}
// (the RO famine) happy-dom's ResizeObserver re-dispatches against
// the constant rect above into a sync spin; the seam chip's Tip
// constructs an RO UNGUARDED, so a no-op stub (not undefined).
class RoStub { observe(): void {} unobserve(): void {} disconnect(): void {} }
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = RoStub

afterEach(() => {
  cleanup()
})

/** One armed edit bag as the doc itself carries it (deriveCommissions
 *  is the real derivation — the scenario never hand-builds a face). */
const EDIT_PARAMS = { edit: [{ edit_prompt: 'make it rain' }] }
/** One prompt row at the lattice's base shape (22+17·5 = 107 frames —
 *  a legal whole-film window: the derived face's Add cut has a legal
 *  split frame, exactly the one-long-clip shape the burn named). */
const P1 = { uuid: 'p1', text: 'hello', start_frame: 0, end_frame: 107, color: null }

const strip = () =>
  render(h(StudioStripPane, {
    calls: [{ text: 'a', start_frame: 0, end_frame: 107 }] as never,
    refAudiosBlocked: false,
    fps: 24,
    barPrompts: [P1] as never,
    barLanes: [] as never,
    barAudioClips: [],
    commissions: deriveCommissions(EDIT_PARAMS),
    barTotal: 107,
    frameIdx: 10,
    callPreviews: {},
    selectedBarId: null,
    filmMap: null,
    handleBarFrame: () => {},
    handleScrubStart: () => {},
    handleScrubEnd: () => {},
    handleKeyframeMove: () => {},
    handleKeyframeDelete: () => {},
    handlePromptUpdate: () => {},
    handlePromptMove: () => {},
    handlePromptResize: () => {},
    handlePromptDelete: () => {},
    handleExtend: () => {},
    addCallAt: () => {},
    addFirstWindowCut: () => {},
    setCallTransition: () => {},
    handleTimelineSelect: () => {},
    layerA: {} as never,
    addAudioClip: () => {},
    takeAudioFile: () => {},
    moveAudioClip: () => {},
    deleteAudioClip: () => {},
    updateAudioClip: () => {},
    setLayerAKey: () => {},
    artifactIndex: { byUrl: new Map() },
    docFromFilm: (f: number) => f,
    keyframes: [] as never,
    addKeyframeWithImage: () => 'k',
    enterKfView: () => {},
    enterAudioView: () => {},
  }))

describe('web h3-strip (the v2v prompt seat, keyless)', () => {
  it('replays against the borrowed canonical session', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.ok(manifest.borrows, 'web scenario without a local fixture must declare borrows')
    const parent = selectGeneration(join(snapshotsRoot, manifest.borrows!), 'parent')
    assert.ok(parent.rows.length > 0, 'the borrowed session carries rows')
    // the face derivation is the REAL one (never a hand-built face)
    assert.deepEqual(callsLaneFace(deriveCommissions(EDIT_PARAMS)), { face: 'v2v', kind: 'edit' })
  })

  it('the v2v face paints its product strings: the face label, the Add cut door, and Carry at rest', () => {
    const els = strip()

    // THE FACE'S OWN LABEL (the user reads which surface they are on)
    const head = els.container.querySelector('[data-testid="tl-calls-label"], h4, h3')
    assert.ok(
      els.container.textContent?.includes(studioCopy.callsV2vLabel),
      `the strip names the v2v face — expected "${studioCopy.callsV2vLabel}"`,
    )
    void head

    // THE ADD CUT DOOR (the burn's own words: the user must be able
    // to add cuts at all) — a real button, the door's aria voice.
    const door = els.container.querySelector('[data-testid="tl-add-cut"]')
    assert.ok(door instanceof HTMLButtonElement, 'the ADD CUT door renders as a button under the edit bag')
    assert.equal(door.getAttribute('aria-label'), studioCopy.addCutDoor)
    assert.ok(
      els.container.textContent?.includes(studioCopy.addCutDoor),
      'the door\'s visible text names the cut',
    )

    // THE SEAM LAW'S PRODUCT VOICE (operator 2026-11-17): the split
    // control rests on CARRY — never Stock (stock is the operator's
    // manual escape hatch in the menu, not what the face births).
    const anchor = els.container.querySelector('[data-testid="tl-split-carry"]')
    assert.ok(anchor instanceof HTMLElement, 'the split carry anchor renders under the armed edit')
    assert.ok(
      anchor.textContent?.includes(studioCopy.splitCarryCarry),
      `the anchor names CARRY at rest — got "${anchor.textContent}"`,
    )
    assert.ok(
      !anchor.textContent?.includes(studioCopy.splitCarryStock),
      'the anchor never names Stock at rest',
    )

    // THE DERIVED WHOLE-FILM WINDOW (D-19): a second mount at the
    // same armed bag with zero authored prompts — the lane paints
    // the run's ONE implicit window (the whole film, derived join —
    // the copy's own law: "with the derived window painting, the
    // lane is empty only when the axis itself has no extent", so
    // the empty-hint arm has no face to judge here).
    const empty = render(h(StudioStripPane, {
      calls: [] as never,
      refAudiosBlocked: false,
      fps: 24,
      barPrompts: [] as never,
      barLanes: [] as never,
      barAudioClips: [],
      commissions: deriveCommissions(EDIT_PARAMS),
      barTotal: 107,
      frameIdx: 0,
      callPreviews: {},
      selectedBarId: null,
      filmMap: null,
      handleBarFrame: () => {},
      handleScrubStart: () => {},
      handleScrubEnd: () => {},
      handleKeyframeMove: () => {},
      handleKeyframeDelete: () => {},
      handlePromptUpdate: () => {},
      handlePromptMove: () => {},
      handlePromptResize: () => {},
      handlePromptDelete: () => {},
      handleExtend: () => {},
      addCallAt: () => {},
      addFirstWindowCut: () => {},
      setCallTransition: () => {},
      handleTimelineSelect: () => {},
      layerA: {} as never,
      addAudioClip: () => {},
      takeAudioFile: () => {},
      moveAudioClip: () => {},
      deleteAudioClip: () => {},
      updateAudioClip: () => {},
      setLayerAKey: () => {},
      artifactIndex: { byUrl: new Map() },
      docFromFilm: (f: number) => f,
      keyframes: [] as never,
      addKeyframeWithImage: () => 'k',
      enterKfView: () => {},
      enterAudioView: () => {},
    }))
    assert.ok(
      empty.container.textContent?.includes(studioCopy.v2vDerivedWindowText),
      'the derived whole-film window paints (the lane mirrors the run)',
    )
  })
})
