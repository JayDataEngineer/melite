// timelineScrollbar.spec.tsx — THE SCROLLBAR GEOMETRY LAW (the
// 2026-11-05 merge row's debt 1: the F1 visor zoom re-home created
// exported API surface with NO direct behavior test — 0% measured;
// vendored-provenance judged origin, not behavior). This wall pins
// the math the operator's hand feels: the thumb covers the visible
// window as a fraction of the full envelope (clamped 8–97%, capped
// below 100 so it never reads as a divider), pans left-to-right
// with panOffset across exactly the free track, centers when
// nothing is scrollable, and NEVER disappears (the wheel-only pan
// is undiscoverable — the row-census law). The zoom cluster's three
// seats ride the real DSH Button click: out 1/1.5, in 1.5, fit
// resetZoom.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { TimelineScrollbar } from "../src/timeline/TimelineScrollbar"
import type { TimelineMessage } from "../src/timeline/viser-timeline/messages"

afterEach(cleanup)

/** A minimal honest timeline: 97 real frames, zoom envelope 385
 * (max_frames_zoom) — the geometry arms ride one fixed envelope so
 * every percentage below is derived, not hand-tuned per case. */
const state = (over: Partial<TimelineMessage> = {}): TimelineMessage =>
  ({ start_frame: 0, end_frame: 96, max_frames_zoom: 385, ...over }) as TimelineMessage

function mount(zoomLevel: number, panOffset: number) {
  cleanup() // two mounts inside one arm: each reads ITS OWN thumb
  const zoomBy = vi.fn()
  const resetZoom = vi.fn()
  const { container } = render(h(TimelineScrollbar, {
    timelineState: state(),
    zoomLevel,
    panOffset,
    darkMode: false,
    scrollbarTrackRef: { current: null },
    onScrollbarTrackMouseDown: () => {},
    onScrollbarThumbMouseDown: () => {},
    zoomBy,
    resetZoom,
  }))
  const thumb = screen.getByTestId("timeline-scrollbar-thumb") as HTMLElement
  const left = Number.parseFloat(thumb.style.left)
  const width = Number.parseFloat(thumb.style.width)
  return { container, thumb, left, width, zoomBy, resetZoom }
}

describe("THE SCROLLBAR GEOMETRY LAW (thumb = visible fraction of the envelope, clamped 8-97)", () => {
  it("zoom 1: the thumb fills the track capped at 97% and centers (nothing to scroll)", () => {
    const { left, width } = mount(1, 0)
    // MUTATION KILLED: a cap removal (>97) makes the thumb a solid
    // bar — a divider, not a scrollbar.
    expect(width).toBe(97)
    // maxPan = 0 at zoom 1 → the centered seat, never left-anchored.
    expect(left).toBeCloseTo((100 - 97) / 2, 10)
  })

  it("zoom 2: the thumb is the visible half and pans the free track end-to-end", () => {
    // total 385, visible 192.5 → width 50%; maxPan 192.5.
    const start = mount(2, 0)
    expect(start.width).toBeCloseTo(50, 10)
    expect(start.left).toBe(0)
    const end = mount(2, 192.5)
    expect(end.left).toBeCloseTo(50, 10)
    // MUTATION KILLED: a pan-normalization break (pan/total instead
    // of pan/maxPan) lands the end-pan thumb past the track.
  })

  it("mid-pan sits proportionally: pan 154 of maxPan 308 at zoom 5 → left 40 of the free 80", () => {
    const { left, width } = mount(5, 154)
    expect(width).toBeCloseTo(20, 10)
    expect(left).toBeCloseTo(40, 10)
  })

  it("deep zoom floors the thumb at 8% — never an unusable sliver", () => {
    // total 385, visible 7.7 → raw 2% → clamped 8.
    const { width } = mount(50, 0)
    expect(width).toBe(8)
  })

  it("the scrollbar NEVER disappears (the wheel-only pan is undiscoverable)", () => {
    const { thumb } = mount(1, 0)
    // showScrollbar is hardcoded true; the law is the ELEMENT, not
    // a computed flag — an envelope/visibility regression dies here.
    expect(thumb).toBeTruthy()
  })

  it("the zoom cluster's three seats: out 1/1.5, fit resetZoom, in 1.5 — through the real Button click", () => {
    const { zoomBy, resetZoom } = mount(1, 0)
    fireEvent.click(screen.getByTestId("timeline-zoom-out"))
    expect(zoomBy).toHaveBeenCalledWith(1 / 1.5)
    fireEvent.click(screen.getByTestId("timeline-zoom-fit"))
    expect(resetZoom).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId("timeline-zoom-in"))
    expect(zoomBy).toHaveBeenLastCalledWith(1.5)
    // MUTATION KILLED: swapping the cluster's directions (in/out) or
    // dead-wiring fit leaves the operator's hand with inverted zoom.
  })
})
