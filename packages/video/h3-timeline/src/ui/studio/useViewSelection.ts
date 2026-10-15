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
 *
 * DEFECT B + THE SUBMENU LAW (operator 2026-11-06): the rail holds
 * DISTINCT, NON-OVERLAPPING submenus reached BY CLICKING ON THE
 * TIMELINE BAR — audio, model call, keyframes — each left by its own
 * back-to-global verb at the top. The old Layer A "fold" is dead:
 * nothing collapses; the rail is exactly ONE view at a time. The
 * model-call arm rides `selected` (its historical shape); `sub` owns
 * the audio and keyframes arms. Mutually exclusive in BOTH
 * directions: entering any submenu clears the others; picking a call
 * leaves every other submenu.
 */
import { useRef, useState } from "react"
import type { DocCall, LayerA } from "./docModel.ts"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts/timelineTypes"

/** Selection shared with the bar clips (tenant §2). */
export interface TimelineSelection {
  callIdx: number
}

/** The rail's non-call submenus (the submenu law): the audio lanes'
 * editor and the standalone keyframes editor. `null` = global view. */
export type RailSub = "audio" | "keyframes" | null

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
  // THE SUBMENU SEAT (the submenu law, defect B's generalization):
  // "audio" | "keyframes" | null. Selected + sub are never both
  // live — enterSub clears the call focus, a call pick clears sub.
  const [sub, setSub] = useState<RailSub>(null)
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
    setSub(null)
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
      setSub(null)
      return
    }
    const callMatch = /^call-(\d+)$/.exec(id)
    // a call pick leaves every other submenu (the rail's views are
    // mutually exclusive — the submenu law's ban, both directions).
    if (callMatch !== null) { setSub(null); setSelected({ callIdx: Number(callMatch[1]) }) }
  }

  /** Enters a bar-navigated submenu (the strip's doors): the call
   *  focus clears — the submenu renders ALONE, nothing else rides. */
  const enterSub = (next: Exclude<RailSub, null>): void => {
    setSelected(null)
    setSub(next)
  }
  /** Leaves the current submenu (the back button's verb). */
  const exitSub = (): void => { setSub(null) }

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
    sub, enterSub, exitSub,
    // (defect B compatibility seats — the panes' prop names) kfView
    // reads `sub === "keyframes"`; entering it is enterSub("keyframes").
    kfView: sub === "keyframes",
    enterKfView: () => { enterSub("keyframes") },
    exitKfView: exitSub,
    enterAudioView: () => { enterSub("audio") },
  }
}
