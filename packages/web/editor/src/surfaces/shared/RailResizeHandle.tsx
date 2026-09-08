// RailResizeHandle — the rail's drag-to-resize edge (the DSH pattern,
// adapted): an 8px hit strip on the rail's left edge with pointer capture
// and rAF-throttled dx reporting, a hover/drag/focus pill affordance,
// keyboard resizing (role="separator"), and double-click to reset.
//
// jsdom note: pointer capture is an ENHANCEMENT here — the guard is the
// handle's own dragging ref (set on pointerdown), so drags still work
// where setPointerCapture is missing; the capture calls are optional and
// only upgrade out-of-frame drags.
import { useCallback, useEffect, useRef, useState } from "react"

interface RailResizeHandleProps {
  /** Current preferred width (aria-valuenow). */
  value: number
  min: number
  max: number
  onDragStart: () => void
  /** Raw dx since drag start (positive = pointer moved right = narrower). */
  onDrag: (dx: number) => void
  onDragEnd: () => void
  /** Keyboard nudge in px (positive = wider). */
  onNudge: (deltaPx: number) => void
  onReset: () => void
}

export function RailResizeHandle({
  value, min, max, onDragStart, onDrag, onDragEnd, onNudge, onReset,
}: RailResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const origin = useRef(0)
  const latest = useRef(0)
  const frame = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const callbacks = useRef({ onDragStart, onDrag, onDragEnd })
  callbacks.current = { onDragStart, onDrag, onDragEnd }

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Optional-call: upgrade to pointer capture when the platform has it.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    origin.current = e.clientX
    latest.current = e.clientX
    draggingRef.current = true
    callbacks.current.onDragStart()
    setDragging(true)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    latest.current = e.clientX
    frame.current ??= requestAnimationFrame(() => {
      frame.current = null
      callbacks.current.onDrag(latest.current - origin.current)
    })
  }, [])

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    draggingRef.current = false
    callbacks.current.onDrag(latest.current - origin.current)
    setDragging(false)
    callbacks.current.onDragEnd()
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // The handle rides the rail's LEFT edge: ArrowLeft/Up widen.
    const step =
      e.key === "ArrowLeft" || e.key === "ArrowUp" ? 16 :
      e.key === "ArrowRight" || e.key === "ArrowDown" ? -16 :
      e.key === "Home" ? max - value :
      e.key === "End" ? min - value :
      0
    if (step !== 0) {
      e.preventDefault()
      onNudge(step)
    }
  }, [max, min, onNudge, value])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize right panel"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-resizing={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none select-none outline-none"
    >
      {/* The floating pill — DSH's hover-reveal affordance. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[resizing=true]:opacity-100"
      />
    </div>
  )
}
