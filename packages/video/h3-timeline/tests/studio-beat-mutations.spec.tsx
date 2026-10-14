/**
 * useBeatMutations — the keyframe pin channel's writers (BEHAVIORAL).
 *
 * PINS: add (id derivation, the one pin shape), move
 * (invalid/same-frame no-ops, real moves), delete (invalid no-op,
 * real delete), image edits (invalid/same no-ops, real writes).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useBeatMutations } from "../src/ui/studio/useBeatMutations.ts"
import type { DocKeyframe } from "../src/ui/studio/docModel.ts"

function harness(initial: DocKeyframe[]) {
  return renderHook(() => {
    const [keyframes, setKeyframes] = useState(initial)
    const m = useBeatMutations(keyframes, setKeyframes)
    return { keyframes, ...m }
  })
}

const KF: DocKeyframe = { image: "a", frame: 10 }

describe("handleKeyframeAdd", () => {
  it("adds an unwired image pin and returns the index-derived id", () => {
    const { result } = harness([KF])
    let id = ""
    act(() => { id = result.current.handleKeyframeAdd("image", 44) })
    assert.equal(id, "kf-1")
    assert.deepEqual(result.current.keyframes, [KF, { image: "", frame: 44 }])
  })

  it("the channel has ONE pin kind — any lane gesture authors an image pin", () => {
    const { result } = harness([])
    let id = ""
    act(() => { id = result.current.handleKeyframeAdd("clip", 5) })
    assert.equal(id, "kf-0")
    assert.deepEqual(result.current.keyframes[0], { image: "", frame: 5 })
    expect(result.current.keyframes.length).toBe(1)
  })
})

describe("handleKeyframeMove", () => {
  it("moves a real keyframe", () => {
    const { result } = harness([KF])
    act(() => { result.current.handleKeyframeMove("kf-0", 77) })
    assert.equal(result.current.keyframes[0]!.frame, 77)
  })

  it("invalid ids, out-of-range ids, and same-frame moves no-op", () => {
    const { result } = harness([KF])
    const before = result.current.keyframes
    act(() => {
      result.current.handleKeyframeMove("kf-x", 77)
      result.current.handleKeyframeMove("kf-9", 77)
      result.current.handleKeyframeMove("kf-0", 10)
    })
    assert.ok(result.current.keyframes === before, "no new array on no-ops")
  })
})

describe("handleKeyframeDelete", () => {
  it("deletes the indexed keyframe", () => {
    const second: DocKeyframe = { image: "", frame: 20 }
    const { result } = harness([KF, second])
    act(() => { result.current.handleKeyframeDelete("kf-0") })
    assert.deepEqual(result.current.keyframes, [second])
  })

  it("invalid ids no-op", () => {
    const { result } = harness([KF])
    const before = result.current.keyframes
    act(() => {
      result.current.handleKeyframeDelete("kf-x")
      result.current.handleKeyframeDelete("kf-5")
    })
    assert.ok(result.current.keyframes === before)
  })
})

describe("setKeyframeImage", () => {
  it("writes a new image source", () => {
    const { result } = harness([KF])
    act(() => { result.current.setKeyframeImage(0, "still-b") })
    assert.equal(result.current.keyframes[0]!.image, "still-b")
  })

  it("out-of-range and same-image writes no-op", () => {
    const { result } = harness([KF])
    const before = result.current.keyframes
    act(() => {
      result.current.setKeyframeImage(-1, "x")
      result.current.setKeyframeImage(4, "x")
      result.current.setKeyframeImage(0, "a")
    })
    assert.ok(result.current.keyframes === before)
  })
})
