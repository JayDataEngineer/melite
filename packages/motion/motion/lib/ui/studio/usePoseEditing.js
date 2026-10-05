/**
 * usePoseEditing — the edit-mode (Phase B) verbs + live reskin moved
 * verbatim from `component.tsx` (MotionCardEditor lines ~844–1037,
 * minus discardKeptEdit/stampConstraintAtFrame which live in useMotionStage).
 *
 * Owns no primitive state (the remnant orchestrates all useState/useRef);
 * it owns the memos, verbs, and the client-side re-skin effect.
 * Free-variable reads became explicit hook args. Behavior is IDENTICAL.
 */
import { useCallback, useEffect, useMemo } from "react";
import { deformFrame, jointsFromCm, jointsToCm, npzToDataUrl, patchFrame, vertsToB64, writeNpz, } from "@melite/formats";
import { decodeF32, stampEditedPose, } from "@melite/formats/motionConstraints";
export function usePoseEditing({ effectiveNpz, frameIdx, tlKeyframes: _tlKeyframes, constraintPayloads, keptEdit, currentJointsM, fullbodyKfAtFrame, pushUndo, toast, skin, onSave, editMode, setEditMode, editableJoints, setEditableJoints, editableJointsRef, setSelectedJoint, setEditedDeformedB64, reposing: _reposing, setReposing, setKeptEdit, setPlaying, setConstraintPayloads, }) {
    void _tlKeyframes;
    void _reposing;
    const toggleEdit = () => {
        /* v8 ignore next 1 -- Refine is disabled exactly when currentJointsM is null (probe 2026-09-19) */
        if (!currentJointsM)
            return;
        if (editMode) {
            // DONE — keep the refined pose. The edited body stays (PoseViewer3D's
            // activeFlat = hasEdited ? editedFlat : flat, so not clearing
            // editedDeformedB64 leaves the body on the edit); the skeleton holds
            // via keptEdit overlay. The effect below recomputes the deformed mesh
            // for the kept frame so scrubbing away + back re-applies it.
            setKeptEdit(editableJoints ? { joints: editableJoints, frame: frameIdx } : null);
            setEditMode(false);
            setSelectedJoint(null);
        }
        else {
            // If a kept edit exists at this frame, continue FROM it (pick up where
            // the user left off). Else if a fullbody keyframe was stamped here,
            // edit from its authored pose. Else fall back to the raw NPZ frame.
            pushUndo();
            const fromKept = keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null;
            const stampedPayload = fullbodyKfAtFrame ? constraintPayloads[fullbodyKfAtFrame.uuid] : null;
            const baseM = stampedPayload && stampedPayload.kind === "fullbody"
                ? decodeF32(stampedPayload.jp)
                : currentJointsM;
            const next = fromKept ? fromKept : jointsToCm(baseM);
            editableJointsRef.current = next;
            setEditableJoints(next);
            setSelectedJoint(null);
            setEditMode(true);
            setPlaying(false);
        }
    };
    const handleJointMove = useCallback((e) => {
        const prev = editableJointsRef.current;
        if (!prev)
            return;
        // IK moves report the full post-solve joint set; FK edits move one joint.
        const next = e.fullJoints ? e.fullJoints : prev.slice();
        if (!e.fullJoints) {
            next[e.idx * 3] = e.position.x;
            next[e.idx * 3 + 1] = e.position.y;
            next[e.idx * 3 + 2] = e.position.z;
        }
        editableJointsRef.current = next; // sync immediately for the next tick
        setEditableJoints(next);
        // LIVE-BIND: if a fullbody keyframe is bound to the current frame, the
        // edit WRITES into its constraint payload. jp = the authored joint
        // positions (cm → m); jr = rotations reconstructed by patchFrame so
        // children follow the dragged joint. This is the bar being WRITABLE —
        // drag a joint, the keyframe at that frame becomes the new pose, Run
        // feeds it as a FullBodyConstraintSet. patchFrame on 77 joints is cheap
        // (microseconds); running it per drag tick keeps the payload live.
        const src = effectiveNpz;
        const kf = fullbodyKfAtFrame;
        if (!src || !kf)
            return;
        const editedM = jointsFromCm(next);
        const patched = patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx);
        const payload = stampEditedPose(editedM, patched.globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9), frameIdx, src.T);
        setConstraintPayloads((p) => ({ ...p, [kf.uuid]: payload }));
    }, [effectiveNpz, fullbodyKfAtFrame, frameIdx, editableJointsRef, setEditableJoints, setConstraintPayloads]);
    // Client-side re-skin: edited joints (cm → m) + RECONSTRUCTED rotations.
    // The rotation reconstruction is mandatory — LBS with the ORIGINAL
    // rotations + moved joint positions stretches the mesh along the old
    // bone direction (spaghetti limbs). patchFrame arc-aligns each joint's
    // rotation so its child-direction follows the edit, then deformFrame
    // skins with those reconstructed rotations. Mirrors what the Kimodo pose
    // studio delegates to the backend (deformSomaJoints with rotmats=null →
    // FK solve); here it's fully client-side via patchFrame. No poser
    // round-trip, so it works pre-inference on the rest pose.
    usePoseReskinEffect({
        skin, effectiveNpz, editMode, editableJoints, keptEdit, frameIdx, setEditedDeformedB64,
    });
    // The joints the viewer displays right now — the edited pose (live drag),
    // a kept refine at this frame (after "Done"), or the raw frame.
    const displayJointsM = useMemo(() => {
        if (editMode && editableJoints)
            return jointsFromCm(editableJoints);
        if (keptEdit && keptEdit.frame === frameIdx)
            return jointsFromCm(keptEdit.joints);
        return currentJointsM;
    }, [editMode, editableJoints, keptEdit, frameIdx, currentJointsM]);
    // Repose: patch the edited frame's rotations → truncate to frameIdx+1 →
    // NPZ data URL → prev_motion_artifact → run. Kimodo conditions on the
    // edited pose as the chain end. Works on the rest pose too (patchFrame
    // reconstructs from the effective motion's base).
    const handleRepose = useCallback(async () => {
        if (!effectiveNpz || !editableJoints || !editMode)
            return;
        setReposing(true);
        try {
            const editedM = jointsFromCm(editableJoints);
            const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, frameIdx);
            const T = frameIdx + 1;
            const bytes = await writeNpz({
                posed_joints: {
                    data: patched.posedJoints.subarray(0, T * 77 * 3),
                    shape: [T, 77, 3],
                },
                global_rot_mats: {
                    data: patched.globalRotMats.subarray(0, T * 77 * 9),
                    shape: [T, 77, 3, 3],
                },
                fps: { data: new Float32Array([effectiveNpz.fps]) },
            });
            onSave({ prev_motion_artifact: npzToDataUrl(bytes) });
            toast("success", `Reposed from edited pose at frame ${frameIdx + 1}. Hit Run to generate.`);
        }
        catch (e) {
            toast("error", `Repose failed: ${e.message}`);
        }
        finally {
            setReposing(false);
        }
    }, [effectiveNpz, editableJoints, editMode, frameIdx, onSave, toast, setReposing]);
    return { toggleEdit, handleJointMove, displayJointsM, handleRepose };
}
/** The re-skin effect, split for readability — same deps + body as inline. */
function usePoseReskinEffect({ skin, effectiveNpz, editMode, editableJoints, keptEdit, frameIdx, setEditedDeformedB64, }) {
    useEffect(() => {
        if (!skin || !effectiveNpz)
            return;
        // Active in edit mode (live drag) AND when a kept edit applies to the
        // current frame (so the body holds the refine after "Done"). Otherwise
        // clear — the raw NPZ body shows.
        const active = editMode
            ? editableJoints
            : keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null;
        if (!active) {
            setEditedDeformedB64(null);
            return;
        }
        const fi = Math.min(frameIdx, effectiveNpz.T - 1);
        const editedM = jointsFromCm(active);
        const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, fi);
        const out = new Float32Array(skin.vertexCount * 3);
        deformFrame(patched.globalRotMats.subarray(fi * 77 * 9, (fi + 1) * 77 * 9), editedM, skin, out);
        setEditedDeformedB64(vertsToB64(out, true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editableJoints, editMode, keptEdit, skin, effectiveNpz, frameIdx, setEditedDeformedB64]);
}
//# sourceMappingURL=usePoseEditing.js.map
