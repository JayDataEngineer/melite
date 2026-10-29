// studio-strip-commissions.spec.tsx — §9's TENANT HALF (the multiwindow
// unification audit, 2026-11-12): the studio's strip pane maps the
// derived commissions onto the kit's rail rows.
//
// THE BURN this closes: an armed mod bag composed on the run and drew
// NOTHING on the lane — "it looks default, despite the AI agent using the
// card to string together multiple clips with a mod". The pane is the
// hop where the durable doc's bags become visible operator-facing words:
// kind label, the seats it names, the extend's window segments, and the
// compose door's refusal voice when the composition is doomed.
//
// Locale law: every word here comes from `studioCopy` — the pane authors
// no literal, so the arm asserts the dictionary's own output.
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createElement as h } from "react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import type { DocCommission } from "../src/ui/studio/commissions.ts"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"

afterEach(cleanup)

const noop = (): void => {}

function strip(commissions: DocCommission[]) {
  return h(StudioStripPane, {
    calls: [],
    fps: 24,
    barPrompts: [],
    barLanes: [],
    barAudioClips: [],
    barTotal: 96,
    frameIdx: 0,
    commissions,
    callPreviews: {},
    selectedBarId: null,
    filmMap: null,
    handleBarFrame: noop,
    handleScrubStart: noop,
    handleScrubEnd: noop,
    handleKeyframeMove: noop,
    handleKeyframeDelete: noop,
    handlePromptUpdate: noop,
    handlePromptMove: noop,
    handlePromptResize: noop,
    handlePromptDelete: noop,
    handleExtend: noop,
    addCallAt: noop,
    handleTimelineSelect: noop,
    layerA: {},
    refAudiosBlocked: false,
    addAudioClip: noop,
    takeAudioFile: async () => {},
    moveAudioClip: noop,
    deleteAudioClip: noop,
    updateAudioClip: noop,
    setLayerAKey: noop,
    artifactIndex: { byUrl: new Map(), byName: new Map() },
    docFromFilm: (f: number) => f,
    keyframes: [],
    addKeyframeWithImage: async () => {},
    enterKfView: noop,
    enterAudioView: noop,
  } as never)
}

const RESHOOT: DocCommission = {
  kind: "reshoot",
  seats: [{ key: "source_clip", value: "clips/t4.mp4" }, { key: "orbit", value: "30" }],
}
const EXTEND: DocCommission = {
  kind: "extend",
  seats: [{ key: "source_clip", value: "clips/t3.mp4" }, { key: "extend_seconds", value: "16.5" }],
  geometry: { windows: 3, windowFrames: 158, deliveredFrames: 396 },
}

describe("§9 — the studio strip's commission mapping", () => {
  it("ARM 1 — no commissions render NO rail row (a doc with no armed bag keeps its bar)", () => {
    const { container } = render(strip([]))
    expect(container.querySelectorAll("[data-commission-lane]")).toHaveLength(0)
  })

  it("ARM 2 — an armed bag becomes ONE row, labelled by the dictionary and addressed by its kind", () => {
    const { container } = render(strip([RESHOOT]))
    const lane = container.querySelector('[data-commission-lane="reshoot"]') as HTMLElement
    expect(lane, "the reshoot commission draws its row").not.toBeNull()
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="reshoot"]') as HTMLElement
    expect(head.textContent).toContain(studioCopy.commissionKindLabel("reshoot"))
    // the row's voice is the dictionary's own sentence, on the head's
    // own title seat (the body draws no native title — the TIP CANON
    // wall pins those per tree)
    expect(head.title).toBe(studioCopy.commissionRowTitle("reshoot"))
    expect(lane.getAttribute("title")).toBeNull()
  })

  it("ARM 3 — the seats line names every seat the bag states (the operator reads what the compose reads)", () => {
    const { container } = render(strip([RESHOOT]))
    const seg = container.querySelector('[data-commission-segment="reshoot-0"]') as HTMLElement
    expect(seg.textContent).toBe(studioCopy.commissionSeats(RESHOOT.seats))
    expect(seg.textContent).toContain("source_clip clips/t4.mp4")
    expect(seg.textContent).toContain("orbit 30")
  })

  it("ARM 4 — an extend draws its N window segments AND its composition line (the multi-window burn)", () => {
    const { container } = render(strip([EXTEND]))
    const segs = container.querySelectorAll('[data-commission-segment^="extend-"]')
    expect(segs, "three windows draw three segments").toHaveLength(3)
    expect([...segs].map((s) => s.textContent)).toEqual([
      studioCopy.commissionWindowSegment(0, 158),
      studioCopy.commissionWindowSegment(1, 158),
      studioCopy.commissionWindowSegment(2, 158),
    ])
    // the composition readout rides the span (the details the operator
    // needs to know how much film this commission adds)
    expect(studioCopy.commissionGeometry(EXTEND.geometry!)).toContain("16.500s")
  })

  it("ARM 5 — a doomed composition shows the compose door's refusal as the row's voice (never a lane that looks fine)", () => {
    const doomed: DocCommission = {
      kind: "extend",
      seats: [{ key: "source_clip", value: "clips/t3.mp4" }, { key: "extend_seconds", value: "5.31" }],
      refusal: "h3-timeline extend: stated 127f composes nowhere exactly",
    }
    const { container } = render(strip([doomed]))
    const lane = container.querySelector('[data-commission-lane="extend"]') as HTMLElement
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="extend"]') as HTMLElement
    expect(head.title).toContain("composes nowhere exactly")
    // a refused composition draws NO window segments (nothing to draw)
    expect(container.querySelectorAll('[data-commission-segment^="extend-"]')).toHaveLength(1)
  })

  it("ARM 6 — two armed bags draw two rows in the card's order (the rail is deterministic)", () => {
    const { container } = render(strip([RESHOOT, EXTEND]))
    const lanes = [...container.querySelectorAll("[data-commission-lane]")]
    expect(lanes.map((l) => l.getAttribute("data-commission-lane"))).toEqual(["reshoot", "extend"])
  })
})
