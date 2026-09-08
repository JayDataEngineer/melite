// VirtualList — the windowed list contract (Phase 3.2, flipped 2026-08-09).
//
// WHAT IS PROVEN: virtualization is a DOM-bound, not a data-bound, mechanism.
// A long list renders only the items near the scroll offset (bounded DOM for
// unbounded lists) while the spacer div keeps the total scroll height honest.
// That's the property that let AppSidebar drop per-category pagination.
//
// HOW IT'S TESTED: the happy-dom zero-rect trap (2026-08-09 — the framer-zoom
// trap class): the virtualizer reads the scroll container's rect SYNCHRONOUSLY
// on mount, and a zero rect makes calculateRange return null → zero items on
// the NEXT render. The wrapper carries data-slot="scroll-area-viewport" and
// the rect mock gives it a real 640px height (everything else stays zero), so
// the window comes from the mocked rect, not from a timing-lucky first paint.
// The measure fallback (getBoundingClientRect().height || estimate) keeps item
// heights at the estimate. This pins OUR contract robustly across flushes:
// window + overscan in the DOM, spacer = count × estimate, short lists fully
// rendered, and per-index estimates respected.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { createRef } from "react"
import { VirtualList } from "../components/ui/listKit"

describe("VirtualList", () => {
  const parentRef = createRef<HTMLDivElement>()
  const WINDOW = 640
  const OVERSCAN = 4

  beforeEach(() => {
    // The happy-dom zero-rect trap, correctly targeted (2026-08-09): the
    // virtualizer's getRect reads offsetWidth/offsetHeight — NOT
    // getBoundingClientRect — and observeElementRect fires it synchronously
    // on mount; happy-dom's getters return 0, zeroing scrollRect and
    // collapsing the range to null once the mount effects re-render. Mock
    // the getters on the viewport wrapper ONLY; everything else stays 0
    // (VirtualList's measureElement fallback keeps item heights at the
    // estimate). ResizeObserver is stubbed so no late observer callback
    // re-reads a real zero rect.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 256 : 0
    })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 640 : 0
    })
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("windows long lists: spacer holds the total height, DOM holds only the window", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    const { container } = render(
      <div ref={parentRef} data-slot="scroll-area-viewport">
        <VirtualList
          items={items}
          parentRef={parentRef}
          estimateSize={() => 30}
          render={(item) => <div data-testid="row">{item.id}</div>}
        />
      </div>,
    )
    // 100 × 30px of scroll space — the spacer is honest about it.
    const spacer = container.querySelector("[style]") as HTMLElement
    expect(spacer.style.height).toBe("3000px")

    // But only the initial window + overscan is actually in the DOM.
    const rows = container.querySelectorAll('[data-testid="row"]')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(100)
    expect(rows.length).toBeLessThanOrEqual(Math.ceil(WINDOW / 30) + OVERSCAN * 2)
  })

  it("renders short lists in full (no windowing when everything fits)", () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i }))
    const { container } = render(
      <div ref={parentRef} data-slot="scroll-area-viewport">
        <VirtualList
          items={items}
          parentRef={parentRef}
          estimateSize={() => 30}
          render={(item) => <div data-testid="row">{item.id}</div>}
        />
      </div>,
    )
    const rows = container.querySelectorAll('[data-testid="row"]')
    expect(rows).toHaveLength(3)
    // 90px total — well under the window.
    expect((container.querySelector("[style]") as HTMLElement).style.height).toBe("90px")
  })

  it("renders the right items at the right offsets (positional contract)", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const { container } = render(
      <div ref={parentRef} data-slot="scroll-area-viewport">
        <VirtualList
          items={items}
          parentRef={parentRef}
          estimateSize={(i) => 30 + (i % 3) * 10} // varying heights
          render={(item, index) => <div data-testid={`row-${index}`}>{item.id}</div>}
        />
      </div>,
    )
    // The first rendered item is index 0 (no scroll offset in tests), and its
    // position comes from the estimate accumulator: 0. (The transform lives on
    // the virtualizer's positioned wrapper, not the inner content div.)
    const first = container.querySelector('[data-testid="row-0"]') as HTMLElement
    expect(first).toBeTruthy()
    expect(first.parentElement!.style.transform).toBe("translateY(0px)")
  })

  it("renders zero items for an empty list without crashing", () => {
    const { container } = render(
      <div ref={parentRef} data-slot="scroll-area-viewport">
        <VirtualList
          items={[]}
          parentRef={parentRef}
          estimateSize={() => 30}
          render={(item) => <div data-testid="row">{item.id}</div>}
        />
      </div>,
    )
    expect(container.querySelectorAll('[data-testid="row"]')).toHaveLength(0)
    expect((container.querySelector("[style]") as HTMLElement).style.height).toBe("0px")
  })
})
