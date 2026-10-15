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
  canonicalJson, liveOps, overlayDoc, projectDoc, serializeChannel,
  type PendingOp, type ProjectedDoc,
} from "../src/ui/studio/pendingOps.ts"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

const P0 = {
  calls: [{ text: "shot one", start_frame: 0, end_frame: 158 }],
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
    const sent = [{ text: "typed live", start_frame: 0, end_frame: 158 }]
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
    const ops = [op("calls", [{ text: "typed live", start_frame: 0, end_frame: 158 }], 0)]
    const foreign: ProjectedDoc = {
      ...doc,
      calls: projectDoc({ calls: [{ text: "the agent wrote this", start_frame: 0, end_frame: 158 }] }).calls,
    }
    expect(liveOps(foreign, ops)).toHaveLength(1)
  })

  // ── A1 (R2, 2026-10-27): canonical retirement ─────────────────────
  it("an op retires on a key-REORDERED settle (canonical digest, not JSON.stringify)", () => {
    const doc = projectDoc(P0)
    // the op's rows serialize keys in gesture order...
    const sent = [{ end_frame: 158, text: "typed live", start_frame: 0 }]
    const ops = [op("calls", sent, 0)]
    // ...the settlement writes the SAME rows in doc order: content
    // equal, key order different. JSON.stringify judged them unequal
    // and the op stayed live forever (the overlay froze the channel).
    const settled: ProjectedDoc = { ...doc, calls: projectDoc({ calls: sent }).calls }
    expect(JSON.stringify(serializeChannel(settled, "calls")))
      .not.toBe(JSON.stringify(sent)) // the reorder is real...
    expect(liveOps(settled, ops)).toHaveLength(0) // ...yet it retires
  })

  it("canonicalJson's undefined-avoidance law: undefined keys skip, top-level undefined digests null (A1's digest floor)", () => {
    // undefined-valued keys are NOT statements (they never reach the
    // digest); a top-level undefined digests as null — never the
    // string "undefined" (which would compare unequal to a settled
    // null and freeze the channel exactly like the reorder bug).
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{\"b\":1}')
    expect(canonicalJson(undefined)).toBe("null")
    expect(canonicalJson([1, undefined, 2])).toBe("[1,null,2]")
  })

  // ── P2 (R2): the delete ride retires ──────────────────────────────
  it("a layerA op carrying an explicit null retires when the settled doc drops the key", () => {
    const base = { seed: 7, shift_video: 5 }
    // the op is built exactly as the real seat builds it: the
    // serializer with the persisted base (the null IS the delete).
    const cleared = { ...hydrateLayerA(base), shift_video: undefined }
    const ops = [op("layerA", serializeLayerA(cleared, base), 0)]
    // the doc still carries the old value: live
    expect(liveOps(projectDoc(base), ops)).toHaveLength(1)
    // the door settled the delete: the key is simply ABSENT
    const settled = projectDoc({ seed: 7 })
    expect(liveOps(settled, ops)).toHaveLength(0)
  })
})

describe("overlayDoc (the shown document)", () => {
  it("no live ops: the projection rides through untouched (same reference)", () => {
    const doc = projectDoc(P0)
    expect(overlayDoc(doc, [])).toBe(doc)
  })

  it("the latest op per channel wins; other channels ride the doc", () => {
    const doc = projectDoc(P0)
    const first = [{ text: "first keystroke", start_frame: 0, end_frame: 158 }]
    const second = [{ text: "second keystroke", start_frame: 0, end_frame: 158 }]
    const shown = overlayDoc(doc, [op("calls", first, 0), op("calls", second, 1)])
    expect(shown.calls[0]!.text).toBe("second keystroke")
    expect(shown.layerA.seed).toBe(7)
  })

  // ── A2 (R2, 2026-10-27): seq is load-bearing ──────────────────────
  it("the MAX-SEQ op wins even when array order is inverted (seq, not position)", () => {
    const doc = projectDoc(P0)
    const early = [{ text: "committed first", start_frame: 0, end_frame: 158 }]
    const late = [{ text: "committed second", start_frame: 0, end_frame: 158 }]
    // array position says `late` first; seq is the commit order —
    // the reordering (state batching, concurrent writers) must not
    // change which op wins.
    const shown = overlayDoc(doc, [op("calls", late, 7), op("calls", early, 2)])
    expect(shown.calls[0]!.text).toBe("committed second")
  })

  it("a stale refresh leaves the shown doc untouched (the flap is unstatable)", () => {
    const doc = projectDoc(P0)
    const typed = [{ text: "typed live", start_frame: 0, end_frame: 158 }]
    const ops = [op("calls", typed, 0)]
    // the out-of-order read answers with pre-edit content: the doc
    // is old, the op is live — the shown doc is still the typed text
    const stale = projectDoc(P0)
    const shown = overlayDoc(stale, ops)
    expect(shown.calls[0]!.text).toBe("typed live")
  })

  it("a settled refresh shows the settlement (retired ops vanish)", () => {
    const doc = projectDoc(P0)
    const typed = [{ text: "typed live", start_frame: 0, end_frame: 158 }]
    const settled = projectDoc({ calls: typed, keyframes: [], fps: 24, seed: 7 })
    const shown = overlayDoc(settled, [op("calls", typed, 0)])
    expect(shown.calls[0]!.text).toBe("typed live")
    expect(shown).toEqual(settled)
  })
})
