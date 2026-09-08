/**
 * MotionTimelineBar — the pose-studio-style DOM bar that replaced the
 * vendored viser canvas Timeline in the motion card (2026-08-14).
 *
 * These lock in the interaction contract the user asked for by name:
 * "I could click and drag prompt in the motion studio, was useful."
 *   • prompt clips render as DOM (grabbable), with resize edges + edit
 *   • dragging a clip body calls onPromptMove with moved bounds
 *   • double-click → inline editor → commit on Enter → onPromptUpdate
 *   • hover ✕ → onPromptDelete
 *   • double-click a lane → onKeyframeAdd(trackId, frame)
 *   • dragging a keyframe diamond → onKeyframeMove
 *   • ruler pointerdown → onFrameChange (scrub)
 *
 * jsdom has no layout: getBoundingClientRect is mocked to a 720px-wide
 * content area so frame↔pixel math is deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import { MOTION_TIMELINE_TRACKS } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"

const W = 720
let rectSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: W, bottom: 100, width: W, height: 100,
    toJSON: () => ({}),
  } as DOMRect)
})
afterEach(() => rectSpy.mockRestore())

// 72 frames @ 30fps → frames 0..71 span 0..720px (≈10px/frame).
const T = 72
/** PACKED: p2 starts exactly one frame after p1 ends — no room between. */
const prompts: TimelinePrompt[] = [
  { uuid: "p1", text: "walk forward", start_frame: 0, end_frame: 35, color: null },
  { uuid: "p2", text: "wave", start_frame: 36, end_frame: 71, color: null },
]
/** GAP: same cards but p1 ends at 20 — p1 has runway before p2@36. The
 *  move/resize tests use this so the NEIGHBOR clamp is a limit, not the
 *  floor (a packed card simply cannot move — that's its own test). */
const gapPrompts: TimelinePrompt[] = [
  { uuid: "p1", text: "walk forward", start_frame: 0, end_frame: 20, color: null },
  { uuid: "p2", text: "wave", start_frame: 36, end_frame: 71, color: null },
]
const keyframes: TimelineKeyframe[] = [
  { uuid: "k1", track_id: "fullbody", frame: 10, value: null, opacity: 1, locked: false },
]

/** Re-render the mounted bar with prop overrides (the transient-drag
 *  regression tests mutate prompts MID-GESTURE, like a real rescale). */
let lastRerender: ((ui: React.ReactElement) => void) | null = null
/** Re-render the mounted bar, KEEPING the harness's spies (the bar's drag
 *  effect re-subscribes on prop-identity change — fresh mocks would steal
 *  the assertions). */
function rerenderWith(
  h: ReturnType<typeof setup>,
  over: Partial<Parameters<typeof MotionTimelineBar>[0]>,
) {
  if (!lastRerender) throw new Error("no bar mounted")
  lastRerender(
    <TooltipProvider>
      <MotionTimelineBar
        prompts={prompts}
        keyframes={keyframes}
        frameIdx={0}
        totalFrames={T}
        fps={30}
        {...h}
        {...over}
      />
    </TooltipProvider>,
  )
}

function setup(over: Partial<Parameters<typeof MotionTimelineBar>[0]> = {}) {
  const h = {
    onFrameChange: vi.fn(),
    onKeyframeAdd: vi.fn(() => "new-kf"),
    onKeyframeMove: vi.fn(),
    onKeyframeDelete: vi.fn(),
    onPromptUpdate: vi.fn(),
    onPromptMove: vi.fn(),
    onPromptResize: vi.fn(),
    onPromptDelete: vi.fn(),
    onExtend: vi.fn(),
  }
  const r = render(
    <TooltipProvider>
      <MotionTimelineBar
        prompts={prompts}
        keyframes={keyframes}
        frameIdx={0}
        totalFrames={T}
        fps={30}
        {...h}
        {...over}
      />
    </TooltipProvider>,
  )
  lastRerender = r.rerender
  return h
}

const clip = () => document.querySelector('[data-prompt-clip="p1"]') as HTMLElement

describe("MotionTimelineBar — styling seam (2026-09-07, the shadcn rule)", () => {
  it("bare mount renders the verbatim navy default (no class/style drift)", () => {
    setup()
    const bar = screen.getByTestId("motion-timeline-bar")
    expect(bar.className).toBe("flex select-none")
    expect(bar.style.background).toBe("#111927")
    const ph = document.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement
    expect(ph.style.background).toBe("#00E9EC")
  })

  it("className merges onto the root (tenant shell chrome rides it)", () => {
    setup({ className: "rounded-lg border border-sidebar-border/40" })
    const bar = screen.getByTestId("motion-timeline-bar")
    expect(bar.className).toContain("rounded-lg")
    expect(bar.className).toContain("border-sidebar-border/40")
    // the base survives the merge
    expect(bar.className).toContain("select-none")
  })

  it("theme.{playhead,barBg} override the accents — defaults elsewhere", () => {
    setup({ theme: { playhead: "#ff00aa", barBg: "#0a0a0a" } })
    const bar = screen.getByTestId("motion-timeline-bar")
    expect(bar.style.background).toBe("#0a0a0a")
    const ph = document.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement
    expect(ph.style.background).toBe("#ff00aa")
    expect(ph.style.boxShadow).toContain("#ff00aa")
  })

  it("style rides the root AFTER the theme wash (a tenant tint wins)", () => {
    setup({ style: { background: "#123456" } })
    const bar = screen.getByTestId("motion-timeline-bar")
    expect(bar.style.background).toBe("#123456")
  })
})


describe("MotionTimelineBar — rendering", () => {
  it("renders the 6 constraint lanes + prompt clips as DOM", () => {
    setup()
    for (const t of MOTION_TIMELINE_TRACKS) {
      expect(document.querySelector(`[data-lane="${t.uuid}"]`)).toBeTruthy()
    }
    expect(clip()).toBeTruthy()
    expect(screen.getAllByText("walk forward").length).toBeGreaterThan(0)
    expect(screen.getAllByText("wave").length).toBeGreaterThan(0)
  })

  it("renders keyframe diamonds on their lane", () => {
    setup()
    expect(document.querySelector('[data-kf="k1"]')).toBeTruthy()
  })
})

describe("MotionTimelineBar — prompt clips (the pose-studio affordance)", () => {
  it("dragging the clip body calls onPromptMove with moved bounds", () => {
    const h = setup({ prompts: gapPrompts })
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    // +50px = +5 frames: [0,20] → [5,25] (p1 has runway to p2@36)
    fireEvent.pointerMove(window, { clientX: 150 })
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenCalledWith("p1", 5, 25)
  })

  it("dragging the right edge calls onPromptResize", () => {
    const h = setup({ prompts: gapPrompts })
    // BOTH grips always render (the first card's left grip is DISABLED —
    // F7 — not removed); select by the stable edge attribute, not the
    // cursor class the disabled state drops.
    const edges = clip().querySelectorAll("[data-prompt-edge]")
    expect(edges.length).toBe(2)
    fireEvent.pointerDown(clip().querySelector('[data-prompt-edge="r"]') as HTMLElement, { button: 0, clientX: 350 })
    fireEvent.pointerMove(window, { clientX: 380 }) // +30px = +3 frames
    fireEvent.pointerUp(window)
    expect(h.onPromptResize).toHaveBeenCalledWith("p1", 0, 23)
  })

  it("the FIRST card's left grip is DISABLED (F7: nothing exists before frame 0)", () => {
    // 2026-09-01: dragging call #0's left edge moved nothing (the tenants
    // ignore start changes at index 0) — a lying cursor over a dead grip.
    // The grip now renders disabled: no resize cursor, dimmed, inert.
    const h = setup({ prompts: gapPrompts })
    const l = clip().querySelector('[data-prompt-edge="l"]') as HTMLElement
    expect(l.className).toContain("opacity-35") // visually disabled
    expect(l.className).not.toContain("cursor-ew-resize")
    fireEvent.pointerDown(l, { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 160 })
    fireEvent.pointerUp(window)
    expect(h.onPromptResize).not.toHaveBeenCalled() // inert by construction
    // …and a NON-first card's left grip stays live (p2 has a predecessor).
    const p2l = document.querySelector('[data-prompt-clip="p2"] [data-prompt-edge="l"]') as HTMLElement
    expect(p2l.className).toContain("cursor-ew-resize")
  })

  // ── Transient-drag regressions (2026-08-15: "sometimes the first
  // endpoint gets stuck, stretching out the card") ─────────────────────
  it("a swallowed release can't ghost-drag: button-less mouse move ends the session", () => {
    const h = setup()
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    // The browser reports a mouse move with NO buttons held — the pointerup
    // was swallowed (native pan stole the gesture, focus theft). The drag
    // must END; before the self-heal it kept resizing with no press at all.
    fireEvent.pointerMove(window, { clientX: 300, pointerType: "mouse", buttons: 0 })
    expect(h.onPromptMove).not.toHaveBeenCalled()
    // …and a later move is inert — the session is over, not paused.
    fireEvent.pointerMove(window, { clientX: 400 })
    expect(h.onPromptMove).not.toHaveBeenCalled()
  })

  it("pointercancel ends the drag (the browser taking the gesture for a pan)", () => {
    const h = setup()
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    fireEvent(window, new Event("pointercancel"))
    fireEvent.pointerMove(window, { clientX: 150 })
    expect(h.onPromptMove).not.toHaveBeenCalled()
  })

  it("an edge drag commits the card's LIVE far edge — no stale-snapshot stretch", () => {
    const h = setup()
    // Grab p2's LEFT edge (p1's is disabled — F7; p2 has a predecessor).
    // Snapshot: start 36, end 71…
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    const grip = p2.querySelector('[data-prompt-edge="l"]') as HTMLElement
    fireEvent.pointerDown(grip, { button: 0, clientX: 400 })
    // …and mid-gesture something else resizes the card (envelope rescale
    // after a run): the live end is now 60. Committing the snapshot 71
    // here WAS the stretch bug — first endpoint tracking the cursor, far
    // edge teleported back to a stale frame.
    rerenderWith(h, { prompts: [
      prompts[0],
      { uuid: "p2", text: "wave", start_frame: 36, end_frame: 60, color: null },
    ] })
    fireEvent.pointerMove(window, { clientX: 430 })
    fireEvent.pointerUp(window)
    const calls = h.onPromptResize.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1]![2]).toBe(60) // LIVE end, not 71
  })

  it("double-click → inline edit → Enter commits via onPromptUpdate", () => {
    const h = setup()
    fireEvent.doubleClick(clip())
    const input = clip().querySelector("input") as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: "run" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(h.onPromptUpdate).toHaveBeenCalledWith("p1", "run")
  })

  it("hover ✕ deletes the clip", () => {
    const h = setup()
    const del = clip().querySelector('button[aria-label="Delete this prompt card"]') as HTMLElement
    fireEvent.click(del)
    expect(h.onPromptDelete).toHaveBeenCalledWith("p1")
  })

  it("the ✕ sits TOP-RIGHT and the right grip starts below it (2026-09-02: 'move the X to the top right')", () => {
    setup()
    const del = clip().querySelector('button[aria-label="Delete this prompt card"]') as HTMLElement
    expect(del.className).toContain("right-1 top-1")
    expect(del.className).not.toContain("left-1/2")
    // F4a's delete-vs-extend collision, split by geometry: the X owns the
    // corner, the resize grip starts at top-4 — never top-0 again.
    const grip = clip().querySelector('[data-prompt-edge="r"]') as HTMLElement
    expect(grip.className).toContain("top-4")
    expect(grip.className).not.toContain("top-0")
  })
})

describe("MotionTimelineBar — add-clip gesture (2026-08-16)", () => {
  it("double-click the ruler → onPromptAdd at that frame; a CLIP double-click never adds (inline edit owns it)", () => {
    const add = vi.fn()
    setup({ onPromptAdd: add })
    // 300px at fit (720/71 ≈ 10.14 px/frame) → frame 30.
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 300 })
    expect(add).toHaveBeenCalledWith(30)
    // PAST the end stays UNclamped — the append contract (a double-click
    // at 1000px → frame 99, not a silent clamp to T1 71).
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 1000 })
    expect(add).toHaveBeenCalledWith(99)
    // The prompts row's NON-clip area is the second surface (gaps, the
    // past-the-end margin) — 450px → frame 44.
    fireEvent.doubleClick(clip().parentElement as HTMLElement, { clientX: 450 })
    expect(add).toHaveBeenCalledWith(44)
    // A clip's own double-click is inline EDIT (stopPropagation) — the
    // count must not grow past the three row-level adds.
    fireEvent.doubleClick(clip())
    expect(add).toHaveBeenCalledTimes(3)
  })

  it("absent onPromptAdd → double-clicks stay inert (the motion card unchanged)", () => {
    const h = setup()
    // The gesture sequence a real double-click produces: pointerdown
    // (scrub) then dblclick — with no onPromptAdd the scrub still works
    // and the dblclick is a no-op (no crash, no phantom add).
    fireEvent.pointerDown(screen.getByTestId("motion-timeline-ruler"), { button: 0, clientX: 300 })
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 300 })
    expect(h.onFrameChange).toHaveBeenCalledWith(30)
  })
})

describe("MotionTimelineBar — keyframe lanes + scrub", () => {
  it("double-click a lane adds a keyframe at that frame", () => {
    const h = setup()
    const lane = document.querySelector('[data-lane="root2d"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 300 }) // 300px = frame 30
    expect(h.onKeyframeAdd).toHaveBeenCalledWith("root2d", 30)
  })

  it("dragging a diamond moves the keyframe", () => {
    const h = setup()
    const kf = document.querySelector('[data-kf="k1"]') as HTMLElement
    fireEvent.pointerDown(kf, { button: 0, clientX: 100 }) // frame 10
    fireEvent.pointerMove(window, { clientX: 160 }) // +6 frames
    fireEvent.pointerUp(window)
    expect(h.onKeyframeMove).toHaveBeenCalledWith("k1", 16)
  })

  it("pointerdown on the ruler scrubs", () => {
    const h = setup()
    // 450/720 × 71 = 44.375 → frame 44 (frames 0..71 span the full width).
    fireEvent.pointerDown(screen.getByTestId("motion-timeline-ruler"), { button: 0, clientX: 450 })
    expect(h.onFrameChange).toHaveBeenCalledWith(44)
  })
})

describe("MotionTimelineBar — zoom + horizontal scroll (2026-08-14)", () => {
  const contentW = () =>
    parseFloat(screen.getByTestId("motion-timeline-content").style.width)
  const scrollEl = () =>
    screen.getByTestId("motion-timeline-scroll") as HTMLElement

  // The fit button renders only the % text (Tip-wrapped, text-bearing →
  // no aria-label). Resolve it from its rendered label.
  const fitBtn = () => {
    const el = screen.getByText(/^[0-9]+%$/)
    return el.closest("button") as HTMLElement
  }

  it("defaults to fit: the frames span the viewport + lead-out (2026-08-30 law)", () => {
    setup()
    // LEAD_OUT (≥35% of the viewport, ≥240px → 252 at W=720): the content
    // is frames + trailing room; the FRAMES still span exactly the width
    // (fit), the lead-out is scrollable empty past the end.
    expect(contentW()).toBeCloseTo(W + 252, 3) // 71*fit + LEAD_OUT
    expect(fitBtn().textContent).toBe("100%")
  })

  it("zoom in grows the content past the viewport and shows the zoom %", () => {
    setup()
    fireEvent.click(screen.getByLabelText("Zoom in"))
    expect(contentW()).toBeGreaterThan(W) // 71 * (720/71)*1.6 ≈ 1152
    expect(contentW()).toBeCloseTo(W * 1.6 + 252, 1)
    expect(fitBtn().textContent).toBe("160%")
  })

  it("the % button returns to fit", () => {
    setup()
    fireEvent.click(screen.getByLabelText("Zoom in"))
    fireEvent.click(fitBtn())
    expect(contentW()).toBeCloseTo(W + 252, 3)
    expect(fitBtn().textContent).toBe("100%")
  })

  it("initialSeconds pins the mount zoom to N seconds across the viewport (2026-09-02: 'default zoom shows 10 seconds')", () => {
    // Harness: W=720, 72f @ 30fps. The 10-second pin = 720/(10·30) = 2.4
    // px/frame — LESS than fit (720/71 ≈ 10.14), so a short doc stops
    // inflating to fill the width. This doc (2.4s) spans 71·2.4 ≈ 170px
    // of frames; contentW FLOORS at the viewport (720) — the doc renders
    // at its 10-second share, no inflation.
    setup({ initialSeconds: 10 })
    expect(71 * (720 / (10 * 30))).toBeLessThan(720)
    expect(contentW()).toBeCloseTo(720, 3)
    // The % readout bases at the MOUNT pin (not fit): 100% = 10s across.
    expect(fitBtn().textContent).toBe("100%")
  })

  it("initialSeconds is absolute: a LONG doc also opens at N seconds, not fit", () => {
    // 600f @ 30fps (20s): fit would pin 720/599 ≈ 1.2; the 10-second pin
    // (2.4) is LARGER — the doc opens readable with 10s visible, scroll
    // for the rest, instead of postage-stamp clips.
    setup({ initialSeconds: 10, totalFrames: 600 })
    const ppf = 720 / (10 * 30)
    expect(contentW()).toBeCloseTo(599 * ppf + 252, 0)
  })

  it("click math compensates for scrollLeft: the frame under the CURSOR, not the viewport edge", () => {
    // The point of horizontal scroll: the lanes scroll, the click position
    // must be resolved in CONTENT coordinates (clientX - rect.left +
    // scrollLeft). Zoom once (fit has nothing to scroll), pan to 360px,
    // double-click at clientX 300 → content x 660 → frame 41 at ppf 16.225.
    const h = setup()
    fireEvent.click(screen.getByLabelText("Zoom in"))
    scrollEl().scrollLeft = 360
    const lane = document.querySelector('[data-lane="root2d"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 300 })
    const ppf = (W / 71) * 1.6
    expect(h.onKeyframeAdd).toHaveBeenCalledWith("root2d", Math.round(660 / ppf))
  })

  it("drag math compensates for zoom: pixel deltas shrink to fewer frames when zoomed", () => {
    const h = setup({ prompts: gapPrompts })
    fireEvent.click(screen.getByLabelText("Zoom in"))
    const ppf = (W / 71) * 1.6
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    // +50px is +5 frames at fit, but +round(50/ppf) frames zoomed.
    fireEvent.pointerMove(window, { clientX: 150 })
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenCalledWith("p1", Math.round(50 / ppf), 20 + Math.round(50 / ppf))
  })

  it("pull-the-tail: dragging the LAST card's right edge past the end EXTENDS instead of clamping", () => {
    // THE "STUCK AT 5 SECONDS" BUG (2026-08-14): the envelope (duration_sec,
    // default 5s) was a wall — the scrollbar dead-ended there and no authoring
    // gesture could make the motion longer. DaVinci Resolve's rule: the
    // sequence is as long as its content. p2 (the tail) ends at 71; drag its
    // right edge +40px = +4 frames → onExtend(76) + resize to 75, no clamp.
    const h = setup()
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    const edges = p2.querySelectorAll(".cursor-ew-resize")
    fireEvent.pointerDown(edges[1] as HTMLElement, { button: 0, clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 740 }) // +40px = +4 frames
    fireEvent.pointerUp(window)
    expect(h.onExtend).toHaveBeenCalledWith(76)
    expect(h.onPromptResize).toHaveBeenCalledWith("p2", 36, 75)
  })

  it("non-last cards still clamp — at the NEXT CARD, never past it (only the tail extends)", () => {
    // NO-OVERLAP (2026-08-15): p1's right edge can grow up to p2's start
    // minus one (35), no further. Before the fix it stretched to T1 71 —
    // straight over p2, the "cards get tangled" report.
    const h = setup()
    const rEdge = clip().querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(rEdge, { button: 0, clientX: 350 })
    fireEvent.pointerMove(window, { clientX: 850 }) // +50 frames → way past p2
    fireEvent.pointerUp(window)
    expect(h.onExtend).not.toHaveBeenCalled()
    expect(h.onPromptResize).toHaveBeenCalledWith("p1", 0, 35)
  })

  it("dragging the CARD BODY MOVES it — never resizes; past the wall the tail card translates + the envelope grows", () => {
    // TWO 2026-08-15 reports, one contract: (1) "dragging right would
    // STRETCH FROM THE FIRST SECOND instead of move the prompt card" —
    // the old flush-tail branch grew the END with the START pinned at 0.
    // (2) The first fix's clamp parked the full-span seed dead ("I can no
    // longer click and drag the prompt cards"). A body drag TRANSLATES the
    // card (duration constant) — and the seeded single card, being the
    // LAST card, moves past the wall with the timeline growing to fit:
    // [0,71] +6f → [6,77], total 78. Both edges moved; nothing resized.
    const seed: TimelinePrompt[] = [{ uuid: "seed", text: "walk", start_frame: 0, end_frame: 71, color: null }]
    const h = setup({ prompts: seed })
    const seedEl = document.querySelector('[data-prompt-clip="seed"]') as HTMLElement
    fireEvent.pointerDown(seedEl, { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 160 }) // +60px = +6 frames
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenCalledWith("seed", 6, 77)
    expect(h.onPromptResize).not.toHaveBeenCalled() // never a resize
    expect(h.onExtend).toHaveBeenCalledWith(78) // envelope fits the moved card
  })

  it("a NON-LAST card's body drag clamps at the NEXT CARD — only the tail moves into new territory", () => {
    const h = setup({ prompts: gapPrompts })
    // p1 [0,20] (dur = 20): a huge rightward drag would park its end at
    // T1 71, straight over p2. The neighbor clamp stops it one frame
    // short of p2@36 instead: max start = 36-1-20 = 15.
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 700 })
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenCalledWith("p1", 15, 35)
    expect(h.onExtend).not.toHaveBeenCalled()
    expect(h.onPromptResize).not.toHaveBeenCalled()
  })

  it("zoom out always lands back at fit — no phantom floor (the 'stuck at 465%' report)", () => {
    // THE FLOOR BUG (2026-08-14): zoom was stored as ABSOLUTE px-per-frame
    // but floored at a fitPpf computed against the CURRENT envelope — which
    // pull-the-tail grows mid-drag. The readout drifted past every dial step
    // (465%) and the out button floored on a fit it could never reach. As a
    // multiplier, out walks 256 → 160 → 100 and STOPS at true fit.
    setup()
    fireEvent.click(screen.getByLabelText("Zoom in"))
    fireEvent.click(screen.getByLabelText("Zoom in"))
    expect(fitBtn().textContent).toBe("256%")
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByLabelText("Zoom out"))
    expect(fitBtn().textContent).toBe("100%")
    expect(contentW()).toBeCloseTo(W + 252, 3) // frames at fit + lead-out
  })

  it("the % is the dialed multiplier — an envelope change (pull-the-tail) does not drift it", () => {
    // 2026-08-16 REWRITE — ABSOLUTE ZOOM (user: "the zoom is NOT absolute.
    // It is always the size of the largest card in the timeline"). The old
    // pin was the fit-multiplier world: the envelope doubling re-fit the
    // content so it still spanned 1.6× the viewport. The absolute world
    // INVERTS the invariant: the ppf (and every card's pixel geometry)
    // stays EXACTLY where it was — the doubled envelope scrolls, never
    // rescales — and the dial reads 160% against the PINNED base (a live-
    // fit denominator would drift to 322% with nobody touching anything).
    const h = {
      onFrameChange: vi.fn(), onKeyframeAdd: vi.fn(() => "k"), onKeyframeMove: vi.fn(),
      onKeyframeDelete: vi.fn(), onPromptUpdate: vi.fn(), onPromptMove: vi.fn(),
      onPromptResize: vi.fn(), onPromptDelete: vi.fn(), onExtend: vi.fn(),
    }
    const props = { prompts, keyframes, frameIdx: 0, fps: 30, ...h }
    const view = render(
      <TooltipProvider>
        <MotionTimelineBar {...props} totalFrames={T} />
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByLabelText("Zoom in"))
    expect(fitBtn().textContent).toBe("160%")
    const w0 = contentW()
    const l0 = (document.querySelector('[data-prompt-clip]') as HTMLElement).style.left
    view.rerender(
      <TooltipProvider>
        <MotionTimelineBar {...props} totalFrames={T * 2} />
      </TooltipProvider>,
    )
    expect(fitBtn().textContent).toBe("160%") // the dial, vs the pinned base
    // The geometry is ABSOLUTE: same ppf → the doubled envelope grows the
    // content by EXACTLY the added span (it scrolls — the strip never
    // rescales the cards). T→2T adds T frame intervals at the pinned ppf.
    expect(contentW()).toBeCloseTo(w0 + T * ((W / (T - 1)) * 1.6), 0)
    // …and the first card sits at the IDENTICAL pixel it was at.
    expect((document.querySelector('[data-prompt-clip]') as HTMLElement).style.left).toBe(l0)
    view.unmount()
  })

  it("keepTailVisible: while ZOOMED, a tail drag pans the viewport so the card's end stays on screen", () => {
    // THE "RIGHT SIDE GETS CUT OFF" BUG (2026-08-14): extending while zoomed
    // in grew the content past the right edge but the viewport never followed
    // — the end being dragged clipped out of sight. keepTailVisible pans
    // scrollLeft so the card's right edge sits ~24px inside the viewport.
    // jsdom has no layout: give the scroll container a LIVE scrollWidth
    // (read off the content div's inline width, exactly what a browser
    // computes) so the panning is observable.
    const h = setup()
    const scroll = scrollEl()
    const content = screen.getByTestId("motion-timeline-content") as HTMLElement
    Object.defineProperty(scroll, "scrollWidth", {
      configurable: true,
      get: () => parseFloat(content.style.width) || 0,
    })
    // Zoom in once: content = frames*1.6 + lead-out ≈ 1404 (max scroll 684).
    fireEvent.click(screen.getByLabelText("Zoom in"))
    expect(scroll.scrollLeft).toBe(0)
    // Drag p2's right edge +200px → ne = round(71 + 200/ppf) well past the
    // end → extend + pan. scrollLeft = min(max, rightPx - W + 24) — here
    // unclamped (the dragged edge is inside the lead-out), so the pan
    // puts the edge ~24px inside the viewport.
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    const edge = p2.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { button: 0, clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 900 })
    fireEvent.pointerUp(window)
    expect(h.onExtend).toHaveBeenCalled()
    const ppf = (W / 71) * 1.6
    const ne = Math.round(71 + 200 / ppf)
    expect(scroll.scrollLeft).toBeCloseTo(ne * ppf - W + 24, 3)
  })

  it("keepTailVisible: a ZOOMED EDGE-drag extend pans too (the single-card seed)", () => {
    // Same contract as the p2 test above, on the SEEDED single card (spans
    // [0, T-1] like the real app's seed). The extend gesture is the
    // RIGHT-EDGE pull grip — the body drag is move-only (2026-08-15).
    const seed: TimelinePrompt[] = [{ uuid: "seed", text: "walk", start_frame: 0, end_frame: 71, color: null }]
    const h = setup({ prompts: seed })
    const scroll = scrollEl()
    const content = screen.getByTestId("motion-timeline-content") as HTMLElement
    Object.defineProperty(scroll, "scrollWidth", {
      configurable: true,
      get: () => parseFloat(content.style.width) || 0,
    })
    fireEvent.click(screen.getByLabelText("Zoom in"))
    const seedEl = document.querySelector('[data-prompt-clip="seed"]') as HTMLElement
    const edge = seedEl.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { button: 0, clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 900 }) // +200px past the end → extend
    fireEvent.pointerUp(window)
    expect(h.onExtend).toHaveBeenCalled()
    const ppf = (W / 71) * 1.6
    const ne = Math.round(71 + 200 / ppf)
    expect(scroll.scrollLeft).toBeCloseTo(ne * ppf - W + 24, 3) // max 684, unclamped
  })

  it("at FIT a small extend pans into the LEAD-OUT (the fit content is scrollable now)", () => {
    // 2026-08-30 lead-out law: fit content = frames + ≥35% viewport of
    // trailing room, so "nothing to scroll" no longer holds at fit — a
    // small tail extend pans INTO the lead-out room (bounded by its max).
    const h = setup()
    const scroll = scrollEl()
    const content = screen.getByTestId("motion-timeline-content") as HTMLElement
    Object.defineProperty(scroll, "scrollWidth", {
      configurable: true,
      get: () => parseFloat(content.style.width) || 0,
    })
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    const edge = p2.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { button: 0, clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 740 })
    fireEvent.pointerUp(window)
    expect(h.onExtend).toHaveBeenCalledWith(76)
    const ppf = W / 71
    const ne = Math.round(71 + 40 / ppf)
    expect(scroll.scrollLeft).toBeCloseTo(ne * ppf - W + 24, 3) // ≈64.6, within max 252
  })

  it("body drag of a NON-flush tail moves within its runway, then moves INTO new territory at the wall", () => {
    // The last card ends at 49 < T1 71 — there's runway, so a rightward drag
    // MOVES until it hits the wall. AT the wall the tail card keeps going:
    // it MOVES into new frames and the envelope grows to fit it (the
    // 2026-08-15 "can no longer click and drag" rework — the full-span seed
    // was parked dead by a hard clamp; the fix is move-past-the-wall, with
    // the DURATION constant so it's a move, never a stretch).
    const tail: TimelinePrompt[] = [{ uuid: "b", text: "wave", start_frame: 0, end_frame: 49, color: null }]
    const h = setup({ prompts: tail })
    const tailEl = document.querySelector('[data-prompt-clip="b"]') as HTMLElement
    // Small drag: dur 49, max start 22 → ns 3 moves fine, no growth.
    fireEvent.pointerDown(tailEl, { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 130 }) // +30px ÷ (720/71) ≈ +2.96 → 3
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenCalledWith("b", 3, 52)
    expect(h.onExtend).not.toHaveBeenCalled()
    // Big drag: +400px ÷ (720/71) ≈ +39.44 → 39 frames. ns 39 > 22 → the
    // tail MOVES past the wall into new frames: [39,88], envelope 89. A
    // move (both edges +39, duration still 49), not a resize.
    fireEvent.pointerDown(tailEl, { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 500 }) // +39 frames
    fireEvent.pointerUp(window)
    expect(h.onExtend).toHaveBeenCalledWith(89)
    expect(h.onPromptMove).toHaveBeenLastCalledWith("b", 39, 88)
    expect(h.onPromptResize).not.toHaveBeenCalled()
  })
})

describe("MotionTimelineBar — NO-OVERLAP (2026-08-15, 'the cards get tangled')", () => {
  // Cards are a SEQUENCE, not a pile. Every gesture stops one frame short
  // of the dragged card's positional neighbor — a move slides within its
  // slot, an edge can't cross the neighbor. The bar clamps GESTURES; the
  // parent's untanglePrompts effect heals every OTHER writer. These pin
  // the gesture half on the PACKED fixture (where the clamps bind hardest:
  // there is literally no room, and that IS the rule).

  it("a packed card's body drag has nowhere to go — it stays put", () => {
    // p1 [0,35] with p2 starting at 36: dragging right would move it over
    // p2. The clamp parks it — a packed timeline is not a tangle waiting
    // to happen.
    const h = setup()
    fireEvent.pointerDown(clip(), { button: 0, clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 150 }) // +5 frames of intent
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenLastCalledWith("p1", 0, 35)
  })

  it("a card's LEFT edge cannot be dragged under its predecessor", () => {
    // p2 [36,71]: dragging the left edge hard left would slide it under
    // p1 (end 35). It stops at prevEnd + 1 = 36 — its own start.
    const h = setup()
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    const edges = p2.querySelectorAll(".cursor-ew-resize")
    fireEvent.pointerDown(edges[0] as HTMLElement, { button: 0, clientX: 400 })
    fireEvent.pointerMove(window, { clientX: 100 }) // hard left, -30 frames
    fireEvent.pointerUp(window)
    expect(h.onPromptResize).toHaveBeenLastCalledWith("p2", 36, 71)
  })

  it("a card's BODY cannot be dragged under its predecessor", () => {
    const h = setup()
    const p2 = document.querySelector('[data-prompt-clip="p2"]') as HTMLElement
    fireEvent.pointerDown(p2, { button: 0, clientX: 400 })
    fireEvent.pointerMove(window, { clientX: 100 }) // hard left, -30 frames
    fireEvent.pointerUp(window)
    expect(h.onPromptMove).toHaveBeenLastCalledWith("p2", 36, 71)
  })

  // The TAIL's freedom is pinned by the pull-the-tail suite above: its right
  // edge (and only its) still extends past the wall — the neighbor clamps
  // never fence in the one card that owns new territory.
})
