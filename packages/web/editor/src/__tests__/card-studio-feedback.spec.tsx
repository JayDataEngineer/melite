/**
 * Card Studio — LIVE RUN feedback (2026-08-15, the three missing features):
 *
 *  (c) Run → Stop mid-run. The old derivation read runId from
 *      stage.result.metadata.runId — which only exists AFTER completion,
 *      so Stop never rendered while a run was live. The store now stamps
 *      stage.runId from the first poll tick; this pins the studio's
 *      fallback chain (stage.runId FIRST, metadata second).
 *  (b) ComfyUI WS feedback in the studio: the SAME CardActivityLine +
 *      CardProgressBar the tile renders, in the rail above the footer.
 *      ComfyUI has no webhooks — /ws frames land on stage.activity /
 *      stage.progress via the status poll; the studio was the one surface
 *      that dropped them on the floor.
 *  (a) Full error in the studio: the wide surface renders the COMPLETE
 *      message (pre-wrap, scroll-capped) — the tile toast says "(full
 *      error on the card)", and this is where the full error lives.
 *
 * Same mount path as card-studio.test.tsx: the REAL drilldown
 * (CardZoomOverlay inside AnimatePresence), not a hand-mounted panel.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { TooltipProvider } from "@melite/ui/tooltip"

beforeAll(() => {
  const stub = new Proxy({}, { get: () => () => stub }) as unknown as CanvasRenderingContext2D
  HTMLCanvasElement.prototype.getContext =
    ((() => stub) as unknown) as typeof HTMLCanvasElement.prototype.getContext
})

vi.mock("@melite-plugin/motion/ui/viewer3d", () => ({ PoseViewer3D: (): null => null }))
const { stopRun } = vi.hoisted(() => ({ stopRun: vi.fn(async () => ({})) }))
vi.mock("../rpc/editorClient", () => ({ editorClient: { stopRun } }))
vi.mock("@melite/formats/somaSkin", () => ({
  loadSomaSkin: vi.fn(async () => { throw new Error("no skin in test") }),
  deformFrame: () => {},
}))

import { CardZoomOverlay } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
// The studio registry resolves route → family → served binding (the
// §16 C0 — the body: claim on the card row (packages/*/cards/) is the one
// definition site). Prime the motion family with its binding so the
// kimodo card below actually gets the wide surface.
import { primeCatalog, type Catalog } from "@melite/catalog"

primeCatalog({
  families: {
    kimodo: {
      label: "Kimodo Motion", genre: "motion",
      // The REAL tenant id: packages/motion/motion/src/ui/studio/component.tsx
      // → "motion/motion" (the glob in cardStudios derives ids from
      // the path). The stale "melite-core/motion" id resolved to no component,
      // so the body claim nulled and the studio never mounted.
      studio: { tenant: "motion/motion", owns_params: false, writes: [
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
beforeEach(() => {
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: W, bottom: 100, width: W, height: 100,
    toJSON: () => ({}),
  } as DOMRect)
})
afterEach(() => { rectSpy.mockRestore(); stopRun.mockClear() })

const SETTLE = { timeout: 3000 }

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Motion",
    subtitle: "kimodo motion",
    kind: "generation",
    service: "kimodo",
    genre: "motion",
    params: { prompt: "walk forward" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

function renderH(base: CardStage, running: boolean) {
  const onRun = vi.fn()
  const Harness = () => {
    const [open, setOpen] = useState(true)
    return (
      <TooltipProvider>
        <AnimatePresence>
          {open && (
            <CardZoomOverlay
              stage={base}
              upstreams={[]}
              running={running}
              actions={{ onEditSave: vi.fn(), onRun, onWireSlot: vi.fn() }}
              onClose={() => setOpen(false)}
            />
          )}
        </AnimatePresence>
      </TooltipProvider>
    )
  }
  render(<Harness />)
  return { onRun }
}

describe("CardStudio live-run feedback", () => {
  it("(c) Stop replaces Run the moment the run is live (stamped runId)", async () => {
    // MID-RUN: result is still null (nothing completed) — only the
    // tick-stamped stage.runId exists. This is exactly the state the old
    // metadata-only derivation failed on.
    renderH(makeStage({
      status: "running",
      runId: "prun88",
      progress: { value: 7, max: 25 },
      activity: { phase: "sampling", value: 7, max: 25 },
    }), true)

    await screen.findByTestId("card-studio-panel", {}, SETTLE)
    // Stop IS rendered; Run is not.
    const stop = screen.getByTestId("studio-stop-button")
    expect(screen.queryByTestId("studio-run-button")).toBeNull()

    // The control plane fires the interrupt for the LIVE run id.
    fireEvent.click(stop)
    await waitFor(() => expect(stopRun).toHaveBeenCalledWith("prun88"), SETTLE)
  })

  it("(c) runId still resolves post-completion via metadata (the fallback)", async () => {
    renderH(makeStage({
      status: "done",
      result: {
        assetUrls: [],
        artifacts: {},
        metadata: { runId: "prun99" },
        durationSec: 3,
      },
    }), false)
    await screen.findByTestId("card-studio-panel", {}, SETTLE)
    // Not running → Run (Re-run) renders, not Stop.
    expect(screen.queryByTestId("studio-stop-button")).toBeNull()
    expect(screen.getByTestId("studio-run-button")).toBeTruthy()
  })

  it("(b) the rail renders the live WS activity line + progress bar", async () => {
    renderH(makeStage({
      status: "running",
      runId: "prun77",
      activity: { phase: "loading", node_class: "CheckpointLoaderSimple" },
      progress: { value: 5, max: 20 },
    }), true)
    const panel = await screen.findByTestId("card-studio-panel", {}, SETTLE)

    // The SAME components the tile renders — inside the studio rail.
    const act = panel.querySelector('[data-card-activity="s0"]')
    expect(act).toBeTruthy()
    expect(act!.textContent).toContain("loading CheckpointLoaderSimple")
    const prog = panel.querySelector('[data-card-progress="s0"]')
    expect(prog).toBeTruthy()
    expect(prog!.textContent).toContain("5/20")
    expect(prog!.textContent).toContain("25%")

    // Both sit in the RAIL (the studio shell), above the Run/Stop footer.
    const rail = panel.querySelector("[data-studio-rail]") ?? panel
    expect(act!.closest("[data-studio-rail]") ?? rail.contains(act!)).toBe(true)
    const footer = stopOrRunFooter()
    expect(rail.contains(act!) && act!.compareDocumentPosition(footer) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("(b) no fake status — no activity frame, no line", async () => {
    renderH(makeStage({ status: "running", runId: "prun66" }), true)
    const panel = await screen.findByTestId("card-studio-panel", {}, SETTLE)
    expect(panel.querySelector('[data-card-activity="s0"]')).toBeNull()
    expect(panel.querySelector('[data-card-progress="s0"]')).toBeNull()
  })

  it("(a) the studio renders the FULL error — complete text, not a clip", async () => {
    const full =
      'RuntimeError: kimodo_motion[text_to_pose]: ComfyUI workflow failed: ' +
      'Error in call to target \'kimodo.model.llm2vec.llm2vec_wrapper.LLM2VecEncoder\': ' +
      'ValueError("Can\'t find \'adapter_config.json\' at \'McGill-NLP/LLM2Vec-Meta-Llama-3-8B-Instruct-mntp-supervised\'")'
    renderH(makeStage({ status: "error", error: full }), false)
    const panel = await screen.findByTestId("card-studio-panel", {}, SETTLE)
    const err = panel.querySelector('[data-studio-error="s0"]') as HTMLElement
    expect(err).toBeTruthy()
    // The ENTIRE message — the tail (what a truncation clips) is present.
    expect(err.textContent).toContain(full)
    expect(err.textContent.endsWith("-supervised\'\")")).toBe(true)
  })

  it("(a) no error state, no error block", async () => {
    renderH(makeStage({ status: "pending" }), false)
    const panel = await screen.findByTestId("card-studio-panel", {}, SETTLE)
    expect(panel.querySelector('[data-studio-error="s0"]')).toBeNull()
  })
})

function stopOrRunFooter(): Node {
  const el =
    screen.queryByTestId("studio-stop-button") ??
    screen.queryByTestId("studio-run-button")
  if (!el) throw new Error("no run/stop footer rendered")
  return el
}
