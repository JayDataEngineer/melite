/**
 * useDocState — the doc atom (BEHAVIORAL).
 *
 * PINS: starter hydration on empty params, persisted hydration
 * (calls/beats/keyframes/Layer A), the sticky-starter sentinel
 * (no-calls stages persist on mount), the model-route law
 * (params.model → stage.model → default; both ref2va spellings),
 * and the persist-guard snapshots.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { renderHook } from "@testing-library/react"
import { useDocState } from "../src/ui/studio/useDocState.ts"
import type { CardStage } from "@melite/contracts"

const stage = (params?: unknown, model?: unknown): CardStage =>
  ({ params, ...(model !== undefined ? { model } : {}) }) as unknown as CardStage

describe("hydration", () => {
  it("empty params seed the starter (calls + engine Layer A)", () => {
    const { result } = renderHook(() => useDocState(stage(undefined)))
    assert.equal(result.current.calls.length, 1)
    assert.equal(result.current.calls[0]!.text, "A single shot — describe the action, camera, and mood.")
    // (Rule A) preset is dead — geometry rides the family pills
    assert.equal(result.current.layerA.width, undefined)
    assert.deepEqual(result.current.keyframes, [])
    // the sticky sentinel: no persisted calls = persist on mount
    assert.equal(result.current.lastCallsRef.current, "")
  })

  it("persisted calls hydrate and arm the mount no-op guard", () => {
    const params = { calls: [{ text: "rain", start_frame: 0, end_frame: 48 }], width: 1344, height: 768 }
    const { result } = renderHook(() => useDocState(stage(params)))
    assert.equal(result.current.calls[0]!.text, "rain")
    assert.equal(result.current.layerA.width, 1344)
    assert.ok(result.current.lastCallsRef.current.length > 0)
    assert.ok(result.current.lastKeyframesRef.current.length > 0)
    assert.ok(result.current.lastLayerARef.current.length > 0)
  })

  it("legacy beats hydrate (the persisted list is the beats arm)", () => {
    const params = { beats: [{ text: "old", start_frame: 0, end_frame: 47 }] }
    const { result } = renderHook(() => useDocState(stage(params)))
    assert.equal(result.current.calls[0]!.text, "old")
    assert.ok(result.current.lastCallsRef.current.length > 0)
  })

  it("persisted keyframes hydrate", () => {
    const params = { keyframes: [{ frame: 5, kind: "clip", source: "s" }] }
    const { result } = renderHook(() => useDocState(stage(params)))
    assert.deepEqual(result.current.keyframes, [{ frame: 5, kind: "clip", source: "s" }])
    expect(result.current.keyframes.length).toBe(1)
  })
})

describe("the model route (which per-call inputs the editor shows)", () => {
  it("params.model wins; then the stage model; then the default", () => {
    const viaParams = renderHook(() => useDocState(stage({ model: "h3-timeline-ref" })))
    assert.equal(viaParams.result.current.routeKey, "h3-timeline-ref")
    assert.equal(viaParams.result.current.isRef2va, true)
    const viaStage = renderHook(() => useDocState(stage({}, "timeline-ref2va")))
    assert.equal(viaStage.result.current.routeKey, "timeline-ref2va")
    assert.equal(viaStage.result.current.isRef2va, true)
    const viaNothing = renderHook(() => useDocState(stage({})))
    assert.equal(viaNothing.result.current.routeKey, "")
    assert.equal(viaNothing.result.current.isRef2va, false)
    // variant rides when model is absent
    const viaVariant = renderHook(() => useDocState(stage({ variant: "v9" })))
    assert.equal(viaVariant.result.current.routeKey, "v9")
    assert.equal(viaVariant.result.current.stageModel, "")
    // a non-string stage model is not a route
    const numModel = renderHook(() => useDocState(stage({}, 42)))
    assert.equal(numModel.result.current.stageModel, "")
    assert.equal(numModel.result.current.isRef2va, false)
    expect(viaNothing.result.current.routeKey).toBe("")
  })
})
