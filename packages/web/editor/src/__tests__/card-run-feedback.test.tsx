/**
 * CardRunFeedback — the drilldown run-feedback BLOCK for the wide
 * card surfaces (2026-09-06, operator order: "for these large cards
 * there's no drilldown feedback for inference like the smaller
 * cards").
 *
 * Pins, through the REAL drilldown mount (CardZoomOverlay inside
 * AnimatePresence — the same path as card-studio-feedback.test.tsx):
 *
 *  (a) RUN STATE LINE — always while running: the studio rail shows
 *      Queued/Running/Starting… even when the lane emits NO /ws
 *      frames (kimodo motion, TRELLIS, TTS). THE regression: the old
 *      rail rendered only the frame-gated activity/progress pair, so
 *      a frame-less lane showed NOTHING mid-run except Stop.
 *  (b) THE CONSOLE DRILLDOWN — the run's include_log tail, polled
 *      from the status door while running (fetchRunStatus with
 *      includeLog: true — the RPC enrichment that had lost both its
 *      caller and its server end), with Copy.
 *  (c) NO-LIE idle — not running: no state line, no console poll
 *      (fetchRunStatus never called), no fake spinner.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AnimatePresence } from "framer-motion"
import { TooltipProvider } from "@melite/ui/tooltip"

beforeAll(() => {
  const stub = new Proxy({}, { get: () => () => stub }) as unknown as CanvasRenderingContext2D
  HTMLCanvasElement.prototype.getContext =
    ((() => stub) as unknown) as typeof HTMLCanvasElement.prototype.getContext
})

vi.mock("@melite-plugin/motion/ui/viewer3d", () => ({ PoseViewer3D: (): null => null }))
const { stopRun, fetchRunStatus, getFormSpec } = vi.hoisted(() => ({
  stopRun: vi.fn(async () => ({})),
  fetchRunStatus: vi.fn(async () => ({
    run_id: "run-test-1",
    status: "running",
    stages: [{ id: "s0", name: "text-to-motion", status: "running" }],
    log_tail: "run: running\ntext-to-motion: running",
  })),
  // the drilldown mount reads the form spec through the SAME client
  // (specContractStore). A mock WITHOUT this member made the spec
  // fetch die "getFormSpec is not a function" mid-mount — (b) then
  // raced the store's failure/retry cache against its waitFor
  // window and starved ~1 run in 4 (the 2026-09-07 recorded flake).
  // One empty spec makes the mount deterministic.
  getFormSpec: vi.fn(async () => ({
    fields: [], schema_groups: [], features: {},
  })),
}))
vi.mock("../rpc/editorClient", () => ({
  editorClient: { stopRun, fetchRunStatus, getFormSpec },
}))
vi.mock("@melite/formats/somaSkin", () => ({
  loadSomaSkin: vi.fn(async () => { throw new Error("no skin in test") }),
  deformFrame: () => {},
}))

import { CardZoomOverlay } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
import { primeCatalog, type Catalog } from "@melite/catalog"

primeCatalog({
  families: {
    kimodo: {
      label: "Kimodo Motion", genre: "motion",
      studio: { tenant: "motion/motion-studio", owns_params: false, writes: [
        "prompt", "duration_sec", "motion_prompts", "motion_constraints",
        "motion_bg_image", "prev_motion_artifact", "preview_glb",
      ] },
    },
  },
  models: {
    kimodo: { family: "kimodo", form: "form_motion_kimodo", label: "Kimodo" },
  },
} as unknown as Catalog)

const W = 720
let rectSpy: ReturnType<typeof vi.spyOn>

/** The kimodo stage — a FRAME-LESS lane: no activity, no progress.
 *  This is exactly the class that used to render NOTHING mid-run. */
function stage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Motion",
    subtitle: "kimodo motion",
    kind: "generation",
    service: "kimodo",
    genre: "motion",
    params: { prompt: "a wave" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "running",
    meta: {},
    runId: "run-test-1",
    ...over,
  } as CardStage
}

function mount(s: CardStage, running: boolean) {
  return render(
    <TooltipProvider>
      <AnimatePresence>
        {s && (
          <CardZoomOverlay
            key={s.id}
            stage={s}
            upstreams={[]}
            running={running}
            actions={{ onEditSave: vi.fn(), onRun: vi.fn(), onWireSlot: vi.fn() }}
            onClose={() => {}}
          />
        )}
      </AnimatePresence>
    </TooltipProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("CardRunFeedback (the wide-card drilldown block)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: W, configurable: true })
    rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: W, bottom: 100, width: W, height: 100,
      toJSON: () => ({}),
    } as DOMRect)
  })
  afterEach(() => { rectSpy.mockRestore() })

  it("(a) shows the run state line while running — with NO /ws frames", async () => {
    // frame-less: activity and progress both absent — the studio must
    // still say the run is live
    mount(stage(), true)
    const panel = await screen.findByTestId("card-studio-panel", {}, { timeout: 3000 })
    const state = panel.querySelector('[data-card-run-state="s0"]')
    expect(state!.textContent).toContain("Running")
  })

  it("(b) shows the include_log console while running, with Copy", async () => {
    mount(stage(), true)
    const panel = await screen.findByTestId("card-studio-panel", {}, { timeout: 3000 })
    const con = panel.querySelector('[data-card-run-console="s0"]')
    expect(con!.textContent).toContain("text-to-motion: running")
    // the poll rides the enrichment door — includeLog: true
    await waitFor(() => {
      expect(fetchRunStatus).toHaveBeenCalledWith(
        "run-test-1",
        { includeLog: true },
      )
    })
    // Copy writes the tail (jsdom's clipboard is a getter — define it)
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    })
    fireEvent.click(screen.getByLabelText("Copy run log"))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
  })

  it("(b2) a queued stage with no runId yet shows Starting… (pre-first-tick window)", async () => {
    mount(stage({ status: "queued", runId: undefined }), true)
    const panel = await screen.findByTestId("card-studio-panel", {}, { timeout: 3000 })
    const state = panel.querySelector('[data-card-run-state="s0"]')
    expect(state!.textContent).toContain("Starting…")
    // and the console does not poll without a runId
    expect(fetchRunStatus).not.toHaveBeenCalled()
  })

  it("(c) idle: no state line, no console, no poll (no-lie)", async () => {
    const { container } = render(<div />)
    mount(stage({ status: "done", runId: undefined, result: null }), false)
    // give any stray effect a beat to fire
    await new Promise((r) => setTimeout(r, 30))
    expect(document.querySelector("[data-card-run-state]")).toBeNull()
    expect(document.querySelector("[data-card-run-console]")).toBeNull()
    expect(fetchRunStatus).not.toHaveBeenCalled()
    expect(container).toBeDefined()
  })
})
