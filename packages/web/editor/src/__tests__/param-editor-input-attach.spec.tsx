// param-editor-input-attach.spec.tsx — the rule 4 consolidation guard.
//
// History: ParamEditor used to host its own attach UI for input slots
// (Attach / Replace / Remove, file-only). Phase 3c (2026-08-07) replaced
// that with the shared AttachControl surface, which lives in
// CardDetailModal's Input slots section and supports three write paths
// (file picker, asset drag-drop, upstream stage picker). Rule 4: ONE
// surface for attach, not two.
//
// This file pins the consolidation:
//   • ParamEditor does NOT render attach UI for a null input slot
//   • ParamEditor does NOT render attach UI for an attached input slot
//   • ParamEditor does NOT render a file input for an input slot
//   • text-only cards (no slot) also show no attach UI (trivially)
//
// The attach behavior itself is proven by card-detail-input-slots.spec.tsx
// (CardDetailModal → InputSlotsSection → AttachControl). If you re-add
// attach UI inside ParamEditor, this test fails — by design.
import { describe, it, expect, beforeEach , vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { ParamEditor } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
import { primeCatalog, type Catalog } from "@melite/catalog"

// THE FORM IS THE CARD (2026-08-18): only spec-DECLARED fields render —
// the prompt textarea needs the form-spec resolved (the old undeclared
// draft fallback painted it pre-spec on a network race). Stub the wire
// the contract store fetches through (Door B pattern). input_image stays
// UNdeclared on purpose: it is an input SLOT (SlotGrid's surface), so it
// must never render as a ParamEditor row either way.
vi.mock("../rpc/editorClient", () => ({
  editorClient: {
    getFormSpec: vi.fn().mockResolvedValue({
      defaults: {},
      fields: [
        { name: "prompt", type: "textarea" },
        { name: "seed", type: "number" },
      ],
      schema_groups: [],
      features: {},
    }),
  },
}))

const CATALOG: Catalog = {
  families: {},
  models: {
    "qwen-edit-base": { family: "qwen-edit", form: "form_edit", label: "Qwen Edit", input: "input_image" },
  },
}

function stage(params: Record<string, unknown>): CardStage {
  return {
    id: "s1",
    title: "Edit",
    kind: "generation",
    service: "qwen-edit-base",
    params,
    inputs: [],
    inputIndices: [],
    result: undefined,
    status: "pending",
  }
}

beforeEach(() => {
  primeCatalog(CATALOG)
})

describe("ParamEditor — rule 4 consolidation (no attach UI in editor body)", () => {
  it("does NOT render attach UI for a null input slot", async () => {
    renderWithTooltip(<ParamEditor stage={stage({ prompt: "x", input_image: null })} onSave={() => {}} />)
    await screen.findByDisplayValue("x")
    // No attach/replace/remove controls — the shared AttachControl in
    // CardDetailModal's Input slots section owns this surface now.
    expect(screen.queryByText("Attach")).toBeNull()
    expect(screen.queryByText("Replace")).toBeNull()
    expect(screen.queryByText("Remove")).toBeNull()
    expect(screen.queryByTitle("Detach")).toBeNull()
    // No file input rendered for the slot.
    expect(document.querySelector('input[type="file"]')).toBeNull()
    // No slot thumbnail.
    expect(document.querySelector('img[alt="input_image"]')).toBeNull()
  })

  it("does NOT render attach UI for an attached (dataUrl) input slot", async () => {
    renderWithTooltip(<ParamEditor
      stage={stage({ prompt: "x", input_image: "data:image/png;base64,iVBORw0KGgo=" })}
      onSave={() => {}}
    />)
    await screen.findByDisplayValue("x")
    expect(screen.queryByText("Attach")).toBeNull()
    expect(screen.queryByText("Replace")).toBeNull()
    expect(screen.queryByText("Remove")).toBeNull()
    expect(screen.queryByTitle("Detach")).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
    // The attached value is NOT shown as a thumbnail here — CardDetailModal
    // renders it in the Input slots section.
    expect(document.querySelector('img[alt="input_image"]')).toBeNull()
  })

  it("does NOT render attach UI for a ComfyUI-filename input slot", async () => {
    renderWithTooltip(<ParamEditor stage={stage({ prompt: "x", input_image: "shot_0001_.png" })} onSave={() => {}} />)
    await screen.findByDisplayValue("x")
    expect(screen.queryByText("shot_0001_.png")).toBeNull()
    expect(screen.queryByText("Replace")).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it("text-only cards (no input slot) show no attach UI", async () => {
    renderWithTooltip(<ParamEditor stage={stage({ prompt: "x", seed: 1 })} onSave={() => {}} />)
    await screen.findByDisplayValue("x")
    expect(screen.queryByText("Attach")).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
