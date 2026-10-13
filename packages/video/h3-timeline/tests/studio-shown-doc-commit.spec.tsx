/**
 * useShownDoc — THE COMMIT SEAT (the R2 walls, 2026-10-27).
 *
 * THE HOLE THESE ARMS CLOSE: every studio harness mocked
 * setLayerAKey/setLayerA, so no wall ever judged what the REAL
 * commit sends — the RunRecipe harness's own comment admitted
 * "minus the save". These arms ride the real hook end to end:
 * only the DOOR (onSave) is a spy; the seat (project → overlay →
 * serialize → send → op append → retirement) is live. The payload
 * assertions name the R2 cures: the fps ride (P1), the pin law
 * (never fps on an untouched doc), the delete ride (P2), the
 * variant key (P3), loras steps survival (P4), the ref_mods lane
 * (P5) — each arm reds when its cure is toggled out.
 */
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useShownDoc } from "../src/ui/studio/useShownDoc.ts"
import type { CardStage } from "@melite/contracts"

const stageOf = (params: Record<string, unknown>): CardStage =>
  ({ id: "s1", params }) as unknown as CardStage

type Sent = Record<string, unknown>[]

/** Mount the real seat; the door records every payload verbatim. */
function seat(params: Record<string, unknown>) {
  const sent: Sent = []
  const onSave = vi.fn((p: Record<string, unknown>) => { sent.push(p) })
  const mounted = renderHook(
    ({ stage }) => useShownDoc(stage, onSave),
    { initialProps: { stage: stageOf(params) } },
  )
  return {
    sent,
    layerA: () => mounted.result.current.layerA,
    setLayerAKey: mounted.result.current.setLayerAKey,
    /** Simulate the durable settle: the refresh carries the merged doc. */
    settle: (next: Record<string, unknown>) => mounted.rerender({ stage: stageOf(next) }),
  }
}

describe("P1 — the fps ride (the control's writes persist)", () => {
  it("an fps gesture sends fps in the layerA payload", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7 })
    act(() => { s.setLayerAKey("fps", 30) })
    expect(s.sent.length).toBeGreaterThan(0)
    expect(s.sent[s.sent.length - 1]!.fps).toBe(30)
    // the overlay shows the gesture immediately (the op is live)
    expect(s.layerA().fps).toBe(30)
  })

  it("THE PIN LAW: a doc that never stated fps never pins one", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7 })
    act(() => { s.setLayerAKey("seed", 9) })
    const p = s.sent[s.sent.length - 1]!
    expect(p.seed).toBe(9)
    expect("fps" in p).toBe(false)
    expect(s.layerA().fps).toBeUndefined()
  })
})

describe("P2 — the delete ride (a cleared key deletes at the door)", () => {
  it("clearing a base-carried key sends the explicit null", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7, shift_video: 5 })
    act(() => { s.setLayerAKey("shift_video", undefined) })
    const p = s.sent[s.sent.length - 1]!
    expect(p.shift_video).toBeNull()
    // the shown doc dropped the shift (the overlay hydrates the op)
    expect(s.layerA().shift_video).toBeUndefined()
  })

  it("no base key, no null (absent stays absent — nothing to delete)", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7 })
    // stating undefined where the doc never carried the key is the
    // no-op law's own case: nothing sent at all.
    const before = s.sent.length
    act(() => { s.setLayerAKey("shift_video", undefined) })
    expect(s.sent.length).toBe(before)
    // set then clear BEFORE any settle: the base (the persisted raw)
    // never carried the key, so the clear rides no null either.
    act(() => { s.setLayerAKey("shift_video", 5) })
    act(() => { s.setLayerAKey("shift_video", undefined) })
    const p = s.sent[s.sent.length - 1]!
    expect("shift_video" in p).toBe(false)
    expect(Object.values(p).every((v) => v !== null)).toBe(true)
  })

  it("the settle retires the delete op (the door's merge-patch view)", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7, shift_video: 5 })
    act(() => { s.setLayerAKey("shift_video", undefined) })
    // the door settled: the merged doc simply lacks the key
    s.settle({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7 })
    expect(s.layerA().shift_video).toBeUndefined()
  })
})

describe("P3 — the variant key rides (no whole-plane replace loses it)", () => {
  it("a variant stated in the doc survives an unrelated gesture", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7, variant: "timeline" })
    act(() => { s.setLayerAKey("seed", 9) })
    expect(s.sent[s.sent.length - 1]!.variant).toBe("timeline")
  })
})

describe("P4 — loras steps survive the round trip (the service reads them)", () => {
  it("a steps-carrying bag row keeps its steps through hydrate → serialize", () => {
    const s = seat({
      calls: [{ text: "a", start_frame: 0, end_frame: 48 }],
      seed: 7,
      loras: [{ id: "h3_lightx2v_turbo", strength: 1, steps: 4 }],
    })
    act(() => { s.setLayerAKey("seed", 9) })
    const p = s.sent[s.sent.length - 1]!
    expect(p.loras).toEqual([{ id: "h3_lightx2v_turbo", strength: 1, steps: 4 }])
  })
})

describe("P5 — the ref_mods lane round-trips (the fourth declared lane)", () => {
  it("ref_mods stated in the doc rides back on an unrelated gesture", () => {
    const s = seat({
      calls: [{ text: "a", start_frame: 0, end_frame: 48 }],
      seed: 7,
      ref_mods: ["h3/flux_repair_v2.safetensors"],
    })
    act(() => { s.setLayerAKey("seed", 9) })
    expect(s.sent[s.sent.length - 1]!.ref_mods).toEqual(["h3/flux_repair_v2.safetensors"])
    expect(s.layerA().ref_mods).toEqual(["h3/flux_repair_v2.safetensors"])
  })
})

describe("the no-op law at the real seat", () => {
  it("a gesture that states nothing sends nothing", () => {
    const s = seat({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }], seed: 7 })
    const before = s.sent.length
    act(() => { s.setLayerAKey("seed", 7) })
    expect(s.sent.length).toBe(before)
  })
})
