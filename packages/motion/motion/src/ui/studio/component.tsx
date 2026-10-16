/**
 * MotionCardEditor — the drill-down surface for a genre:"motion" card
 * (kimodo text→motion). Turns the card into a live 3D stage like the Body
 * Card: the somax mannequin rendered from the run's motion NPZ, a scrubber
 * strip, an 8-angle azimuth ring, click-drag joint refinement, and the
 * VNCCS export pair (mesh + openpose at an azimuth).
 *
 * Data flow (all client-side, mirrors MotionViewer):
 * 1. npzUrl from stage.result.artifacts["motion_npz"] (fallback: first
 * .npz asset) → loadMotionNpz (meters) + loadSomaSkin (neutral bind).
 * 2. precomputeDeformedVerts → (T, V, 3) meters → vertsToB64(…, cm) →
 * PoseViewer3D's deformedVerticesB64. The skin's bind mesh (meters →
 * cm) is handed over as customBindMesh so the viewer skips the
 * /poser/skin/mesh fetch entirely — the render is 1:1 with MotionViewer.
 * 3. Playback is PoseViewer3D's own AnimController (animate prop); the
 * scrubber reads frameIdx (throttled ~10fps) + seeks by state.
 *
 * FREEZE → STOP (2026-08-15): the studio SHELL owns the rail's Run row and
 * with it the interrupt (editorClient.stopRun → /v1/flows/stop → ComfyUI
 * /interrupt — the kimodo node's per-step hook makes the abort land
 * mid-generation). The tenant carries ZERO rpc imports: its only write
 * channel is onSave (E1 — the tenant-props contract, web-kit/contracts
 * studio.ts; zero RPC imports by construction).
 *
 * REPOSE (Phase B): edit mode drives PoseViewer3D's joint gizmos. The
 * sculpt is re-skinned client-side (edited joints cm→m → deformFrame →
 * vertsToB64 → editedDeformedB64). "Repose" patches the current frame's
 * rotations (patchFrame), truncates the motion to frameIdx+1, writes an NPZ
 * data URL, and saves it as prev_motion_artifact (the chain slot —
 * _upload_input_images converts the data URL to a bare .npz). The user hits
 * Run separately — kimodo conditions the next generation on the saved pose.
 * Zero backend changes.
 *
 * NO-RUN STATE (2026-08-10, policy: "compare it to the Kimodo Pose
 * Studio"): the stage ALWAYS renders. Before any run exists there is no NPZ,
 * so PoseViewer3D receives no deformed vertices and SkinnedHumanoid falls
 * back to the bind pose — the neutral somax mannequin, live and interactive
 * (orbit/zoom/azimuth), exactly like opening the pose studio. Scrubber,
 * Refine, and Export stay honestly disabled ("run the card" hints) — no
 * placeholder preview, no blank box.
 *
 * SPLIT (godfile remediation): this module is now state orchestration +
 * composition only. The inner units moved verbatim to seams —
 * useMotionUndoStack (undo/redo), useMotionMedia (body/skin/load/playback/
 * thumb/background), usePoseEditing (edit mode + reskin + repose),
 * useMotionStage (joints flat + stamp/discard + export framing),
 * useTimelineEnvelope (envelope math + pull-the-tail),
 * useTimelineAuthoring (timeline CRUD verbs), and the MotionRail /
 * MotionStageView / MotionTimelineSection panels.
 *
 * ONE TRUTH (2026-11-05, nativity audit F7 — the h3-timeline pattern):
 * stage.params is the ONLY document state. The tlPrompts/tlKeyframes/
 * tlIntervals/constraintPayloads mirrors, the once-only hydration, the
 * echo-guard persist effects, and the derived `prompt` write-back are
 * gone: useMotionDoc projects the row, overlays the transient op log,
 * and commits every gesture straight through onSave (fused prompts
 * statement: motion_prompts + prompt in ONE call). The bar renders the
 * shown projection; an external bench write re-hydrates naturally.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { useToastStore } from '@melite/card-base/client'
import { useResolvedForm } from "@melite/card-base/client"
import type { MotionAzimuth, MotionNpz } from "@melite/formats"
import { precomputeDeformedVerts, vertsToB64 } from "@melite/formats"
import type { SomaSkin } from "@melite/formats"
import type { CameraFraming } from "@melite-plugin/motion/ui/viewer3d"
import { useMotionDoc } from "./useMotionDoc.ts"
import type { MotionDoc } from "./motionDoc.ts"
import { StudioShell, defineShellDeclaration } from '@melite/card-base/client'
import s from "./component.module.css"
import {
  DEFAULT_STAGE_RECT,
  type StageRect, type ThreeCtx,
} from "./MotionExportDialog.tsx"
import {
  FLOOR_LIFT_Y,
  MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM,
} from "./motionParams.ts"
import { useMotionUndoStack } from "./useMotionUndoStack.ts"
import { useMotionMedia } from "./useMotionMedia.ts"
import { usePoseEditing } from "./usePoseEditing.ts"
import { useMotionStage } from "./useMotionStage.ts"
import { useTimelineEnvelope } from "./useTimelineEnvelope.ts"
import { useTimelineAuthoring } from "./useTimelineAuthoring.ts"
import { MotionRail } from "./MotionRail.tsx"
import { MotionStageView } from "./MotionStageView.tsx"
import { MotionTimelineSection } from "./MotionTimelineSection.tsx"

export { FLOOR_LIFT_Y, MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM }

interface MotionCardEditorProps {
  stage: CardStage
  onSave: (params: Record<string, unknown>) => void
  /** ALL stages of the enclosing run, in array order — the preview-body
   *  subcard's wire picker restricts to indices BEFORE this card. */
  upstreams?: CardStage[]
  /** Wire/unwire the preview_glb slot (the store's setSlotInput, stage-
   *  scoped by the studio shell). Omit to hide the wire affordance. */
  onWireSlot?: (
    slotKey: string,
    upstreamId: string | null,
    outputName?: string | null,
  ) => void
  runCompiledGeneration: typeof import("@melite/catalog").runCompiledGeneration
}

// Accepts {stage, onSave, upstreams?, onWireSlot?} — assignable to
// StudioTenantProps (E1); `running` is shell business now (the rail's Stop
// button owns the interrupt).
export function MotionCardEditor({
  stage, onSave, upstreams = [], onWireSlot, runCompiledGeneration,
}: MotionCardEditorProps) {
  const toast = useToastStore((s) => s.addToast)
  // RULE B — THE FORM LAW (operator, 2026-09-18: "All Cards must be
  // Forms, with seams for overrides"): the card's schema-declared
  // params render through the SHARED SpecPanel — the generic
  // schemastery-protected surface on the DSH primitives.
  const userParams = typeof stage.params === "object" && stage.params !== null
    ? stage.params as Record<string, unknown> : {}
  const {
    spec: kimodoSpec, error: kimodoError, resolved: paramValues, edit: onParamEdit,
  } = useResolvedForm(
    "kimodo",
    userParams,
    (name: string, value: unknown) => { onSave({ [name]: value }) },
  )

  // ── Asset resolution: the motion NPZ from the run result ────────────────
  // Guards: artifacts/assetUrls can carry non-string entries from revived
  // docs (2026-08-10 crash: u.endsWith on undefined) — never assume.
  const npzUrl = useMemo(() => {
    const arts = stage.result?.artifacts
    if (arts) {
      const named = arts["motion_npz"]
      if (typeof named === "string") return named
      const npzArt = Object.values(arts).find(
        (u): u is string => typeof u === "string" && u.endsWith(".npz"),
      )
      if (npzArt) return npzArt
    }
    return (
      stage.result?.assetUrls?.find(
        (u): u is string => typeof u === "string" && u.endsWith(".npz"),
      ) ?? null
    )
  }, [stage.result])

  // ── Primitive state (orchestrated here, logic lives in the seams) ───────
  const [bodyGlb, setBodyGlbState] = useState<string | null>(null)
  const [bodyNotice, setBodyNotice] = useState<string | null>(null)
  const [bodyWireOpen, setBodyWireOpen] = useState(false)
  const [skin, setSkin] = useState<SomaSkin | null>(null)
  const [npz, setNpz] = useState<MotionNpz | null>(null)
  const [allVertsM, setAllVertsM] = useState<Float32Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [keptEdit, setKeptEdit] = useState<{ joints: Float32Array; frame: number } | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editableJoints, setEditableJoints] = useState<Float32Array | null>(null)
  // Ref mirror of editableJoints so handleJointMove can read the latest value
  // synchronously (without a nested setState) for the live-bind payload write.
  const editableJointsRef = useRef<Float32Array | null>(null)
  const [selectedJoint, setSelectedJoint] = useState<number | null>(null)
  const [editedDeformedB64, setEditedDeformedB64] = useState<string | null>(null)
  const [reposing, setReposing] = useState(false)
  const [cameraView, setCameraView] = useState<MotionAzimuth>("az-0")
  const [framing, setFraming] = useState<CameraFraming>("full")
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [inPlace, setInPlace] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [stageRect, setStageRect] = useState<StageRect>(DEFAULT_STAGE_RECT)
  const threeCtxRef = useRef<ThreeCtx | null>(null)
  const bgInputRef = useRef<HTMLInputElement | null>(null)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [bgDragOver, setBgDragOver] = useState(false)

  // ── Rest pose (upstream behavior) ──────────────────────────────────
  // The skin's neutral joints + rotations — the TS equivalent of
  // vendor/kimodo `skeleton.neutral_joints`. When no run exists, this is the
  // "motion" (T=1) every pose consumer operates on, so refine/export work
  // BEFORE any GPU inference. See SomaSkin.restJoints doc.
  const restNpz = useMemo<MotionNpz | null>(() => {
    if (!skin) return null
    return { posedJoints: skin.restJoints, globalRotMats: skin.restRots, fps: 30, T: 1 }
  }, [skin])
  // The effective motion: the real run's NPZ if present, else the rest pose.
  const effectiveNpz = npz ?? restNpz
  // ── PoseViewer3D inputs (PoseViewer3D speaks cm) ────────────────────────
  // Precompute deformed verts for the REST POSE ONLY (T=1 — instant). This
  // is the fallback shown before/after a real run. The full motion's vertices
  // come from allVertsM (set by the async chunked NPZ-load effect — already
  // in cm). Computing the full motion here would block render for seconds.
  const effectiveVertsM = useMemo(() => {
    if (!restNpz || !skin) return null
    return precomputeDeformedVerts(restNpz, skin)
  }, [restNpz, skin])
  // allVertsM is already CM (from precomputeDeformedVertsChunked outputCm=true)
  // → pass directly to PoseViewer3D via deformedVertsDirect. No vertsToB64!
  // The rest-pose fallback (effectiveVertsM, meters, T=1) still goes through
  // b64 — it's 1 frame so the encode is ~0.2ms (negligible).
  const restB64 = useMemo(
    () => effectiveVertsM ? vertsToB64(effectiveVertsM, true) : null,
    [effectiveVertsM],
  )

  // Neutral bind mesh (meters → cm) — bypasses /poser/skin/mesh entirely.
  const customBindMesh = useMemo(() => {
    if (!skin) return null
    const bv = skin.bindVertices
    const vertices: number[][] = []
    for (let i = 0; i < bv.length; i += 3) vertices.push([bv[i] * 100, bv[i + 1] * 100, bv[i + 2] * 100])
    const f = skin.faces
    const faces: number[][] = []
    for (let i = 0; i < f.length; i += 3) faces.push([f[i], f[i + 1], f[i + 2]])
    return { vertices, faces }
  }, [skin])

  // The viewer's mesh lift (mirrors PoseViewer3D's computeMeshLiftY).
  const liftY = useMemo(() => {
    if (!skin) return 0
    let minY = Infinity
    const bv = skin.bindVertices
    for (let i = 1; i < bv.length; i += 3) if (bv[i] < minY) minY = bv[i]
    return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y
  }, [skin])

  // The current frame's joints (77×3 meters) — the edit-mode starting point
  // and the export's displayed joints. Falls back to the rest pose when no
  // run exists so refine/export work pre-inference (the Kimodo demo behavior).
  const currentJointsM = useMemo(() => {
    const src = effectiveNpz
    if (!src) return null
    const i = Math.min(frameIdx, src.T - 1) * 77 * 3
    return src.posedJoints.slice(i, i + 77 * 3)
  }, [effectiveNpz, frameIdx])

  // ── The doc cluster (one truth) ─────────────────────────────────────────
  // Envelope math first (the projection seeds prompts over [0, targetT-1]),
  // then the one-truth hook: shown = projection + live ops.
  const { targetT, onTimelineExtend } = useTimelineEnvelope({
    stage, effectiveNpz, onSave, toast,
  })
  const { shown, commitPrompts, commitConstraints } = useMotionDoc(
    stage, onSave, effectiveNpz?.fps ?? 30, targetT,
  )
  // The shown document's live ref for the undo snapshot reader (capture
  // must read THIS tick's shown, not a render-captured copy).
  const shownRef = useRef<MotionDoc>(shown)
  shownRef.current = shown

  // The fullbody keyframe sitting at the current frame, if any. When present,
  // edit mode is AUTHORING into that keyframe (drag a joint → the keyframe's
  // constraint payload absorbs the new pose). When absent, edit mode is a
  // FREE sculpt for Repose (the chain path).
  const fullbodyKfAtFrame = useMemo(
    () => shown.keyframes.find((k) => k.track_id === "fullbody" && k.frame === frameIdx) ?? null,
    [shown.keyframes, frameIdx],
  )

  // ── Seams (verbs + effects; state stays orchestrated above) ─────────────
  const {
    bodySlotIdx, bodyWiredId, bodyWiredUpstream, bodyWired, bodyWiredUrl,
    bodySrc, attachBody, handleBodyFile, priorStages,
    setBg, handleBgFile, handleStageDrop,
  } = useMotionMedia({
    stage, upstreams, onSave, onWireSlot, runCompiledGeneration, toast,
    bodyGlb, setBodyGlbState, setBodyNotice,
    skin, setSkin, npz, setNpz, allVertsM, setAllVertsM, setError, setLoading,
    setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64,
    threeCtxRef, npzUrl, bgImage, setBgImage, setBgDragOver,
  })

  // Undo snapshots the SHOWN doc + viewer UI state; a restore states the
  // captured channels back through the commit doors (an undo is an edit).
  const { pushUndo, handleUndo, handleRedo, maybePushDragUndo } = useMotionUndoStack({
    captureDoc: () => ({
      prompts: shownRef.current.prompts,
      keyframes: shownRef.current.keyframes,
      payloads: shownRef.current.payloads,
    }),
    restoreDoc: (doc) => {
      commitPrompts(() => doc.prompts)
      commitConstraints((prev) => ({ ...prev, keyframes: doc.keyframes, payloads: doc.payloads }))
    },
    keptEdit, editedDeformedB64,
    editableJointsRef,
    setEditableJoints, setKeptEdit, setEditedDeformedB64,
    stageId: stage.id,
  })

  const { toggleEdit, handleJointMove, displayJointsM, handleRepose } = usePoseEditing({
    effectiveNpz, frameIdx, tlKeyframes: shown.keyframes, constraintPayloads: shown.payloads,
    keptEdit, currentJointsM, fullbodyKfAtFrame,
    pushUndo, toast, skin, onSave,
    editMode, setEditMode, editableJoints, setEditableJoints, editableJointsRef,
    setSelectedJoint, setEditedDeformedB64, reposing, setReposing,
    setKeptEdit, setPlaying, commitConstraints,
  })

  const {
    jointsFlatCm, discardKeptEdit, stampConstraintAtFrame,
    exportOut, handleOutSize, handleFramePreset,
    stageBoxRef, beginRectDrag, onRectPointerMove, endRectDrag,
  } = useMotionStage({
    effectiveNpz, keptEdit, editableJoints, frameIdx, fullbodyKfAtFrame,
    toast, pushUndo,
    setKeptEdit, setEditedDeformedB64, commitConstraints,
    exportOpen, stageRect, setStageRect,
  })

  const {
    handleTimelineFrameChange,
    onKeyframeAdd, onKeyframeMove, onKeyframeDelete,
    onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete,
    addPromptCard,
  } = useTimelineAuthoring({
    effectiveNpz, toast, pushUndo, maybePushDragUndo, targetT,
    setFrameIdx, setPlaying, commitConstraints, commitPrompts,
  })

  // ── Scrubber ────────────────────────────────────────────────────────────
  const totalSec = npz ? npz.T / npz.fps : 0
  const curSec = npz ? frameIdx / npz.fps : 0
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s - m * 60
    return `${m}:${r.toFixed(1).padStart(4, "0")}`
  }

  void handleUndo
  void handleRedo

  return (
    <StudioShell className={s.shellPad}
      params={
        <MotionRail
          effectiveNpz={effectiveNpz}
          showSkeleton={showSkeleton} setShowSkeleton={setShowSkeleton}
          inPlace={inPlace} setInPlace={setInPlace}
          editMode={editMode} toggleEdit={toggleEdit}
          fullbodyKfAtFrame={fullbodyKfAtFrame} frameIdx={frameIdx}
          stampConstraintAtFrame={stampConstraintAtFrame}
          editableJoints={editableJoints} handleRepose={handleRepose}
          reposing={reposing} keptEdit={keptEdit} discardKeptEdit={discardKeptEdit}
          kimodoSpec={kimodoSpec} kimodoError={kimodoError}
          paramValues={paramValues} onParamEdit={onParamEdit}
          exportOpen={exportOpen} setExportOpen={setExportOpen}
          bgImage={bgImage} bgInputRef={bgInputRef} handleBgFile={handleBgFile} setBg={setBg}
          bodySrc={bodySrc} bodyWired={bodyWired} bodyWiredUpstream={bodyWiredUpstream}
          bodyWiredUrl={bodyWiredUrl} handleBodyFile={handleBodyFile}
          toast={toast} attachBody={attachBody}
          onWireSlot={onWireSlot} bodySlotIdx={bodySlotIdx} onSave={onSave} stage={stage}
          setBodyWireOpen={setBodyWireOpen} bodyNotice={bodyNotice}
        />
      }
      preview={
        <MotionStageView
          stageBoxRef={stageBoxRef} bgDragOver={bgDragOver} setBgDragOver={setBgDragOver}
          handleStageDrop={handleStageDrop} bgImage={bgImage}
          skin={skin} allVertsM={allVertsM} restB64={restB64} editedDeformedB64={editedDeformedB64}
          frameIdx={frameIdx} setFrameIdx={setFrameIdx}
          npz={npz} playing={playing} editMode={editMode}
          cameraView={cameraView} framing={framing} jointsFlatCm={jointsFlatCm}
          showSkeleton={showSkeleton} effectiveNpz={effectiveNpz} customBindMesh={customBindMesh}
          inPlace={inPlace} threeCtxRef={threeCtxRef} editableJoints={editableJoints}
          selectedJoint={selectedJoint} setSelectedJoint={setSelectedJoint}
          handleJointMove={handleJointMove} loading={loading} error={error}
          setCameraView={setCameraView} setFraming={setFraming}
          exportOpen={exportOpen} stageRect={stageRect}
          beginRectDrag={beginRectDrag} onRectPointerMove={onRectPointerMove} endRectDrag={endRectDrag}
          setExportOpen={setExportOpen} npzUrl={npzUrl} stage={stage} setPlaying={setPlaying}
          displayJointsM={displayJointsM} liftY={liftY} setStageRect={setStageRect}
          exportOut={exportOut} handleOutSize={handleOutSize} handleFramePreset={handleFramePreset}
        />
      }
      bottom={
        <MotionTimelineSection
          npz={npz} editMode={editMode} playing={playing} setPlaying={setPlaying}
          fmt={fmt} curSec={curSec} totalSec={totalSec}
          tlPrompts={shown.prompts} targetT={targetT} addPromptCard={addPromptCard}
          tlKeyframes={shown.keyframes} frameIdx={frameIdx} effectiveNpz={effectiveNpz}
          onTimelineExtend={onTimelineExtend} handleTimelineFrameChange={handleTimelineFrameChange}
          onKeyframeAdd={onKeyframeAdd} onKeyframeMove={onKeyframeMove} onKeyframeDelete={onKeyframeDelete}
          onPromptUpdate={onPromptUpdate} onPromptMove={onPromptMove}
          onPromptResize={onPromptResize} onPromptDelete={onPromptDelete}
          bodyWireOpen={bodyWireOpen} onWireSlot={onWireSlot} priorStages={priorStages}
          bodyWired={bodyWired} bodyWiredId={bodyWiredId} onSave={onSave}
          setBodyGlbState={setBodyGlbState} setBodyNotice={setBodyNotice}
          setBodyWireOpen={setBodyWireOpen}
        />
      }
    >
    </StudioShell>
  )
}
export default MotionCardEditor

/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the live skinned motion viewport is the mesh, kind
 *  "native"; the rail carries the view/pose/output tool groups;
 *  MotionTimelineBar in a PaneShell is the bottom). */
export const shellDeclaration = defineShellDeclaration({
  preview: { kind: "native" },
  bottom: { kind: "timeline" },
  params: { slots: [] },
})
