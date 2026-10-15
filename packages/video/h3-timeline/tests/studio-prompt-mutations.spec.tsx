/**
 * usePromptMutations — bar↔card prompt gestures (BEHAVIORAL).
 *
 * PINS: resize (left-cut ripple, right-cut ripple + tail growth,
 * no-op identity), move (translation with neighbor absorb, identity
 * no-op), delete (middle merge-back, first rolls forward, only-call
 * resets to starter), text update (write + identity no-op), and the
 * range guards throughout.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { usePromptMutations } from "../src/ui/studio/usePromptMutations.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { STARTER_CALLS } from "../src/ui/studio/docModel.ts"

function harness(initial: DocCall[]) {
  return renderHook(() => {
    const [calls, setCalls] = useState(initial)
    const m = usePromptMutations(setCalls)
    return { calls, ...m }
  })
}

// GRID-LEGAL fixtures (the snap law's premise: the pack starts
// legal — 56 = 22+17·2, the carried follower 68 = 17·4)
const A: DocCall = { text: "a", start_frame: 0, end_frame: 56 }
const B: DocCall = { text: "b", start_frame: 56, end_frame: 124 }
const C: DocCall = { text: "c", start_frame: 124, end_frame: 192 }

describe("handlePromptResize", () => {
  it("a left-edge drag moves the shared cut with the previous call — ON THE 17-LATTICE (the snap law, 2026-11-05: a dragged cut never authors an off-grid window)", () => {
    const { result } = harness([A, B])
    // drag to 65 (δ=9 past the 56 cut): one whole 17-step — the cut
    // lands 73, BOTH windows stay legal (a δ<9 drag is no move)
    act(() => { result.current.handlePromptResize("call-1", 65, 124) })
    assert.equal(result.current.calls[0]!.end_frame, 73)
    assert.equal(result.current.calls[1]!.start_frame, 73)
    assert.equal(result.current.calls[0]!.end_frame - result.current.calls[0]!.start_frame, 73)
    assert.equal(result.current.calls[1]!.end_frame - result.current.calls[1]!.start_frame, 51)
  })

  it("a right-edge drag moves the shared cut with the next call (tail grows) — the 17-lattice snap holds both sides", () => {
    const { result } = harness([A, B])
    // drag the cut to 73 (δ=17): exactly one 17-step — the cut lands 73
    act(() => { result.current.handlePromptResize("call-0", 0, 72) })
    assert.equal(result.current.calls[0]!.end_frame, 73)
    assert.equal(result.current.calls[1]!.start_frame, 73)
    // last call: the envelope grows on ITS shape's grid (carried:
    // the dragged end 141 → length 68 = 17·4 verbatim), no neighbor
    // to ripple
    act(() => { result.current.handlePromptResize("call-1", 73, 140) })
    assert.equal(result.current.calls[1]!.end_frame, 141)
  })

  it("identity and out-of-range resizes no-op", () => {
    const { result } = harness([A])
    const before = result.current.calls
    act(() => {
      result.current.handlePromptResize("call-0", 0, 47)
      result.current.handlePromptResize("call-x", 0, 10)
      result.current.handlePromptResize("call-9", 0, 10)
    })
    assert.ok(result.current.calls === before)
    expect(result.current.calls.length).toBe(1)
  })
})

describe("handlePromptMove", () => {
  it("a body drag translates the card; neighbors absorb (tiling stays exact — lengths unchanged, so the grid holds)", () => {
    const { result } = harness([A, B, C])
    // translate by one 17-step: 56→73, 124→141
    act(() => { result.current.handlePromptMove("call-1", 73, 140) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 73], [73, 141], [141, 192]])
  })

  it("first/last cards absorb one-sided; identity and bad ids no-op", () => {
    const { result } = harness([A, B])
    act(() => { result.current.handlePromptMove("call-0", 17, 72) })
    assert.equal(result.current.calls[0]!.start_frame, 17)
    assert.equal(result.current.calls[1]!.start_frame, 73)
    // last card: only the previous neighbor absorbs
    act(() => { result.current.handlePromptMove("call-1", 90, 123) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[17, 90], [90, 124]])
    const before = result.current.calls
    act(() => {
      // identity: the same span writes nothing (call-0 now rides
      // 17→90, call-1 90→124)
      result.current.handlePromptMove("call-0", 17, 89)
      result.current.handlePromptMove("call-1", 90, 123)
      result.current.handlePromptMove("call-x", 1, 2)
      result.current.handlePromptMove("call-8", 1, 2)
    })
    assert.ok(result.current.calls === before)
  })
})

describe("handlePromptDelete", () => {
  it("a middle delete merges the span back into the previous call", () => {
    const { result } = harness([A, B, C])
    act(() => { result.current.handlePromptDelete("call-1") })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 124], [124, 192]])
    assert.equal(result.current.calls[0]!.text, "a")
  })

  it("deleting the first call rolls its span into the new first", () => {
    const { result } = harness([A, B])
    act(() => { result.current.handlePromptDelete("call-0") })
    assert.deepEqual(result.current.calls, [{ ...B, start_frame: 0 }])
  })

  it("deleting the ONLY call resets to the starter (never an empty doc)", () => {
    const { result } = harness([{ ...A }])
    act(() => { result.current.handlePromptDelete("call-0") })
    assert.deepEqual(result.current.calls, STARTER_CALLS.map((c) => ({ ...c })))
    assert.ok(result.current.calls !== STARTER_CALLS, "a copy, not the shared starter")
  })

  it("bad ids no-op", () => {
    const { result } = harness([A])
    const before = result.current.calls
    act(() => {
      result.current.handlePromptDelete("call-x")
      result.current.handlePromptDelete("call-3")
    })
    assert.ok(result.current.calls === before)
  })
})

describe("handlePromptUpdate", () => {
  it("writes new text; empty is a visible TODO (never refused client-side)", () => {
    const { result } = harness([A])
    act(() => { result.current.handlePromptUpdate("call-0", "rain on glass") })
    assert.equal(result.current.calls[0]!.text, "rain on glass")
    act(() => { result.current.handlePromptUpdate("call-0", "") })
    assert.equal(result.current.calls[0]!.text, "")
  })

  it("same-text and bad-id updates no-op", () => {
    const { result } = harness([A])
    const before = result.current.calls
    act(() => {
      result.current.handlePromptUpdate("call-0", "a")
      result.current.handlePromptUpdate("call-x", "z")
      result.current.handlePromptUpdate("call-2", "z")
    })
    assert.ok(result.current.calls === before)
    expect(result.current.calls[0]!.text).toBe("a")
  })
})
