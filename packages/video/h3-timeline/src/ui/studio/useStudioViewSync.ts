/**
 * useStudioViewSync — the collapse's view thirds (the rework).
 *
 * WHAT SURVIVED of useDocEffects: the playhead clamp, the
 * selection→sidebar scroll, and the stale-selection guard. NO
 * save, NO guards, NO persist — the adapter owns writes (a gesture
 * commits; this hook only keeps the VIEW coherent). Takes the
 * SHOWN calls (f(doc, pendingOps)), so its bounds are never stale.
 */
import { useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { DocCall } from "./docModel.ts"
import type { TimelineSelection } from "./useViewSelection.ts"

export function useStudioViewSync(args: {
  totalFrames: number
  setFrameIdx: Dispatch<SetStateAction<number>>
  selected: TimelineSelection | null
  setSelected: Dispatch<SetStateAction<TimelineSelection | null>>
  calls: DocCall[]
  callCardRefs: { current: (HTMLDivElement | null)[] }
  beatRowRefs: { current: (HTMLDivElement | null)[][] }
}) {
  const { totalFrames, setFrameIdx, selected, setSelected, calls, callCardRefs, beatRowRefs } = args
  // Keep the playhead inside the envelope (beat deletes / tail shrinks).
  useEffect(() => {
    setFrameIdx((f) => Math.min(f, Math.max(0, totalFrames - 1)))
  }, [totalFrames])

  // Selection → the sidebar: scroll the selected call card (and segment
  // row) into view — the rail scrolls independently of the bar.
  useEffect(() => {
    if (!selected) return
    callCardRefs.current[selected.callIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    if (selected.beatIdx != null) {
      beatRowRefs.current[selected.callIdx]?.[selected.beatIdx]
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selected])

  // Stale guard: a delete/restructure that shrank the calls clears
  // the selection — never ring a ghost.
  useEffect(() => {
    if (!selected) return
    if (selected.callIdx >= calls.length) {
      setSelected(null)
    }
  }, [calls, selected])
}
