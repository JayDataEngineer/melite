/**
 * The NO-BS integration test (2026-08-14): the REAL MotionCardEditor wired
 * to a REAL MotionTimelineBar, with a parent that merges onSave patches into
 * stage.params exactly like CardDetailModal → updateStageParams does (plain
 * spread merge, no clamping). Drives the actual DOM gesture the user made —
 * grabbing the seeded prompt CARD and dragging it right — and asserts the
 * timeline envelope actually GROWS past the 5-second default.
 *
 * Bar-level tests mock the callbacks; this one exists because the user
 * reported "there is a 5 second hard limit here" AFTER those passed — the
 * bug class it guards against is in the MCE↔bar wiring (override state,
 * seed/rescale effect, param write-back), which only the real component
 * exercises.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useState } from "react"

// Heavy/visual deps → inert mocks. loadSomaSkin RESOLVES a minimal fake so
// the rest pose exists (restNpz) — the Export button needs it, and the
// export-rect overlay + the export PANEL render in these tests. No motion
// is loaded (no npz), so targetT = duration_sec default 5s × 30fps = 150.
vi.mock("@melite-plugin/motion/ui/viewer3d", () => ({ PoseViewer3D: (): null => null }))
vi.mock("../rpc/editorClient", () => ({ editorClient: { stopRun: vi.fn(async () => ({})) } }))
vi.mock("@melite/formats/somaSkin", () => ({
  loadSomaSkin: vi.fn(async () => ({
    vertexCount: 4,
    bindVertices: new Float32Array(12),
    faces: new Uint32Array(3),
    restJoints: new Float32Array(77 * 3),
    restRots: new Float32Array(77 * 9),
  })),
  deformFrame: () => {},
}))

import { MotionCardEditor } from "@melite/motion-motion/ui/studio/component"
import { TooltipProvider } from "@melite/ui/tooltip"

const W = 720
let rectSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: W, bottom: 100, width: W, height: 100,
    toJSON: () => ({}),
  } as DOMRect)
})
afterEach(() => rectSpy.mockRestore())

/** Parent harness: merge-on-save, like updateStageParams ({...params, ...patch}). */
function Harness({ initial }: { initial: Record<string, unknown> }) {
  const [params, setParams] = useState(initial)
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null)
  return (
    <TooltipProvider>
    <>
      <MotionCardEditor
        stage={{ id: "s1", genre: "motion", params } as never}
        onSave={(p) => {
          setSaved(p)
          setParams((prev) => ({ ...prev, ...p }))
        }}
      />
      <div data-testid="saved-durations" data-json={JSON.stringify(saved)} />
      <div data-testid="stage-params" data-json={JSON.stringify(params)} />
    </>
    </TooltipProvider>
  )
// The app root always provides the tooltip context; parallel-session Tip
// migrations in shared modules require it in tests too.
}

const clip = () => document.querySelector('[data-prompt-clip="motion-prompt"]') as HTMLElement
/** The extend gesture lives on the card's RIGHT-EDGE pull grip (2026-08-15:
 *  body drag = move only — "when I click and drag from the middle of the
 *  card, the prompt card should NOT be resized"). */
const edgeR = () => clip().querySelector('[data-prompt-edge="r"]') as HTMLElement
const params = () =>
  JSON.parse(screen.getByTestId("stage-params").dataset.json!) as Record<string, unknown>
const saved = () =>
  JSON.parse(screen.getByTestId("saved-durations").dataset.json!) as Record<string, unknown>

describe("MotionCardEditor ↔ MotionTimelineBar — pull-the-tail (integration)", () => {
  it("dragging the seeded card's right-edge grip past the 5s wall GROWS the envelope + duration_sec", async () => {
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())

    // The bar renders at fit: the FRAMES span the viewport (the seeded
    // card spans it), plus the 2026-08-30 lead-out room (≥35% viewport →
    // 252 at W=720) — content = 720 + 252. (The clip's own `max(16px, Npx)`
    // width is invisible to jsdom — its CSS validator drops math functions
    // — so assert on the content strip, which uses a plain px value.)
    expect(parseFloat(screen.getByTestId("motion-timeline-content").style.width)).toBeCloseTo(720 + 252, 0)

    // The user's gesture: grab the card's right-edge PULL GRIP and drag
    // right, hard. (Body drag is move-only since 2026-08-15.)
    fireEvent.pointerDown(edgeR(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 400 }) // +100px ≈ +21 frames
    fireEvent.pointerUp(window)

    await waitFor(() => {
      expect(params().duration_sec).toBeGreaterThan(5)
    })
    // 171 frames → 5.7s exactly (100px / (720/149) = 20.69 → 21 over).
    expect(params().duration_sec).toBeCloseTo(5.7, 5)
    // The extend write is what landed (not some other param noise).
    expect(saved().duration_sec).toBeCloseTo(5.7, 5)
    // No snap-back: the envelope param HELD at 5.7 after the merge round
    // trip (the rescale/override interplay would rewrite it to 5.0 here).
    // The prompt text survived (the rescale effect must NOT have fired).
    expect(screen.getAllByText("walk forward").length).toBeGreaterThan(0)
  })

  it("ONE continuous drag grows the envelope smoothly — no move-clamp stutter, no left gap", async () => {
    // THE STUTTER BUG (2026-08-14 report: "I hammer it, it goes up maybe .1
    // second sometimes"): the extend read the POINTERDOWN snapshot of the
    // card; after the first extend tick T1 outran it and every later move
    // degraded into a tiny MOVE. One press, three growing moves — the
    // envelope must track the drag monotonically and the card must stay
    // pinned at frame 0 (a MOVE would leave a gap). Edge math: growth is
    // the raw pixel delta from the grab (d.endF snapshot — reading the LIVE
    // end would compound each move), so +180px ≈ +37-40 frames total.
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())

    fireEvent.pointerDown(edgeR(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 360 }) // +60px ≈ +12 frames
    await waitFor(() => expect(params().duration_sec as number).toBeGreaterThan(5.2))
    fireEvent.pointerMove(window, { clientX: 420 }) // +120px total ≈ +25
    fireEvent.pointerMove(window, { clientX: 480 }) // +180px total ≈ +37+
    fireEvent.pointerUp(window)

    // Final envelope: 149 + ≈37-40 over → ~186-190 frames → ≥6.2s.
    await waitFor(() => expect(params().duration_sec as number).toBeGreaterThan(6.2))
    // The card was never MOVED — still pinned at the left (no gap at 0).
    expect(clip().style.left).toBe("0px")
  })

  it("dragging the seeded card BODY right MOVES it — the start comes off frame 0, never a stretch", async () => {
    // THE ORIGINAL REPORT (2026-08-15): "when I click and drag a Prompt
    // Card to the right, it would stretch from the first second instead
    // of move the prompt card." Then the follow-up: "I can no longer
    // click and drag the prompt cards" (the first fix's clamp parked the
    // full-span seed dead). The contract: a body drag TRANSLATES the card
    // — its start leaves frame 0, its duration is untouched, and the
    // envelope grows to fit the MOVED card (the tail owns new territory).
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())
    expect(clip().style.left).toBe("0px") // seeded at frame 0

    fireEvent.pointerDown(clip(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 400 }) // +100px ≈ +21 frames
    fireEvent.pointerUp(window)

    // The envelope grew (duration_sec synced past the 5s wall)…
    await waitFor(() => expect(params().duration_sec).toBeGreaterThan(5))
    // …and the card MOVED: its left edge is off frame 0 (the stretch kept
    // it pinned at 0 — this is the move/stretch discriminator).
    await waitFor(() => expect(parseFloat(clip().style.left)).toBeGreaterThan(50))
  })

  it("a SECOND pull keeps growing (no one-shot / no stale-clamp)", async () => {
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())

    fireEvent.pointerDown(edgeR(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 400 })
    fireEvent.pointerUp(window)
    await waitFor(() => expect(params().duration_sec).toBeGreaterThan(5))

    // Pull again from the new, longer envelope.
    fireEvent.pointerDown(edgeR(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 600 }) // +300px at the new ppf
    fireEvent.pointerUp(window)
    await waitFor(() => {
      expect(params().duration_sec as number).toBeGreaterThan(7)
    })
  })

  it("the export rect is ASPECT-LOCKED to the typed pixels; corners scale it; the panel PUSHES the stage (never a fixed overlay)", async () => {
    // 2026-08-15 round 3: "the square is sort of too big. I can't really
    // output a 768 by 1024, because I don't have room in the mesh view" —
    // the rect's PIXEL aspect is locked to the typed outW:outH (768×1024
    // default), so it lands as the max-fit frame and ANY corner scales it
    // like an image handle. On the mocked 720×100 stage the 3:4 output is
    // a full-height, ~10.4%-wide strip, centered — the rect is the framing
    // TOOL, not the resolution.
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())

    // Open Export (enabled — the rest pose exists via the mocked skin).
    fireEvent.click(screen.getByText("Export"))
    const rect = document.querySelector("[data-export-rect]") as HTMLElement
    await waitFor(() => expect(rect).toBeTruthy())
    const AN = (768 / 1024) * (100 / 720) // normalized w:h on this stage
    await waitFor(() => expect(parseFloat(rect.style.height)).toBeCloseTo(100, 3))
    expect(parseFloat(rect.style.width)).toBeCloseTo(AN * 100, 3)
    expect(parseFloat(rect.style.left)).toBeCloseTo(((1 - AN) / 2) * 100, 3)
    expect(parseFloat(rect.style.top)).toBeCloseTo(0, 5)

    // FOUR corner handles exist.
    const corners = document.querySelectorAll("[data-export-corner]")
    expect(corners.length).toBe(4)
    const nw = document.querySelector('[data-export-corner="nw"]') as HTMLElement

    // Drag NW INWARD (+36px x, +10px y): the vertical gesture dominates
    // (dy 0.1 vs dx 0.05) → the rect SCALES to 90% of its size, aspect
    // held (the SE anchor stays put).
    fireEvent.pointerDown(nw, { button: 0, clientX: 400, clientY: 0 })
    fireEvent.pointerMove(rect, { clientX: 436, clientY: 10 })
    fireEvent.pointerUp(rect)
    await waitFor(() => expect(parseFloat(rect.style.height)).toBeCloseTo(90, 3))
    expect(parseFloat(rect.style.width)).toBeCloseTo(AN * 0.9 * 100, 3)
    expect(parseFloat(rect.style.top)).toBeCloseTo(10, 3)

    // THE LOCK: (w·sw)/(h·sh) == outW/outH == 0.75 — the on-screen size
    // changed, the typed output did not (readout still 768 × 1024).
    const rw = parseFloat(rect.style.width) / 100
    const rh = parseFloat(rect.style.height) / 100
    expect((rw * 720) / (rh * 100)).toBeCloseTo(0.75, 5)
    expect(screen.getByTestId("export-rect-readout").textContent).toContain("768 × 1024")

    // Typing a new px width refits the rect's aspect (512 → 1:2 → narrower
    // strip, still full height on this tall stage).
    fireEvent.change(screen.getByTestId("export-out-w"), { target: { value: "512" } })
    await waitFor(() =>
      expect(parseFloat(rect.style.width)).toBeCloseTo((0.5 * (100 / 720)) * 100, 3))
    expect(parseFloat(rect.style.height)).toBeCloseTo(100, 3)

    // The PANEL is in-flow: MCE's stage row has the dialog as a SIBLING,
    // and the dialog root carries no fixed/overlay positioning.
    const dialog = document.querySelector("[data-testid='card-studio-panel']") // not in this harness
    expect(dialog).toBeNull() // (sanity: this harness is standalone MCE)
    const panels = Array.from(document.querySelectorAll("div"))
      .filter((d) => d.className && String(d.className).includes("bg-card") && String(d.className).includes("shadow-2xl"))
    expect(panels.length).toBeGreaterThan(0)
    for (const p of panels) {
      const cls = String(p.className)
      expect(cls).not.toContain("fixed")
      expect(cls).not.toContain("inset-0")
    }
  })

  it("PRE-RUN export: the rest pose frames + exports — no scrubber, Downloads disabled", async () => {
    // "Do I have to actually make motion to output a frame? That's…
    // unideal." — no motion needed: the rest pose (T=1, mocked skin) is a
    // full export subject. The rect + pixel panel render; the frame
    // scrubber is hidden (nothing to scrub); only the Downloads scope
    // waits for a run (no NPZ asset exists on the rest pose).
    render(<Harness initial={{ prompt: "walk forward" }} />)
    await waitFor(() => expect(clip()).toBeTruthy())

    // The rail Export button is a QUIET tool by default ("why is the
    // export button always highlighted?" — it was styled as a primary
    // CTA in a row of toggles): muted like Skeleton/In-place, lit ONLY
    // while the panel is open, and it toggles.
    const railBtn = screen.getByText("Export").closest("button") as HTMLElement
    expect(railBtn.className).toContain("bg-sidebar/30")
    expect(railBtn.className).not.toContain("bg-brand/15")

    fireEvent.click(screen.getByText("Export"))
    const rect = document.querySelector("[data-export-rect]") as HTMLElement
    await waitFor(() => expect(rect).toBeTruthy())
    expect(railBtn.className).toContain("bg-brand/15") // lit while open
    expect(railBtn.getAttribute("aria-pressed")).toBe("true")
    // The aspect-fit frame landed (768×1024 → full-height strip).
    await waitFor(() => expect(parseFloat(rect.style.height)).toBeCloseTo(100, 3))

    // No scrubber at T=1 — no play button, no range slider.
    expect(screen.queryByRole("button", { name: /play preview/i })).toBeNull()
    expect(document.querySelector('input[type="range"]')).toBeNull()
    // The typed px panel is live pre-run.
    expect(screen.getByTestId("export-out-w")).toBeTruthy()
    expect(screen.getByTestId("export-rect-readout").textContent).toContain("768 × 1024")

    // Downloads needs a run.
    const dl = screen.getByRole("button", { name: /downloads/i })
    expect(dl.getAttribute("disabled")).not.toBeNull()
    expect(dl.textContent).toContain("needs a run")

    // IN-PLACE is a VIEW toggle — alive on the rest pose, never gated on a
    // run ("ours is not toggleable" was the pre-run disabled state).
    // Default ON (in-place is the working view); clicking toggles it off.
    const ip = screen.getByRole("button", { name: /in-place/i })
    expect(ip.getAttribute("disabled")).toBeNull()
    expect(ip.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(ip)
    expect(ip.getAttribute("aria-pressed")).toBe("false")
    expect(ip.className).not.toContain("bg-brand/15")

    // The image scopes are armed: pick a mode → the Export button fires.
    fireEvent.click(screen.getByRole("button", { name: /raw mesh/i }))
    expect(screen.getByRole("button", { name: /export the frame/i }).getAttribute("disabled")).toBeNull()

    // The rail button TOGGLES the panel closed (the button is the only
    // lit state left — and the second click must not leave it lit).
    fireEvent.click(screen.getByText("Export"))
    await waitFor(() => expect(document.querySelector("[data-export-rect]")).toBeNull())
    expect(railBtn.className).not.toContain("bg-brand/15")
    expect(railBtn.getAttribute("aria-pressed")).toBe("false")
  })
})
