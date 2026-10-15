// @melite/motion — THE PENDING-OPS WALL (nativity audit F7, 2026-11-05).
// The one-truth content laws, fired as pure-function arms (ported from
// the h3 collapse's studio-pending-ops.spec.ts):
// - the projection is pure: same params in, same doc out;
// - an op retires the moment the projected doc CONTAINS its value
//   (content-compared — key order is not a statement);
// - a foreign doc value holds the op live (a stale refresh can never
//   un-state what was stated);
// - THE SUPERSEDE LAW: a channel holds ONE live statement — a newer
//   append retires older ops on that channel (the door can only settle
//   the newest payload; kept live they would re-mask the doc the moment
//   the newer op retired);
// - max-seq wins the overlay (never array position);
// - EXTERNAL BENCH WRITES RE-HYDRATE: the projection re-reads the doc on
//   every change — the once-only hydration latch that made an external
//   motion_constraints/motion_prompts write invisible until remount is
//   dead, and this arm fires if it comes back.
import { describe, expect, it } from "vitest"
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline"
import {
  canonicalJson, liveOps, opCurrency, overlayMotionDoc, projectMotionDoc,
  promptsSettle, serializeChannel, serializeConstraintsParam,
  serializePromptsParams, supersedeOps,
  type MotionDoc, type PendingOp, type SettleCtx,
} from "../src/ui/studio/motionDoc.ts"

const FPS = 30
const T = 150
const CTX: SettleCtx = { fps: FPS, targetT: T }

const dot = (uuid: string, trackId: string, frame: number): TimelineKeyframe => ({
  uuid, track_id: trackId, frame, value: null, opacity: 1, locked: false,
})

/** The REAL door wire for a doc (never a hand-rolled copy of the shape —
 *  the wall rides the same serializer the commit door rides). */
const wireOf = (doc: MotionDoc): string => serializeConstraintsParam(doc)

/** The REAL prompts door wire for semantic rows (same law). */
const serializePromptsWire = (rows: { text: string; start_frame: number; end_frame: number }[]): string =>
  serializePromptsParams(rows.map((r, i) => ({ ...r, uuid: `wire-${i}`, color: null })), FPS).motion_prompts as string

const docWithKf = (): MotionDoc => ({
  prompts: [],
  keyframes: [dot("kf-9", "fullbody", 3)],
  payloads: { "kf-9": { kind: "fullbody", frame: 3, jp: "AA", jr: "BB" } },
})

describe("motion pending ops (F7): the content laws", () => {
  it("the projection is pure — same params digest to the same doc", () => {
    const a = projectMotionDoc({ prompt: "x", motion_constraints: '{"keyframes":[]}' }, FPS, T)
    const b = projectMotionDoc({ motion_constraints: '{"keyframes":[]}', prompt: "x" }, FPS, T)
    expect(canonicalJson(a)).toBe(canonicalJson(b))
  })

  it("an op retires when the projected doc contains its value (both channels)", () => {
    // constraints: the wire string is the currency
    const doc = docWithKf()
    const wire = wireOf(doc)
    const settled = projectMotionDoc({ motion_constraints: wire }, FPS, T)
    expect(settled.keyframes).toEqual(doc.keyframes)
    expect(liveOps(settled, [{ channel: "constraints", value: wire, seq: 1 }], CTX)).toEqual([])
    // prompts: the semantic rows are the currency
    const seeded = projectMotionDoc(undefined, FPS, T)
    const semantic = seeded.prompts.map((p) => ({ text: p.text, start_frame: p.start_frame, end_frame: p.end_frame }))
    expect(liveOps(seeded, [{ channel: "prompts", value: semantic, seq: 1 }], CTX)).toEqual([])
  })

  it("a foreign doc value holds the op live (stale refresh never un-states)", () => {
    const op: PendingOp = {
      channel: "prompts",
      value: [{ text: "drag", start_frame: 2, end_frame: 149 }],
      seq: 1,
    }
    const refreshed = projectMotionDoc(undefined, FPS, T) // the "refresh" (same params)
    expect(liveOps(refreshed, [op], CTX)).toHaveLength(1)
    // and the overlay STILL shows the stated drag, not the seed
    const shown = overlayMotionDoc(refreshed, liveOps(refreshed, [op], CTX), CTX)
    expect(shown.prompts[0]!.text).toBe("drag")
    expect(shown.prompts[0]!.start_frame).toBe(2)
  })

  it("key order is not a statement: a reordered-key settlement retires the op", () => {
    const doc = projectMotionDoc(undefined, FPS, T)
    const wireA = `{"fullbody":[],"end_effectors":[],"keyframes":[],"root2d":[]}`
    const wireB = `{"keyframes":[],"fullbody":[],"root2d":[],"end_effectors":[]}`
    const settledA = projectMotionDoc({ motion_constraints: wireA }, FPS, T)
    const settledB = projectMotionDoc({ motion_constraints: wireB }, FPS, T)
    expect(canonicalJson(settledA)).toBe(canonicalJson(settledB))
    expect(liveOps(settledB, [{ channel: "constraints", value: wireA, seq: 1 }], CTX)).toEqual([])
  })

  it("THE SUPERSEDE LAW: a newer append retires the channel's older ops", () => {
    const op1: PendingOp = { channel: "prompts", value: [{ text: "", start_frame: 0, end_frame: 74 }, { text: "", start_frame: 75, end_frame: 149 }], seq: 1 }
    const op2: PendingOp = { channel: "prompts", value: [{ text: "", start_frame: 0, end_frame: 149 }], seq: 2 }
    const log = supersedeOps(supersedeOps([], op1), op2)
    expect(log).toHaveLength(1)
    expect(log[0]!.seq).toBe(2)
    // THE ZOMBIE-RESURFACE HAZARD (why the law exists): op2's value equals
    // the doc's seed, so it retires instantly — with the old append-only
    // log, op1 (the split) would re-mask the doc. Under supersede, the
    // shown doc IS the doc.
    expect(liveOps(projectMotionDoc(undefined, FPS, T), log, CTX)).toEqual([])
  })

  it("max-seq wins the overlay, never array position", () => {
    const older: PendingOp = { channel: "prompts", value: [{ text: "older", start_frame: 0, end_frame: 149 }], seq: 5 }
    const newer: PendingOp = { channel: "prompts", value: [{ text: "newer", start_frame: 0, end_frame: 149 }], seq: 6 }
    const shown = overlayMotionDoc(projectMotionDoc(undefined, FPS, T), [newer, older], CTX)
    expect(shown.prompts[0]!.text).toBe("newer")
  })

  it("channels are independent: a prompts op never masks the constraints channel", () => {
    const kfOp: PendingOp = { channel: "constraints", value: wireOf(docWithKf()), seq: 1 }
    const shown = overlayMotionDoc(projectMotionDoc(undefined, FPS, T), [
      kfOp,
      { channel: "prompts", value: [{ text: "p", start_frame: 0, end_frame: 149 }], seq: 2 },
    ], CTX)
    expect(shown.prompts[0]!.text).toBe("p")
    expect(shown.keyframes).toEqual(docWithKf().keyframes)
  })

  it("EXTERNAL BENCH WRITES RE-HYDRATE (the once-only latch is dead)", () => {
    // mount: no constraints in the doc, no ops
    const before = projectMotionDoc(undefined, FPS, T)
    expect(before.keyframes).toEqual([])
    // the bench (another studio, a run's finalize) writes constraints the
    // studio never authored — the projection must show it with NO remount
    // and NO op of our own to retire first. (The wire is the door's own:
    // hydrate drops keyframes without payloads, so a bare keyframes array
    // is correctly invisible.)
    const after = projectMotionDoc({ motion_constraints: wireOf(docWithKf()) }, FPS, T)
    expect(after.keyframes).toEqual(docWithKf().keyframes)
    // same law on the prompts channel (the 2-segment override form)
    const promptsAfter = projectMotionDoc({
      motion_prompts: '[{"text":"from bench","duration_sec":2},{"text":"second","duration_sec":3}]',
    }, FPS, T)
    expect(promptsAfter.prompts.map((p) => p.text)).toEqual(["from bench", "second"])
  })

  it("settlement runs in DOC SPACE: a last-card-short op retires however the envelope moved", () => {
    // The projection stretches the LAST card to targetT-1; a raw-rows
    // compare would wedge the op live forever (the masking hazard). Both
    // sides normalize through promptsSettle at the CURRENT envelope.
    const opRows = [
      { text: "walks", start_frame: 0, end_frame: 59 },
      { text: "turns", start_frame: 60, end_frame: 100 }, // ends SHORT of T-1
    ]
    const wire = serializePromptsWire(opRows)
    // the doc settled the op's wire; the envelope has since grown to 300
    const settledBig = projectMotionDoc({ motion_prompts: wire }, FPS, 300)
    const ctxBig: SettleCtx = { fps: FPS, targetT: 300 }
    expect(liveOps(settledBig, [{ channel: "prompts", value: opRows, seq: 1 }], ctxBig)).toEqual([])
    // ...and while the doc had NOT settled, the op held at BOTH envelopes
    const unsettled = projectMotionDoc(undefined, FPS, 300)
    expect(liveOps(unsettled, [{ channel: "prompts", value: opRows, seq: 1 }], ctxBig)).toHaveLength(1)
  })

  it("THE UNSTATEABLE RESIDUE (pinned): a multi-EMPTY composition stays live — the wire cannot carry empty cards", () => {
    const split: PendingOp = {
      channel: "prompts",
      value: [{ text: "", start_frame: 0, end_frame: 74 }, { text: "", start_frame: 75, end_frame: 149 }],
      seq: 1,
    }
    // the doc's seed is the closest stateable shape — and the op does NOT
    // retire into it: retiring would erase the authoring surface (the
    // split-then-type flow). It lives until a stateable gesture
    // supersedes it or the stage switch clears it.
    expect(liveOps(projectMotionDoc(undefined, FPS, T), [split], CTX)).toHaveLength(1)
  })

  it("the no-op law's space: shapes differing only within the last-card stretch share one currency", () => {
    const short = [{ text: "a", start_frame: 0, end_frame: 59 }, { text: "b", start_frame: 60, end_frame: 100 }]
    const full = [{ text: "a", start_frame: 0, end_frame: 59 }, { text: "b", start_frame: 60, end_frame: 149 }]
    // the OP side normalizes (the stretch law) ...
    expect(canonicalJson(promptsSettle(short, CTX))).toBe(canonicalJson(promptsSettle(full, CTX)))
    // ...and lands on exactly the projected doc's own rows (one law: the
    // op's normalized currency EQUALS serializeChannel's verbatim rows)
    const doc = projectMotionDoc({ motion_prompts: serializePromptsWire(short) }, FPS, T)
    expect(canonicalJson(opCurrency(short, "prompts", CTX)))
      .toBe(canonicalJson(serializeChannel(doc, "prompts", CTX)))
  })

  it("a corrupt live op degrades the overlay to empty constraints, never a crash", () => {
    const op: PendingOp = { channel: "constraints", value: "{garbage", seq: 1 }
    const shown = overlayMotionDoc(projectMotionDoc(undefined, FPS, T), [op], CTX)
    expect(shown.keyframes).toEqual([])
    expect(shown.payloads).toEqual({})
    expect(shown.prompts).toHaveLength(1) // the prompts channel untouched
  })
})
