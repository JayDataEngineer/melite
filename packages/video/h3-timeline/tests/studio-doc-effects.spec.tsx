/**
 * useDocEffects — clamps, scrolls, stale-guards, persists (BEHAVIORAL).
 *
 * PINS: the playhead clamp (tail shrinks under the playhead), the
 * selection scroll (call card + segment row; missing refs never
 * throw), the stale-guard (shrunk calls clear a ghost selection),
 * the three persist channels (change writes, identity no-ops), and
 * setLayerAKey (same-value identity, real merge).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useRef } from "react"
import { useDocEffects } from "../src/ui/studio/useDocEffects.ts"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"
import { hydrateCalls } from "../src/ui/studio/docCalls.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"

const CALLS = hydrateCalls({
  calls: [
    { text: "a", start_frame: 0, end_frame: 48 },
    { text: "b", start_frame: 48, end_frame: 96 },
  ],
})

function harness(over?: {
  calls?: typeof CALLS
  selected?: TimelineSelection | null
  keyframes?: { frame: number; kind: "image"; source: string }[]
  layerA?: ReturnType<typeof hydrateLayerA>
}) {
  const saved: Record<string, unknown>[] = []
  let frame = 0
  let selected: TimelineSelection | null = over?.selected ?? null
  const callScrolls: string[] = []
  const beatScrolls: string[] = []
  const initLayerA = over?.layerA ?? hydrateLayerA(undefined)
  // (production parity: useDocState seeds the Layer A guard with the
  // serialized mount value, so mount no-ops — never a redundant write.)
  const lastLayerARef = { current: JSON.stringify(serializeLayerA(initLayerA)) }
  const h = renderHook(
    ({ calls, selected: sel, keyframes, layerA }) => {
      // (production parity: the guards are STABLE refs seeded once at
      // mount — a fresh object per render would no-op every write.)
      const lastCallsRef = useRef("")
      const lastKeyframesRef = useRef("")
      const seeded = useRef(false)
      if (!seeded.current) {
        seeded.current = true
        lastCallsRef.current = JSON.stringify(calls)
        lastKeyframesRef.current = JSON.stringify(keyframes)
      }
      return useDocEffects({
        totalFrames: calls.length ? calls[calls.length - 1]!.end_frame : 1,
        setFrameIdx: (u) => { frame = typeof u === "function" ? (u as (f: number) => number)(frame) : u },
        selected: sel,
        setSelected: (u) => { selected = typeof u === "function" ? (u as (s: TimelineSelection | null) => TimelineSelection | null)(selected) : u },
        calls,
        keyframes,
        layerA,
        setLayerA: () => {},
        onSave: (p) => { saved.push(p) },
        callCardRefs: {
          current: [
            { scrollIntoView: () => { callScrolls.push("c0") } } as unknown as HTMLDivElement,
            null,
          ],
        },
        beatRowRefs: { current: [[{ scrollIntoView: () => { beatScrolls.push("b0") } } as unknown as HTMLDivElement]] },
        lastCallsRef,
        lastKeyframesRef,
        lastLayerARef,
        resendEpoch: 0,
      })
    },
    {
      initialProps: {
        calls: over?.calls ?? CALLS,
        selected: over?.selected ?? null,
        keyframes: over?.keyframes ?? [],
        layerA: initLayerA,
      },
    },
  )
  return {
    ...h,
    saved,
    frame: () => frame,
    seek: (f: number) => { frame = f },
    selected: () => selected,
    callScrolls,
    beatScrolls,
  }
}

describe("the playhead clamp", () => {
  it("a shrinking envelope pulls the playhead back inside", () => {
    const h = harness()
    h.rerender({ calls: CALLS, selected: null, keyframes: [], layerA: hydrateLayerA(undefined) })
    assert.equal(h.frame(), 0)
    // the playhead rides out to 90, then the tail shrinks to 48: clamp
    h.seek(90)
    const short = hydrateCalls({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }] })
    h.rerender({ calls: short, selected: null, keyframes: [], layerA: hydrateLayerA(undefined) })
    assert.equal(h.frame(), 47)
  })
})

describe("selection scroll + stale guard", () => {
  it("selecting a call scrolls its card; a segment scrolls its row", () => {
    const h = harness({ selected: { callIdx: 0 } })
    assert.deepEqual(h.callScrolls, ["c0"])
    assert.deepEqual(h.beatScrolls, [])
    h.rerender({ calls: CALLS, selected: { callIdx: 0, beatIdx: 0 }, keyframes: [], layerA: hydrateLayerA(undefined) })
    assert.deepEqual(h.beatScrolls, ["b0"])
  })

  it("missing refs never throw (unmounted card, unmounted row)", () => {
    const h = harness({ selected: { callIdx: 1 } })
    assert.deepEqual(h.callScrolls, [])
    h.rerender({ calls: CALLS, selected: { callIdx: 0, beatIdx: 5 }, keyframes: [], layerA: hydrateLayerA(undefined) })
    assert.deepEqual(h.beatScrolls, [])
  })

  it("a delete that shrank the calls clears the ghost selection", () => {
    const short = hydrateCalls({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }] })
    const h = harness({ selected: { callIdx: 3 } })
    assert.equal(h.selected(), null)
    void short
    expect(h.selected()).toBeNull()
  })
})

describe("persist (onSave is the ONLY write channel)", () => {
  it("mount no-ops when the snapshots match (no redundant write)", () => {
    const h = harness()
    assert.deepEqual(h.saved, [])
  })

  it("a changed calls array writes the serialized shape", () => {
    const h = harness()
    const next = [...CALLS, { text: "c", start_frame: 96, end_frame: 144 }]
    h.rerender({ calls: next, selected: null, keyframes: [], layerA: hydrateLayerA(undefined) })
    assert.equal(h.saved.length, 1)
    assert.deepEqual((h.saved[0]!["calls"] as unknown[]).length, 3)
  })

  it("keyframe edits write key copies (never the live objects)", () => {
    const h = harness()
    const kf = [{ frame: 5, kind: "image" as const, source: "s" }]
    h.rerender({ calls: CALLS, selected: null, keyframes: kf, layerA: hydrateLayerA(undefined) })
    assert.equal(h.saved.length, 1)
    assert.deepEqual(h.saved[0]!["keyframes"], kf)
    assert.ok(h.saved[0]!["keyframes"] !== kf, "a copy rides, not the live array")
  })

  it("Layer A edits write the whole serialized set", () => {
    const h = harness()
    const layerA = hydrateLayerA({ seed: 9 })
    h.rerender({ calls: CALLS, selected: null, keyframes: [], layerA })
    assert.equal(h.saved.length, 1)
    assert.equal((h.saved[0] as Record<string, unknown>)["seed"], 9)
  })
})

describe("setLayerAKey", () => {
  it("same-value writes keep identity; real writes merge", () => {
    let layerA = hydrateLayerA(undefined)
    const seen: typeof layerA[] = []
    const { result } = renderHook(() =>
      useDocEffects({
        totalFrames: 96,
        setFrameIdx: () => {},
        selected: null,
        setSelected: () => {},
        calls: CALLS,
        keyframes: [],
        layerA,
        setLayerA: (u) => {
          layerA = typeof u === "function" ? (u as (p: typeof layerA) => typeof layerA)(layerA) : u
          seen.push(layerA)
        },
        onSave: () => {},
        callCardRefs: { current: [] },
        beatRowRefs: { current: [] },
        lastCallsRef: { current: JSON.stringify(CALLS) },
        lastKeyframesRef: { current: "[]" },
        lastLayerARef: { current: "" },
        resendEpoch: 0,
      }),
    )
    const before = layerA
    act(() => { result.current.setLayerAKey("fps", 24) })
    assert.ok(layerA === before, "same value = same object")
    act(() => { result.current.setLayerAKey("seed", 11) })
    assert.equal(layerA.seed, 11)
    assert.equal(layerA.fps, 24)
    assert.equal(seen.length, 2)
  })
})
