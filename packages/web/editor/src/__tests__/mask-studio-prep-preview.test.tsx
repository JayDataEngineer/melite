// mask-studio-prep-preview.test.tsx — the VIEW-ONLY prep preview contract
// (docs/design/mask-prep.md §9). The panel previews the effective mask
// (grow/feather via the parity twin); it must NEVER write stage params —
// the knobs live on the Inpaint card, the studio writes raw masks.
// Canvas math is jsdom-untestable (stubbed getContext + undecodable data
// URLs keep the compute effect a no-op); these tests lock the WIRING:
// panel presence, knob interaction, and the no-writes invariant.
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render as renderBase, screen, fireEvent } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { MaskStudioEditor } from "../../../../../packages/engines/comfyui-cordis/src/cards/image/mask-studio/ui/studio/component"
import type { CardStage } from "@melite/contracts"
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

beforeAll(() => {
  const stub = new Proxy({}, { get: () => () => stub }) as unknown as CanvasRenderingContext2D
  HTMLCanvasElement.prototype.getContext =
    ((() => stub) as unknown) as typeof HTMLCanvasElement.prototype.getContext
})

function makeStage(): CardStage {
  return {
    id: "stage-mask-1",
    title: "Mask Studio",
    kind: "generation",
    service: "mask-studio",
    params: {
      input_image: "data:image/png;base64,AAAA",
      detect_mode: "body",
      detection_threshold: 0.35,
      sam_threshold: 0.93,
      sam_dilation: 0,
    },
    inputs: [],
    inputIndices: [],
    result: {
      assetUrls: ["data:image/png;base64,AAAA"],
      artifacts: { mask_combined: "data:image/png;base64,AAAA" },
      metadata: {},
      completedAt: Date.now(),
      durationSec: 1.2,
    },
  } as unknown as CardStage
}

describe("MaskStudioEditor prep preview (view-only)", () => {
  it("is OFF by default — no panel, but the Eye dock button exists", () => {
    renderWithTooltip(
      <MaskStudioEditor stage={makeStage()} onSave={() => {}} />,
    )
    expect(screen.queryByText("Effective mask")).toBeNull()
    expect(
      screen.getByRole("button", { name: /Prep preview/i }),
    ).toBeTruthy()
  })

  it("toggles the panel on the Eye dock button; knobs render + adjust", () => {
    renderWithTooltip(
      <MaskStudioEditor stage={makeStage()} onSave={() => {}} />,
    )
    fireEvent.click(
      screen.getByRole("button", { name: /Prep preview/i }),
    )
    const panel = document.querySelector("[data-prep-preview]")
    expect(panel).toBeTruthy()
    // defaults mirror the catalog quality defaults
    expect(screen.getByText("Grow / Shrink")).toBeTruthy()
    expect(screen.getByText("Feather")).toBeTruthy()
    expect(screen.getAllByText("8px").length).toBe(2)

    const ranges = panel!.querySelectorAll("input[type=range]")
    expect(ranges.length).toBe(2)
    fireEvent.change(ranges[0], { target: { value: "12" } })
    expect(screen.getByText("12px")).toBeTruthy()
    fireEvent.change(ranges[1], { target: { value: "0" } })
  })

  it("NEVER calls onSave — view-only, writesKeys untouched", () => {
    const onSave = vi.fn()
    renderWithTooltip(
      <MaskStudioEditor stage={makeStage()} onSave={onSave} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Prep preview/i }))
    const panel = document.querySelector("[data-prep-preview]")!
    const ranges = panel.querySelectorAll("input[type=range]")
    fireEvent.change(ranges[0], { target: { value: "20" } })
    fireEvent.change(ranges[1], { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: /Prep preview/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it("labels the panel as applied-at-the-card (the two-stage model)", () => {
    renderWithTooltip(
      <MaskStudioEditor stage={makeStage()} onSave={() => {}} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Prep preview/i }))
    expect(screen.getByText(/Inpaint card applies/i)).toBeTruthy()
    expect(screen.getByText(/studio writes raw masks/i)).toBeTruthy()
  })
})
