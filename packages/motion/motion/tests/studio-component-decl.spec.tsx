// @vitest-environment happy-dom
/**
 * studio-component-decl — C4 (the journey-closure plan): the studio's
 * shellDeclaration is SEATED, not dead.
 *
 * The audit found (motion-params-dry F6 / row 13): component.tsx's
 * exported declaration had zero consumers — a declared contract
 * nothing read (LAW 4 DEPTH). The seat keeps the record and gives it
 * its judge: the arm pins the declared shape (h3's twin arm —
 * packages/video/h3-timeline/tests/studio-component.spec.tsx, the
 * deepEqual at its "the shell declaration owns the seams" test) AND
 * rides the real render (the authoring specs' harness shape:
 * stubLoads + mountEditor + waitForText), asserting each declared
 * seam's observable face. Both directions fire: a wrong-shape plant
 * reds at the shape pin and at the kind-keyed face lookup; render
 * drift (a seam leaves the DOM) reds at the face lookup.
 */
import { afterEach, describe, expect, test } from 'vitest'
import { shellDeclaration } from '../src/ui/studio/component.tsx'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { mountEditor, resetStudio, stubLoads } from './helpers.ts'

afterEach(() => resetStudio())

/** Each declared preview kind's observable face — the camera chrome
 *  only the native viewport's stage (MotionStageView) renders. A kind
 *  with no entry has no face and reds at the lookup. */
const PREVIEW_FACE: Record<string, string> = {
  native: '[aria-label="Rotate view left (45°)"]',
}

/** Each declared bottom kind's observable face — the scroller only
 *  the timeline bar (MotionTimelineSection → web-kit bar chrome)
 *  renders. */
const BOTTOM_FACE: Record<string, string> = {
  timeline: '[data-testid="motion-timeline-scroll"]',
}

describe('the declared shell ride (C4)', () => {
  test('the declaration states the ride the studio renders', async () => {
    // (1) the declared shape itself — h3's twin arm, the genre record:
    // the uniform three-seam shape, frozen at the construction door.
    expect(shellDeclaration).toEqual({
      preview: { kind: 'native' },
      bottom: { kind: 'timeline' },
      params: { slots: [] },
    })

    stubLoads({ motionT: 4 })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } }, params: {} })
    await waitForText('30 fps · 4f')

    // (2) the rendered face of each declared seam — the lookup keys on
    // the DECLARED kind, so a wrong-shape plant reds here too, not
    // only at (1).
    const previewFace = PREVIEW_FACE[shellDeclaration.preview.kind]
    if (!previewFace) throw new Error(`no rendered face for preview kind "${shellDeclaration.preview.kind}"`)
    expect(document.body.querySelector(previewFace)).toBeTruthy()

    const bottomKind = shellDeclaration.bottom?.kind
    if (!bottomKind) throw new Error('the declaration leaves the bottom seam unclaimed')
    const bottomFace = BOTTOM_FACE[bottomKind]
    if (!bottomFace) throw new Error(`no rendered face for bottom kind "${bottomKind}"`)
    expect(document.body.querySelector(bottomFace)).toBeTruthy()

    // (3) params: slots [] — the shell composes zero named param
    // slots; the whole params column is the tenant's own rail node.
    // (The rail's SpecPanel sections ride INSIDE that tenant node, so
    // the empty-slots record and the rendered form agree: the form is
    // the tenant's composition, never a shell-composed slot.)
    expect(shellDeclaration.params.slots).toEqual([])
    expect(document.body.querySelector('[data-testid="mo-rail-panel"]')).toBeTruthy()
  })
})
