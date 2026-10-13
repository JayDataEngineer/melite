/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx, reworked 2026-10-31 (the rail-law audit):
 * the dead beat-selection arm is deleted (Layer C beats left the bar
 * 2026-09-15 — text mode only; the parser, the beat refs, and the
 * beat flag were a contract with no producer), junk clip ids no
 * longer clear the seat (a deselect is an explicit gesture — null,
 * the empty timeline, or the back button), and a stage switch resets
 * the selection (the bench slot can receive a new stage without
 * remounting; an index carried across stages points at a different
 * stage's call).
 */
import { useRef, useState } from "react"
import type { DocCall, LayerA } from "./docModel.ts"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts/timelineTypes"

/** Selection shared with the bar clips (tenant §2). */
export interface TimelineSelection {
  callIdx: number
}

/** THE DELETE-FOLLOW LAW (the rail-law audit, 2026-10-31): calls are
 *  INDEX-addressed, so a delete repoints the focused editor at
 *  whatever slid into the index unless the seat follows the doc.
 *  Deleting the SELECTED call clears the focus (the editor that
 *  replaces it would silently be a different call's); deleting an
 *  EARLIER call walks the focus back one so the editor stays on the
 *  call it was editing; anything else leaves the seat untouched.
 *
 *  @param selected the live selection (null = global rail).
 *  @param deletedId the bar/card delete gesture's clip id (`call-N`).
 *  @returns the selection the rail should hold after the delete. */
export function nextSelectionAfterDelete(
  selected: TimelineSelection | null,
  deletedId: string,
): TimelineSelection | null {
  if (selected == null || !/^call-\d+$/.test(deletedId)) return selected
  const i = Number(deletedId.slice("call-".length))
  if (i === selected.callIdx) return null
  if (i < selected.callIdx) return { callIdx: selected.callIdx - 1 }
  return selected
}

export function useViewSelection(calls: DocCall[], layerA: LayerA, stageId: string) {
  // View state (resets every mount — never persisted to params).
  const [frameIdx, setFrameIdx] = useState(0)

  // Selection state (2026-08-16, the user's directive: click a CALL
  // clip in the bar → the LEFT SIDEBAR populates that call's
  // inputs/options — the rail swaps to that call's editor).
  const [selected, setSelected] = useState<TimelineSelection | null>(null)
  const callCardRefs = useRef<(HTMLDivElement | null)[]>([])

  // THE STAGE-SEAM RESET (the rail-law audit, 2026-10-31): the bench
  // slot re-seats stages without remounting the tenant — a selection
  // index from stage A would ride stage B's calls until the bounds
  // guard happened to fire. Same during-render pattern as useShownDoc
  // P6: the first frame of the new stage shows no stage-A focus.
  const stageIdRef = useRef(stageId)
  if (stageIdRef.current !== stageId) {
    stageIdRef.current = stageId
    setSelected(null)
  }

  /** Bar clip id → the sidebar selection. `call-N` → that call's
   *  card; null = a click on the empty timeline — the sidebar shifts
   *  back to global params (the mode-switching rail: global ⇄ the
   *  selected call). An UNRECOGNIZED id changes nothing: only an
   *  explicit deselect gesture (null, the empty timeline, the back
   *  button) leaves the focused editor — a junk id is not one. */
  const handleTimelineSelect = (id: string | null) => {
    if (id === null) {
      setSelected(null)
      return
    }
    const callMatch = /^call-(\d+)$/.exec(id)
    if (callMatch !== null) setSelected({ callIdx: Number(callMatch[1]) })
  }

  // THE CLOCK DEFAULT'S ONE OWNER (the pin law, R2 2026-10-27):
  // Layer A hydrates fps OPTIONAL — an unstated doc never pins a
  // clock. Every downstream `fps: number` contract (useFilmSync,
  // useFilmAudio, useDerivedView, the panes) stays true because the
  // default rides HERE, once: DEFAULT_SEGMENT_PARAMS.fps, the same
  // seed stemToClip and callsToPrompts fall to at read.
  const fps = layerA.fps ?? DEFAULT_SEGMENT_PARAMS.fps
  const totalFrames = calls.length ? calls[calls.length - 1]!.end_frame : 1
  return {
    frameIdx, setFrameIdx, selected, setSelected,
    callCardRefs, handleTimelineSelect, fps, totalFrames,
  }
}
