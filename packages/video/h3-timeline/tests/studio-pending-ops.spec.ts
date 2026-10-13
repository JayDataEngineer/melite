/**
 * pendingOps — the studio's live incrementality (THE REWORK's core).
 *
 * PINS: the projection is a pure hydrate of the row; the overlay
 * applies the latest live op per channel; an op retires exactly
 * when the projected doc contains its value (never by ledger
 * whisper, never by timeout); a stale refresh (old content, ops
 * outstanding) leaves the shown doc untouched; ops from a dead
 * stage never overlay a new stage (the caller clears on switch —
 * pinned here as the overlay's indifference to stage identity:
 * retirement is content-judged, so a foreign doc simply retires
 * nothing and the overlay would lie — the component owns the
 * clear, this spec pins the content law it relies on).
 */
import { describe, expect, it } from "vitest"
import {
  liveOps, overlayDoc, projectDoc,
  type PendingOp, type ProjectedDoc,
} from "../src/ui/studio/pendingOps.ts"

const P0 = {
  calls: [{ text: "shot one", start_frame: 0, end_frame: 160 }],
  keyframes: [],
  fps: 24,
  seed: 7,
}

const op = (channel: PendingOp["channel"], value: unknown, seq: number): PendingOp =>
  ({ channel, value, seq })

describe("projectDoc (the pure projection)", () => {
  it("hydrates the row with no state (calls + keyframes + layerA)", () => {
    const doc = projectDoc(P0)
    expect(doc.calls).toHaveLength(1)
    expect(doc.calls[0]!.text).toBe("shot one")
    expect(doc.keyframes).toEqual([])
    expect(doc.layerA.seed).toBe(7)
  })
})

describe("liveOps (retirement by durable settlement)", () => {
  it("an op retires the moment the doc contains its value", () => {
    const doc = projectDoc(P0)
    const sent = [{ text: "typed live", start_frame: 0, end_frame: 160 }]
    const ops = [op("calls", sent, 0)]
    // the doc does not yet carry it: live
    expect(liveOps(doc, ops)).toHaveLength(1)
    // the settlement lands (the refresh carries the sent content):
    // retired — nothing outstanding
    const settled: ProjectedDoc = { ...doc, calls: projectDoc({ calls: sent }).calls }
    expect(liveOps(settled, ops)).toHaveLength(0)
  })

  it("a foreign write does not retire our op (different content stays live)", () => {
    const doc = projectDoc(P0)
    const ops = [op("calls", [{ text: "typed live", start_frame: 0, end_frame: 160 }], 0)]
    const foreign: ProjectedDoc = {
      ...doc,
      calls: projectDoc({ calls: [{ text: "the agent wrote this", start_frame: 0, end_frame: 160 }] }).calls,
    }
    expect(liveOps(foreign, ops)).toHaveLength(1)
  })
})

describe("overlayDoc (the shown document)", () => {
  it("no live ops: the projection rides through untouched (same reference)", () => {
    const doc = projectDoc(P0)
    expect(overlayDoc(doc, [])).toBe(doc)
  })

  it("the latest op per channel wins; other channels ride the doc", () => {
    const doc = projectDoc(P0)
    const first = [{ text: "first keystroke", start_frame: 0, end_frame: 160 }]
    const second = [{ text: "second keystroke", start_frame: 0, end_frame: 160 }]
    const shown = overlayDoc(doc, [op("calls", first, 0), op("calls", second, 1)])
    expect(shown.calls[0]!.text).toBe("second keystroke")
    expect(shown.layerA.seed).toBe(7)
  })

  it("a stale refresh leaves the shown doc untouched (the flap is unstatable)", () => {
    const doc = projectDoc(P0)
    const typed = [{ text: "typed live", start_frame: 0, end_frame: 160 }]
    const ops = [op("calls", typed, 0)]
    // the out-of-order read answers with pre-edit content: the doc
    // is old, the op is live — the shown doc is still the typed text
    const stale = projectDoc(P0)
    const shown = overlayDoc(stale, ops)
    expect(shown.calls[0]!.text).toBe("typed live")
  })

  it("a settled refresh shows the settlement (retired ops vanish)", () => {
    const doc = projectDoc(P0)
    const typed = [{ text: "typed live", start_frame: 0, end_frame: 160 }]
    const settled = projectDoc({ calls: typed, keyframes: [], fps: 24, seed: 7 })
    const shown = overlayDoc(settled, [op("calls", typed, 0)])
    expect(shown.calls[0]!.text).toBe("typed live")
    expect(shown).toEqual(settled)
  })
})
