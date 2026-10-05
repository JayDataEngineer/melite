/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useRef, useState } from "react"
import type { DocCall, LayerA } from "./docModel.ts"

/** Selection shared with the bar clips (tenant §2). Verbatim lines 1561–1590. */
export interface TimelineSelection {
  callIdx: number
  beatIdx?: number
}
export function useViewSelection(calls: DocCall[], layerA: LayerA) {
  // View state (resets every mount — never persisted to params).
  const [frameIdx, setFrameIdx] = useState(0)

  // Selection state (2026-08-16, the user's directive: click a CALL or
  // BEAT clip in the bar → the LEFT SIDEBAR populates that item's
  // inputs/options — the rail scrolls the selected call card / segment
  // row into view with its ring).
  const [selected, setSelected] = useState<{ callIdx: number; beatIdx?: number } | null>(null)
  const callCardRefs = useRef<(HTMLDivElement | null)[]>([])
  const beatRowRefs = useRef<(HTMLDivElement | null)[][]>([])

  /** Bar clip id → the sidebar selection. `call-N` → that call's card;
   * `beat-i-j` → call i's segment j (Layer C). null = a click on the
   * empty timeline — the sidebar shifts back to global params (the
   * mode-switching rail: global ⇄ the selected item). */
  const handleTimelineSelect = (id: string | null) => {
    if (id === null) {
      setSelected(null)
      return
    }
    const callMatch = /^call-(\d+)$/.exec(id)
    const beatMatch = /^beat-(\d+)-(\d+)$/.exec(id)
    let next: { callIdx: number; beatIdx?: number } | null = null
    if (beatMatch) next = { callIdx: Number(beatMatch[1]), beatIdx: Number(beatMatch[2]) }
    else if (callMatch) next = { callIdx: Number(callMatch[1]) }
    setSelected(next)
  }

  const fps = layerA.fps
  const totalFrames = calls.length ? calls[calls.length - 1]!.end_frame : 1
  return {
    frameIdx, setFrameIdx, selected, setSelected,
    callCardRefs, beatRowRefs, handleTimelineSelect, fps, totalFrames,
  }
}
