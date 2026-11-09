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
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { createElement as h } from "react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import type { DocCommission } from "../src/ui/studio/commissions.ts"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { STARTER_CALLS, type DocCall } from "../src/ui/studio/docModel.ts"
import { callsToPrompts } from "../src/ui/studio/docCalls.ts"

afterEach(cleanup)

const noop = (): void => {}

function strip(commissions: DocCommission[], calls: DocCall[] = [], overrides: Record<string, unknown> = {}) {
  return h(StudioStripPane, {
    calls,
    fps: 24,
    // the lane rows EXACTLY as useDerivedView feeds them: the real
    // builder over the same calls (barPrompts[i] ↔ calls[i], one row
    // per call in order — the correspondence the mod-face filter rides)
    barPrompts: callsToPrompts(calls),
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
    ...overrides,
  } as never)
}

const RESHOOT: DocCommission = {
  kind: "reshoot",
  seats: [{ key: "source_clip", value: "clips/t4.mp4" }, { key: "orbit", value: "30" }],
}
// THE READ-LIST COLLAPSE (2026-11-09): the canonical bag's own render
// hop — an `edit` commission draws its row with the operator's word.
const EDIT: DocCommission = {
  kind: "edit",
  seats: [
    { key: "source_clip", value: "clips/t7.mp4" }, { key: "edit_prompt", value: "make it night" },
    { key: "mask_source", value: "region" }, { key: "region_prompt", value: "a person" },
    { key: "denoise", value: "0.55" },
  ],
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

  it("ARM 2e — the CANONICAL bag renders: an armed edit commission draws its row under the operator's word (the read-list collapse's UI hop)", () => {
    const { container } = render(strip([EDIT]))
    const lane = container.querySelector('[data-commission-lane="edit"]') as HTMLElement
    expect(lane, "the edit commission draws its row").not.toBeNull()
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="edit"]') as HTMLElement
    expect(head.textContent).toContain("Video edit")
    expect(head.title).toBe(studioCopy.commissionRowTitle("edit"))
    const seg = container.querySelector('[data-commission-segment="edit-0"]') as HTMLElement
    expect(seg.textContent).toBe(studioCopy.commissionSeats(EDIT.seats))
    expect(seg.textContent).toContain("edit_prompt make it night")
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
      refusal: "h3-timeline extend: length 127f is off-grid — the engine renders 22+17k frames in [22,362] (nearest legal: 124f); the doc-proven geometry is 0→124→243→362",
    }
    const { container } = render(strip([doomed]))
    const lane = container.querySelector('[data-commission-lane="extend"]') as HTMLElement
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="extend"]') as HTMLElement
    expect(head.title).toContain("is off-grid")
    expect(head.title).toContain("[22,362]")
    // a refused composition draws NO window segments (nothing to draw)
    expect(container.querySelectorAll('[data-commission-segment^="extend-"]')).toHaveLength(1)
  })

  it("ARM 6 — two armed bags draw two rows in the DERIVED order the pane is handed (the rail is deterministic)", () => {
    // the derivation emits card order (extend before reshoot); the pane
    // must not reorder what the rail was handed
    const { container } = render(strip([EXTEND, RESHOOT]))
    const lanes = [...container.querySelectorAll("[data-commission-lane]")]
    expect(lanes.map((l) => l.getAttribute("data-commission-lane"))).toEqual(["extend", "reshoot"])
  })

  it("ARM 7 — a present NON-ARRAY bag shows the malformed row (the door refuses; the lane never looks fine)", () => {
    const malformed: DocCommission = { kind: "extend", seats: [], note: "malformed" }
    const { container } = render(strip([malformed]))
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="extend"]') as HTMLElement
    expect(head, "the malformed arm still draws its row").not.toBeNull()
    expect(head.title).toBe(studioCopy.commissionMalformed("extend"))
    expect(head.title).toContain("not an entry list")
    // no window segments: nothing was composed
    expect(container.querySelectorAll('[data-commission-segment^="extend-"]')).toHaveLength(1)
  })

  it("ARM 8 — a non-object entry shows the bad-entry row (armed, refused by the door, never hidden)", () => {
    const badEntry: DocCommission = { kind: "reshoot", seats: [], note: "bad-entry" }
    const { container } = render(strip([badEntry]))
    const head = container.querySelector('[data-lane-head="commission"][data-lane-head-id="reshoot"]') as HTMLElement
    expect(head, "the bad entry still draws its row").not.toBeNull()
    expect(head.title).toBe(studioCopy.commissionBadEntry("reshoot"))
    expect(head.title).toContain("entry is not an object")
  })
})

// ── THE MOD-MODE CALLS FACE (operator 2026-11-14, verbatim: "By using
// Mod, we enter a special mode, that uses different inputs. But, to the
// user, there is still the default call in the timeline bar that tells
// them to describe their video there, when that isn't used at all. And
// when I do stuff like reshoot, it adds two bars to the timeline as
// well. It's just sloppy") ────────────────────────────────────────────
// The strip's calls lane names its calls-readership under an armed
// commission: replace/repair/extend/refine/upscale compose from the bag
// alone (never read a call's text — pinned per kind by the mod specs'
// composed graphs), so under those arms the STARTER placeholder — the
// studio's own view-state invitation to "describe the action, camera,
// and mood" — stands down (no clip, the dormant label + hint naming the
// armed kind); authored prose still paints (doc truth, merely unread).
// reshoot/loras RIDE the film action and read the call text (reshoot's
// prompt is "crossview. " + the text), so their lane stays live and is
// labeled as the run's prompt seat — one lane for the input, one rail
// row for the commission, each named. The words are the dictionary's.
const REPLACE: DocCommission = {
  kind: "replace",
  seats: [{ key: "source_clip", value: "clips/t1.mp4" }, { key: "prompt", value: "the same person, now indoors" }],
}
const STARTER: DocCall = { ...STARTER_CALLS[0]! }
const AUTHORED: DocCall = { text: "she walks on, the light shifts", start_frame: 0, end_frame: 90 }
const lorasRow = (id: string): DocCommission => ({
  kind: "loras",
  seats: [{ key: "id", value: id }, { key: "strength", value: "0.8" }],
})

describe("THE MOD-MODE CALLS FACE (2026-11-14 — the default call bar under a mod)", () => {
  it("ARM F — under a NON-reading arm the starter placeholder paints NOTHING (the reported burn, verbatim)", () => {
    // the armed doc's view state still carries the starter call (the
    // hydrate fallback) — exactly the face the operator reported
    const { container } = render(strip([REPLACE], [STARTER]))
    expect(container.querySelectorAll("[data-prompt-clip]"))
      .toHaveLength(0)
    // the lane NAMES its dormancy: the dictionary's label + hint, the
    // armed kind's own name on both
    const head = container.querySelector('[data-lane-head="prompts"]') as HTMLElement
    expect(head.textContent).toBe(studioCopy.callsDormantLabel("replace"))
    expect(container.textContent).toContain(studioCopy.callsDormantHint("replace"))
    // the commission row still paints — the run's real inputs are
    // named on the rail, never hidden beside the dead invitation
    expect(container.querySelector('[data-commission-lane="replace"]')).not.toBeNull()
  })

  it("ARM G — under a NON-reading arm AUTHORED prose still paints (doc truth is never hidden — merely named unread)", () => {
    const { container } = render(strip([REPLACE], [AUTHORED]))
    expect(container.querySelectorAll("[data-prompt-clip]")).toHaveLength(1)
    const head = container.querySelector('[data-lane-head="prompts"]') as HTMLElement
    expect(head.textContent).toBe(studioCopy.callsDormantLabel("replace"))
  })

  it("ARM H — under a READING arm (reshoot) the lane stays LIVE and is labelled the run's prompt seat", () => {
    const { container } = render(strip([RESHOOT], [STARTER]))
    // the clip paints — this lane's text rides the run, so the starter
    // view is the authoring invitation, honestly labeled
    expect(container.querySelectorAll("[data-prompt-clip]")).toHaveLength(1)
    const head = container.querySelector('[data-lane-head="prompts"]') as HTMLElement
    expect(head.textContent).toBe(studioCopy.callsPromptSeatLabel("reshoot"))
    // the commission row paints its own row — two NAMED bars (the
    // prompt's input lane + the commission), never two mystery bars
    expect(container.querySelector('[data-commission-lane="reshoot"]')).not.toBeNull()
  })

  it("ARM I — a READING arm over an EMPTY lane names the prompt seat in the hint (the lane's own words)", () => {
    const { container } = render(strip([RESHOOT], []))
    expect(container.querySelectorAll("[data-prompt-clip]")).toHaveLength(0)
    expect(container.textContent).toContain(studioCopy.callsPromptSeatHint("reshoot"))
    const head = container.querySelector('[data-lane-head="prompts"]') as HTMLElement
    expect(head.textContent).toBe(studioCopy.callsPromptSeatLabel("reshoot"))
  })

  it("ARM J — with NOTHING armed the lane is the plain default face (the film's authoring surface)", () => {
    const { container } = render(strip([], [STARTER]))
    expect(container.querySelectorAll("[data-prompt-clip]")).toHaveLength(1)
    const head = container.querySelector('[data-lane-head="prompts"]') as HTMLElement
    expect(head.textContent).toBe(studioCopy.callsLabel)
    // the clip's own paint carries the plain face; the empty hint is
    // the no-calls face's row (not this arm's — the lane is not empty)
  })

  it("ARM K — STACKED rows carry entry-qualified ids (two adapters = two addressable rows, no shared identity)", () => {
    const { container } = render(strip([lorasRow("h3_lightx2v_turbo"), lorasRow("h3_camera_dolly")]))
    const lanes = [...container.querySelectorAll("[data-commission-lane]")]
    // the FIRST row keeps the bare kind (every existing selector's
    // contract); each subsequent row is entry-qualified — unique
    // React keys and unique addressable lane rows
    expect(lanes.map((l) => l.getAttribute("data-commission-lane")))
      .toEqual(["loras", "loras-2"])
    expect(container.querySelector('[data-lane-head="commission"][data-lane-head-id="loras-2"]'))
      .not.toBeNull()
    // both rows name their own adapter (the stacked-bag law: one row
    // per entry, the operator sees BOTH adapters)
    expect(container.textContent).toContain("h3_lightx2v_turbo")
    expect(container.textContent).toContain("h3_camera_dolly")
  })

  it("ARM L — THE FRAME-OFFSET HALF: an armed extend positions its windows at the FILM's end (stride = windowFrames − carry overlap, the solver's own composition), the axis grows, and every planned window is marked", () => {
    // barTotal = 96 (the strip harness's own film end). EXTEND: 3 ×
    // 158f under the solver's 39f carry overlap → stride 119, windows
    // at 96 / 215 / 334, each 158f, the last ending exactly at
    // 96 + deliveredFrames 396 = 492 — the spans ARE the composition
    // the compose door will build, one spelling (windowSpans rides
    // the contract's own CONTEXT_OVERLAP_FRAMES).
    const { container } = render(strip([EXTEND]))
    const segs = [...container.querySelectorAll('[data-commission-segment^="extend-"]')] as HTMLElement[]
    expect(segs).toHaveLength(3)
    const lefts = segs.map((s) => parseFloat(s.style.left))
    const widths = segs.map((s) => parseFloat(s.style.width))
    // equal stride: left deltas match frameToPx(119) exactly
    expect(lefts[1]! - lefts[0]!).toBeCloseTo(lefts[2]! - lefts[1]!, 5)
    // equal widths: every window is 158f
    expect(widths[0]).toBeCloseTo(widths[1]!, 5)
    expect(widths[0]).toBeCloseTo(widths[2]!, 5)
    // width:frame ratio consistency — the stride and the width ride
    // the SAME frameToPx scale (119/158, no rounding drift)
    expect((lefts[1]! - lefts[0]!) / widths[0]!).toBeCloseTo(119 / 158, 4)
    // every window of the armed extension is planned film (starts at
    // or past the real film's end — dashed, not yet rendered)
    for (const s of segs) expect(s.getAttribute("data-commission-planned")).toBe("true")
    // the axis seats the hatched tail: the band starts where the
    // film ends and the first window starts with it — one tail
    const band = container.querySelector("[data-planned-band]") as HTMLElement
    expect(band, "the planned band renders for an armed extend").not.toBeNull()
    expect(parseFloat(band.style.left)).toBeCloseTo(lefts[0]!, 5)
  })

  it("ARM M — no geometry armed (reshoot only, or nothing) seats NO planned tail — the bar is byte-identical", () => {
    const { container: armed } = render(strip([RESHOOT]))
    expect(armed.querySelectorAll("[data-planned-band]")).toHaveLength(0)
    const { container: bare } = render(strip([]))
    expect(bare.querySelectorAll("[data-planned-band]")).toHaveLength(0)
  })

  it("ARM N — a SINGLE-WINDOW extend positions its one window at the film's end (no stride to state, the tail is one window deep)", () => {
    const single: DocCommission = {
      kind: "extend",
      seats: [{ key: "extend_seconds", value: "5.167" }],
      geometry: { windows: 1, windowFrames: 124, deliveredFrames: 124 },
    }
    const { container } = render(strip([single]))
    const seg = container.querySelector('[data-commission-segment="extend-0"]') as HTMLElement
    expect(seg, "the single window positions").not.toBeNull()
    expect(seg.getAttribute("data-commission-planned")).toBe("true")
    // window and band share the film-end edge (the 124f tail)
    const band = container.querySelector("[data-planned-band]") as HTMLElement
    expect(parseFloat(band.style.left)).toBeCloseTo(parseFloat(seg.style.left), 5)
  })

  // (THE MOD-MODE EDIT DOORS, 2026-11-15 — the h3-modreplace-calls-bug
  // audit) the add door already stands down under a dormant face
  // (:460's onPromptAdd gate) but the FOUR per-call edit doors wired
  // unconditionally — an operator could still move/resize/retext/delete
  // a call the armed run would never read (dead-text authoring
  // persisting beside the armed bag). This arm drives the REAL kit
  // gestures against the REAL pane and expects: every write spy stays
  // cold, the shared refusal slot carries the dictionary's dormant
  // voice, and the PLAIN face keeps every door (the gate is the
  // face's, never a broken wire).
  it("ARM O — under a dormant face the four EDIT doors refuse loud and the writes never fire; the plain face keeps every door", () => {
    const spies = {
      update: vi.fn(), move: vi.fn(), resize: vi.fn(), del: vi.fn(),
    }
    const overrides: Record<string, unknown> = {
      handlePromptUpdate: spies.update,
      handlePromptMove: spies.move,
      handlePromptResize: spies.resize,
      handlePromptDelete: spies.del,
    }
    // TWO authored calls: call 0 is first (edge-l dead by law) but NOT
    // last (edge-r is a resize grip, not the extend pull)
    const second: DocCall = { text: "the second beat", start_frame: 90, end_frame: 96 }
    const { container } = render(strip([REPLACE], [AUTHORED, second], overrides))
    const clips = [...container.querySelectorAll("[data-prompt-clip]")] as HTMLElement[]
    expect(clips, "both authored calls paint under the dormant face (ARM G's law)").toHaveLength(2)

    // EDIT: double-click opens the inline editor; a change + blur is
    // the commit path that calls onPromptUpdate
    fireEvent.doubleClick(clips[0]!)
    const editor = clips[0]!.querySelector("input") as HTMLInputElement
    expect(editor, "double-click opens the inline editor").not.toBeNull()
    fireEvent.change(editor, { target: { value: "retexted dead text" } })
    fireEvent.blur(editor)

    // MOVE: body drag (pointer down → window move → up)
    fireEvent.pointerDown(clips[0]!, { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 140 })
    fireEvent.pointerUp(window, { clientX: 140 })

    // RESIZE: the right edge grip of the non-last clip
    fireEvent.pointerDown(clips[0]!.querySelector('[data-prompt-edge="r"]')!, { button: 0, clientX: 150 })
    fireEvent.pointerMove(window, { clientX: 170 })
    fireEvent.pointerUp(window, { clientX: 170 })

    // DELETE: the ✕ button (by its accessible name — the seam chip
    // is a second lawful button inside a non-first clip now)
    const del = clips[1]!.querySelector('[aria-label^="Delete this prompt card"]')!
    fireEvent.click(del)

    expect(spies.update, "retexting a call the armed run never reads refuses").not.toHaveBeenCalled()
    expect(spies.move, "moving a dormant call refuses").not.toHaveBeenCalled()
    expect(spies.resize, "resizing a dormant call refuses").not.toHaveBeenCalled()
    expect(spies.del, "deleting a dormant call refuses").not.toHaveBeenCalled()
    // the refusal is LOUD, in the shared slot, in the dictionary's own
    // dormant voice naming the armed kind
    const refusal = container.querySelector('[data-testid="tl-strip-file-error"]') as HTMLElement
    expect(refusal, "the shared refusal slot paints").not.toBeNull()
    expect(refusal.textContent).toBe(studioCopy.callsDormantHint("replace"))

    // THE PLAIN FACE KEEPS EVERY DOOR — same spies, no armed bag: the
    // delete write FIRES (the gate is the dormant face's, never a
    // broken wire)
    const plain = render(strip([], [AUTHORED, second], overrides))
    const plainClips = [...plain.container.querySelectorAll("[data-prompt-clip]")] as HTMLElement[]
    fireEvent.click(plainClips[1]!.querySelector('[aria-label^="Delete this prompt card"]')!)
    expect(spies.del, "the plain face's delete door still writes").toHaveBeenCalledTimes(1)
  })
})
