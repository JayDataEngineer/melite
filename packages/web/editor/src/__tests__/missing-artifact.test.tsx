// Missing-artifact state (2026-09-05) — a run's sidecar outlives its
// artifacts when the run dir is pruned externally, and a dead <img>
// renders its alt text as document content (the operator's "krea-2"
// alt-text cards). Every artifact image swaps at onError to
// MissingArtifactCell ("artifact missing — run pruned") — honest,
// never alt-text-as-content, never a blank void.
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import type { ReactElement } from "react"
// The preview cell rides the ui-claim wire — seed the lane exactly as
// the app's boot does, or the cell renders null.
import "@/shell/pluginUi"
import {
  RayCoreCardPreview,
  MissingArtifactCell,
} from "../surfaces/flow/cardElements"
import type { CardStage } from "@melite/contracts"

afterEach(() => cleanup())

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

function doneStage(): CardStage {
  return {
    id: "s0",
    title: "Generate image",
    subtitle: "krea2",
    kind: "generation",
    service: "krea2",
    params: { prompt: "a waifu" },
    inputs: [],
    inputIndices: [],
    result: {
      assetUrls: ["/v1/assets/runs/p_pruned/gen.png"],
      artifacts: {},
      metadata: { runId: "p_pruned" },
      completedAt: 1,
      durationSec: 1,
    },
    status: "done",
    meta: {},
  } as unknown as CardStage
}

describe("MissingArtifactCell", () => {
  it("renders the honest pruned note, never the model route as text", () => {
    renderWithTooltip(<MissingArtifactCell label="Generate image" />)
    expect(screen.getByText("artifact missing — run pruned")).toBeTruthy()
    // The service route ("krea-2" — the old alt text) is nowhere in the cell.
    expect(screen.queryByText("krea2")).toBeNull()
  })
})

describe("RayCoreCardPreview — pruned-run swap", () => {
  it("a live artifact renders the img", () => {
    renderWithTooltip(
      <RayCoreCardPreview
        stage={doneStage()}
        url="/v1/assets/runs/p_pruned/gen.png"
        genre="image"
      />,
    )
    expect(screen.getByAltText("Generate image")).toBeTruthy()
  })

  it("a dead artifact swaps to the missing cell at onError (no alt-text-as-content)", () => {
    renderWithTooltip(
      <RayCoreCardPreview
        stage={doneStage()}
        url="/v1/assets/runs/p_pruned/gen.png"
        genre="image"
      />,
    )
    const img = screen.getByAltText("Generate image")
    fireEvent.error(img)
    expect(screen.getByText("artifact missing — run pruned")).toBeTruthy()
    expect(screen.queryByAltText("Generate image")).toBeNull()
  })
})
