/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { DocCall, DocKeyframe, LayerA } from "./docModel"
import { serializeLayerA } from "./docHydrate"
import { serializeCalls } from "./docCalls"
import type { TimelineSelection } from "./useViewSelection"

/** Playhead clamp, selection scroll/stale-guard, persist effects + the Layer A
 *  setter (tenant §4). Verbatim lines 1671–1729. */
export function useDocEffects(args: {
  totalFrames: number
  setFrameIdx: Dispatch<SetStateAction<number>>
  selected: TimelineSelection | null
  setSelected: Dispatch<SetStateAction<TimelineSelection | null>>
  calls: DocCall[]
  keyframes: DocKeyframe[]
  layerA: LayerA
  setLayerA: Dispatch<SetStateAction<LayerA>>
  onSave: (params: Record<string, unknown>) => void
  callCardRefs: { current: (HTMLDivElement | null)[] }
  beatRowRefs: { current: (HTMLDivElement | null)[][] }
  lastCallsRef: { current: string }
  lastKeyframesRef: { current: string }
  lastLayerARef: { current: string }
}) {
  const {
    totalFrames, setFrameIdx, selected, setSelected, calls, keyframes, layerA, setLayerA,
    onSave, callCardRefs, beatRowRefs,
    lastCallsRef, lastKeyframesRef, lastLayerARef,
  } = args
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

  // Stale guard: a delete/restructure that shrank the calls or a call's
  // segments clears the selection — never ring a ghost.
  useEffect(() => {
    if (!selected) return
    if (selected.callIdx >= calls.length) {
      setSelected(null)
    }
  }, [calls, selected])

  // ── Persist (E1: onSave is the ONLY write channel; real arrays, the
  // document's own shape — no JSON stringification, no view keys, no
  // synthesized uuids riding along into the persisted doc).
  useEffect(() => {
    const candidate = JSON.stringify(calls)
    if (candidate === lastCallsRef.current) return
    lastCallsRef.current = candidate
    onSave({ calls: serializeCalls(calls) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls])

  useEffect(() => {
    const candidate = JSON.stringify(keyframes)
    if (candidate === lastKeyframesRef.current) return
    lastKeyframesRef.current = candidate
    onSave({ keyframes: keyframes.map((k) => ({ ...k })) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyframes])

  // Layer A — the run panel (a change writes the WHOLE global set; the
  // untouched-optional keys serialize absent, so the engine/preset keeps
  // deciding them until the user speaks).
  useEffect(() => {
    const candidate = JSON.stringify(serializeLayerA(layerA))
    if (candidate === lastLayerARef.current) return
    lastLayerARef.current = candidate
    onSave(serializeLayerA(layerA))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerA])

  const setLayerAKey = <K extends keyof LayerA>(k: K, v: LayerA[K]) =>
    setLayerA((prev) => (prev[k] === v ? prev : { ...prev, [k]: v }))
  return { setLayerAKey }
}
