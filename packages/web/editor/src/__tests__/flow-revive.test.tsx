// flow-revive.test.tsx — the save-system rework (2026-08-08).
//
// "We need to rework the 'save' system. In the left sidebar, I can revive
// flows of previous gens. But right now it's tied to families and not
// flows."
//
// Reviving a run ("Open as cards" in the Media drawer → loadRunById →
 // loadRun) reconstructs from the run's OWN records: the brick shapes
 // the backend reports (hydrateRunStages), wiring slots from `inputs` →
 // upstream `outputs` (`consumes` is SHARED CONFIG, so wiring from it
 // produced EMPTY slot wires). (The pipe-carry arm died with the wire
 // 2026-09-05: no gateway ever stashed pipe/stage_id, flow_doc was never
 // emitted — its fictional tests retire with it.)
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

// The real @/lib/api module graph (modelCatalog) fires a background
// catalog fetch at module scope — stub it like the other store tests.
vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))

// The real editorClient — no spec lookup exists to stub anymore.
vi.mock("sonner", () => {
  const fn = vi.fn()
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
  }
})

// Import ORDER matters: the store ↔ editorClient graph is circular —
// store-first order gives the store the completed mock (same as
// flow-nodes-drawer.test.tsx).
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"



beforeEach(() => {
  useLibraryFlowStore.getState().clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("revive fallbacks — brick-shape runs (no spec door exists)", () => {
  // (2026-09-05) The spec-revive arm died with the yaml library: runs
  // revive from their OWN records — pipe doc or bricks. No spec lookup,
  // no drift class.

  it("inline runs (yaml '(inline)') revive the single card with its MODEL service", async () => {
    await useLibraryFlowStore.getState().loadRun("intent", {
      run_id: "p_abcd",
      status: "done",
      stages: [
        {
          id: "generate_image_0",
          name: "generate_image",
          family_id: "generate_image",
          title: "Generate",
          status: "done",
          url: "/assets/runs/p_abcd/out.png",
          inputs: [],
          outputs: ["primary"],
          consumes: ["comfy_url"],
          params: { model: "krea-2", prompt: "x" },
          secs: 1.0,
        },
      ],
    } as never)

    const p = useLibraryFlowStore.getState().flow!
    expect(p.stages).toHaveLength(1)
    // The compile-path brick carries `model` — the card's real service.
    expect(p.stages[0].service).toBe("krea-2")
    expect(p.stages[0].result?.assetUrls).toContain("/assets/runs/p_abcd/out.png")
    // Inline runs have no chain to re-link.
    expect(p.flowName).toBeUndefined()
  })

  it("inline run: a stage whose consumes names an OUTPUT but inputs is empty gets NO wire", async () => {
    // INLINE path (the only legitimate brick-shape hydrate now): consumes
    // is ignored entirely — a config-only consume of an output name must
    // NOT produce a slot wire.
    await useLibraryFlowStore.getState().loadRun("intent", {
      run_id: "y_dup",
      status: "done",
      stages: [
        {
          id: "video_generate_0", name: "video_generate", family_id: "video_generate",
          title: "Generate Clip", status: "done", url: "/a/clip_0.mp4",
          inputs: [], outputs: ["clip_0"], consumes: [],
          params: { prompt: "a robot dances" }, secs: 1.0,
        },
        {
          id: "video_edit_1", name: "video_edit", family_id: "video_edit",
          title: "Edit Clip", status: "done", url: "/a/clip_1.mp4",
          inputs: [], outputs: ["clip_1"], consumes: ["clip_0"],
          params: { prompt: "make it rain" }, secs: 1.0,
        },
      ],
    } as never)

    const p = useLibraryFlowStore.getState().flow!
    // consumes: [clip_0] is NOT a wire — the second card has no input slot
    // wired to the first.
    expect(p.stages[1].inputs.every((id) => id === "")).toBe(true)
  })
})

