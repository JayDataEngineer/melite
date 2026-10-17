/** MotionStageView — the live stage (StudioShell `preview`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * The viewport frame (drops, bg, mannequin/viewer, veils, camera pill,
 * export-frame rectangle) + the in-flow export panel sibling.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react"
import { PersonStanding, RotateCcw, RotateCw } from '@melite/card-base/client'
import {
  Button, IconUserOutlineRegular, IconWarningTriangleOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { CardStage } from "@melite/contracts"
import type { MotionAzimuth, MotionNpz } from "@melite/formats"
import type { SomaSkin } from "@melite/formats"
import { stepAzimuth } from "@melite/formats"
import { PoseViewer3D, type CameraFraming } from "@melite-plugin/motion/ui/viewer3d"
import type { JointMoveEvent } from "@melite-plugin/motion/ui/viewer3d"
import { Skeleton, Tip, ViewportAnchor, ViewportFrame } from "./kit.tsx"
import { ASSET_DRAG_MIME } from '@melite/card-base/client'
import { cn } from '@melite/card-base/client'
import s from "./component.module.css"
import { MotionExportDialog, type StageRect, type ThreeCtx } from "./MotionExportDialog.tsx"
import { motionCopy } from "./motionCopy.ts"

export interface MotionStageViewProps {
  stageBoxRef: React.RefObject<HTMLDivElement | null>
  bgDragOver: boolean
  setBgDragOver: React.Dispatch<React.SetStateAction<boolean>>
  handleStageDrop: (e: React.DragEvent) => void
  bgImage: string | null
  skin: SomaSkin | null
  allVertsM: Float32Array | null
  restB64: string | null
  editedDeformedB64: string | null
  frameIdx: number
  setFrameIdx: React.Dispatch<React.SetStateAction<number>>
  npz: MotionNpz | null
  playing: boolean
  editMode: boolean
  cameraView: MotionAzimuth
  framing: CameraFraming
  jointsFlatCm: Float32Array | null
  showSkeleton: boolean
  effectiveNpz: MotionNpz | null
  customBindMesh: { vertices: number[][]; faces: number[][] } | null
  inPlace: boolean
  threeCtxRef: React.MutableRefObject<ThreeCtx | null>
  editableJoints: Float32Array | null
  selectedJoint: number | null
  setSelectedJoint: React.Dispatch<React.SetStateAction<number | null>>
  handleJointMove: (e: JointMoveEvent) => void
  loading: boolean
  error: string | null
  setCameraView: React.Dispatch<React.SetStateAction<MotionAzimuth>>
  setFraming: React.Dispatch<React.SetStateAction<CameraFraming>>
  exportOpen: boolean
  stageRect: StageRect
  beginRectDrag: (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => void
  onRectPointerMove: (e: React.PointerEvent) => void
  endRectDrag: () => void
  setExportOpen: React.Dispatch<React.SetStateAction<boolean>>
  npzUrl: string | null
  stage: CardStage
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  displayJointsM: Float32Array | null
  liftY: number
  setStageRect: React.Dispatch<React.SetStateAction<StageRect>>
  exportOut: { w: number; h: number }
  handleOutSize: (w: number, h: number) => void
  handleFramePreset: (kind: "reset" | "whole") => void
}

export function MotionStageView({
  stageBoxRef, bgDragOver, setBgDragOver, handleStageDrop, bgImage,
  skin, allVertsM, restB64, editedDeformedB64, frameIdx, setFrameIdx,
  npz, playing, editMode, cameraView, framing, jointsFlatCm, showSkeleton,
  effectiveNpz, customBindMesh, inPlace, threeCtxRef, editableJoints,
  selectedJoint, setSelectedJoint, handleJointMove, loading, error,
  setCameraView, setFraming, exportOpen, stageRect, beginRectDrag,
  onRectPointerMove, endRectDrag, setExportOpen, npzUrl, stage, setPlaying,
  displayJointsM, liftY, setStageRect, exportOut, handleOutSize, handleFramePreset,
}: MotionStageViewProps) {
  return (
 <div className={s.centerRow}>
 {/* ── Live stage — ALWAYS the viewer (pose-studio behavior) ──────────
 No run yet → no deformed vertices → SkinnedHumanoid renders the
 bind pose: the neutral somax mannequin, orbit/zoom/azimuth live.
 Loading/error overlays sit ON TOP of the mannequin, never replace
 the stage.

 DROP TARGET (2026-08-14, extended 2026-08-15): the stage accepts
 asset-tray drags (ASSET_DRAG_MIME — drop a Media-sidebar image to set
 the BG, a GLB to set the preview body) and OS file drags (drop a file
 from the desktop — same type dispatch). Same multi-source pattern as
 the image input subcards — the Background/Body buttons' file pickers
 are still there for click-to-pick. */}
 <ViewportFrame
 ref={stageBoxRef}
className={cn(s.stageFrame, bgDragOver && s.stageFrameDrag)}
 onDragOver={(e) => {
   if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
     e.preventDefault()
     setBgDragOver(true)
   }
 }}
 onDragLeave={() => setBgDragOver(false)}
 onDrop={handleStageDrop}
 >
 {bgImage && (
 <ViewportAnchor dock="fill" className={s.ovBg}>
  <img src={bgImage} alt="" aria-hidden className={s.bgImg} />
 </ViewportAnchor>
 )}
 {/* Drop overlay — visible only while an asset/file is dragged over
     the stage. The ring on the parent div + this label tell the user
     what a drop does (mirrors InputSquare's dragOver highlight). z-20
     sits above the bg <img> but below the viewer's error overlays. */}
 {bgDragOver && (
 <ViewportAnchor dock="fill" className={s.ovDrop}>
  <div className={s.dropVeil}>
 <span className={s.dropVeilLabel}>
 {motionCopy.dropHint}
 </span>
  </div>
 </ViewportAnchor>
 )}
 {skin ? (
 <PoseViewer3D
 deformedVertsDirect={allVertsM}
 deformedVerticesB64={/* v8 ignore next -- the viewer renders only when skin loaded, which seeds restB64 (probe 2026-09-19) */ restB64 ?? ""}
 editedDeformedB64={editedDeformedB64}
 frameIdx={frameIdx}
 onFrameChange={setFrameIdx}
 animate={npz ? playing && !editMode : false}
 fps={npz?.fps ?? 30}
 cameraView={cameraView}
 cameraFraming={framing}
  soma77JointsFlat={jointsFlatCm}
 layers={{ wireframe: false, skeleton: /* v8 ignore next -- viewer renders only under skin ⟹ restNpz/effectiveNpz/restB64 non-null (probe 2026-09-19) */ effectiveNpz ? showSkeleton && !editMode : false }}
 customBindMesh={customBindMesh}
 identityModel="soma"
 inPlace={inPlace}
 threeCtxRef={threeCtxRef}
 darkMode
 // ── Edit mode (gated: needs a motion) ──
 editMode={editMode}
 editableJoints={editableJoints}
 selectedJoint={selectedJoint}
 onSelectJoint={setSelectedJoint}
 onJointMove={handleJointMove}
 kinematicMode="ik"
 gizmoMode="translate"
 />
 ) : (
 <div
 role="status"
 aria-busy="true"
 aria-label={motionCopy.loadingMannequin}
 className={s.stageLoading}
 >
 {/* Skeleton stands in for the mannequin viewport while the rig
     loads — a quiet block instead of a spinning dot. */}
 <Skeleton className={s.skelAvatar} />
 <Skeleton className={s.skelLine} />
 </div>
 )}
 {loading && (
 <ViewportAnchor dock="fill">
 <div
 role="status"
 aria-busy="true"
 aria-label={motionCopy.loadingMotion}
 className={s.stageVeil}
 >
 <Skeleton className={s.skelAvatarSm} />
 <Skeleton className={s.skelLine} />
 </div>
 </ViewportAnchor>
 )}
 {error && (
 <ViewportAnchor dock="fill">
 <div className={s.stageVeil}>
 <IconWarningTriangleOutlineRegular className={s.warnIcon} />
 <span className={s.veilText}>{error}</span>
 </div>
 </ViewportAnchor>
 )}
 {/* ── Camera pill — rotate arrows + framing toggle (2026-08-15, v2) ──
 Replaces the 8-triangle ring. [←] [→] step ±45° around the azimuth ring
 (stepAzimuth — wrap-around, re-snapping from wherever the camera is).
 NO direction label: the stage is freely orbitable (click-drag), so any
 "FRONT" chip would be a lie the moment the user drags — the arrows and
 the tips carry it. The segmented toggle picks the FRAMING — full body
 vs upper half (framedCameraPos: same azimuth, tighter distances both).
 Framing is pure view state: never a param, never exported. */}
 <ViewportAnchor dock="top-right" className={s.ovCam}>
 <div className={s.camPill}>
 <Tip tip={motionCopy.rotateLeft}>
 {/* THE PRIMITIVES' OWN FACES (the motion-params audit F5, and the
  * 28px pill-box law, operator volley 2026-10-24): all four pill
  * buttons ride size="sm" (28px) and the variant map — icon verbs
  * ghost, the pressed framing primary, the idle framing outline.
  * No module reset: sm's own box is the pill face. */}
 <Button variant="ghost" size="sm"
 onClick={() => setCameraView(stepAzimuth(cameraView, -1))}
 aria-label={motionCopy.rotateLeft}
 >
 <RotateCcw className={s.i14} />
 </Button>
 </Tip>
 <span className={s.camDivider} />
 <Tip tip={motionCopy.framingFull}>
 <Button variant={framing === "full" ? "primary" : "outline"} size="sm"
 onClick={() => setFraming("full")}
 aria-label={motionCopy.framingFull}
 aria-pressed={framing === "full"}
 >
 <PersonStanding className={s.i14} />
 </Button>
 </Tip>
 <Tip tip="Upper half framing — closer, chest-height camera at the same angle">
 <Button variant={framing === "upper" ? "primary" : "outline"} size="sm"
 onClick={() => setFraming("upper")}
 aria-label={motionCopy.framingUpper}
 aria-pressed={framing === "upper"}
 >
 <IconUserOutlineRegular className={s.i14} />
 </Button>
 </Tip>
 <Tip tip={motionCopy.rotateRight}>
 <Button variant="ghost" size="sm"
 onClick={() => setCameraView(stepAzimuth(cameraView, 1))}
 aria-label={motionCopy.rotateRight}
 >
 <RotateCw className={s.i14} />
 </Button>
 </Tip>
 </div>
 </ViewportAnchor>

 {/* ── Export-frame rectangle (2026-08-15 rework) — the draggable crop
     over the LIVE character while the export dialog is open and framing
     is "live". The wrapper is pointer-transparent everywhere except the
     rect itself, so orbiting the camera (the angle is the user's own)
     keeps working; the rect dims everything outside it. The corner
     handle resizes FREE-aspect; the body moves it. */}
 {exportOpen && (
 <ViewportAnchor data-export-rect-overlay dock="fill" className={s.ovRect}>
 <div
 data-export-rect
 role="presentation"
 aria-label={motionCopy.exportRectAria}
 onPointerDown={(e) => beginRectDrag(e, "move")}
 onPointerMove={onRectPointerMove}
 onPointerUp={endRectDrag}
 onPointerCancel={endRectDrag}
 className={s.exportRect}
 style={{
 left: `${stageRect.x * 100}%`,
 top: `${stageRect.y * 100}%`,
 width: `${stageRect.w * 100}%`,
 height: `${stageRect.h * 100}%`,
 boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
 }}
 >
 {/* FOUR corner handles (resize, free aspect — the opposite corner
     anchors). Typed exact sizes live in the dialog panel. */}
 {([
 { corner: "nw", cls: s.cornerNW },
 { corner: "ne", cls: s.cornerNE },
 { corner: "sw", cls: s.cornerSW },
 { corner: "se", cls: s.cornerSE },
 ] as const).map((h) => (
 <div
 key={h.corner}
 data-export-corner={h.corner}
 onPointerDown={(e) => beginRectDrag(e, h.corner)}
 onPointerMove={onRectPointerMove}
 onPointerUp={endRectDrag}
 onPointerCancel={endRectDrag}
 className={cn(s.cornerHandle, h.cls)}
 />
 ))}
 {/* center crosshair */}
 <div className={s.crossV} />
 <div className={s.crossH} />
 </div>
 {/* hint — outside the rect, never blocks orbit */}
 <ViewportAnchor dock="bottom-center" className={s.rectHint}>
 {motionCopy.rectHint}
 </ViewportAnchor>
 </ViewportAnchor>
 )}
 </ViewportFrame>

 {/* The export PANEL — in-flow sibling of the stage (pushes it narrower,
     never covers it). Renders only while a motion/rest pose exists. */}
 {effectiveNpz && (
 <MotionExportDialog
 open={exportOpen}
 onClose={() => setExportOpen(false)}
 npz={effectiveNpz}
 npzUrl={npzUrl}
 glbUrl={stage.result?.motionPreviews?.find((m) => m.url)?.url ?? null}
 frameIdx={frameIdx}
 onFrameChange={(f) => { setFrameIdx(f); setPlaying(false) }}
 cameraView={cameraView}
 displayJointsM={displayJointsM!}
 liftY={liftY}
 inPlace={inPlace}
 threeCtxRef={threeCtxRef}
 stageRect={stageRect}
 onStageRectChange={setStageRect}
 outW={exportOut.w}
 outH={exportOut.h}
 onOutSize={handleOutSize}
 onFramePreset={handleFramePreset}
 />
 )}
 </div>
  )
}
