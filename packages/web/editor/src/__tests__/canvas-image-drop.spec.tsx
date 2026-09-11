// canvas-image-drop.spec.tsx — the OS-media → Ops card convenience path
// (2026-08-09).
//
// "When I am on library view, when I drag and drop an image onto the middle,
// it should create the image ops card automatically with the image I dragged
// in there." The canvas is ALREADY a drop target for capability tiles; this
// extends it to OS media files. Drop a file the input family DECLARES it
// accepts → a kind:"input" stage lands with `source` pre-seeded to the file's
// data: URL. The accepted types are NOT free-coded — they come from the
// family's pydantic-validated `accepts` declaration (FamilyEntry.accepts in
// schema.py, surfaced via familyAccepts in modelCatalog.ts). A file whose type
// is OUTSIDE that declaration HARD-FAILS (toast), never a silent swallow.
//
// The card tiles stopPropagation on file drops (they attach to the slot), so
// this canvas-level path only fires for drops on the canvas BACKGROUND —
// dropping a file ON a card still attaches to that card's slot (proven by
// card-tile-drop.spec.tsx). This file proves the canvas-background contract.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, fireEvent, act, cleanup, waitFor } from "@testing-library/react"
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { primeCatalog, type Catalog } from "@melite/catalog"
import { ASSET_DRAG_MIME } from "@melite/ui"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
  const fn = vi.fn()
  return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})
// ServicePicker pulls the catalog + owns its own dialog; not under test here.
vi.mock("../surfaces/flow/ServicePicker", () => ({
  ServicePicker: (): null => null,
}))

const FAKE_CATALOG: Catalog = {
  families: {
    "krea-2": { label: "Krea 2", genre: "image" },
    // The input family's DECLARED ingestion set — mirrors the real
    // input_prep.yaml `accepts:` block. The canvas drop handler gates on this
    // via familyAccepts(); flipping this list (e.g. to [image]) is the ONE
    // lever that narrows which drops spawn a card.
    input: { label: "Input Prep", genre: "image", accepts: ["image", "video", "audio"] },
  },
  models: {
    "krea-2": { family: "krea-2", form: "form_generate", label: "Krea 2", prompt_in_form: true },
  },
  capabilities: {},
}

/** A synthetic drop event carrying an OS File (any media type). */
function fileDropEvent(file: File) {
  return {
    dataTransfer: {
      types: ["Files"],
      files: [file],
      getData: () => "",
    },
  } as unknown as React.DragEvent
}

/** A synthetic dragOver event for an OS file drag. */
function fileDragOverEvent() {
  return {
    dataTransfer: { types: ["Files"], files: [] },
  } as unknown as React.DragEvent
}

/** A synthetic drop event carrying a sidebar-asset drag payload (the SAME
 *  MIME + JSON shape AppSidebar.dragPayload emits + SlotSquare parses). */
function assetDropEvent(asset: { url: string; type: string; name: string; id: string }) {
  return {
    dataTransfer: {
      types: [ASSET_DRAG_MIME],
      files: [],
      getData: (mime: string) => (mime === ASSET_DRAG_MIME ? JSON.stringify(asset) : ""),
    },
  } as unknown as React.DragEvent
}

/** A synthetic dragOver event for a sidebar-asset drag. */
function assetDragOverEvent() {
  return {
    dataTransfer: { types: [ASSET_DRAG_MIME], files: [] },
  } as unknown as React.DragEvent
}

beforeEach(() => {
  primeCatalog(FAKE_CATALOG)
  useLibraryFlowStore.getState().clear()
})
afterEach(() => {
  cleanup()
  // The sonner toast.error mock is module-scoped — clear call history between
  // tests so a hard-fail assertion in one test doesn't leak into the next
  // test's "not to have been called" assertion.
  vi.clearAllMocks()
})

describe("FlowCanvas — OS media drop creates an Ops card (declared via familyAccepts)", () => {
  it("dropping an IMAGE on the empty canvas UPLOADS and seeds the ESTATE PATH (2026-09-06 rail)", async () => {
    // the upload door: bytes in, estate path out
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ path: "data/input/cat-abc12345.png" }),
    })))
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    expect(dropZone).toBeTruthy()

    await act(async () => {
      fireEvent.drop(dropZone, fileDropEvent(new File(["img-bytes"], "cat.png", { type: "image/png" })))
    })

    // readAsDataURL resolves async; the addStage lands once it does.
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.kind).toBe("input")
    expect(stage.service).toBe("input")
    expect(stage.title).toBe("Image Ops")
    expect(stage.params.source).toBe("data/input/cat-abc12345.png")
    vi.unstubAllGlobals()
  })

  it("dropping a VIDEO creates a Video Ops card (the family declares video)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(dropZone, fileDropEvent(new File(["vid"], "clip.mp4", { type: "video/mp4" })))
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.kind).toBe("input")
    expect(stage.title).toBe("Video Ops")
    expect(stage.params.source).toMatch(/^data:video\/mp4;base64,/)
  })

  it("dropping an AUDIO creates an Audio Ops card (the family declares audio)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(dropZone, fileDropEvent(new File(["au"], "vocals.mp3", { type: "audio/mpeg" })))
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.kind).toBe("input")
    expect(stage.title).toBe("Audio Ops")
    expect(stage.params.source).toMatch(/^data:audio\/mpeg;base64,/)
  })

  it("dropping an image on a POPULATED canvas appends the Ops stage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ path: "data/input/cat-abc12345.png" }),
    })))
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    // Seed one card so the populated canvas renders.
    await useLibraryFlowStore.getState().addStage({
      kind: "generation",
      service: "krea-2",
      title: "Generate",
      params: { prompt: "" },
    })
    expect(useLibraryFlowStore.getState().flow!.stages).toHaveLength(1)

    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="populated"]') as HTMLElement
    expect(dropZone).toBeTruthy()

    await act(async () => {
      fireEvent.drop(dropZone, fileDropEvent(new File(["x"], "a.jpg", { type: "image/jpeg" })))
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(2)
    })
    const appended = useLibraryFlowStore.getState().flow!.stages[1]
    expect(appended.kind).toBe("input")
    expect(appended.params.source).toBe("data/input/cat-abc12345.png")
  })

  it("a NON-media file HARD-FAILS — toast error, no card spawned (no silent swallow)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { toast } = await import("sonner")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(
        dropZone,
        fileDropEvent(new File(["txt"], "notes.txt", { type: "text/plain" })),
      )
    })
    await act(async () => {})
    // No spurious card…
    expect(useLibraryFlowStore.getState().flow).toBeNull()
    // …and the rejection was SURFACED, not buried (the declarative contract:
    // never a silent no-op).
    expect(toast.error).toHaveBeenCalled()
  })

  it("a file type OUTSIDE the family's declared accepts hard-fails even if it's a known media type", async () => {
    // Narrow the input family's declaration to images only → a video drop must
    // hard-fail (the family no longer declares video ingestion). This is the
    // lever for "decide whether audio/video ops are good": flip the YAML list.
    primeCatalog({
      ...FAKE_CATALOG,
      families: { ...FAKE_CATALOG.families, input: { label: "Input Prep", genre: "image", accepts: ["image"] } },
    })
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { toast } = await import("sonner")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(dropZone, fileDropEvent(new File(["v"], "c.mp4", { type: "video/mp4" })))
    })
    await act(async () => {})
    expect(useLibraryFlowStore.getState().flow).toBeNull()
    expect(toast.error).toHaveBeenCalled()
  })

  it("an empty Files drag (files:[]) is a non-event — no card, no toast", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { toast } = await import("sonner")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { types: ["Files"], files: [], getData: () => "" },
      } as unknown as React.DragEvent)
    })
    expect(useLibraryFlowStore.getState().flow).toBeNull()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("dragOver a media file highlights the canvas + shows the Ops hint", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    act(() => {
      fireEvent.dragOver(dropZone, fileDragOverEvent())
    })
    expect(dropZone.className).toContain("ring-brand")
    expect(container.textContent).toContain("Drop to create an Ops card")
  })
})

describe("FlowCanvas — sidebar ASSET drop creates an Ops card (same gate, no readAsDataURL)", () => {
  // The asset path is the peer of the OS-file path: same gate
  // (familyAccepts), same Ops card (kind:"input"), same prefilled source.
  // The ONE difference: the asset url is already a URL (hosted or data:), so
  // it seeds `source` DIRECTLY — no readAsDataURL round-trip. These tests
  // pin that the sidebar→canvas drop works AND that the url is seeded
  // verbatim (not rewritten to a data: URL). 2026-08-09.

  it("dropping an IMAGE asset seeds a kind:'input' stage with the asset url VERBATIM (no readAsDataURL)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    expect(dropZone).toBeTruthy()

    await act(async () => {
      fireEvent.drop(
        dropZone,
        assetDropEvent({ url: "/api/artifacts/img-1.png", type: "image", name: "img-1.png", id: "img-1" }),
      )
    })

    // Asset drops are synchronous (no FileReader) — the stage lands immediately.
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.kind).toBe("input")
    expect(stage.service).toBe("input")
    expect(stage.title).toBe("Image Ops")
    // The asset url is seeded DIRECTLY — NOT a data: URL (proves no
    // readAsDataURL ran on the asset path).
    expect(stage.params.source).toBe("/api/artifacts/img-1.png")
  })

  it("dropping a VIDEO asset creates a Video Ops card", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(
        dropZone,
        assetDropEvent({ url: "https://cdn.example/clip.mp4", type: "video", name: "clip.mp4", id: "clip" }),
      )
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.kind).toBe("input")
    expect(stage.title).toBe("Video Ops")
    expect(stage.params.source).toBe("https://cdn.example/clip.mp4")
  })

  it("dropping an AUDIO asset creates an Audio Ops card", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(
        dropZone,
        assetDropEvent({ url: "/api/artifacts/vocals.mp3", type: "audio", name: "vocals.mp3", id: "voc" }),
      )
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.title).toBe("Audio Ops")
    expect(stage.params.source).toBe("/api/artifacts/vocals.mp3")
  })

  it("dropping a non-media asset (glb) HARD-FAILS — toast error, no card spawned", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { toast } = await import("sonner")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(
        dropZone,
        assetDropEvent({ url: "/api/artifacts/model.glb", type: "glb", name: "model.glb", id: "glb" }),
      )
    })
    await act(async () => {})
    // No card spawned — glb is outside the family's declared ingestion vocabulary.
    expect(useLibraryFlowStore.getState().flow).toBeNull()
    // The rejection was SURFACED (declarative contract: never a silent no-op).
    expect(toast.error).toHaveBeenCalled()
  })

  it("an asset whose type is OUTSIDE a narrowed accepts hard-fails (declaration is the lever)", async () => {
    // Narrow the input family to images only → a video ASSET drop must
    // hard-fail (same declarative lever as the OS-file path).
    primeCatalog({
      ...FAKE_CATALOG,
      families: { ...FAKE_CATALOG.families, input: { label: "Input Prep", genre: "image", accepts: ["image"] } },
    })
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { toast } = await import("sonner")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement

    await act(async () => {
      fireEvent.drop(
        dropZone,
        assetDropEvent({ url: "/api/artifacts/clip.mp4", type: "video", name: "clip.mp4", id: "clip" }),
      )
    })
    await act(async () => {})
    expect(useLibraryFlowStore.getState().flow).toBeNull()
    expect(toast.error).toHaveBeenCalled()
  })

  it("dragOver a sidebar asset highlights the canvas + shows the Ops hint (same as files)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    act(() => {
      fireEvent.dragOver(dropZone, assetDragOverEvent())
    })
    expect(dropZone.className).toContain("ring-brand")
    expect(container.textContent).toContain("Drop to create an Ops card")
  })
})
