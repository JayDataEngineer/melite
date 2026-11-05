// commissions-rail.spec.tsx — §9's RENDERED HALF (the multiwindow
// unification audit, 2026-11-12): the bar DRAWS the commissions the
// derivation names.
//
// The kit contract is opt-in and dumb: the tenant hands one row per
// armed bag, the kit draws a gutter head + a lane span (or the N window
// segments for a multi-window extend) in bar space. Absent/empty → NO
// row, so a tenant that arms no mod keeps the byte-identical bar (the
// audioClipCards / kfLaneCards precedent this rides).
//
// The tenant half (the h3 pane's mapping: seats → detail, geometry →
// segments, refusal → the row's voice) is judged in
// packages/video/h3-timeline/tests/studio-strip-commissions.spec.tsx.
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createElement as h } from "react"
import { MotionTimelineBar, COMMISSION_H, type CommissionRow } from "../src/timeline/index.ts"

afterEach(cleanup)

const noop = (): void => {}

function bar(over?: Record<string, unknown>) {
  return h(MotionTimelineBar, {
    prompts: [],
    keyframes: [],
    frameIdx: 0,
    totalFrames: 96,
    fps: 24,
    tracks: [],
    beats: [],
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
    ...over,
  } as never)
}

const ROWS: CommissionRow[] = [
  { id: "reshoot", label: "Reshoot", detail: "source_clip clips/t4.mp4 · orbit 30", accent: "#22d3ee" },
  { id: "extend", label: "Extend", detail: "3 × 158f · 16.500s", segments: ["w1 · 158f", "w2 · 158f", "w3 · 158f"] },
]

describe("§9 rail — the kit's commission lane", () => {
  it("ARM 1 — no commissions prop and an EMPTY array both render NO rail row (byte-identical bar)", () => {
    const { container: none } = render(bar())
    expect(none.querySelectorAll("[data-commission-lane]")).toHaveLength(0)
    expect(none.querySelectorAll('[data-lane-head="commission"]')).toHaveLength(0)
    cleanup()
    const { container: empty } = render(bar({ commissions: [] }))
    expect(empty.querySelectorAll("[data-commission-lane]")).toHaveLength(0)
    expect(empty.querySelectorAll('[data-lane-head="commission"]')).toHaveLength(0)
  })

  it("ARM 7 — a bare row (no detail, no segments) draws ONE span carrying its label (never an empty lane)", () => {
    const { container } = render(bar({ commissions: [{ id: "repair", label: "Repair" }] }))
    const segs = container.querySelectorAll('[data-commission-segment="repair-0"]')
    expect(segs).toHaveLength(1)
    expect(segs[0]!.textContent).toBe("Repair")
    // and no title seat on the body (the voice rides the head only)
    expect((container.querySelector('[data-commission-lane="repair"]') as HTMLElement).getAttribute("title")).toBeNull()
  })

  it("ARM 2 — one row per commission, head and body paired 1:1 in the card's order", () => {
    const { container } = render(bar({ commissions: ROWS }))
    const heads = container.querySelectorAll('[data-lane-head="commission"]')
    const bodies = container.querySelectorAll("[data-commission-lane]")
    expect(heads).toHaveLength(ROWS.length)
    expect(bodies).toHaveLength(ROWS.length)
    // the pairing is by id, not by position accident
    for (const row of ROWS) {
      expect(container.querySelector(`[data-lane-head="commission"][data-lane-head-id="${row.id}"]`), `${row.id} head`).not.toBeNull()
      expect(container.querySelector(`[data-commission-lane="${row.id}"]`), `${row.id} lane`).not.toBeNull()
    }
    expect([...bodies].map((b) => b.getAttribute("data-commission-lane"))).toEqual(ROWS.map((r) => r.id))
  })

  it("ARM 3 — the head and its lane share ONE height (the LaneHead pairing law; never a desynced gutter)", () => {
    const { container } = render(bar({ commissions: ROWS }))
    for (const row of ROWS) {
      const head = container.querySelector(`[data-lane-head="commission"][data-lane-head-id="${row.id}"]`) as HTMLElement
      const lane = container.querySelector(`[data-commission-lane="${row.id}"]`) as HTMLElement
      expect(head.style.height).toBe(`${COMMISSION_H}px`)
      expect(lane.style.height).toBe(`${COMMISSION_H}px`)
    }
  })

  it("ARM 4 — an extend commission draws its N window segments; a single-span commission draws one", () => {
    const { container } = render(bar({ commissions: ROWS }))
    const extendSegs = container.querySelectorAll('[data-commission-segment^="extend-"]')
    expect(extendSegs).toHaveLength(3)
    expect([...extendSegs].map((s) => s.textContent)).toEqual(["w1 · 158f", "w2 · 158f", "w3 · 158f"])
    // the single-window arm draws its one span, carrying the detail
    const rshSegs = container.querySelectorAll('[data-commission-segment^="reshoot-"]')
    expect(rshSegs).toHaveLength(1)
    expect(rshSegs[0]!.textContent).toContain("clips/t4.mp4")
  })

  it("ARM 5 — the span is drawn on the BAR's geometry (width = the doc's own px span)", () => {
    const { container } = render(bar({ commissions: ROWS, totalFrames: 96 }))
    const span = container.querySelector('[data-commission-lane="extend"] > div') as HTMLElement
    // fit-to-width default: 96 frames span the content; the span is
    // strictly positive and never zero-width (a zero-width row would be
    // an invisible commission — the burn this wall closes)
    expect(parseFloat(span.style.width)).toBeGreaterThan(0)
  })

  it("ARM 6 — a row's refusal voice rides the head's title (the armed-and-doomed doc is legible on hover)", () => {
    const doomed: CommissionRow[] = [
      { id: "extend", label: "Extend", detail: "5.31s", title: "h3-timeline extend: stated 127f composes nowhere exactly" },
    ]
    const { container } = render(bar({ commissions: doomed }))
    // the voice rides LaneHead's OWN title seat (the TIP CANON wall
    // pins native-title seats per tree: the row's body draws none)
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="extend"]') as HTMLElement
    expect(head.title).toContain("composes nowhere exactly")
    const lane = container.querySelector('[data-commission-lane="extend"]') as HTMLElement
    expect(lane.getAttribute("title")).toBeNull()
  })

  it("ARM 8 — POSITIONED segments: segmentSpans draw each window at its frame offset (equal stride, equal width, the carry seam visible), and the chip flow is gone", () => {
    const { container } = render(bar({
      totalFrames: 96,
      commissions: [{
        id: "extend", label: "Extend", segments: ["w1 · 158f", "w2 · 158f", "w3 · 158f"],
        segmentSpans: [
          { start: 96, frames: 158 },
          { start: 96 + 119, frames: 158 },
          { start: 96 + 238, frames: 158 },
        ],
      }],
    }))
    const segs = [...container.querySelectorAll('[data-commission-segment^="extend-"]')] as HTMLElement[]
    expect(segs).toHaveLength(3)
    // the span body degrades to a band (no chips inside it)
    const body = container.querySelector('[data-commission-lane="extend"] > div') as HTMLElement
    expect(body.querySelectorAll('[data-commission-segment]')).toHaveLength(0)
    // every window sits at its own offset: equal stride between
    // consecutive lefts (the carry overlap is the same seam every
    // time — 158f windows, 119f stride), equal widths
    const lefts = segs.map((s) => parseFloat(s.style.left))
    const widths = segs.map((s) => parseFloat(s.style.width))
    expect(lefts[1]! - lefts[0]!).toBeCloseTo(lefts[2]! - lefts[1]!, 5)
    expect(widths[0]).toBeCloseTo(widths[1]!, 5)
    expect(widths[0]).toBeCloseTo(widths[2]!, 5)
    // every positioned window of this armed extension starts at or
    // past the real film's end → every segment is marked planned
    for (const s of segs) expect(s.getAttribute("data-commission-planned")).toBe("true")
  })

  it("ARM 9 — a MISMATCHED segmentSpans length falls back to the chip flow (the guard is length equality, never a crash)", () => {
    const { container } = render(bar({
      totalFrames: 96,
      commissions: [{
        id: "extend", label: "Extend", segments: ["w1 · 158f", "w2 · 158f", "w3 · 158f"],
        segmentSpans: [{ start: 96, frames: 158 }],
      }],
    }))
    const body = container.querySelector('[data-commission-lane="extend"] > div') as HTMLElement
    expect(body.querySelectorAll('[data-commission-segment]')).toHaveLength(3)
    expect(container.querySelectorAll("[data-commission-planned]")).toHaveLength(0)
  })

  it("ARM 10 — THE PLANNED TAIL: plannedFrames extends the axis and seats the hatched band at the film's end; absent → no band (byte-identical)", () => {
    const { container: plain } = render(bar({ totalFrames: 96 }))
    expect(plain.querySelectorAll("[data-planned-band]")).toHaveLength(0)
    cleanup()
    const { container } = render(bar({ totalFrames: 96, plannedFrames: 396 }))
    const band = container.querySelector("[data-planned-band]") as HTMLElement
    expect(band, "the armed tail seats its reservation").not.toBeNull()
    expect(parseFloat(band.style.width)).toBeGreaterThan(0)
    // the band starts where the film ends: its left equals a
    // positioned segment placed at frame 96 (the extend's first
    // window) — one axis, two faces of the same tail
    const { container: withSeg } = render(bar({
      totalFrames: 96, plannedFrames: 396,
      commissions: [{ id: "extend", label: "Extend", segments: ["w1"], segmentSpans: [{ start: 96, frames: 158 }] }],
    }))
    const seg0 = withSeg.querySelector('[data-commission-segment="extend-0"]') as HTMLElement
    expect(parseFloat((withSeg.querySelector("[data-planned-band]") as HTMLElement).style.left))
      .toBeCloseTo(parseFloat(seg0.style.left), 5)
  })
})
