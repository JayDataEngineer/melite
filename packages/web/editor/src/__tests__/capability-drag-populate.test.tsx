// capability-drag-populate.test.tsx — the sidebar→canvas drag flow (2026-08-08).
//
// "I NEED TO CLICK AND DRAG TO MIDDLE. WHEN I DROP IT IN MIDDLE THE CARD
// NEEDS TO APPEAR." Drag a capability tile from the LibrarySidebar, drop it
// on the canvas (the middle), and a NEW card lands — the SAME addStage path
// as clicking the tile. Three layers, one spec:
//
//   1. The LibrarySidebar tile is a DRAG SOURCE — onDragStart writes
//      application/tech-noir-capability with the resolved card.
//   2. The FlowCanvas is a DROP TARGET for that MIME — drop creates a
//      new stage via addStage. Works on BOTH the empty canvas (first card)
//      and a populated canvas (appends a card).
//   3. A capability drop on an existing CARD bubbles to the canvas — the
//      card's onDrop only claims asset/file drops, so dragging onto a card
//      still creates a new card (doesn't get swallowed).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render as renderBase, fireEvent, act, cleanup, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// LibrarySidebar tiles mount the Radix Tip (tooltip unification 2026-08-14)
// — render under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}
import {
  CAPABILITY_DRAG_MIME,
  capabilityDragPayload,
  parseCapabilityDrop,
} from "@melite/formats"
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { primeCatalog, type Catalog } from "@melite/catalog"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
  const fn = vi.fn()
  return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})
// ServicePicker pulls the catalog + owns its own dialog; not under test here.
// Stub it so FlowCanvas renders in isolation.
vi.mock("../surfaces/flow/ServicePicker", () => ({
  ServicePicker: (): null => null,
}))

const FAKE_CATALOG: Catalog = {
  families: {
    "krea-2": { label: "Krea 2", genre: "image" },
    "qwen-edit": { label: "Qwen Edit", genre: "image" },
  },
  models: {
    "krea-2": { family: "krea-2", form: "form_generate", label: "Krea 2", prompt_in_form: true },
    "qwen-edit-base": { family: "qwen-edit", form: "form_edit", label: "Qwen Edit", input: "input_image", prompt_in_form: true },
  },
  capabilities: {
    image: {
      label: "Generate",
      kind: "generation",
      default_family: "krea-2",
      families: ["krea-2"],
      resolved: { family: "krea-2", model: "krea-2", params: { width: 1024 } },
    },
    image_edit: {
      label: "Edit",
      kind: "generation",
      default_family: "qwen-edit",
      families: ["qwen-edit"],
      resolved: { family: "qwen-edit", model: "qwen-edit-base", params: {} },
    },
  },
}

/** A synthetic drop event carrying a capability MIME payload. */
function capDropEvent(card: { service: string; title: string; params: Record<string, unknown>; kind?: "generation" }) {
  const payload = capabilityDragPayload("cap", card)
  return {
    dataTransfer: {
      types: [CAPABILITY_DRAG_MIME],
      files: [],
      getData: (mime: string) => (mime === CAPABILITY_DRAG_MIME ? payload : ""),
    },
  } as unknown as React.DragEvent
}

/** A synthetic dragOver event for the capability MIME. */
function capDragOverEvent() {
  return {
    dataTransfer: { types: [CAPABILITY_DRAG_MIME], files: [] },
  } as unknown as React.DragEvent
}

beforeEach(() => {
  primeCatalog(FAKE_CATALOG)
  useLibraryFlowStore.getState().clear()
})
afterEach(cleanup)

describe("capabilityCards — drag payload codec", () => {
  it("round-trips a resolved card through the MIME payload", () => {
    const raw = capabilityDragPayload("image", {
      service: "krea-2",
      title: "Generate",
      params: { prompt: "", width: 1024 },
    })
    const parsed = parseCapabilityDrop(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.service).toBe("krea-2")
    expect(parsed!.title).toBe("Generate")
    expect(parsed!.params.width).toBe(1024)
    expect(parsed!.capId).toBe("image")
  })

  it("parseCapabilityDrop returns null for malformed payloads", () => {
    expect(parseCapabilityDrop("")).toBeNull()
    expect(parseCapabilityDrop("not json")).toBeNull()
    expect(parseCapabilityDrop(JSON.stringify({ service: "x" }))).toBeNull()
  })
})

describe("LibrarySidebar — drag source", () => {
  it("the capability tile writes the capability MIME on dragStart", async () => {
    const { LibrarySidebar } = await import("../surfaces/library/LibrarySidebar")
    const { container } = renderWithTooltip(<LibrarySidebar />)
    // Target the Generate tile specifically (tiles are sorted alphabetically
    // by label within a genre, so the first tile is "Edit" — query by id).
    await waitFor(() => {
      expect(container.querySelector('[data-capability-tile="image"]')).toBeTruthy()
    })
    const tile = container.querySelector('[data-capability-tile="image"]') as HTMLElement
    expect(tile.getAttribute("draggable")).toBe("true")

    let captured = ""
    act(() => {
      fireEvent.dragStart(tile, {
        dataTransfer: {
          types: [] as string[],
          setData: (mime: string, data: string) => {
            if (mime === CAPABILITY_DRAG_MIME) captured = data
          },
          effectAllowed: "uninitialized",
        },
      } as unknown as React.DragEvent)
    })
    const parsed = parseCapabilityDrop(captured)
    expect(parsed).not.toBeNull()
    expect(parsed!.service).toBe("krea-2")
    expect(parsed!.title).toBe("Generate")
    expect(parsed!.params.width).toBe(1024)
  })
})

describe("FlowCanvas — capability drop creates a card", () => {
  it("dropping on the EMPTY canvas lands the first card (addStage)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    // Empty state: the drop target carries data-canvas-drop="empty".
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    expect(dropZone).toBeTruthy()

    await act(async () => {
      fireEvent.drop(
        dropZone,
        capDropEvent({ service: "krea-2", title: "Generate", params: { prompt: "", width: 1024 } }),
      )
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.service).toBe("krea-2")
    expect(stage.title).toBe("Generate")
    expect(stage.params.width).toBe(1024)
    // addStage auto-creates the flow if none exists.
    expect(useLibraryFlowStore.getState().flow).toBeTruthy()
  })

  it("dropping on a POPULATED canvas appends a card", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    // Seed one card so the canvas renders the populated grid.
    await useLibraryFlowStore.getState().addStage({
      kind: "generation",
      service: "qwen-edit-base",
      title: "Edit",
      params: { prompt: "", input_image: null },
    })
    expect(useLibraryFlowStore.getState().flow!.stages).toHaveLength(1)

    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="populated"]') as HTMLElement
    expect(dropZone).toBeTruthy()

    await act(async () => {
      fireEvent.drop(
        dropZone,
        capDropEvent({ service: "krea-2", title: "Generate", params: { prompt: "" } }),
      )
    })
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(2)
    })
    const appended = useLibraryFlowStore.getState().flow!.stages[1]
    expect(appended.service).toBe("krea-2")
    expect(appended.title).toBe("Generate")
  })

  it("a capability drop ON A CARD bubbles to the canvas — the card does not swallow it", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    // Seed a card whose onDrop claims ASSET drops (with stopPropagation) but
    // must let a CAPABILITY drop bubble to the canvas.
    await useLibraryFlowStore.getState().addStage({
      kind: "generation",
      service: "qwen-edit-base",
      title: "Edit",
      params: { prompt: "", input_image: null },
    })

    const { container } = renderWithTooltip(<FlowCanvas />)
    const cardTile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(cardTile).toBeTruthy()

    await act(async () => {
      fireEvent.drop(
        cardTile,
        capDropEvent({ service: "krea-2", title: "Generate", params: { prompt: "" } }),
      )
    })
    // The card did NOT handle the capability drop — it bubbled to the canvas,
    // which added a new card.
    await waitFor(() => {
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(2)
    })
  })

  it("dragOver highlights the canvas (data-canvas-drop lights up for the capability MIME)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    act(() => {
      fireEvent.dragOver(dropZone, capDragOverEvent())
    })
    // The dragOver highlight ring class is applied.
    expect(dropZone.className).toContain("ring-brand")
  })

  it("a NON-capability drop on the canvas is ignored (no spurious card)", async () => {
    const { FlowCanvas } = await import("../surfaces/flow/FlowCanvas")
    const { container } = renderWithTooltip(<FlowCanvas />)
    const dropZone = container.querySelector('[data-canvas-drop="empty"]') as HTMLElement
    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { types: ["Files"], files: [], getData: () => "" },
      } as unknown as React.DragEvent)
    })
    expect(useLibraryFlowStore.getState().flow).toBeNull()
  })

  it("a fire-and-forget recompute does NOT resurrect a cleared flow (2026-08-08 full-suite flake)", async () => {
    // The flake: the canvas drop handler fires `void addStage(...)` (no
    // await). addStage awaits _recomputeKeys, which captures the flow
    // snapshot at entry and unconditionally set()s it back on finish.
    // computeCacheKey awaits crypto.subtle.digest — a REAL suspension — so
    // clear() (next test's beforeEach) can land mid-recompute and the stale
    // snapshot resurrects the flow. This test pins the race
    // DETERMINISTICALLY by deferring the digest: the recompute suspends,
    // clear() runs, the digest resolves, and the flow MUST stay null.
    let release: ((b: ArrayBuffer) => void) | null = null
    const gate = new Promise<ArrayBuffer>((resolve) => { release = resolve })
    const digestSpy = vi.spyOn(crypto.subtle, "digest").mockImplementation(() => gate)
    try {
      const store = useLibraryFlowStore.getState()
      // Awaited addStage — its recompute suspends on the deferred digest.
      const seeded = store.addStage({
        kind: "generation",
        service: "qwen-edit-base",
        title: "Edit",
        params: { prompt: "" },
      })
      await act(async () => {}) // the set() lands; the recompute is suspended
      // Drop-style fire-and-forget (exactly what onCanvasDrop does).
      void store.addStage({
        kind: "generation",
        service: "krea-2",
        title: "Generate",
        params: { prompt: "" },
      })
      await act(async () => {})
      expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(2)

      // Clear while BOTH recomputes are in flight — the race window.
      useLibraryFlowStore.getState().clear()
      expect(useLibraryFlowStore.getState().flow).toBeNull()

      // The digest resolves: the recomputes finish with STALE snapshots.
      release?.(new ArrayBuffer(1))
      await act(async () => {})
      await seeded

      // Pre-fix, the stale recompute set() resurrected the old flow
      // here (the observed `expected { id: 'p_…' } to be null` failure).
      expect(useLibraryFlowStore.getState().flow).toBeNull()
    } finally {
      digestSpy.mockRestore()
    }
  })
})

describe("CardTile — capability drop does not claim the asset path (regression)", () => {
  it("an asset drop on a slotted card still attaches + stopPropagation (unchanged)", async () => {
    const { CardTile } = await import("../surfaces/flow/FlowCard")
    type CardStage = import("@melite/contracts").CardStage
    const onAttach = vi.fn()
    const outer = vi.fn()
    const stage: CardStage = {
      id: "s0", title: "Edit", kind: "generation", service: "qwen-edit-base",
      params: { prompt: "x", input_image: null }, inputs: [], inputIndices: [],
      result: null, status: "pending", meta: {},
    }
    const { container } = renderWithTooltip(
      <div onDrop={outer}>
        <CardTile stage={stage} running={false} index={0} onOpen={() => {}} onRemove={() => {}} onAttachToSlot={onAttach} />
      </div>,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    act(() => {
      fireEvent.drop(tile, {
        dataTransfer: {
          types: ["application/tech-noir-asset"],
          files: [],
          getData: (m: string) =>
            m === "application/tech-noir-asset"
              ? JSON.stringify({ url: "/assets/x.png" })
              : "",
        },
      } as unknown as React.DragEvent)
    })
    expect(onAttach).toHaveBeenCalledWith("input_image", "/assets/x.png")
    expect(outer).not.toHaveBeenCalled()
  })
})
