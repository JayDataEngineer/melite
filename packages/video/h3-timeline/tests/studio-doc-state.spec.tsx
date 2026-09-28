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
import { act, renderHook } from "@testing-library/react"
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

  it("a CORRUPT array-shaped calls string shows the starter but never arms the mount persist (CRITICAL-1)", () => {
    // the 2026-08-30 crime class: an unparseable string fell to
    // STARTER_CALLS with the sentinel armed ("") — the first persist
    // wrote the 1-call starter back over the corrupt source and the
    // plan was destroyed permanently. The sentinel now HOLDS.
    const { result } = renderHook(() => useDocState(stage({ calls: "[{broken" })))
    assert.equal(result.current.calls.length, 1) // starter VIEW state
    assert.ok(result.current.lastCallsRef.current.length > 0) // HOLD — no "" arming
  })

  it("a parseable string-encoded calls still arms the self-heal migration", () => {
    const params = { calls: JSON.stringify([{ text: "s", start_frame: 0, end_frame: 24 }]) }
    const { result } = renderHook(() => useDocState(stage(params)))
    assert.equal(result.current.calls[0]!.text, "s")
    assert.equal(result.current.lastCallsRef.current, "") // armed — the migration persists
  })

  it("rehydrates when the same stage receives a new document", () => {
    const first = {
      calls: [{ text: "first", start_frame: 0, end_frame: 48 }],
      audio_clips: [{ src: "/audio/first.flac", start_frame: "0", dur_frames: "24" }],
      ref_images: ["/images/first.png"],
    }
    const second = {
      calls: [{ text: "second", start_frame: 0, end_frame: 96 }],
      audio_clips: [{ src: "/audio/second.flac", start_frame: "24", dur_frames: "0" }],
      ref_images: ["/images/second.png"],
    }
    const { result, rerender } = renderHook(
      ({ params }: { params: unknown }) => useDocState({ id: "s_1", params } as unknown as CardStage),
      { initialProps: { params: first } },
    )
    expect(result.current.calls[0]!.text).toBe("first")
    act(() => rerender({ params: second }))
    expect(result.current.calls[0]!.text).toBe("second")
    expect(result.current.layerA.audio_clips?.[0]?.src).toBe("/audio/second.flac")
    expect(result.current.layerA.ref_images).toEqual(["/images/second.png"])
  })
})

// THE ROUTE LENS IS DEAD (operator 2026-09-20: "we use ONE
// model") — the fused b30-49 checkpoint takes anchors AND refs in
// one graph; no doc key names a second wiring.)
