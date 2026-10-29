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
})
