// card-tile-drop.test.tsx — proves the CardTile drop target (Phase 3c).
//
// Per the approved plan: "CardTile + CardDetailInline are drop targets".
// CardTile accepts asset (application/tech-noir-asset) + OS file drops,
// resolves them to the card's FIRST input slot (lib/inputSlots.ts →
// firstInputSlot), and writes the URL through onAttachToSlot. Cards
// with no input slot are NOT drop targets (the drop is a no-op — no
// silent slot creation, no toast spam).
import { describe, it, expect, vi } from "vitest"
import { render, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { CardTile } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Edit image",
    kind: "generation",
    service: "qwen-edit-base",
    params: { prompt: "x", input_image: null },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

const DRAG_MIME = "application/tech-noir-asset"

function makeDrop(payload: Record<string, unknown> | null, file: File | null = null) {
  return {
    dataTransfer: {
      types: payload ? [DRAG_MIME] : ["Files"],
      files: file ? [file] : [],
      getData: (mime: string) =>
        payload && mime === DRAG_MIME ? JSON.stringify(payload) : "",
    },
  } as unknown as React.DragEvent
}

describe("CardTile — Phase 3c drop target", () => {
  it("an asset drop resolves to the first input slot + fires onAttachToSlot", () => {
    const onAttach = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage()}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onAttachToSlot={onAttach}
      />,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile).toBeTruthy()
    // The drop target carries its slot name as a data attribute — the
    // e2e + this test can assert which slot a drop would fill.
    expect(tile.getAttribute("data-drop-target")).toBe("input_image")
    act(() => {
      fireEvent.drop(tile, makeDrop({ url: "/v1/assets/cat.png", type: "image", name: "cat.png", id: "a1" }))
    })
    expect(onAttach).toHaveBeenCalledWith("input_image", "/v1/assets/cat.png")
  })

  it("prefers input_image over reference_image when both are present (firstInputSlot order)", () => {
    const onAttach = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ params: { prompt: "x", reference_image: null, input_image: null } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onAttachToSlot={onAttach}
      />,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile.getAttribute("data-drop-target")).toBe("input_image")
    act(() => {
      fireEvent.drop(tile, makeDrop({ url: "/assets/x.png" }))
    })
    expect(onAttach).toHaveBeenCalledWith("input_image", "/assets/x.png")
  })

  it("a card with NO input slots is NOT a drop target (no data-drop-target, no callback)", () => {
    const onAttach = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ params: { prompt: "no slots" } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onAttachToSlot={onAttach}
      />,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile.getAttribute("data-drop-target")).toBeNull()
    act(() => {
      fireEvent.drop(tile, makeDrop({ url: "/assets/x.png" }))
    })
    expect(onAttach).not.toHaveBeenCalled()
  })

  it("an OS file drop reads the bytes + writes a data: URL to the slot", async () => {
    const onAttach = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage()}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onAttachToSlot={onAttach}
      />,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    const file = new File(["hi"], "img.png", { type: "image/png" })
    await act(async () => {
      fireEvent.drop(tile, makeDrop(null, file))
    })
    // FileReader.readAsDataURL fires onload async. Poll, don't sleep: a
    // fixed timeout flakes under gate:1's 9-arm parallel load (observed
    // 2026-08-08 — 20ms wasn't enough for the read + handler chain).
    await waitFor(() => expect(onAttach).toHaveBeenCalledTimes(1))
    const [slot, url] = onAttach.mock.calls[0]
    expect(slot).toBe("input_image")
    expect(url).toMatch(/^data:image\/png;base64,/)
  })

  it("drop stopPropagation: does not bubble to a canvas-level handler", () => {
    const onAttach = vi.fn()
    const outerHandler = vi.fn()
    const { container } = renderWithTooltip(
      <div onDrop={outerHandler}>
        <CardTile
          stage={makeStage()}
          running={false}
          index={0}
          onOpen={() => {}}
          onRemove={() => {}}
          onAttachToSlot={onAttach}
        />
      </div>,
    )
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    act(() => {
      fireEvent.drop(tile, makeDrop({ url: "/assets/x.png" }))
    })
    expect(onAttach).toHaveBeenCalled()
    // The drop stopped propagating — the outer handler is NOT called.
    expect(outerHandler).not.toHaveBeenCalled()
  })
})
