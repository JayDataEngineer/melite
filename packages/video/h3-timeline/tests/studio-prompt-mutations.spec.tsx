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

const A: DocCall = { text: "a", start_frame: 0, end_frame: 48 }
const B: DocCall = { text: "b", start_frame: 48, end_frame: 96 }
const C: DocCall = { text: "c", start_frame: 96, end_frame: 144 }

describe("handlePromptResize", () => {
  it("a left-edge drag moves the shared cut with the previous call", () => {
    const { result } = harness([A, B])
    act(() => { result.current.handlePromptResize("call-1", 60, 95) })
    assert.equal(result.current.calls[0]!.end_frame, 60)
    assert.equal(result.current.calls[1]!.start_frame, 60)
  })

  it("a right-edge drag moves the shared cut with the next call (tail grows)", () => {
    const { result } = harness([A, B])
    act(() => { result.current.handlePromptResize("call-0", 0, 60) })
    assert.equal(result.current.calls[0]!.end_frame, 61)
    assert.equal(result.current.calls[1]!.start_frame, 61)
    // last call: the envelope grows, no neighbor to ripple
    act(() => { result.current.handlePromptResize("call-1", 61, 200) })
    assert.equal(result.current.calls[1]!.end_frame, 201)
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
  it("a body drag translates the card; neighbors absorb (tiling stays exact)", () => {
    const { result } = harness([A, B, C])
    act(() => { result.current.handlePromptMove("call-1", 40, 87) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 40], [40, 88], [88, 144]])
  })

  it("first/last cards absorb one-sided; identity and bad ids no-op", () => {
    const { result } = harness([A, B])
    act(() => { result.current.handlePromptMove("call-0", 4, 47) })
    assert.equal(result.current.calls[0]!.start_frame, 4)
    assert.equal(result.current.calls[1]!.start_frame, 48)
    // last card: only the previous neighbor absorbs
    act(() => { result.current.handlePromptMove("call-1", 60, 111) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[4, 60], [60, 112]])
    const before = result.current.calls
    act(() => {
      result.current.handlePromptMove("call-0", 4, 59)
      result.current.handlePromptMove("call-1", 60, 111)
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
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 96], [96, 144]])
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
