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
import { EyeAlt as Eye, EyeOff, Move, PersonStanding, RotateCcw, Target } from '@melite/card-base/client'
import {
  Button, IconDownloadOutlineRegular, IconLinkOutlineRegular, IconRefreshOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { SectionLabel, SpecPanel, panelSectionsOf } from "@melite/card-base/client"
import { InputSquare, MESH_SQUARE_ACCEPT, isMeshUrl } from '@melite/card-base/client'
import { SourceRow, fetchMediaLibrary } from '@melite/card-base/client'
import type { CardStage } from "@melite/contracts"
import type { MotionNpz } from "@melite/formats"
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline"
import { Tip } from "./kit.tsx"
import { motionCopy } from "./motionCopy.ts"
import { cn } from '@melite/card-base/client'
import s from "./component.module.css"
import { MOTION_PREVIEW_GLB_PARAM } from "./motionParams.ts"
import type { ToastFn } from "./useMotionStage.ts"

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
  handleBgFile: (file: File) => void
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
  exportOpen, setExportOpen, bgImage, handleBgFile, setBg,
  bodySrc, bodyWired, bodyWiredUpstream, bodyWiredUrl, handleBodyFile,
  toast, attachBody, onWireSlot, bodySlotIdx, onSave, stage,
  setBodyWireOpen, bodyNotice,
}: MotionRailProps) {
  return (
 <div className={s.railGrid}>
 {/* VIEW */}
 <SectionLabel>{motionCopy.viewGroup}</SectionLabel>
 <Tip tip={effectiveNpz ? "Show the joint skeleton over the mesh" : motionCopy.loadingMannequinBusy}>
 <span className={s.contents}>
 <Button variant={showSkeleton ? "primary" : "outline"} size="sm"
 onClick={() => setShowSkeleton((s) => !s)}
 disabled={!effectiveNpz}
 aria-pressed={showSkeleton}
 >
 {showSkeleton ? <Eye className={s.i14} /> : <EyeOff className={s.i14} />}
 {motionCopy.skeletonToggle}
 </Button>
 </span>
 </Tip>
 <Tip
 tip={!effectiveNpz
 ? motionCopy.loadingMannequinBusy
 : inPlace
 ? "Pinned at the origin — same motion, no travel (treadmill). Toggle to play the root's travel across the stage."
 : "Playing the root's travel across the stage. Toggle to pin the figure at the origin — same motion, no travel."}
 >
 <span className={s.contents}>
 <Button variant={inPlace ? "primary" : "outline"} size="sm"
 onClick={() => setInPlace((v) => !v)}
 disabled={!effectiveNpz}
 aria-pressed={inPlace}
 >
 <Target className={s.i14} />
 {motionCopy.inPlaceToggle}
 </Button>
 </span>
 </Tip>

 {/* POSE */}
 <SectionLabel className={s.railGroupLabelMt}>{motionCopy.poseGroup}</SectionLabel>
 <Tip
 tip={
 !effectiveNpz
 ? motionCopy.loadingMannequinBusy
 : editMode
 ? "Exit edit mode — keeps the refined pose on the character at this frame"
 : "Drag joints to refine the pose at this frame"
 }
 >
 <span className={s.contents}>
 <Button variant={editMode ? "primary" : "outline"} size="sm"
 onClick={toggleEdit}
 disabled={!effectiveNpz}
 aria-pressed={editMode}
 >
 <Move className={s.i14} />
 {editMode ? motionCopy.poseDone : motionCopy.refinePose}
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
 <Button variant="primary" size="sm"
 onClick={stampConstraintAtFrame}
 disabled={!editableJoints}
 >
 <Target className={s.i14} />
 {motionCopy.stamp}
 </Button>
 </span>
 </Tip>
 <Tip tip="Chain the edited pose as the starting point — kimodo conditions the next generation on it. Hit Run when ready.">
 <span className={s.contents}>
 <Button variant="primary" size="sm"
 onClick={handleRepose}
 disabled={reposing || !editableJoints}
 >
 <IconRefreshOutlineRegular className={reposing ? s.spinIcon : s.i14} />
 {reposing ? motionCopy.reposing : motionCopy.repose}
 </Button>
 </span>
 </Tip>
 </>
 )}
 {!editMode && keptEdit && keptEdit.frame === frameIdx && (
 <Tip tip="Discard the refined pose at this frame — revert to the raw motion">
 <Button variant="outline" size="sm"
 onClick={discardKeptEdit}
 >
 <RotateCcw className={s.i14} />
 {motionCopy.resetPose}
 </Button>
 </Tip>
 )}

 {/* OUTPUT */}
 {/* RULE B: the generic form — the schema's own params (generation,
     guidance, clock) through the shared SpecPanel. The timeline's
     document seam writes the same keys; this is the override
     surface the form law requires (never a hand-rolled row). */}
 {/* RULE B: the generic form — the schema's own params through the
     shared SpecPanel. The sections DERIVE from the served spec
     (panelSectionsOf — the motion-params journey audit's class cure:
     the hand-typed rows list was the killed h3 shape and dropped
     cfg_type for the card's whole history); the host names the
     groups it seats. The timeline's document seam writes the same
     keys; this is the override surface the form law requires (never
     a hand-rolled row). The railPanel wrapper spans the tool grid's
     two columns — the panel is not a half-width track (the
     scrollbar cure). */}
 <div className={s.railPanel} data-testid="mo-rail-panel">
 <SpecPanel
   model="kimodo"
   spec={kimodoSpec}
   error={kimodoError}
   values={paramValues}
   onEdit={onParamEdit}
   sections={panelSectionsOf(kimodoSpec, {
     generation: { title: motionCopy.sectionGeneration, testid: "mo-gen-panel" },
     guidance: { title: motionCopy.sectionGuidance, testid: "mo-guide-panel" },
     general: { title: motionCopy.sectionClock, testid: "mo-clock-panel" },
   })}
 />
 </div>
 <SectionLabel className={s.railGroupLabelMt}>{motionCopy.outputGroup}</SectionLabel>
 <Tip
 tip={!effectiveNpz
 ? motionCopy.loadingMannequinBusy
 : exportOpen
 ? "Close the export panel"
 : "Frame a shot with the stage rectangle — no run needed; exports mesh / openpose / depth at the typed pixel size"}
 >
 <span className={s.contents}>
 <Button variant={exportOpen ? "primary" : "outline"} size="sm"
 onClick={() => setExportOpen((o) => !o)}
 disabled={!effectiveNpz}
 aria-pressed={exportOpen}
 >
 <IconDownloadOutlineRegular className={s.i14} />
 {motionCopy.railExport}
 </Button>
 </span>
 </Tip>
 {/* THE BG PICK IS THE ESTATE SQUARE (the motion-params journey
     audit F4): ONE input-selection face — SourceRow's square + the
     three-entry source menu (From flow / From media / From file)
     and the picker modal — never a restyled button over a private
     hidden file input. motion's file law rides the wire's onFile
     seam (data-URL persist through readAsDataURL, the ONE read
     path — the semantics the SquareWire.onFile seam exists to
     keep); the square's X detaches (onEdit('')); the stage drop
     (type-dispatched GLB-to-body / image-to-bg) still teaches the
     multi-source pattern beside it. */}
 <div className={s.bgSquareWrap} data-motion-bg>
 <SourceRow
  label={motionCopy.background}
  kind="image"
  value={bgImage}
  onEdit={(v) => setBg(v === "" ? null : v)}
  onFile={handleBgFile}
  loadMedia={fetchMediaLibrary}
 />
 </div>
 {/* Preview body (2026-08-15 character import) — an INPUT SUBCARD, the
     same square the image inputs render (the user directive: "that has
     to be an input subcard just like the image input has subcards").
      One InputSquare for the preview_glb slot: pick (bottom-left ⬆), asset/
     OS drop, detach (top-right ✕), and WIRE to an upstream 3D card
     (bottom-right ⛓ — a genre:"3d" producer feeds it; canWireSlot guards
     the type). The stage drop (GLB→body / image→bg) stays. A failed
     import leaves the amber notice; the mannequin keeps rendering. */}
 <SectionLabel className={s.railGroupLabelMt}>{motionCopy.previewBody}</SectionLabel>
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
  aria-label={motionCopy.wireBodyAria}
  data-motion-body-wire
className={cn(s.wireBtn, bodyWired ? s.wireBtnOn : s.wireBtnOff)}
  >
  <IconLinkOutlineRegular className={s.i12} />
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
   : motionCopy.bodyNoticeSuffix({ notice: bodyNotice })}
 </p>
 )}
 </div>
  )
}
