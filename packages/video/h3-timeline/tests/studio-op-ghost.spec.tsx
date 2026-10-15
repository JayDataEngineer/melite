/**
 * useShownDoc — THE GHOST WALL (P8, 2026-10-15).
 *
 * THE HAUNTING: the op overlay retires content-compared — an op dies
 * only when the durable doc CONTAINS its value. A write the bench
 * refused past its rebase budget (the stretch storm's own exhaust)
 * therefore never retired: the dead value sat max-seq live forever,
 * and every later settlement showed through it — the studio one
 * gesture behind the bench, permanently. Two cures, one pin each:
 *
 *   P8a — THE ANCESTOR PRUNE: committing a channel drops its
 *   superseded ops with the successor (latest-per-channel is all the
 *   overlay ever shows; the dead past must not outlive it).
 *
 *   P8b — THE ASYNC RETRACTION: the door's late answer (the widened
 *   onSave promise) retracts exactly the op it carried — `false` or
 *   a rejection drops it, anything else leaves retirement to the doc.
 *
 * Each arm reds when its cure is toggled out (plain append, no
 * promise handling). The seat is the REAL hook end to end — only the
 * door is a spy.
 */
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useShownDoc } from "../src/ui/studio/useShownDoc.ts"
import { liveOps, projectDoc, serializeChannel, type PendingOp } from "../src/ui/studio/pendingOps.ts"
import { serializeCalls } from "../src/ui/studio/docCalls.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { CardStage } from "@melite/contracts"

const stageOf = (params: Record<string, unknown>): CardStage =>
  ({ id: "s1", params }) as unknown as CardStage

type Save = (p: Record<string, unknown>) => boolean | void | Promise<boolean | void>

/** Mount the real seat; the door is the caller's (a spy by default). */
function seat(params: Record<string, unknown>, onSave?: Save) {
  const sent: Array<Record<string, unknown>> = []
  const save: Save = onSave ?? ((p) => { sent.push(p) })
  const mounted = renderHook(
    ({ stage }) => useShownDoc(stage, save),
    { initialProps: { stage: stageOf(params) } },
  )
  return {
    sent,
    calls: () => mounted.result.current.calls,
    keyframes: () => mounted.result.current.keyframes,
    updateCalls: () => mounted.result.current.updateCalls,
    updateKeyframes: () => mounted.result.current.updateKeyframes,
    /** Simulate the durable settle: the refresh carries the merged doc. */
    settle: (next: Record<string, unknown>) => mounted.rerender({ stage: stageOf(next) }),
  }
}

// (re-pin 2026-11-06, the heal law ce79f052a) the engine renders
// 22+17k frames — the legacy 40f/60f fixtures were themselves
// off-grid docs that healed under the overlay (gridSnap 40→39),
// redning every assertion. On-grid pair: 39 / 73.
const CALL_40 = { text: "a", start_frame: 0, end_frame: 39 }
const CALL_48 = { text: "a", start_frame: 0, end_frame: 48 }
const CALL_60 = { text: "a", start_frame: 0, end_frame: 73 }

describe("THE HEALED RETIREMENT (2026-11-06, the ghost's named blind spot, cured at the verb)", () => {
  // A hand-rolled off-grid statement (end 48 — not on the 22+17k
  // grid) settles VERBATIM into the bench; the projected channel
  // HEALS it (48→56). The raw-payload law compared op.value against
  // the healed channel — 48 never equals 56, so the op sat live
  // forever (unreachable via the studio setters, which pre-snap,
  // but the retirement law's own blind spot, named by the overlay
  // diagnosis). The cured law projects BOTH sides: the op retires
  // the moment the doc HEALS to it. Judged at the verb — the
  // component overlay shows the same face either way (it re-hydrates
  // op values too), so the hook cannot discriminate; liveOps is the
  // retirement judge and its own wall.
  it("an off-grid op retires when the settled doc carries its raw payload and heals it", () => {
    const op: PendingOp = { channel: "calls", value: serializeCalls([CALL_48 as DocCall]), seq: 1 }
    const doc = projectDoc({ calls: [CALL_48] })
    expect(serializeChannel(doc, "calls")).toEqual([{ text: "a", start_frame: 0, end_frame: 56 }])
    expect(liveOps(doc, [op])).toEqual([])
  });

  it("the on-grid twin still retires (the heal projects a no-op) and a divergent doc keeps the statement live", () => {
    const settled = projectDoc({ calls: [CALL_40] })
    expect(liveOps(settled, [{ channel: "calls", value: serializeCalls([CALL_40 as DocCall]), seq: 1 }])).toEqual([])
    // a doc that never carried the statement keeps it live (the
    // one-truth law: a refresh cannot un-state what was stated)
    const divergent = projectDoc({ calls: [CALL_60] })
    expect(liveOps(divergent, [{ channel: "calls", value: serializeCalls([CALL_48 as DocCall]), seq: 1 }]).length).toBe(1)
  });
});

describe("P8a — THE ANCESTOR PRUNE (a superseded op dies with its successor)", () => {
  it("two stretches then a settle carrying the latest: the shown doc IS the settle, never the dead middle", () => {
    const s = seat({ calls: [CALL_40] })
    act(() => { s.updateCalls()([CALL_48]) })
    act(() => { s.updateCalls()([CALL_60]) })
    expect(s.sent.length).toBe(2)
    // the overlay tracks the latest statement mid-flight
    expect(s.calls()[0]!.end_frame).toBe(73)
    // the durable doc lands the latest value — the middle op (never
    // contained by any doc) must not mask it as max-seq live
    s.settle({ calls: s.sent[1]!["calls"] })
    expect(s.calls()[0]!.end_frame).toBe(73)
  });

  it("a settle carrying the middle value still shows the latest statement (the prune is latest-wins, not settle-wins)", () => {
    const s = seat({ calls: [CALL_40] })
    act(() => { s.updateCalls()([CALL_48]) })
    act(() => { s.updateCalls()([CALL_60]) })
    // a stale refresh (the pre-prune doc landing late) cannot un-state
    // what was stated after it — the overlay holds the latest op
    s.settle({ calls: s.sent[0]!["calls"] })
    expect(s.calls()[0]!.end_frame).toBe(73)
  });

  it("the prune is per-channel: a keyframes op survives a calls commit, and its own settle retires it", () => {
    const s = seat({ calls: [CALL_40], keyframes: [{ image: "a.png", frame: 24 }] })
    act(() => { s.updateCalls()([CALL_60]) })
    act(() => { s.updateKeyframes()([{ image: "b.mp4", frame: 48 }, { image: "a.png", frame: 24 }]) })
    // both statements live on their own channels
    expect(s.calls()[0]!.end_frame).toBe(73)
    expect(s.keyframes().length).toBe(2)
    // the calls settle retires only the calls op — keyframes stays stated
    s.settle({ calls: s.sent[0]!["calls"], keyframes: [{ image: "a.png", frame: 24 }] })
    expect(s.calls()[0]!.end_frame).toBe(73)
    expect(s.keyframes().length).toBe(2)
    // and the keyframes settle retires it in turn — nothing haunts
    s.settle({
      calls: s.sent[0]!["calls"],
      keyframes: s.sent[1]!["keyframes"],
    })
    expect(s.keyframes().length).toBe(2)
  });
});

describe("P8b — THE ASYNC RETRACTION (a refused write retracts exactly its op)", () => {
  it("a late `false` drops the stated op — the overlay falls back to the bench doc", async () => {
    let resolveSave!: (v: boolean) => void
    const gate = new Promise<boolean>((res) => { resolveSave = res })
    const s = seat({ calls: [CALL_40] }, () => gate)
    act(() => { s.updateCalls()([CALL_60]) })
    // optimistic first: the statement shows before the door answers
    expect(s.calls()[0]!.end_frame).toBe(73)
    await act(async () => {
      resolveSave(false)
      await new Promise((r) => setTimeout(r, 0))
    })
    // retracted: the bench never carried it, the studio no longer shows it
    expect(s.calls()[0]!.end_frame).toBe(39)
  });

  it("a late `true` keeps the op for the doc to retire (the common landing)", async () => {
    let resolveSave!: (v: boolean) => void
    const gate = new Promise<boolean>((res) => { resolveSave = res })
    const s = seat({ calls: [CALL_40] }, () => gate)
    act(() => { s.updateCalls()([CALL_60]) })
    await act(async () => {
      resolveSave(true)
      await new Promise((r) => setTimeout(r, 0))
    })
    // still stated — no settle yet, no retirement yet
    expect(s.calls()[0]!.end_frame).toBe(73)
    s.settle({ calls: s.sent.length > 0 ? s.sent[0]!["calls"] : [CALL_60] })
  });

  it("a rejection retracts too — and only its own op (the sibling channel stands)", async () => {
    let rejectSave!: (e: unknown) => void
    const gate = new Promise<boolean>((_, rej) => { rejectSave = rej })
    const s = seat(
      { calls: [CALL_40], keyframes: [{ image: "a.png", frame: 24 }] },
      (p) => ("calls" in p ? gate : undefined),
    )
    act(() => { s.updateCalls()([CALL_60]) })
    act(() => { s.updateKeyframes()([{ image: "b.mp4", frame: 48 }, { image: "a.png", frame: 24 }]) })
    expect(s.calls()[0]!.end_frame).toBe(73)
    expect(s.keyframes().length).toBe(2)
    await act(async () => {
      rejectSave(new Error("drafts/patch: bench moved under the patch"))
      await gate.then(() => {}, () => {})
      await new Promise((r) => setTimeout(r, 0))
    })
    // the refused calls op is gone; the unrefused keyframes statement stands
    expect(s.calls()[0]!.end_frame).toBe(39)
    expect(s.keyframes().length).toBe(2)
  });

  it("P7 stands: a synchronous `false` never rides the overlay at all", () => {
    const onSave = vi.fn((_p: Record<string, unknown>): boolean => false)
    const s = seat({ calls: [CALL_40] }, onSave)
    expect(onSave).not.toHaveBeenCalled()
    act(() => { s.updateCalls()([CALL_60]) })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(s.calls()[0]!.end_frame).toBe(39)
  });
});
