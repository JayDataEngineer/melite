// card-detail-run-flush.test.tsx — regression: a prompt typed into the
// ParamEditor MUST reach the backend when the user clicks Run, even if they
// never clicked Apply. The typed prompt lives in ParamEditor's local draft;
// Run reads stage.params (the last Apply). The fix: CardDetailInline reports
// the live draft via onDraftChange and flushes it through onEditSave in
// handleRun BEFORE onRun fires. Without the flush, the compile-path run
// (p…-prefix) fails with "generate_image: prompt is required".
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
// THE FORM IS THE CARD (2026-08-18): only spec-DECLARED fields render —
// the prompt textarea needs the form-spec resolved (the old undeclared
// draft fallback painted it pre-spec on a network race). Stub the wire
// the contract store fetches through (Door B pattern).
vi.mock("../rpc/editorClient", () => ({
  editorClient: {
    getFormSpec: vi.fn().mockResolvedValue({
      defaults: {},
      fields: [
        { name: "prompt", type: "textarea" },
        { name: "steps", type: "number" },
        { name: "cfg", type: "number" },
      ],
      schema_groups: [],
      features: {},
    }),
  },
}))

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Generate",
    subtitle: "krea2",
    kind: "generation",
    service: "krea2",
    // prompt seeded empty — the picker seeds prompt: "" for prompt-serving
    // models; the textarea is gated on "prompt" in draft, so it must start
    // present for the user to type into.
    params: { prompt: "", steps: 28, cfg: 4.5 },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

describe("CardDetailInline — Run flushes the typed prompt (no Apply needed)", () => {
  it("a prompt typed then Run (no Apply) is flushed via onEditSave before onRun", async () => {
    const callOrder: string[] = []
    const onEditSave = vi.fn((..._args: unknown[]) => { callOrder.push("edit") })
    const onRun = vi.fn((..._args: unknown[]) => { callOrder.push("run") })

    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave, onRun }}
      />,
    )

    // Editing auto-enables (no result + onEditSave wired) → the ParamEditor
    // prompt textarea mounts.
    const prompt = await screen.findByLabelText("Prompt") as HTMLTextAreaElement
    expect(prompt.value).toBe("")

    // The user types a prompt — this updates ONLY ParamEditor's local draft.
    fireEvent.change(prompt, { target: { value: "a neon cat" } })
    await waitFor(() => { expect(prompt.value).toBe("a neon cat") })

    // The user clicks Run WITHOUT clicking Apply first.
    fireEvent.click(screen.getByText("Run"))

    // THE FIX: the typed prompt is flushed to stage.params via onEditSave
    // BEFORE onRun fires. Without the flush, onEditSave would not be called
    // here and the run would hit "prompt is required" on the empty stage
    // params.
    expect(onEditSave).toHaveBeenCalledTimes(1)
    const flushed = onEditSave.mock.calls[0]
    expect(flushed[0]).toBe("s0")                       // stageId
    expect((flushed[1] as Record<string, unknown>).prompt).toBe("a neon cat")

    expect(onRun).toHaveBeenCalledTimes(1)
    expect(onRun.mock.calls[0][0]).toBe("s0")

    // Order matters: flush must precede the run (Zustand set() is sync, so
    // executeStage captures the freshly-flushed params).
    expect(callOrder).toEqual(["edit", "run"])
  })
})
