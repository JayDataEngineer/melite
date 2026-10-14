/**
 * useShownDoc — THE NON-CALLS COMMIT SURFACE (GAP-2 arms, R3
 * 2026-10-27: B4 keyframes shape, B6 within-tick composer, B8 the
 * starter sentinel's other branches, B9 stage-switch op clear, B10
 * setLayerAKey identity, B11 the keyframe copy).
 *
 * Same law as the R2 commit-seat spec: only the DOOR (onSave) is a
 * spy; the seat is live. `studio-doc-void.spec.tsx` judged the
 * calls channel alone — these arms judge every other edge of the
 * collapse's commit path.
 */
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useLayoutEffect } from "react"
import { useShownDoc } from "../src/ui/studio/useShownDoc.ts"
import type { CardStage } from "@melite/contracts"

const stageOf = (params: Record<string, unknown>, id = "s1"): CardStage =>
  ({ id, params }) as unknown as CardStage

const SHOT = { text: "a", start_frame: 0, end_frame: 48 }

/** Mount the real seat; the door records every payload verbatim. */
function seat(params: Record<string, unknown>, id = "s1") {
  const sent: Record<string, unknown>[] = []
  const onSave = vi.fn((p: Record<string, unknown>) => { sent.push(p) })
  const mounted = renderHook(
    ({ stage }) => useShownDoc(stage, onSave),
    { initialProps: { stage: stageOf(params, id) } },
  )
  return {
    sent,
    onSave,
    result: mounted.result,
    /** Durable settle: the refresh carries the merged doc (same stage). */
    settle: (next: Record<string, unknown>) =>
      act(() => { mounted.rerender({ stage: stageOf(next, id) }) }),
    /** Stage switch: a DIFFERENT stage id mounts fresh state. */
    switchTo: (next: Record<string, unknown>, nextId: string) =>
      act(() => { mounted.rerender({ stage: stageOf(next, nextId) }) }),
  }
}

/** A REFUSING door (P7): answers `false` to every write. */
function refusingSeat(params: Record<string, unknown>) {
  const sent: Record<string, unknown>[] = []
  const onSave = vi.fn((p: Record<string, unknown>) => { sent.push(p); return false })
  const mounted = renderHook(
    ({ stage }) => useShownDoc(stage, onSave),
    { initialProps: { stage: stageOf(params) } },
  )
  return { sent, onSave, result: mounted.result }
}

describe("B4/B11 — the keyframes channel (door shape + the sorted write)", () => {
  it("a keyframe commit rides serializer rows under the whole-array keyframes key (the door shape)", () => {
    // DocKeyframe's real vocabulary: {image, frame} — the pin channel
    const s = seat({ calls: [SHOT], seed: 7, keyframes: [{ image: "a.png", frame: 24 }] })
    const before = s.sent.length
    act(() => {
      s.result.current.updateKeyframes([{ image: "b.mp4", frame: 48 }, { image: "a.png", frame: 24 }])
    })
    expect(s.sent.length).toBe(before + 1)
    const p = s.sent[s.sent.length - 1]!
    // THE DOOR SHAPE: the whole array rides under `keyframes` —
    // never a partial patch, never a bare array payload — and the
    // write is SORTED by frame (the sorted-write law; the gesture's
    // insertion order never leaks into the door payload).
    expect(Object.keys(p)).toEqual(["keyframes"])
    expect(p.keyframes).toEqual([
      { image: "a.png", frame: 24 },
      { image: "b.mp4", frame: 48 },
    ])
    // B11: the overlay shows the committed rows (hydrate accepts
    // the same vocabulary the serializer emits).
    expect(s.result.current.keyframes).toEqual([
      { image: "a.png", frame: 24 },
      { image: "b.mp4", frame: 48 },
    ])
  })

  it("the keyframe no-op law: sending the hydrated set verbatim sends nothing", () => {
    const kf = [{ image: "a.png", frame: 24 }]
    const s = seat({ calls: [SHOT], seed: 7, keyframes: kf })
    const before = s.sent.length
    act(() => { s.result.current.updateKeyframes(s.result.current.keyframes) })
    expect(s.sent.length).toBe(before)
  })
})

describe("B6 — the within-tick composer (refs, not render-captured copies)", () => {
  it("two layerA gestures in one tick compose: the second reads the first's overlay", () => {
    const s = seat({ calls: [SHOT], seed: 7 })
    act(() => {
      s.result.current.setLayerAKey("seed", 9)
      s.result.current.setLayerAKey("shift_video", 5)
    })
    // Both sent (each gesture commits); the SECOND payload carries
    // BOTH statements — composed from the first's live overlay, not
    // the stale pre-gesture projection.
    expect(s.sent.length).toBe(2)
    const second = s.sent[1]!
    expect(second.seed).toBe(9)
    expect(second.shift_video).toBe(5)
    expect(s.result.current.layerA.seed).toBe(9)
    expect(s.result.current.layerA.shift_video).toBe(5)
  })

  it("a calls gesture and a layerA gesture in one tick keep their own door shapes", () => {
    const s = seat({ calls: [SHOT], seed: 7 })
    act(() => {
      s.result.current.setLayerAKey("seed", 9)
      s.result.current.updateCalls([{ text: "b", start_frame: 0, end_frame: 24 }])
    })
    const last = s.sent[s.sent.length - 1]!
    expect(Object.keys(last)).toEqual(["calls"])
    expect(last.calls).toEqual([{ text: "b", start_frame: 0, end_frame: 24 }])
  })
})

describe("B8 — the starter sentinel's other branches (beats + corrupt)", () => {
  it("a beats-carrying doc NEVER persists the starter (beats are present content)", () => {
    const s = seat({ beats: [{ text: "legacy", start_frame: 0, end_frame: 48 }] })
    expect(s.sent.length).toBe(0)
    // and the beats hydrate as calls (the legacy vocabulary)
    expect(s.result.current.calls.length).toBe(1)
    expect(s.result.current.calls[0]!.text).toBe("legacy")
  })

  it("a corrupt string sentinel NEVER persists the starter over the crime", () => {
    // corruptCallsField's own shape: a string starting "[" that
    // parses to a non-array (or fails to parse) is CORRUPT — the
    // starter must not write over it on mount.
    const s = seat({ calls: '["corrupt"' })
    expect(s.sent.length).toBe(0)
  })

  it("a void doc persists the starter once (the known arm's seat twin)", () => {
    const s = seat({})
    expect(s.sent.length).toBe(1)
    expect(Object.keys(s.sent[0]!)).toEqual(["calls"])
  })

  it("H2 (error-hunt fold): a doc ARRIVING after a starter mount displaces the starter — the real calls show, never a frozen provisional view", () => {
    // The frozen-decision hazard: the starter effect runs on
    // [stage.id] alone, so a LATE-arriving doc (params absent at
    // mount, present on a later refresh) never re-judges. The wall
    // pins the displacement law: the starter was a PROVISIONAL view
    // for a doc that had none — a doc WITH calls supersedes it.
    const s = seat({})
    expect(s.sent.length).toBe(1) // the starter saved for the absent doc
    s.settle({ calls: [{ text: "arrived", start_frame: 0, end_frame: 24 }] })
    expect(s.result.current.calls.length).toBe(1)
    // the late-arriving doc's real calls show — the starter op
    // retires on arrival, never masks the doc
    expect(s.result.current.calls[0]!.text).toBe("arrived")
    expect(s.sent.length).toBe(1) // arrival itself never sends (it is not a gesture)
  })
})

describe("B9 — the stage-switch op clear", () => {
  it("a live op never bleeds across a stage switch (fresh state, no cross-stage overlay)", () => {
    const s = seat({ calls: [SHOT], seed: 7 }, "stageA")
    act(() => { s.result.current.setLayerAKey("seed", 9) })
    expect(s.result.current.layerA.seed).toBe(9)
    // switch BEFORE any settle: stage B must show B's doc alone —
    // the transient op log is per-mount state, cleared on switch.
    s.switchTo({ calls: [{ text: "other", start_frame: 0, end_frame: 24 }], seed: 42 }, "stageB")
    expect(s.result.current.layerA.seed).toBe(42)
    expect(s.result.current.calls[0]!.text).toBe("other")
  })

  it("the switch onto a calls-less stage persists B's OWN starter (the sticky law rides the switch)", () => {
    const s = seat({ calls: [SHOT], seed: 7 }, "stageA")
    const sentOnA = s.sent.length
    s.switchTo({}, "stageB")
    // the starter fired for B (one calls payload) and never for A
    expect(s.sent.length).toBe(sentOnA + 1)
    expect(Object.keys(s.sent[s.sent.length - 1]!)).toEqual(["calls"])
  })
})

describe("B10 — setLayerAKey identity", () => {
  it("a same-value set sends nothing (prev[k] === v → prev, no op, no door call)", () => {
    const s = seat({ calls: [SHOT], seed: 7 })
    const before = s.sent.length
    act(() => { s.result.current.setLayerAKey("seed", 7) })
    expect(s.sent.length).toBe(before)
    expect(s.onSave).not.toHaveBeenCalledWith(expect.objectContaining({ seed: 7 }))
    // a DIFFERENT value still goes through (the identity arm does
    // not swallow real statements)
    act(() => { s.result.current.setLayerAKey("seed", 8) })
    expect(s.sent[s.sent.length - 1]!.seed).toBe(8)
  })
})

describe("P7 — the refused write never rides (no stated-value lie)", () => {
  it("a door that answers false: the gesture sends, the op NEVER rides, the shown doc keeps the bench truth", () => {
    const s = refusingSeat({ calls: [SHOT], seed: 7 })
    act(() => { s.result.current.setLayerAKey("seed", 9) })
    // the door WAS called (the writer attempted the statement)…
    expect(s.sent.length).toBe(1)
    // …and refused it: the overlay never shows 9 — the studio
    // face stays the bench's 7 (no silent-wrong-data divergence).
    expect(s.result.current.layerA.seed).toBe(7)
    // a second gesture re-composes from the REFUSED state (the
    // unstated 9 is not a base to build on): the next payload
    // carries 8, not a 9-then-8 chain.
    act(() => { s.result.current.setLayerAKey("seed", 8) })
    expect(s.sent[s.sent.length - 1]!.seed).toBe(8)
    expect(s.sent[s.sent.length - 1]!.seed).not.toBe(9)
    expect(s.result.current.layerA.seed).toBe(7)
  })

  it("a void door is NOT a refusal (the async CAS fence rides the parent's own face)", () => {
    const s = seat({ calls: [SHOT], seed: 7 })
    act(() => { s.result.current.setLayerAKey("seed", 9) })
    expect(s.result.current.layerA.seed).toBe(9)
  })
})

describe("P6 — the stage-switch flash frame (every render's face, not just the settled one)", () => {
  it("B's FIRST render never shows A's live op — the clear rides the render, not a later effect", () => {
    // The probe records the shown seed at EVERY render (including
    // the intermediate pre-effect frames act would otherwise hide).
    // The flash class: ops cleared in an effect let B's first
    // frame overlay A's still-live op — one frame of A's 9 on B.
    const seen: (number | undefined)[] = []
    const sent: Record<string, unknown>[] = []
    const onSave = vi.fn((p: Record<string, unknown>) => { sent.push(p) })
    // The honest seat: a component that BOTH gestures (drives the
    // real writer) and probes COMMITTED frames only — a flash
    // frame is a committed paint, so the probe records inside
    // useLayoutEffect (render passes React discards never show).
    let api: ReturnType<typeof useShownDoc> | undefined
    const Seat = ({ stage }: { stage: CardStage }) => {
      api = useShownDoc(stage, onSave)
      const seed = api.layerA.seed
      useLayoutEffect(() => { seen.push(seed) })
      return null
    }
    const mounted = renderHook(Seat, {
      initialProps: { stage: { id: "A", params: { calls: [SHOT], seed: 7 } } as unknown as CardStage },
    })
    act(() => { api!.setLayerAKey("seed", 9) })
    expect(seen[seen.length - 1]).toBe(9)
    const mark = seen.length
    // switch to B before any settle: NO frame from here on may
    // carry A's 9 — the first B face is B's 42.
    act(() => {
      mounted.rerender({ stage: { id: "B", params: { calls: [SHOT], seed: 42 } } as unknown as CardStage })
    })
    expect(seen.slice(mark)).not.toContain(9)
    expect(seen[mark]).toBe(42)
  })
})
