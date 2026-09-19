/**
 * lane-defaults.e2e.ts — THE SERVED-ORIGIN DEFAULTS GATE (the
 * zombie-tab correction, 2026-09-19): correction #28's "live
 * proof" was a ONE-TIME CURL against the estate lane — nothing
 * STOOD WATCH over the origin the browser actually talks to. The
 * operator hit exactly that hole: a GUI process with no melite
 * estate mounted served the studio, every /v1 door 404'd, the
 * spec fetch died, and Steps rendered blank — while every unit
 * wall stayed green (they prove the ESTATE, never the ORIGIN).
 *
 * THIS gate closes it: against the LIVE estate lane it asserts
 * every boarded family's form-spec CARRIES ITS DEFAULTS — the
 * schema envelope parses, model_defaults is non-empty, and the
 * walked core knobs (steps, denoise, seed…) are present and
 * non-null for the families that declare them. A dead lane, a
 * renamed door, or an unwalked default fails HERE, at the door,
 * before any operator opens a studio tab.
 *
 * Gated on the lane being alive (skip, never false-fail, when the
 * estate is down — same law as the engine-gated GPU receipts).
 */
import { describe, expect, it } from 'vitest'

const LANE = 'http://127.0.0.1:3088'

async function laneAlive(): Promise<boolean> {
  try {
    const res = await fetch(LANE + '/v1/model-catalog', { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
// TOP-LEVEL AWAIT (the GPU gate's own law): describe.skipIf
// evaluates at COLLECTION time — a beforeAll liveness probe runs
// too late and the suite silently skips against a live lane.
const laneUp = await laneAlive()

/** The knob cores each family must have walked onto the wire (the
 *  families that declare them — a family boarding none of a knob
 *  is exempt, the assertion is about nullness, not vocabulary). */
const CORE: Record<string, string[]> = {
  'h3-timeline': ['steps', 'denoise', 'seed', 'sampler_name', 'shift_video'],
}

describe.skipIf(!laneUp)('the served lane carries every family\'s defaults (the origin the browser talks to)', () => {
  for (const [family, knobs] of Object.entries(CORE)) {
    it(family + ': form-spec serves model_defaults with the core knobs non-null', async () => {
      const r = await fetch(LANE + '/v1/form-spec?model=' + encodeURIComponent(family), { signal: AbortSignal.timeout(5000) })
      expect(r.status, 'the form-spec door answers on the lane origin').toBe(200)
      const doc = await r.json() as { model_defaults?: Record<string, unknown>, schema?: unknown }
      expect(doc.schema, 'the schema envelope rides the spec').toBeTruthy()
      expect(Object.keys(doc.model_defaults ?? {}).length, 'model_defaults is not empty').toBeGreaterThan(0)
      for (const k of knobs) {
        expect(doc.model_defaults?.[k], `model_defaults.${k} is present and non-null (the blank-rows cure, #28)`).toBeDefined()
      }
    })
  }
})
