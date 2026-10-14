/**
 * useStudioViewSync — the collapse's surviving view thirds: the
 * playhead stays inside the envelope, a delete that shrank the
 * calls clears the ghost selection. NO save, NO guards — the
 * adapter owns writes.
 */
import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useStudioViewSync } from "../src/ui/studio/useStudioViewSync.ts"
import { hydrateCalls } from "../src/ui/studio/docCalls.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"

function mount(calls: { text: string, start_frame: number, end_frame: number }[], selected: TimelineSelection | null, totalFrames: number) {
  const callCardRefs = { current: [] as (HTMLDivElement | null)[] }
  return renderHook(({ c, s, t }) => {
    const [frameIdx, setFrameIdx] = useState(99)
    const [sel, setSel] = useState<TimelineSelection | null>(s)
    useStudioViewSync({
      totalFrames: t, setFrameIdx, selected: sel, setSelected: setSel,
      calls: hydrateCalls({ calls: c, beats: undefined }),
      callCardRefs,
    })
    return { frameIdx, sel }
  }, { initialProps: { c: calls, s: selected, t: totalFrames } })
}

describe("useStudioViewSync (the view thirds, no save)", () => {
  it("clamps the playhead inside a shrunk envelope", () => {
    const h = mount(
      [{ text: "a", start_frame: 0, end_frame: 48 }],
      null, 48,
    )
    expect(h.result.current.frameIdx).toBe(47)
  })

  it("a delete that shrank the calls clears the ghost selection", () => {
    const two = [
      { text: "a", start_frame: 0, end_frame: 48 },
      { text: "b", start_frame: 48, end_frame: 96 },
    ]
    const h = mount(two, { callIdx: 1 }, 96)
    expect(h.result.current.sel).toEqual({ callIdx: 1 })
    act(() => {
      h.rerender({
        c: [{ text: "a", start_frame: 0, end_frame: 48 }],
        s: { callIdx: 1 },
        t: 48,
      })
    })
    // the rerender carries the stale selection prop — the guard
    // clears the LIVE selection state to null
    expect(h.result.current.sel).toBeNull()
  })
})
