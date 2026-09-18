/**
 * useMotionStage — the 3D/stage cluster moved verbatim from `component.tsx`.
 *
 * Covers the mega-function's stage seams:
 * - jointsFlatCm memo (~788): T×77×3 cm flat for the skeleton overlay,
 *   with the kept-refine overlay.
 * - discardKeptEdit (~897): revert the kept refine at the current frame.
 * - stampConstraintAtFrame (~941): capture the edited pose as a fullbody
 *   keyframe at the current frame (create or update the bound diamond).
 * - Export framing (~1051–1178): typed-pixel output truth + aspect-locked
 *   stage rect (move + corner-resize math), coherence refits, and the
 *   ResizeObserver live-refit while framing.
 *
 * Free-variable reads became explicit hook args; the memo + verbs +
 * framing state/handlers are returned. Behavior is IDENTICAL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type * as React from "react"
import type { MotionNpz } from "@melite/formats"
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline"
import type { MotionConstraint } from "@melite/formats/motionConstraints"
import { makeTimelineId } from "@melite-plugin/timeline/ui/timeline"
import { jointsFromCm, patchFrame } from "@melite/formats"
import { stampEditedPose } from "@melite/formats/motionConstraints"
import type { StageRect } from "./MotionExportDialog"

export type ToastFn = (type: "error" | "success" | "info", message: string) => void

export interface MotionStageArgs {
  effectiveNpz: MotionNpz | null
  keptEdit: { joints: Float32Array; frame: number } | null
  editableJoints: Float32Array | null
  frameIdx: number
  fullbodyKfAtFrame: TimelineKeyframe | null
  toast: ToastFn
  pushUndo: () => void
  setKeptEdit: React.Dispatch<React.SetStateAction<{ joints: Float32Array; frame: number } | null>>
  setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>
  setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>
  setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>
  exportOpen: boolean
  stageRect: StageRect
  setStageRect: React.Dispatch<React.SetStateAction<StageRect>>
}

export function useMotionStage({
  effectiveNpz, keptEdit, editableJoints, frameIdx, fullbodyKfAtFrame,
  toast, pushUndo,
  setKeptEdit, setEditedDeformedB64, setConstraintPayloads, setTlKeyframes,
  exportOpen, stageRect, setStageRect,
}: MotionStageArgs) {
  // T × 77 × 3 Float32Array (cm) — the skeleton overlay's flat prop shape.
  // A kept refine overrides its frame so the skeleton holds the edited pose
  // after "Done". Produced directly as a Float32Array (no nested intermediate)
  // to avoid 11,550 small-array allocations + GC pressure per generation.
  const jointsFlatCm = useMemo(() => {
    const src = effectiveNpz
    if (!src) return null
    const T = src.T
    const flat = new Float32Array(T * 77 * 3)
    const s = src.posedJoints
    for (let f = 0; f < T; f++) {
      const base = f * 77 * 3
      for (let i = 0; i < 77 * 3; i++) flat[base + i] = s[base + i] * 100
    }
    if (keptEdit && keptEdit.frame < T) {
      const base = keptEdit.frame * 77 * 3
      for (let j = 0; j < 77; j++) {
        flat[base + j * 3] = keptEdit.joints[j * 3]
        flat[base + j * 3 + 1] = keptEdit.joints[j * 3 + 1]
        flat[base + j * 3 + 2] = keptEdit.joints[j * 3 + 2]
      }
    }
    return flat
  }, [effectiveNpz, keptEdit])

  const discardKeptEdit = useCallback(() => {
    pushUndo()
    setKeptEdit(null)
    setEditedDeformedB64(null)
  }, [pushUndo, setKeptEdit, setEditedDeformedB64])

  // STAMP: capture the currently-edited pose as a fullbody keyframe at the
  // current frame. Creates the keyframe if none is bound, then the live-bind
  // above takes over for subsequent drags. This is the explicit "write this
  // motion into the timeline" action — the user authored a pose, Stamp makes
  // it a constraint that drives generation.
  const stampConstraintAtFrame = useCallback(() => {
    const src = effectiveNpz
    if (!src || !editableJoints) {
      toast("error", "Enter edit mode and drag a joint first — nothing to stamp")
      return
    }
    pushUndo()
    const editedM = jointsFromCm(editableJoints)
    const patched = patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx)
    const payload = stampEditedPose(
      editedM,
      patched.globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9),
      frameIdx,
      src.T,
    )
    const existing = fullbodyKfAtFrame
    if (existing) {
      setConstraintPayloads((prev) => ({ ...prev, [existing.uuid]: payload }))
      toast("success", `Updated keyframe at frame ${frameIdx + 1} (full-body)`)
    } else {
      const uuid = makeTimelineId()
      setConstraintPayloads((prev) => ({ ...prev, [uuid]: payload }))
      setTlKeyframes((prev) => [...prev, { uuid, track_id: "fullbody", frame: frameIdx, value: null, opacity: 1, locked: false }])
      toast("success", `Stamped authored pose → keyframe at frame ${frameIdx + 1}`)
    }
  }, [effectiveNpz, editableJoints, frameIdx, fullbodyKfAtFrame, toast, pushUndo, setConstraintPayloads, setTlKeyframes])

  // ── Export framing — PIXEL OUTPUT + aspect-locked rect (round 3) ────────
  // exportOut (typed PIXELS) is the OUTPUT TRUTH; the stage rect is only the
  // framing TOOL. Its PIXEL aspect (w·sw : h·sh) is locked to exportOut's
  // w:h, so the rect can sit at ANY size on screen and still export the
  // typed pixels — "I can't really output a 768 by 1024, because I don't
  // have room in the mesh view" was the old model's bug (rect size ≡ output
  // size); under this one the rect NEVER needs to be output-sized.
  // Body drag = move; ANY of the FOUR corners = aspect-locked resize (the
  // opposite corner anchored — "click and drag the corners of the square to
  // adjust" scales it like an image handle); typed position % + typed px
  // size live in the dialog. Everything outside the rect stays
  // pointer-transparent so OrbitControls keeps working while framing.
  const [exportOut, setExportOut] = useState({ w: 768, h: 1024 })
  const stageBoxRef = useRef<HTMLDivElement | null>(null)
  /** The stage's live pixel size — the mediator between the rect's
   *  normalized units and the output's pixels. */
  const stageSizeNow = (): { w: number; h: number } => {
    const b = stageBoxRef.current?.getBoundingClientRect()
    if (b && b.width > 0 && b.height > 0) return { w: b.width, h: b.height }
    return { w: 16, h: 9 } // inert fallback (no layout yet)
  }
  /** The rect's normalized w:h that carries the typed output's pixel
   *  aspect: (r.w·sw)/(r.h·sh) == outW/outH. */
  const rectAspectNorm = (): number => {
    const { w: sw, h: sh } = stageSizeNow()
    return (exportOut.w / exportOut.h) * (sh / sw)
  }
  /** The largest on-stage rect with the given normalized aspect, centered
   *  on (cx, cy) and clamped inside the stage. */
  const rectWithAspect = (aspect: number, cx: number, cy: number): StageRect => {
    const w = Math.min(1, aspect)
    const h = w / aspect
    return {
      x: Math.max(0, Math.min(1 - w, cx - w / 2)),
      y: Math.max(0, Math.min(1 - h, cy - h / 2)),
      w, h,
    }
  }
  /** Typed-size write channel (the dialog's px inputs — the preset row is
   *  gone, typed px is the only size UI): clamp 8..4096. The coherence
   *  effect below refits the rect's aspect. */
  const handleOutSize = useCallback((w: number, h: number) => {
    const cw = Math.max(8, Math.min(4096, Math.round(w)))
    const ch = Math.max(8, Math.min(4096, Math.round(h)))
    setExportOut((prev) => (prev.w === cw && prev.h === ch ? prev : { w: cw, h: ch }))
  }, [])
  /** Frame presets — the parent owns the aspect lock, so both land as a
   *  refit: "whole" = the max-fit rect; "reset" = 80% of it (breathing
   *  room), centered on the stage. */
  const handleFramePreset = useCallback((kind: "reset" | "whole") => {
    const a = rectAspectNorm()
    if (kind === "whole") {
      setStageRect((r) => rectWithAspect(a, r.x + r.w / 2, r.y + r.h / 2))
      return
    }
    const w = Math.min(1, a) * 0.8
    const h = w / a
    setStageRect({
      x: Math.max(0, Math.min(1 - w, 0.5 - w / 2)),
      y: Math.max(0, Math.min(1 - h, 0.5 - h / 2)),
      w, h,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOut, setStageRect])
  // COHERENCE: refit the rect's aspect when the export opens (the stage may
  // have resized since it last framed) and whenever the typed size changes.
  // ONE-WAY coupling (px → rect): dragging the rect resizes it on screen but
  // never rewrites the typed output — that's the whole model.
  useEffect(() => {
    setStageRect((r) => {
      const next = rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2)
      return r.x === next.x && r.y === next.y && r.w === next.w && r.h === next.h ? r : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen, exportOut.w, exportOut.h, setStageRect])
  // A stage resize (window, panel toggle) while framing would drift a fixed
  // normalized rect's PIXEL aspect — refit live. Guarded: jsdom has no
  // ResizeObserver (the effect paths above cover the tests).
  useEffect(() => {
    if (!exportOpen || typeof ResizeObserver === "undefined") return
    const el = stageBoxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setStageRect((r) => rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2))
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen, exportOut.w, exportOut.h, setStageRect])
  const rectDragRef = useRef<null | {
    mode: "move" | "nw" | "ne" | "sw" | "se"
    sx: number; sy: number
    orig: StageRect
  }>(null)
  const beginRectDrag = (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    rectDragRef.current = { mode, sx: e.clientX, sy: e.clientY, orig: { ...stageRect } }
  }
  const onRectPointerMove = (e: React.PointerEvent) => {
    const d = rectDragRef.current
    const box = stageBoxRef.current?.getBoundingClientRect()
    if (!d || !box || box.width === 0 || box.height === 0) return
    const dx = (e.clientX - d.sx) / box.width
    const dy = (e.clientY - d.sy) / box.height
    const o = d.orig
    const MIN = 0.02
    if (d.mode === "move") {
      const nx = Math.max(0, Math.min(1 - o.w, o.x + dx))
      const ny = Math.max(0, Math.min(1 - o.h, o.y + dy))
      setStageRect((r) => (r.x === nx && r.y === ny ? r : { ...r, x: nx, y: ny }))
      return
    }
    // Corner resizes — ASPECT-LOCKED (round 3): the dominant drag axis sets
    // the scale, the other dimension is DERIVED from the typed output's
    // aspect, and the OPPOSITE corner stays anchored. Stage bounds cap the
    // growth with both dims re-derived so the ratio never breaks.
    const AN = rectAspectNorm()
    const candW = d.mode === "se" || d.mode === "ne" ? o.w + dx : o.w - dx
    const candH = d.mode === "se" || d.mode === "sw" ? o.h + dy : o.h - dy
    const s = Math.max(candW / o.w, candH / o.h)
    const maxW = d.mode === "se" || d.mode === "ne" ? 1 - o.x : o.x + o.w
    const maxH = d.mode === "se" || d.mode === "sw" ? 1 - o.y : o.y + o.h
    let w = Math.min(o.w * s, maxW)
    let h = Math.min(w / AN, maxH)
    w = Math.min(h * AN, maxW)
    h = w / AN
    // a floor on the smaller axis so the handles never collapse
    if (AN >= 1) { h = Math.max(MIN, h); w = h * AN } else { w = Math.max(MIN, w); h = w / AN }
    w = Math.min(w, maxW)
    h = Math.min(h, maxH)
    setStageRect({
      x: d.mode === "se" || d.mode === "ne" ? o.x : o.x + o.w - w,
      y: d.mode === "se" || d.mode === "sw" ? o.y : o.y + o.h - h,
      w, h,
    })
  }
  const endRectDrag = () => { rectDragRef.current = null }

  return {
    jointsFlatCm, discardKeptEdit, stampConstraintAtFrame,
    exportOut, handleOutSize, handleFramePreset,
    stageBoxRef, beginRectDrag, onRectPointerMove, endRectDrag,
  }
}
