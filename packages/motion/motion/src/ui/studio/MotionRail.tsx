/** MotionRail — the studio rail (StudioShell `params`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * The view/pose/output tool groups: skeleton + in-place toggles, refine/
 * stamp/repose/reset, the shared SpecPanel form, export + background +
 * preview-body input subcard.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react"
import {
  Download, EyeAlt as Eye, EyeOff, ImagePlus, Link2,
  Move, PersonStanding, RefreshCw, RotateCcw, Target, X,
} from '@melite/card-base/client'
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { SpecPanel } from "@melite/card-base/client"
import { InputSquare, MESH_SQUARE_ACCEPT, isMeshUrl } from '@melite/card-base/client'
import type { CardStage } from "@melite/contracts"
import type { MotionNpz } from "@melite/formats"
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline"
import { Tip } from "./kit"
import { cn } from '@melite/card-base/client'
import s from "./component.module.css"
import { MOTION_PREVIEW_GLB_PARAM } from "./motionParams"
import type { ToastFn } from "./useMotionStage"

export interface MotionRailProps {
  effectiveNpz: MotionNpz | null
  showSkeleton: boolean
  setShowSkeleton: React.Dispatch<React.SetStateAction<boolean>>
  inPlace: boolean
  setInPlace: React.Dispatch<React.SetStateAction<boolean>>
  editMode: boolean
  toggleEdit: () => void
  fullbodyKfAtFrame: TimelineKeyframe | null
  frameIdx: number
  stampConstraintAtFrame: () => void
  editableJoints: Float32Array | null
  handleRepose: () => void
  reposing: boolean
  keptEdit: { joints: Float32Array; frame: number } | null
  discardKeptEdit: () => void
  kimodoSpec: React.ComponentProps<typeof SpecPanel>["spec"]
  kimodoError: React.ComponentProps<typeof SpecPanel>["error"]
  paramValues: React.ComponentProps<typeof SpecPanel>["values"]
  onParamEdit: React.ComponentProps<typeof SpecPanel>["onEdit"]
  exportOpen: boolean
  setExportOpen: React.Dispatch<React.SetStateAction<boolean>>
  bgImage: string | null
  bgInputRef: React.RefObject<HTMLInputElement | null>
  handleBgFile: (file: File | null) => void
  setBg: (url: string | null) => void
  bodySrc: string
  bodyWired: boolean
  bodyWiredUpstream: CardStage | undefined
  bodyWiredUrl: string | null
  handleBodyFile: (file: File) => void
  toast: ToastFn
  attachBody: (url: string | null) => void
  onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
  bodySlotIdx: number
  onSave: (params: Record<string, unknown>) => void
  stage: CardStage
  setBodyWireOpen: React.Dispatch<React.SetStateAction<boolean>>
  bodyNotice: string | null
}

export function MotionRail({
  effectiveNpz, showSkeleton, setShowSkeleton, inPlace, setInPlace,
  editMode, toggleEdit, fullbodyKfAtFrame, frameIdx, stampConstraintAtFrame,
  editableJoints, handleRepose, reposing, keptEdit, discardKeptEdit,
  kimodoSpec, kimodoError, paramValues, onParamEdit,
  exportOpen, setExportOpen, bgImage, bgInputRef, handleBgFile, setBg,
  bodySrc, bodyWired, bodyWiredUpstream, bodyWiredUrl, handleBodyFile,
  toast, attachBody, onWireSlot, bodySlotIdx, onSave, stage,
  setBodyWireOpen, bodyNotice,
}: MotionRailProps) {
  return (
 <div className={s.railGrid}>
 {/* VIEW */}
 <span className={s.railGroupLabel}>View</span>
 <Tip tip={effectiveNpz ? "Show the joint skeleton over the mesh" : "Loading mannequin…"}>
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setShowSkeleton((s) => !s)}
 disabled={!effectiveNpz}
className={cn(s.railBtn, showSkeleton ? s.railBtnActive : s.railBtnIdle)}
 >
 {showSkeleton ? <Eye className={s.i14} /> : <EyeOff className={s.i14} />}
 Skeleton
 </Button>
 </span>
 </Tip>
 <Tip
 tip={!effectiveNpz
 ? "Loading mannequin…"
 : inPlace
 ? "Pinned at the origin — same motion, no travel (treadmill). Toggle to play the root's travel across the stage."
 : "Playing the root's travel across the stage. Toggle to pin the figure at the origin — same motion, no travel."}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setInPlace((v) => !v)}
 disabled={!effectiveNpz}
 aria-pressed={inPlace}
className={cn(s.railBtn, inPlace ? s.railBtnActive : s.railBtnIdle)}
 >
 <Target className={s.i14} />
 In-place
 </Button>
 </span>
 </Tip>

 {/* POSE */}
 <span className={s.railGroupLabelMt}>Pose</span>
 <Tip
 tip={
 !effectiveNpz
 ? "Loading mannequin…"
 : editMode
 ? "Exit edit mode — keeps the refined pose on the character at this frame"
 : "Drag joints to refine the pose at this frame"
 }
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={toggleEdit}
 disabled={!effectiveNpz}
className={cn(s.railBtn, editMode ? s.railBtnEditActive : s.railBtnIdle)}
 >
 <Move className={s.i14} />
 {editMode ? "Done" : "Refine pose"}
 </Button>
 </span>
 </Tip>
 {editMode && (
 <>
 <Tip
 tip={fullbodyKfAtFrame
 ? `Update the full-body keyframe at frame ${frameIdx + 1} with this pose`
 : `Write this pose into the timeline as a full-body keyframe at frame ${frameIdx + 1}`}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={stampConstraintAtFrame}
 disabled={!editableJoints}
 className={s.stampBtn}
 >
 <Target className={s.i14} />
 Stamp
 </Button>
 </span>
 </Tip>
 <Tip tip="Chain the edited pose as the starting point — kimodo conditions the next generation on it. Hit Run when ready.">
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={handleRepose}
 disabled={reposing || !editableJoints}
 className={s.reposeBtn}
 >
 <RefreshCw className={reposing ? s.spinIcon : s.i14} />
 {reposing ? "Reposing…" : "Repose"}
 </Button>
 </span>
 </Tip>
 </>
 )}
 {!editMode && keptEdit && keptEdit.frame === frameIdx && (
 <Tip tip="Discard the refined pose at this frame — revert to the raw motion">
 <Button variant="ghost"
 onClick={discardKeptEdit}
 className={s.railBtnDanger}
 >
 <RotateCcw className={s.i14} />
 Reset pose
 </Button>
 </Tip>
 )}

 {/* OUTPUT */}
 {/* RULE B: the generic form — the schema's own params (generation,
     guidance, clock) through the shared SpecPanel. The timeline's
     document seam writes the same keys; this is the override
     surface the form law requires (never a hand-rolled row). */}
 <SpecPanel
   model="kimodo"
   spec={kimodoSpec}
   error={kimodoError}
   values={paramValues}
   onEdit={onParamEdit}
   sections={[
     {
       title: "Generation",
       testid: "mo-gen-panel",
       rows: [
         { name: "duration_sec" }, { name: "diffusion_steps" },
         { name: "num_samples" }, { name: "num_transition_frames" },
       ],
     },
     {
       title: "Guidance",
       testid: "mo-guide-panel",
       rows: [{ name: "cfg_weight_a" }, { name: "cfg_weight_b" }],
     },
     {
       title: "Clock",
       testid: "mo-clock-panel",
       rows: [{ name: "seed" }],
     },
   ]}
 />
 <span className={s.railGroupLabelMt}>Output</span>
 <Tip
 tip={!effectiveNpz
 ? "Loading mannequin…"
 : exportOpen
 ? "Close the export panel"
 : "Frame a shot with the stage rectangle — no run needed; exports mesh / openpose / depth at the typed pixel size"}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setExportOpen((o) => !o)}
 disabled={!effectiveNpz}
 aria-pressed={exportOpen}
className={cn(s.railBtn, exportOpen ? s.railBtnActive : s.railBtnIdle)}
 >
 <Download className={s.i14} />
 Export
 </Button>
 </span>
 </Tip>
 <Tip
 tip={bgImage
 ? "Replace the background image behind the mannequin (or drop an asset/file on the stage)"
 : "Set a background image behind the mannequin — click to pick, or drop an asset/file on the stage"}
 >
 <Button variant="ghost"
 onClick={() => bgInputRef.current?.click()}
 className={s.bgBtnIdle}
 >
 <ImagePlus className={s.i14} />
 Background
 </Button>
 </Tip>
 {bgImage && (
 <Tip tip="Clear the background image">
 <Button variant="ghost"
 onClick={() => setBg(null)}
 aria-label="Clear the background image"
 className={s.railBtnDanger}
 >
 <X className={s.i14} />
 Clear
 </Button>
 </Tip>
 )}
 <input
 ref={bgInputRef}
 type="file"
 accept="image/*"
 className={s.hiddenInput}
 onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)}
 />
 {/* Preview body (2026-08-15 character import) — an INPUT SUBCARD, the
     same square the image inputs render (the user directive: "that has
     to be an input subcard just like the image input has subcards").
      One InputSquare for the preview_glb slot: pick (bottom-left ⬆), asset/
     OS drop, detach (top-right ✕), and WIRE to an upstream 3D card
     (bottom-right ⛓ — a genre:"3d" producer feeds it; canWireSlot guards
     the type). The stage drop (GLB→body / image→bg) stays. A failed
     import leaves the amber notice; the mannequin keeps rendering. */}
 <span className={s.railGroupLabelMt}>Preview body</span>
 <div data-motion-body className={s.bodySquareWrap}>
  <InputSquare
  label={MOTION_PREVIEW_GLB_PARAM}
  value={bodySrc || undefined}
  badge={bodyWired ? bodyWiredUpstream!.title : undefined}
  metric={bodyWired && !bodyWiredUrl ? "waiting for upstream" : undefined}
  emptyIcon={<PersonStanding className={s.bodyEmptyIcon} />}
  accept={MESH_SQUARE_ACCEPT}
  showFileAction
  onFile={handleBodyFile}
  onAsset={(url) => {
  if (!isMeshUrl(url)) {
  toast("error", "Preview body must be a .glb or .gltf (SOMAX-rigged character).")
  return
  }
  attachBody(url)
  }}
  onClear={bodyWired
  ? () => {
  onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null)
  onSave({ ...stage.params, [MOTION_PREVIEW_GLB_PARAM]: null })
  }
  : () => attachBody(null)}
  actions={onWireSlot && bodySlotIdx >= 0 && (
  <Tip tip="Wire from an earlier card's GLB output">
  <Button variant="ghost"
  type="button"
  onClick={(e) => { e.stopPropagation(); setBodyWireOpen(true) }}
  aria-label="Wire the preview body from an earlier card"
  data-motion-body-wire
className={cn(s.wireBtn, bodyWired ? s.wireBtnOn : s.wireBtnOff)}
  >
  <Link2 className={s.i12} />
  </Button>
  </Tip>
  )}
  />
 </div>
 {bodyNotice && (
 <p
 data-motion-body-error
 className={s.bodyNotice}
 >
 {/* The suffix lies mid-convert (nothing previews yet) — the
     converting notice carries its own state; the mannequin claim
     only rides the settled fallbacks. */}
 {bodyNotice.includes("converting through the queue")
   ? bodyNotice
   : `${bodyNotice} — previewing on the neutral mannequin.`}
 </p>
 )}
 </div>
  )
}
