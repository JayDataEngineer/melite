// slot-square.spec.tsx — proves the shared design-system square shell.
//
// SlotSquare (surfaces/shared) is THE square for any slot-shaped value —
// the flow's wireable input slots today, the modifier sub-cards
// (loras etc.) later. It owns the file/asset drop internals; consumers
// own the persistence. This file pins the shell contract:
//   • label under the square + thumbnail for a value
//   • asset drop (application/tech-noir-asset payload) → onDropAsset
//   • OS file drop → onDropFile
//   • the pick button drives the hidden input → onPickFile
//   • Detach (title) fires onClear; hidden when no value
//   • disabled squares do nothing (opacity + no handlers)
//   • sm (tile strip) vs md (detail grid) sizing
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { SlotSquare, ASSET_DRAG_MIME } from "@melite/ui"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

const ASSET_PAYLOAD = JSON.stringify({
  url: "/v1/assets/cat.png",
  type: "image",
  name: "cat.png",
  id: "asset_1",
})

function dropOn(el: HTMLElement, mime: string, payload: string, files: File[] = []) {
  fireEvent.dragOver(el, {
    dataTransfer: { types: [mime, ...(files.length ? ["Files"] : [])], files },
  } as unknown as React.DragEvent)
  fireEvent.drop(el, {
    dataTransfer: {
      types: [mime, ...(files.length ? ["Files"] : [])],
      files,
      getData: (m: string) => (m === mime ? payload : ""),
    },
  } as unknown as React.DragEvent)
}

describe("SlotSquare — the shared square shell", () => {
  it("renders the label under an empty placeholder when no value", () => {
    renderWithTooltip(<SlotSquare label="input_image" />)
    expect(screen.getByText("input_image")).toBeTruthy()
    // Empty → dashed placeholder, no thumbnail.
    expect(document.querySelector('[data-slot-square] img')).toBeNull()
    expect(document.querySelector('[data-slot-square]')).toBeTruthy()
  })

  it("renders an image thumbnail for a data: URL value", () => {
    renderWithTooltip(<SlotSquare label="input_image" value="data:image/png;base64,xxx" />)
    const img = document.querySelector('[data-slot-square] img') as HTMLImageElement
    expect(img?.src).toMatch(/^data:image\/png/)
  })

  it("asset drop resolves the payload URL → onDropAsset", () => {
    const onDropAsset = vi.fn()
    renderWithTooltip(<SlotSquare label="input_image" onDropAsset={onDropAsset} />)
    dropOn(document.querySelector("[data-slot-square]") as HTMLElement, ASSET_DRAG_MIME, ASSET_PAYLOAD)
    expect(onDropAsset).toHaveBeenCalledWith("/v1/assets/cat.png")
  })

  it("an OS file drop → onDropFile", () => {
    const onDropFile = vi.fn()
    renderWithTooltip(<SlotSquare label="input_image" onDropFile={onDropFile} />)
    const file = new File(["fake"], "cat.png", { type: "image/png" })
    dropOn(document.querySelector("[data-slot-square]") as HTMLElement, "Files", "", [file])
    expect(onDropFile).toHaveBeenCalledWith(file)
  })

  it("the pick button opens the hidden file input → onPickFile", async () => {
    const onPickFile = vi.fn()
    renderWithTooltip(<SlotSquare label="input_image" onPickFile={onPickFile} />)
    const file = new File(["fake"], "cat.png", { type: "image/png" })
    const input = document.querySelector('[data-slot-square] input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    act(() => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    // onPickFile fires synchronously from the change handler (the async
    // read happens in the CONSUMER) — waitFor for the pick to land.
    await waitFor(() => expect(onPickFile).toHaveBeenCalledWith(file))
  })

  it("Detach fires onClear only when a value is set", () => {
    const onClear = vi.fn()
    const { rerender } = renderWithTooltip(<SlotSquare label="input_image" onClear={onClear} />)
    // No value → no Detach button (nothing to detach).
    expect(screen.queryByRole("button", { name: "Detach" })).toBeNull()
    rerender(
      <TooltipProvider>
        <SlotSquare label="input_image" value="/v1/assets/cat.png" onClear={onClear} />
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Detach" }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it("disabled squares ignore drops and hide the pick button", () => {
    const onDropAsset = vi.fn()
    const onPickFile = vi.fn()
    renderWithTooltip(<SlotSquare label="input_image" disabled onDropAsset={onDropAsset} onPickFile={onPickFile} />)
    dropOn(document.querySelector("[data-slot-square]") as HTMLElement, ASSET_DRAG_MIME, ASSET_PAYLOAD)
    expect(onDropAsset).not.toHaveBeenCalled()
    expect(document.querySelector("[data-slot-pick]")).toBeNull()
  })

  it("sm renders the compact size, md the LARGER detail size (2026-08-08: 'the little square can be bigger, more clear')", () => {
    const { container } = renderWithTooltip(<SlotSquare label="a" size="sm" />)
    expect(container.querySelector("[data-slot-square]")?.className).toContain("h-9")
    const { container: md } = renderWithTooltip(<SlotSquare label="b" size="md" />)
    expect(md.querySelector("[data-slot-square]")?.className).toContain("h-20")
  })
})
