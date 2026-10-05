import { jsx as _jsx } from "react/jsx-runtime";
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
 * channel is onSave (E1, enforced by card-studio-boundary.test.ts).
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
 * useTimelineEnvelope (envelope + seed guard + persists),
 * useTimelineAuthoring (timeline CRUD verbs), and the MotionRail /
 * MotionStageView / MotionTimelineSection panels. Behavior is IDENTICAL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useToastStore } from '@melite/card-base/client';
import { useResolvedForm } from "@melite/card-base/client";
import { precomputeDeformedVerts, vertsToB64 } from "@melite/formats";
import { StudioShell, defineShellDeclaration } from '@melite/card-base/client';
import s from "./component.module.css";
import { DEFAULT_STAGE_RECT, } from "./MotionExportDialog.js";
import { FLOOR_LIFT_Y, MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM, } from "./motionParams.js";
import { useMotionUndoStack } from "./useMotionUndoStack.js";
import { useMotionMedia } from "./useMotionMedia.js";
import { usePoseEditing } from "./usePoseEditing.js";
import { useMotionStage } from "./useMotionStage.js";
import { useTimelineEnvelope } from "./useTimelineEnvelope.js";
import { useTimelineAuthoring } from "./useTimelineAuthoring.js";
import { MotionRail } from "./MotionRail.js";
import { MotionStageView } from "./MotionStageView.js";
import { MotionTimelineSection } from "./MotionTimelineSection.js";
export { FLOOR_LIFT_Y, MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM };
// Accepts {stage, onSave, upstreams?, onWireSlot?} — assignable to
// StudioTenantProps (E1); `running` is shell business now (the rail's Stop
// button owns the interrupt).
export function MotionCardEditor({ stage, onSave, upstreams = [], onWireSlot, runCompiledGeneration, }) {
    const toast = useToastStore((s) => s.addToast);
    // RULE B — THE FORM LAW (operator, 2026-09-18: "All Cards must be
    // Forms, with seams for overrides"): the card's schema-declared
    // params render through the SHARED SpecPanel — the generic
    // schemastery-protected surface on the DSH primitives.
    const userParams = typeof stage.params === "object" && stage.params !== null
        ? stage.params : {};
    const { spec: kimodoSpec, error: kimodoError, resolved: paramValues, edit: onParamEdit, } = useResolvedForm("kimodo", userParams, (name, value) => { onSave({ [name]: value }); });
    // ── Asset resolution: the motion NPZ from the run result ────────────────
    // Guards: artifacts/assetUrls can carry non-string entries from revived
    // docs (2026-08-10 crash: u.endsWith on undefined) — never assume.
    const npzUrl = useMemo(() => {
        const arts = stage.result?.artifacts;
        if (arts) {
            const named = arts["motion_npz"];
            if (typeof named === "string")
                return named;
            const npzArt = Object.values(arts).find((u) => typeof u === "string" && u.endsWith(".npz"));
            if (npzArt)
                return npzArt;
        }
        return (stage.result?.assetUrls?.find((u) => typeof u === "string" && u.endsWith(".npz")) ?? null);
    }, [stage.result]);
    // ── Primitive state (orchestrated here, logic lives in the seams) ───────
    const [bodyGlb, setBodyGlbState] = useState(null);
    const [bodyNotice, setBodyNotice] = useState(null);
    const [bodyWireOpen, setBodyWireOpen] = useState(false);
    const [skin, setSkin] = useState(null);
    const [npz, setNpz] = useState(null);
    const [allVertsM, setAllVertsM] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [keptEdit, setKeptEdit] = useState(null);
    const [frameIdx, setFrameIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [tlKeyframes, setTlKeyframes] = useState([]);
    const [tlIntervals, setTlIntervals] = useState([]);
    const [tlPrompts, setTlPrompts] = useState([]);
    const [constraintPayloads, setConstraintPayloads] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [editableJoints, setEditableJoints] = useState(null);
    // Ref mirror of editableJoints so handleJointMove can read the latest value
    // synchronously (without a nested setState) for the live-bind payload write.
    const editableJointsRef = useRef(null);
    const [selectedJoint, setSelectedJoint] = useState(null);
    const [editedDeformedB64, setEditedDeformedB64] = useState(null);
    const [reposing, setReposing] = useState(false);
    const [cameraView, setCameraView] = useState("az-0");
    const [framing, setFraming] = useState("full");
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [inPlace, setInPlace] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [stageRect, setStageRect] = useState(DEFAULT_STAGE_RECT);
    const threeCtxRef = useRef(null);
    const bgInputRef = useRef(null);
    const [bgImage, setBgImage] = useState(null);
    const [bgDragOver, setBgDragOver] = useState(false);
    // THE AUTHORING GUARD's flag — owned here, shared by the undo restore,
    // the timeline verbs, and the envelope seed (see useTimelineEnvelope).
    const promptsAuthoredRef = useRef(false);
    // ── Rest pose (upstream behavior) ──────────────────────────────────
    // The skin's neutral joints + rotations — the TS equivalent of
    // vendor/kimodo `skeleton.neutral_joints`. When no run exists, this is the
    // "motion" (T=1) every pose consumer operates on, so refine/export work
    // BEFORE any GPU inference. See SomaSkin.restJoints doc.
    const restNpz = useMemo(() => {
        if (!skin)
            return null;
        return { posedJoints: skin.restJoints, globalRotMats: skin.restRots, fps: 30, T: 1 };
    }, [skin]);
    // The effective motion: the real run's NPZ if present, else the rest pose.
    const effectiveNpz = npz ?? restNpz;
    // ── PoseViewer3D inputs (PoseViewer3D speaks cm) ────────────────────────
    // Precompute deformed verts for the REST POSE ONLY (T=1 — instant). This
    // is the fallback shown before/after a real run. The full motion's vertices
    // come from allVertsM (set by the async chunked NPZ-load effect — already
    // in cm). Computing the full motion here would block render for seconds.
    const effectiveVertsM = useMemo(() => {
        if (!restNpz || !skin)
            return null;
        return precomputeDeformedVerts(restNpz, skin);
    }, [restNpz, skin]);
    // allVertsM is already CM (from precomputeDeformedVertsChunked outputCm=true)
    // → pass directly to PoseViewer3D via deformedVertsDirect. No vertsToB64!
    // The rest-pose fallback (effectiveVertsM, meters, T=1) still goes through
    // b64 — it's 1 frame so the encode is ~0.2ms (negligible).
    const restB64 = useMemo(() => effectiveVertsM ? vertsToB64(effectiveVertsM, true) : null, [effectiveVertsM]);
    // Neutral bind mesh (meters → cm) — bypasses /poser/skin/mesh entirely.
    const customBindMesh = useMemo(() => {
        if (!skin)
            return null;
        const bv = skin.bindVertices;
        const vertices = [];
        for (let i = 0; i < bv.length; i += 3)
            vertices.push([bv[i] * 100, bv[i + 1] * 100, bv[i + 2] * 100]);
        const f = skin.faces;
        const faces = [];
        for (let i = 0; i < f.length; i += 3)
            faces.push([f[i], f[i + 1], f[i + 2]]);
        return { vertices, faces };
    }, [skin]);
    // The viewer's mesh lift (mirrors PoseViewer3D's computeMeshLiftY).
    const liftY = useMemo(() => {
        if (!skin)
            return 0;
        let minY = Infinity;
        const bv = skin.bindVertices;
        for (let i = 1; i < bv.length; i += 3)
            if (bv[i] < minY)
                minY = bv[i];
        return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y;
    }, [skin]);
    // The current frame's joints (77×3 meters) — the edit-mode starting point
    // and the export's displayed joints. Falls back to the rest pose when no
    // run exists so refine/export work pre-inference (the Kimodo demo behavior).
    const currentJointsM = useMemo(() => {
        const src = effectiveNpz;
        if (!src)
            return null;
        const i = Math.min(frameIdx, src.T - 1) * 77 * 3;
        return src.posedJoints.slice(i, i + 77 * 3);
    }, [effectiveNpz, frameIdx]);
    // The fullbody keyframe sitting at the current frame, if any. When present,
    // edit mode is AUTHORING into that keyframe (drag a joint → the keyframe's
    // constraint payload absorbs the new pose). When absent, edit mode is a
    // FREE sculpt for Repose (the chain path).
    const fullbodyKfAtFrame = useMemo(() => tlKeyframes.find((k) => k.track_id === "fullbody" && k.frame === frameIdx) ?? null, [tlKeyframes, frameIdx]);
    // First non-empty prompt → the card's single `prompt` param mirror (the
    // backend's single-prompt path reads it when motion_prompts is below the
    // 2-segment override threshold).
    const firstNonEmptyCardText = useMemo(() => tlPrompts.find((p) => p.text.trim())?.text ?? "", [tlPrompts]);
    useEffect(() => {
        onSave({ prompt: firstNonEmptyCardText });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstNonEmptyCardText]);
    // ── Seams (verbs + effects; state stays orchestrated above) ─────────────
    const { bodySlotIdx, bodyWiredId, bodyWiredUpstream, bodyWired, bodyWiredUrl, bodySrc, attachBody, handleBodyFile, priorStages, setBg, handleBgFile, handleStageDrop, } = useMotionMedia({
        stage, upstreams, onSave, onWireSlot, runCompiledGeneration, toast,
        bodyGlb, setBodyGlbState, setBodyNotice,
        skin, setSkin, npz, setNpz, allVertsM, setAllVertsM, setError, setLoading,
        setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64,
        threeCtxRef, npzUrl, bgImage, setBgImage, setBgDragOver,
    });
    const { pushUndo, handleUndo, handleRedo, maybePushDragUndo } = useMotionUndoStack({
        tlPrompts, tlKeyframes, constraintPayloads, tlIntervals,
        keptEdit, editedDeformedB64,
        editableJointsRef, promptsAuthoredRef,
        setTlPrompts, setTlKeyframes, setConstraintPayloads, setTlIntervals,
        setEditableJoints, setKeptEdit, setEditedDeformedB64,
    });
    const { toggleEdit, handleJointMove, displayJointsM, handleRepose } = usePoseEditing({
        effectiveNpz, frameIdx, tlKeyframes, constraintPayloads,
        keptEdit, currentJointsM, fullbodyKfAtFrame,
        pushUndo, toast, skin, onSave,
        editMode, setEditMode, editableJoints, setEditableJoints, editableJointsRef,
        setSelectedJoint, setEditedDeformedB64, reposing, setReposing,
        setKeptEdit, setPlaying, setConstraintPayloads,
    });
    const { jointsFlatCm, discardKeptEdit, stampConstraintAtFrame, exportOut, handleOutSize, handleFramePreset, stageBoxRef, beginRectDrag, onRectPointerMove, endRectDrag, } = useMotionStage({
        effectiveNpz, keptEdit, editableJoints, frameIdx, fullbodyKfAtFrame,
        toast, pushUndo,
        setKeptEdit, setEditedDeformedB64, setConstraintPayloads, setTlKeyframes,
        exportOpen, stageRect, setStageRect,
    });
    const { targetT, onTimelineExtend } = useTimelineEnvelope({
        stage, effectiveNpz, onSave, toast, promptsAuthoredRef,
        tlPrompts, setTlPrompts, tlKeyframes, setTlKeyframes,
        constraintPayloads, setConstraintPayloads, setTlIntervals,
    });
    const { handleTimelineFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete, addPromptCard, } = useTimelineAuthoring({
        effectiveNpz, toast, pushUndo, maybePushDragUndo, promptsAuthoredRef, targetT,
        setFrameIdx, setPlaying, setConstraintPayloads, setTlKeyframes, setTlPrompts,
    });
    // ── Scrubber ────────────────────────────────────────────────────────────
    const totalSec = npz ? npz.T / npz.fps : 0;
    const curSec = npz ? frameIdx / npz.fps : 0;
    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const r = s - m * 60;
        return `${m}:${r.toFixed(1).padStart(4, "0")}`;
    };
    void handleUndo;
    void handleRedo;
    return (_jsx(StudioShell, { className: s.shellPad, params: _jsx(MotionRail, { effectiveNpz: effectiveNpz, showSkeleton: showSkeleton, setShowSkeleton: setShowSkeleton, inPlace: inPlace, setInPlace: setInPlace, editMode: editMode, toggleEdit: toggleEdit, fullbodyKfAtFrame: fullbodyKfAtFrame, frameIdx: frameIdx, stampConstraintAtFrame: stampConstraintAtFrame, editableJoints: editableJoints, handleRepose: handleRepose, reposing: reposing, keptEdit: keptEdit, discardKeptEdit: discardKeptEdit, kimodoSpec: kimodoSpec, kimodoError: kimodoError, paramValues: paramValues, onParamEdit: onParamEdit, exportOpen: exportOpen, setExportOpen: setExportOpen, bgImage: bgImage, bgInputRef: bgInputRef, handleBgFile: handleBgFile, setBg: setBg, bodySrc: bodySrc, bodyWired: bodyWired, bodyWiredUpstream: bodyWiredUpstream, bodyWiredUrl: bodyWiredUrl, handleBodyFile: handleBodyFile, toast: toast, attachBody: attachBody, onWireSlot: onWireSlot, bodySlotIdx: bodySlotIdx, onSave: onSave, stage: stage, setBodyWireOpen: setBodyWireOpen, bodyNotice: bodyNotice }), preview: _jsx(MotionStageView, { stageBoxRef: stageBoxRef, bgDragOver: bgDragOver, setBgDragOver: setBgDragOver, handleStageDrop: handleStageDrop, bgImage: bgImage, skin: skin, allVertsM: allVertsM, restB64: restB64, editedDeformedB64: editedDeformedB64, frameIdx: frameIdx, setFrameIdx: setFrameIdx, npz: npz, playing: playing, editMode: editMode, cameraView: cameraView, framing: framing, jointsFlatCm: jointsFlatCm, showSkeleton: showSkeleton, effectiveNpz: effectiveNpz, customBindMesh: customBindMesh, inPlace: inPlace, threeCtxRef: threeCtxRef, editableJoints: editableJoints, selectedJoint: selectedJoint, setSelectedJoint: setSelectedJoint, handleJointMove: handleJointMove, loading: loading, error: error, setCameraView: setCameraView, setFraming: setFraming, exportOpen: exportOpen, stageRect: stageRect, beginRectDrag: beginRectDrag, onRectPointerMove: onRectPointerMove, endRectDrag: endRectDrag, setExportOpen: setExportOpen, npzUrl: npzUrl, stage: stage, setPlaying: setPlaying, displayJointsM: displayJointsM, liftY: liftY, setStageRect: setStageRect, exportOut: exportOut, handleOutSize: handleOutSize, handleFramePreset: handleFramePreset }), bottom: _jsx(MotionTimelineSection, { npz: npz, editMode: editMode, playing: playing, setPlaying: setPlaying, fmt: fmt, curSec: curSec, totalSec: totalSec, tlPrompts: tlPrompts, targetT: targetT, addPromptCard: addPromptCard, tlKeyframes: tlKeyframes, frameIdx: frameIdx, effectiveNpz: effectiveNpz, onTimelineExtend: onTimelineExtend, handleTimelineFrameChange: handleTimelineFrameChange, onKeyframeAdd: onKeyframeAdd, onKeyframeMove: onKeyframeMove, onKeyframeDelete: onKeyframeDelete, onPromptUpdate: onPromptUpdate, onPromptMove: onPromptMove, onPromptResize: onPromptResize, onPromptDelete: onPromptDelete, bodyWireOpen: bodyWireOpen, onWireSlot: onWireSlot, priorStages: priorStages, bodyWired: bodyWired, bodyWiredId: bodyWiredId, onSave: onSave, setBodyGlbState: setBodyGlbState, setBodyNotice: setBodyNotice, setBodyWireOpen: setBodyWireOpen }) }));
}
export default MotionCardEditor;
/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the live skinned motion viewport is the mesh, kind
 *  "native"; the rail carries the view/pose/output tool groups;
 *  MotionTimelineBar in a PaneShell is the bottom). */
export const shellDeclaration = defineShellDeclaration({
    preview: { kind: "native" },
    bottom: { kind: "timeline" },
    params: { slots: [] },
});
//# sourceMappingURL=component.js.map
