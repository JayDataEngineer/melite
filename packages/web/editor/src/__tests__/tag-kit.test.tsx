// tag-kit — the tag presentational family regression contract.
//
// THE STABLE-REFERENCE RULE (what this file pins): every store subscription
// in tagKit must select the STABLE parent object (s.map / s.tags) and derive
// per-item values in the render body. A selector that mints a fresh reference
// per call — `s.map[key] ?? []` (new array when untagged) or `new Set(...)`
// (always new) — never equals the previous snapshot under Zustand's
// useSyncExternalStore (Object.is), so React re-renders forever and throws
// "Maximum update depth exceeded". That was the sidebar crash: the first
// store write at app mount (initTagSync's hydrate, which replaces the
// localStorage cache with the server copy) kicked every subscriber into the
// loop. The components now select stable references; this file proves the
// settle by doing exactly what initTagSync does — a setState at mount — and
// asserting the tree is stable afterward. With the old selectors, each of
// these renders threw the invariant.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render as renderBase, screen, fireEvent, act } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// tagKit components mount the Radix Tip (tooltip unification 2026-08-14) —
// render under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}
import { TagStrip, TagPicker, TagFilterBar } from "../components/ui/tagKit"
import { useTagMap, TagColor } from "@melite/catalog"

function mockLocalStorage() {
  let store: Record<string, string> = {}
  const ls = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
  Object.defineProperty(globalThis, "localStorage", { value: ls, writable: true, configurable: true })
  return ls
}

beforeEach(() => {
  mockLocalStorage()
  useTagMap.setState({ tags: {}, map: {} })
})

// ── TagStrip ──────────────────────────────────────────────────────────────
describe("TagStrip", () => {
  it("settles on a mount-time store write for an UNTAGGED item (the crash)", () => {
    // Untagged key is the sharpest case: the old selector returned a fresh
    // [] per call, looping even with no tags anywhere. Render both a strip
    // for the untagged item AND one that gets tagged by the write, so the
    // settle is observable both ways.
    renderWithTooltip(
      <>
        <TagStrip itemKey="untagged" />
        <TagStrip itemKey="img-1" />
      </>,
    )
    // initTagSync-style hydrate: replace the whole document at mount.
    act(() => {
      useTagMap.setState({
        tags: { a: { id: "a", name: "A", color: TagColor.sky } },
        map: { "img-1": ["a"] },
      })
    })
    // Second write — the settle must hold for any subsequent mutation.
    act(() => {
      useTagMap.setState({
        tags: {
          a: { id: "a", name: "A", color: TagColor.sky },
          b: { id: "b", name: "B", color: TagColor.rose },
        },
        map: { "img-1": ["a", "b"] },
      })
    })
    // Settled tree: the untagged item contributes nothing; no throw means no
    // loop (React's nested-update guard would have fired "Maximum update
    // depth exceeded" during the act() calls).
    expect(document.querySelectorAll('[aria-label="A"]')).toHaveLength(1)
    expect(document.querySelectorAll('[aria-label="B"]')).toHaveLength(1)
  })

  it("renders one compact dot per tag and derives from the live map", () => {
    act(() => {
      useTagMap.setState({
        tags: { a: { id: "a", name: "Alpha", color: TagColor.sky } },
        map: {},
      })
    })
    renderWithTooltip(<TagStrip itemKey="img-1" />)
    expect(screen.queryByLabelText("Alpha")).toBeNull() // not tagged yet
    act(() => {
      useTagMap.getState().addTagToItem("img-1", "a")
    })
    expect(screen.getByLabelText("Alpha")).toBeTruthy()
  })

  it("onClick reports the tag id of the clicked dot", () => {
    const onTag = vi.fn()
    act(() => {
      useTagMap.setState({
        tags: { a: { id: "a", name: "Alpha", color: TagColor.sky } },
        map: { "img-1": ["a"] },
      })
    })
    renderWithTooltip(<TagStrip itemKey="img-1" onClick={onTag} />)
    fireEvent.click(screen.getByLabelText("Alpha"))
    expect(onTag).toHaveBeenCalledWith("a")
  })
})

// ── TagPicker ─────────────────────────────────────────────────────────────
describe("TagPicker", () => {
  it("settles on a mount-time store write, then reflects the new state", () => {
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    act(() => {
      useTagMap.setState({
        tags: { a: { id: "a", name: "Alpha", color: TagColor.sky } },
        map: { "img-1": ["a"] },
      })
    })
    // Open the picker — the write happened BEFORE the popover mounted.
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    // Alpha is listed and checked (map says img-1 has it).
    const row = screen.getByText("Alpha").closest("button")!
    expect(row).toBeTruthy()
    // Toggle it off — the write path exercises the same selectors again.
    fireEvent.click(row)
    expect(useTagMap.getState().map["img-1"]).toBeUndefined()
  })

  it("row variant (default) uses the muted trigger — matches RowAction row", () => {
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    const trigger = screen.getByRole("button", { name: "Tag this item" })
    expect(trigger.className).toContain("text-muted-foreground/70")
    expect(trigger.className).not.toContain("bg-black/55")
  })

  it("tile variant uses the dark-translucent trigger — matches RowAction tile", () => {
    // The bug: AssetTile's hover layer put a faded text-muted-foreground/70
    // TagPicker trigger next to bright bg-black/55 RowActions — the tag icon
    // looked washed out. Tile variant matches the sibling RowActions.
    renderWithTooltip(<TagPicker itemKey="img-1" variant="tile" />)
    const trigger = screen.getByRole("button", { name: "Tag this item" })
    expect(trigger.className).toContain("bg-black/55")
    expect(trigger.className).toContain("text-foreground/80")
    expect(trigger.className).not.toContain("text-muted-foreground/70")
  })

  it("creates a tag from the input and attaches it to the item", () => {
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    fireEvent.change(screen.getByPlaceholderText("New tag…"), { target: { value: "Portrait" } })
    fireEvent.click(screen.getByLabelText("Add tag"))
    expect(useTagMap.getState().tags["portrait"]).toMatchObject({ name: "Portrait" })
    expect(useTagMap.getState().map["img-1"]).toEqual(["portrait"])
  })

  it("renames a tag via the row action (Enter commits)", () => {
    act(() => {
      useTagMap.setState({
        tags: { alpha: { id: "alpha", name: "Alpha", color: TagColor.sky } },
        map: {},
      })
    })
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    fireEvent.click(screen.getByLabelText("Rename tag Alpha"))
    // The row becomes an inline input, pre-filled + selected.
    const input = screen.getByLabelText("Rename Alpha") as HTMLInputElement
    fireEvent.change(input, { target: { value: "Star" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(useTagMap.getState().tags["alpha"].name).toBe("Star")
    // Rename mode is exited; the row shows the new name.
    expect(screen.getByText("Star")).toBeTruthy()
    expect(useTagMap.getState().tags["alpha"].id).toBe("alpha") // id stable
  })

  it("rename with an empty value cancels (keeps the old name)", () => {
    act(() => {
      useTagMap.setState({
        tags: { alpha: { id: "alpha", name: "Alpha", color: TagColor.sky } },
        map: {},
      })
    })
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    fireEvent.click(screen.getByLabelText("Rename tag Alpha"))
    const input = screen.getByLabelText("Rename Alpha") as HTMLInputElement
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(useTagMap.getState().tags["alpha"].name).toBe("Alpha")
  })

  it("Escape cancels rename without touching the store", () => {
    act(() => {
      useTagMap.setState({
        tags: { alpha: { id: "alpha", name: "Alpha", color: TagColor.sky } },
        map: {},
      })
    })
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    fireEvent.click(screen.getByLabelText("Rename tag Alpha"))
    const input = screen.getByLabelText("Rename Alpha") as HTMLInputElement
    fireEvent.change(input, { target: { value: "Beta" } })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(useTagMap.getState().tags["alpha"].name).toBe("Alpha")
    // Back to the toggle row, still showing the original name.
    expect(screen.getByLabelText("Add Alpha")).toBeTruthy()
  })

  it("deletes a tag via the row action — registry AND every item's map entry", () => {
    act(() => {
      useTagMap.setState({
        tags: { alpha: { id: "alpha", name: "Alpha", color: TagColor.sky } },
        map: { "img-1": ["alpha"], "img-2": ["alpha"] },
      })
    })
    renderWithTooltip(<TagPicker itemKey="img-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Tag this item" }))
    fireEvent.click(screen.getByLabelText("Delete tag Alpha"))
    expect(useTagMap.getState().tags["alpha"]).toBeUndefined()
    // The store action cleans the forward index everywhere, not just here.
    expect(useTagMap.getState().map["img-1"]).toBeUndefined()
    expect(useTagMap.getState().map["img-2"]).toBeUndefined()
  })
})

// ── TagFilterBar ──────────────────────────────────────────────────────────
describe("TagFilterBar", () => {
  it("settles on a mount-time store write and renders chips for the selection", () => {
    const onToggle = vi.fn()
    const view = renderWithTooltip(<TagFilterBar state={{ tagSelected: [], tagExcluded: [] }} onToggle={onToggle} onClear={vi.fn()} />)
    // Store write at mount (the crash scenario) — the bar subscribes to s.tags.
    act(() => {
      useTagMap.setState({
        tags: { a: { id: "a", name: "Alpha", color: TagColor.sky } },
        map: {},
      })
    })
    // A selection change from the parent re-renders with the chip.
    // rerender replaces the whole root — the TooltipProvider must ride along.
    view.rerender(
      <TooltipProvider>
        <TagFilterBar state={{ tagSelected: ["a"], tagExcluded: [] }} onToggle={onToggle} onClear={vi.fn()} />
      </TooltipProvider>,
    )
    expect(screen.getByText("Alpha")).toBeTruthy()
    fireEvent.click(screen.getByLabelText("Remove Alpha"))
    expect(onToggle).toHaveBeenCalledWith("a", "selected")
  })
})
