/**
 * docHydrate gap rows (2026-09-19) — the legacy lora pair without a
 * strength (the bag defaults to full strength), junk in the optional
 * numbers (never NaN), a strength-less mod row (strength stays
 * absent), and Super-Res ON without a target (the switch rides
 * alone). Every row asserts hydrated/serialized shapes.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

const TURBO = "h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors"

describe("hydrateLayerA (the lora-pair + optional-number tails)", () => {
  it("a legacy lora pair without a strength lands at full strength", () => {
    const a = hydrateLayerA({ lora_name: TURBO })
    assert.deepEqual(a.loras, [{ id: "h3_lightx2v_turbo", strength: 1 }])
    expect(a.loras).toEqual([{ id: "h3_lightx2v_turbo", strength: 1 }])
  })

  it("a legacy pair merges into an already-hydrated bag (never clobbers)", () => {
    const a = hydrateLayerA({ loras: [{ id: "kept", strength: 0.5 }], lora_name: TURBO, lora_strength: 0.6 })
    assert.deepEqual(a.loras, [
      { id: "kept", strength: 0.5 },
      { id: "h3_lightx2v_turbo", strength: 0.6 },
    ])
  })

  it("junk in the optional numbers hydrates absent (never NaN)", () => {
    const a = hydrateLayerA({ shift_video: "junk", steps: "lots", width: "wide" })
    assert.equal(a.shift_video, undefined)
    assert.equal(a.steps, undefined)
    assert.equal(a.width, undefined)
  })

  it("a mod row without a strength keeps its id (strength stays absent)", () => {
    const a = hydrateLayerA({ loras: [{ id: "h3_lightx2v_turbo" }] })
    assert.equal(a.loras!.length, 1)
    assert.equal(a.loras![0]!.id, "h3_lightx2v_turbo")
    assert.ok(!("strength" in a.loras![0]!) || a.loras![0]!.strength === undefined)
  })
})

describe("serializeLayerA (Super-Res without a target)", () => {
  it("the switch rides alone when no target resolution is set", () => {
    const out = serializeLayerA({ ...hydrateLayerA(undefined), sr_switch: true })
    assert.equal(out["sr_switch"], true)
    assert.ok(!("sr_resolution" in out), "no target = no resolution key")
    expect(out["sr_switch"]).toBe(true)
  })
})
