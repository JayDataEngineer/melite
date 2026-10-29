// regime-admission.spec.ts — F18's wall: the cross-regime join
// admission (the two resolution regimes in one family). The LAW home
// is chainEdit.ts; the tier math is the ENGINE'S OWN, ported from the
// live extension (comfyui-h3-oneclick-swap/__init__.py — RESOLUTIONS
// line 28, plan_clips lines 268-273). These arms pin the port to the
// engine's arithmetic on the film regime's own shape (1344×768, the
// schema's declared defaults) so an engine-side move of either the
// tier table or the shape math must update the port or this wall
// reds — the admission must never lie about the shape a join will
// render.
import { describe, expect, it } from 'vitest'
import {
  RESOLUTION_SHORT_EDGE, planTierShape, admitCrossRegimeJoin,
} from '../src/chainEdit.js'

// the FILM regime's declared shape (schema.ts width/height defaults)
const FILM_W = 1344
const FILM_H = 768

describe('F18 — the tier table ports the engine\'s own RESOLUTIONS row', () => {
  it('every tier spells its engine short edge (comfyui-h3-oneclick-swap line 28, verbatim)', () => {
    expect(RESOLUTION_SHORT_EDGE).toEqual({
      '480p': 480, '576p': 576, '736p': 736, '768p': 768, '1080p': 1080,
    })
  })
})

describe('F18 — planTierShape ports the engine\'s plan_clips arithmetic', () => {
  it('736p on the film regime renders 1280×736 — the exact mismatch F18 burned on', () => {
    // engine math: scale = 736/min(1344,768) = 736/768;
    // out_w = round(1344·scale/32)·32 = round(40.25)·32 = 1280;
    // out_h = round(768·scale/32)·32 = 736
    expect(planTierShape(FILM_W, FILM_H, 736)).toEqual({ width: 1280, height: 736 })
  })

  it('768p on the film regime renders 1344×768 EXACTLY — the shape-true join pin', () => {
    expect(planTierShape(FILM_W, FILM_H, 768)).toEqual({ width: 1344, height: 768 })
  })

  it('the SHORT edge rules, both orientations: a portrait film regime scales its width', () => {
    // 768×1344 portrait at 736p: scale 736/768 → 736×1280
    expect(planTierShape(768, 1344, 736)).toEqual({ width: 736, height: 1280 })
  })

  it('both edges snap to 32 with a 32 floor (the engine\'s own round, never ceil)', () => {
    // 480p on 1344×768: scale 0.625 → 840/32 = 26.25 → round 26 → 832;
    // 768·0.625 = 480 exact → 832×480
    expect(planTierShape(FILM_W, FILM_H, 480)).toEqual({ width: 832, height: 480 })
    // 576p: scale 0.75 → 1008/32 = 31.5 → round 32 → 1024; 576 exact
    expect(planTierShape(FILM_W, FILM_H, 576)).toEqual({ width: 1024, height: 576 })
    // 1080p on a short-edge-768 source UPSCALES: scale 1080/768 =
    // 1.40625 → 1890/32 = 59.06 → 59·32 = 1888; 1080/32 = 33.75 →
    // 34·32 = 1088 → 1888×1088
    expect(planTierShape(FILM_W, FILM_H, 1080)).toEqual({ width: 1888, height: 1088 })
  })
})

describe('F18 — the cross-regime join admission', () => {
  it('a mismatched tier ADMITS loud: names both regimes, the derived shape, and the 768p pin', () => {
    const text = admitCrossRegimeJoin(FILM_W, FILM_H, '736p')
    expect(text).toBeTruthy()
    expect(text!.startsWith('h3-timeline: CROSS-REGIME JOIN')).toBe(true)
    expect(text!).toContain('1344×768')
    expect(text!).toContain("tier '736p' renders 1280×736")
    expect(text!).toContain("pin the bag's resolution 768p")
    expect(text!).toContain('never refuses')
  })

  it('the shape-true tier 768p stays SILENT — a reconciled join never nags', () => {
    expect(admitCrossRegimeJoin(FILM_W, FILM_H, '768p')).toBeNull()
  })

  it('an unknown tier names no shape it cannot derive — null, never a guess', () => {
    expect(admitCrossRegimeJoin(FILM_W, FILM_H, '999p')).toBeNull()
  })

  it('a film shape no tier spells still pins: short_edge names the film\'s own short edge', () => {
    // 960×512 film regime: no tier short edge is 512, so the pin is
    // the plan node's short_edge knob
    const text = admitCrossRegimeJoin(960, 512, '736p')
    expect(text).toBeTruthy()
    expect(text!).toContain("pin the plan's short_edge 512")
  })

  it('a portrait film regime admits its own orientation (the admission follows the shape, not a landscape assumption)', () => {
    const text = admitCrossRegimeJoin(768, 1344, '736p')
    expect(text).toBeTruthy()
    expect(text!).toContain("tier '736p' renders 736×1280")
  })
})
