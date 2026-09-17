// timelineScrubBar.spec.tsx — the form card's optional BOTTOM SEAM
// (the generic-tools stroke 2026-09-17): pointer → fraction → seek,
// drag capture, the inert duration<=0 arm, the readout's time/frame
// columns, and the optional transport toggle.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { TimelineScrubBar } from "../timeline/TimelineScrubBar"

afterEach(cleanup)

describe("TimelineScrubBar (the form card's bottom seam)", () => {
  it("renders the playhead at current/duration with the time readout", () => {
    render(h(TimelineScrubBar, { current: 3, duration: 12, onSeek: () => {} }))
    const track = screen.getByTestId("timeline-scrub-track")
    expect(track.getAttribute("aria-valuenow")).toBe("3")
    expect(track.getAttribute("aria-valuemax")).toBe("12")
    expect(screen.getByTestId("timeline-scrub-readout").textContent).toBe("3.0s / 12.0s")
    // the head sits at 25%
    const head = track.querySelector("div:last-child") as HTMLElement
    expect(head.style.left).toBe("25.000%")
  })

  it("the readout carries the frame column when fps rides", () => {
    render(h(TimelineScrubBar, { current: 1, duration: 4, onSeek: () => {}, fps: 24 }))
    expect(screen.getByTestId("timeline-scrub-readout").textContent).toBe("1.0s / 4.0s · frame 24/96")
  })

  it("minutes format past 60s", () => {
    render(h(TimelineScrubBar, { current: 65, duration: 125, onSeek: () => {} }))
    expect(screen.getByTestId("timeline-scrub-readout").textContent).toBe("1:05 / 2:05")
  })

  it("a click on the track seeks to the pointer's fraction (clamped)", () => {
    const onSeek = vi.fn()
    render(h(TimelineScrubBar, { current: 0, duration: 10, onSeek }))
    const track = screen.getByTestId("timeline-scrub-track")
    // happy-dom returns zero rects — pin one: 100px wide, x=0
    Object.defineProperty(track, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 100, bottom: 18, width: 100, height: 18, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.pointerDown(track, { clientX: 75, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(7.5)
    fireEvent.pointerDown(track, { clientX: -50, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(0)
    fireEvent.pointerDown(track, { clientX: 999, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(10)
  })

  it("drag moves with capture; release ends the drag", () => {
    const onSeek = vi.fn()
    render(h(TimelineScrubBar, { current: 0, duration: 10, onSeek }))
    const track = screen.getByTestId("timeline-scrub-track")
    Object.defineProperty(track, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 100, bottom: 18, width: 100, height: 18, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    const capture = vi.fn()
    track.setPointerCapture = capture as unknown as typeof track.setPointerCapture
    const release = vi.fn()
    track.releasePointerCapture = release as unknown as typeof track.releasePointerCapture
    fireEvent.pointerDown(track, { clientX: 10, pointerId: 7 })
    expect(capture).toHaveBeenCalledWith(7)
    // the dragging mark rides the BAR root (the track is the inner slider)
    expect(screen.getByTestId("timeline-scrub-bar").getAttribute("data-dragging")).toBe("true")
    fireEvent.pointerMove(track, { clientX: 90, pointerId: 7 })
    expect(onSeek).toHaveBeenLastCalledWith(9)
    fireEvent.pointerUp(track, { pointerId: 7 })
    expect(release).toHaveBeenCalledWith(7)
    expect(screen.getByTestId("timeline-scrub-bar").hasAttribute("data-dragging")).toBe(false)
    // a move after release never seeks
    onSeek.mockClear()
    fireEvent.pointerMove(track, { clientX: 50, pointerId: 7 })
    expect(onSeek).not.toHaveBeenCalled()
  })

  it("duration <= 0 renders INERT (no seek on any pointer)", () => {
    const onSeek = vi.fn()
    render(h(TimelineScrubBar, { current: 0, duration: 0, onSeek }))
    const track = screen.getByTestId("timeline-scrub-track")
    expect(track.getAttribute("aria-valuemax")).toBe("0")
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 })
    fireEvent.pointerMove(track, { clientX: 80, pointerId: 1 })
    expect(onSeek).not.toHaveBeenCalled()
    expect(screen.getByTestId("timeline-scrub-readout").textContent).toBe("0.0s / 0.0s")
  })

  it("the optional transport toggle rides (glyph + click)", () => {
    const onTogglePlay = vi.fn()
    const { rerender } = render(h(TimelineScrubBar, { current: 0, duration: 10, onSeek: () => {}, onTogglePlay }))
    const btn = screen.getByTestId("timeline-scrub-toggle")
    expect(btn.getAttribute("aria-label")).toBe("Play")
    expect(btn.textContent).toBe("▶")
    fireEvent.click(btn)
    expect(onTogglePlay).toHaveBeenCalledTimes(1)
    rerender(h(TimelineScrubBar, { current: 0, duration: 10, onSeek: () => {}, onTogglePlay, playing: true }))
    expect(screen.getByTestId("timeline-scrub-toggle").getAttribute("aria-label")).toBe("Pause")
    expect(screen.getByTestId("timeline-scrub-toggle").textContent).toBe("❚❚")
    // no toggle prop → no button
    rerender(h(TimelineScrubBar, { current: 0, duration: 10, onSeek: () => {} }))
    expect(screen.queryByTestId("timeline-scrub-toggle")).toBeNull()
  })

  it("a zero-width track rect never divides by zero", () => {
    const onSeek = vi.fn()
    render(h(TimelineScrubBar, { current: 0, duration: 10, onSeek }))
    const track = screen.getByTestId("timeline-scrub-track")
    Object.defineProperty(track, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 })
    expect(onSeek).not.toHaveBeenCalled()
  })
})
