import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PoseViewer3D — Three.js skinned humanoid figure from SOMA mesh (NVIDIA mesh).
 *
 * ALWAYS shows the bind mesh (T-pose NVIDIA humanoid) when loaded — even when
 * no 3D frame data is available yet. When valid frame data arrives it deforms
 * the mesh via /poser/skin/deform (COCO-18) or /poser/skin/deform_soma (SOMA-77).
 *
 * For text-to-pose results, pre-computed deformed vertices arrive as base64-encoded
 * float32 binary (deformedVerticesB64). These are decoded ONCE to a Float32Array
 * and indexed DIRECTLY into the geometry buffer (no nested-array conversion —
 * building 60×18056 = 1.08M small JS arrays freezes the browser tab).
 *
 * Mirrors the Kimodo demo scene (vendor/kimodo/kimodo/viz/scene.py):
 *   - Camera at [2.74, 1.88, 7.68], look-at [0, 0.9, 0], fov 45°
 *   - Grid at y=0, infinite, fade_distance ~ 3×floor_len
 *   - Bind pose lifted so feet clear the floor: bind_pos.y -= min_y; bind_pos.y += 0.02
 *   - Mesh color LIGHT_THEME (152,189,255) = #98BDFF
 *   - Per-frame set_pose() writes deformed verts directly into BufferGeometry
 *
 * RENDERED ON THE SHARED RAW-THREE STAGE (poseStage over card-base stage3d —
 * the substrate law). This file is the REACT SHELL: it owns the async data
 * plumbing (bind-mesh fetch, base64 decode, alt-sample decode, reference
 * bundle resolution) and syncs props into the imperative scene every render.
 * The old @react-three/fiber JSX tree and the drei components live on only
 * as their imperative analogues in poseStage.ts (the 2026-09-13 port).
 */
import { IconLoadingOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRef, useMemo, useState, useEffect, memo } from "react";
import styles from "./PoseViewer3D.module.css";
import { mountPoseStage, framedCameraPos, fetchBindMesh, } from "./poseStage.js";
export { framedCameraPos };
/** The layers default (the altSamples law's twin): a hoisted shared
 *  OFF state — a per-render `= {}` default would give every omitting
 *  render a NEW identity and re-sync the stage for nothing. */
const NO_LAYERS = { wireframe: false, skeleton: false };
// ── Per-identity-model bind-mesh cache ───────────────────────────────────
// (the fetch machinery lives in poseStage for the reference carrier; the
//  shell re-exports it so both sides share ONE cache.)
const NUM_VERTS = 18056;
const ALT_NUM_VERTS = 18056;
/** The altSamples default (stroke 77 bug fix): a hoisted shared
 *  empty — a per-render `= []` default gave every omitting render a
 *  NEW array identity, so the [altSamples] decode effect refired
 *  each render and its setState seeded an async render loop (proven
 *  by the motion burn-down's effect census). One stable identity,
 *  never mutated. */
const NO_ALT_SAMPLES = [];
// ── PoseViewer3D (memoized) ──────────────────────────────────────────────
// Wrapped in React.memo so typing in the prompt bar, dragging sliders in
// unrelated dialogs, or any other state change in TextToPoseTab that does
// NOT affect PoseViewer3D's actual props no longer re-renders the 3D scene.
// Pre-memo, every keystroke in the bottom PromptBubbleBar fired a full
// TextToPoseTab re-render that cascaded into PoseViewer3D (heavy: Canvas,
// WebGL, all the overlays) and froze the page ("WHen I try to type in the
// bottom bar, it all freezes"). frameIdx changes during playback are
// throttled to ~10fps by the stage's anim clock, so memo re-renders during
// playback are bounded.
function PoseViewer3DImpl({ deformedVerticesB64, deformedVertsDirect, frameIdx, onFrameChange, animate = false, cameraView = "demo", cameraFraming = "full", height = "100%", opacity = 1.0, layers = NO_LAYERS, color = "#98bdf7", fps = 30, forceBindPose = false, soma77Joints = null, soma77JointsFlat: soma77JointsFlatProp = null, editMode = false, editableJoints = null, selectedJoint = null, onSelectJoint, onSelectChain, onJointMove, selectedChain = null, kinematicMode = "fk", gizmoMode = "rotate", editedDeformedB64 = null, lightingOrbs = [], onLightingOrbsChange, selectedOrb = null, onSelectOrb, ghostJoints = null, cameraFov = 45, darkMode = true, playbackSpeed = 1, identityModel = "anny", identityCoeffs = null, localChanges = null, customTargets = null, footContacts = null, showFootContacts = false, showStartingDirection = false, altSamples = NO_ALT_SAMPLES, onCommitSample = () => { }, root2dPoints = [], endEffectorPoints = [], showConstraintLabels = true, selectedEEId = null, onSelectEE, onChangeEEPoint, placingEE = false, eePlaceJointIdx, onPlaceEE, referenceMesh = null, refPlaybackFrameIdx, editRefMode = false, refEditableJoints, onRefJointMove, onCanvasReady, threeCtxRef, inPlace = false, customBindMesh = null, }) {
    const [meshData, setMeshData] = useState(null);
    const [meshLoading, setMeshLoading] = useState(true);
    const [meshError, setMeshError] = useState(null);
    const [deformedFlat, setDeformedFlat] = useState(null);
    const [altDecoded, setAltDecoded] = useState([]);
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    // Flatten soma77Joints into a Float32Array for the skeleton overlay.
    const soma77JointsFlat = useMemo(() => {
        if (soma77JointsFlatProp)
            return soma77JointsFlatProp;
        if (!soma77Joints || soma77Joints.length === 0)
            return null;
        const T = soma77Joints.length;
        const flat = new Float32Array(T * 77 * 3);
        for (let f = 0; f < T; f++) {
            const frame = soma77Joints[f];
            if (!frame || frame.length < 77)
                continue;
            for (let j = 0; j < 77; j++) {
                const ji = (f * 77 + j) * 3;
                flat[ji] = frame[j][0];
                flat[ji + 1] = frame[j][1];
                flat[ji + 2] = frame[j][2];
            }
        }
        return flat;
    }, [soma77Joints, soma77JointsFlatProp]);
    // ── Reference bundle (the ReferenceMesh data effects, one hook) ──────
    // Resolves the reference's OWN bind mesh + decoded vert streams; the
    // stage renders from the resolved bundle.
    const [refBundle, setRefBundle] = useState(null);
    useEffect(() => {
        if (!referenceMesh) {
            setRefBundle(null);
            return;
        }
        let cancelled = false;
        const bundle = {
            spec: referenceMesh, meshData: null, flat: null, editedFlat: null,
        };
        setRefBundle({ ...bundle });
        (async () => {
            try {
                const mesh = await fetchBindMesh({
                    identityModel: referenceMesh.identityModel ?? "anny",
                    identityCoeffs: referenceMesh.identityCoeffs,
                    localChanges: referenceMesh.localChanges,
                    customTargets: referenceMesh.customTargets,
                });
                if (!cancelled)
                    setRefBundle((b) => (b !== null && b.spec === referenceMesh ? { ...b, meshData: mesh } : b));
            }
            catch (e) {
                console.error("ReferenceMesh bind fetch failed:", e);
            }
            if (referenceMesh.deformedVerticesB64) {
                try {
                    const res = await fetch(`data:application/octet-stream;base64,${referenceMesh.deformedVerticesB64}`);
                    if (cancelled)
                        return;
                    const buf = await res.arrayBuffer();
                    if (cancelled)
                        return;
                    setRefBundle((b) => (b !== null && b.spec === referenceMesh ? { ...b, flat: new Float32Array(buf) } : b));
                }
                catch (e) {
                    if (!cancelled)
                        console.error("ReferenceMesh decode failed:", e);
                }
            }
            if (referenceMesh.editedDeformedVerticesB64) {
                try {
                    const res = await fetch(`data:application/octet-stream;base64,${referenceMesh.editedDeformedVerticesB64}`);
                    if (cancelled)
                        return;
                    const buf = await res.arrayBuffer();
                    if (cancelled)
                        return;
                    setRefBundle((b) => (b !== null && b.spec === referenceMesh ? { ...b, editedFlat: new Float32Array(buf) } : b));
                }
                catch (e) {
                    if (!cancelled)
                        console.error("ReferenceMesh edited decode failed:", e);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [referenceMesh]);
    // Fetch bind mesh on mount AND when the identity mesh, coefficients, or
    // detail morphs change. soma/mhr/anny have different face topologies on
    // the same 18056-vertex layout; custom coefficients produce a shaped
    // variant of the bind mesh. Debounced so rapid slider movement in the
    // BodyShapeDialog doesn't spam the server.
    const coeffsKey = identityCoeffs && identityCoeffs.length > 0
        ? identityCoeffs.map(v => v.toFixed(1)).join(",")
        : "";
    const localChangesKey = localChanges && Object.keys(localChanges).length > 0
        ? Object.entries(localChanges)
            .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
            .map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",")
        : "";
    const customTargetsKey = customTargets && Object.keys(customTargets).length > 0
        ? Object.entries(customTargets)
            .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
            .map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",")
        : "";
    useEffect(() => {
        // Custom mesh override (item d): if the user loaded a GLB, use it
        // directly instead of fetching from /poser/skin/mesh.
        if (customBindMesh) {
            setMeshData(customBindMesh);
            setMeshLoading(false);
            setMeshError(null);
            return;
        }
        let cancel = false;
        setMeshLoading(true);
        setMeshError(null);
        const timer = setTimeout(() => {
            fetchBindMesh({ identityModel, identityCoeffs, localChanges, customTargets })
                .then((d) => { if (!cancel) {
                setMeshData(d);
                setMeshLoading(false);
            } })
                .catch((e) => { if (!cancel) {
                setMeshError(e.message);
                setMeshLoading(false);
            } });
        }, 60); // 60 ms debounce — coalesce rapid slider drags into one fetch
        return () => { cancel = true; clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identityModel, coeffsKey, localChangesKey, customTargetsKey, customBindMesh]);
    // Decode deformed_vertices_b64 → Float32Array ONCE. A sculpted pose
    // (editedDeformedB64) takes priority whenever present — both DURING edit
    // mode AND after "Done ✓" (keepPose) exits edit mode. ASYNC via
    // fetch(data:) so the browser's native decoder keeps the main thread free.
    const activeB64 = editedDeformedB64 ?? deformedVerticesB64;
    useEffect(() => {
        if (deformedVertsDirect && !editedDeformedB64) {
            setDeformedFlat(deformedVertsDirect);
            return;
        }
        if (!activeB64) {
            setDeformedFlat(null);
            return;
        }
        let cancelled = false;
        setDeformedFlat(null) // clear immediately so old data doesn't flash
        ;
        (async () => {
            try {
                const res = await fetch(`data:application/octet-stream;base64,${activeB64}`);
                if (cancelled)
                    return;
                const buf = await res.arrayBuffer();
                if (cancelled)
                    return;
                setDeformedFlat(new Float32Array(buf));
            }
            catch (e) {
                if (!cancelled)
                    console.error("Failed to decode deformed_vertices_b64:", e);
                // Fallback: synchronous decode (small payloads only — single-frame
                // edits). ~0.2ms for 1 frame so the freeze is negligible.
                try {
                    const binary = atob(activeB64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++)
                        bytes[i] = binary.charCodeAt(i);
                    if (!cancelled)
                        setDeformedFlat(new Float32Array(bytes.buffer));
                }
                catch (e2) {
                    if (!cancelled) {
                        console.error("Fallback decode also failed:", e2);
                        setDeformedFlat(null);
                    }
                }
            }
        })();
        return () => { cancelled = true; };
    }, [activeB64, deformedVertsDirect, editedDeformedB64]);
    // Alt samples: decode each sample's first frame async (each b64 is ~13MB;
    // synchronous atob froze the main thread 500ms × N).
    useEffect(() => {
        if (!altSamples || altSamples.length === 0) {
            setAltDecoded([]);
            return;
        }
        let cancelled = false;
        const decoded = [];
        (async () => {
            for (let i = 0; i < altSamples.length; i++) {
                if (cancelled)
                    return;
                const s = altSamples[i];
                try {
                    const res = await fetch(`data:application/octet-stream;base64,${s.deformed_vertices_b64}`);
                    if (cancelled)
                        return;
                    const buf = await res.arrayBuffer();
                    if (cancelled)
                        return;
                    const flat = new Float32Array(buf);
                    const frame0 = flat.subarray(0, ALT_NUM_VERTS * 3);
                    decoded.push({ idx: i + 1, verts: new Float32Array(frame0) });
                    if (!cancelled)
                        setAltDecoded([...decoded]);
                }
                catch (e) {
                    // NO SILENT SWALLOW — log so sample drops don't look like "no alts."
                    console.error("[PoseViewer3D] alt-sample decode failed:", e);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [altSamples]);
    const hasDeformed = !!deformedFlat && deformedFlat.length >= NUM_VERTS * 3;
    const computedFrameCount = hasDeformed
        ? Math.floor(deformedFlat.length / (NUM_VERTS * 3))
        : 0;
    const showBindPose = forceBindPose || !hasDeformed || !meshData;
    const cameraPos = useMemo(() => framedCameraPos(cameraView, cameraFraming)[0], [cameraView, cameraFraming]);
    // ── Mount the imperative stage ONCE per mesh-data lifetime ───────────
    // (camera fov/pos are mount-time facts in the raw substrate, exactly as
    //  the r3f <Canvas camera={...}> only applied them on mount.)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !meshData)
            return;
        const handle = mountPoseStage(canvas, {
            fov: cameraFov,
            camera: cameraPos,
            darkMode,
            onCanvasReady,
        });
        if (handle === null)
            return;
        stageRef.current = handle;
        if (threeCtxRef)
            threeCtxRef.current = handle.threeCtx;
        return () => {
            stageRef.current = null;
            if (threeCtxRef)
                threeCtxRef.current = null;
            handle.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meshData]);
    // ── Props → stage sync (every render; coarse diffs live stage-side) ──
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || !meshData)
            return;
        stage.update({
            meshData,
            deformedFlat: hasDeformed ? deformedFlat : null,
            numVerts: NUM_VERTS,
            frameCount: computedFrameCount || 1,
            frameIdx,
            setFrameIdx: onFrameChange ?? (() => { }),
            animate,
            showBindPose,
            opacity,
            layers,
            color,
            fps,
            soma77JointsFlat,
            editMode,
            editableJoints,
            selectedJoint,
            onSelectJoint: onSelectJoint ?? (() => { }),
            onSelectChain,
            onJointMove: onJointMove ?? (() => { }),
            selectedChain,
            kinematicMode,
            gizmoMode,
            lightingOrbs,
            onLightingOrbsChange,
            selectedOrb,
            onSelectOrb,
            ghostJoints,
            playbackSpeed,
            footContacts,
            showFootContacts,
            showStartingDirection,
            altSamples: altDecoded,
            onCommitSample,
            root2dPoints,
            endEffectorPoints,
            showConstraintLabels,
            selectedEEId,
            onSelectEE,
            onChangeEEPoint,
            placingEE,
            eePlaceJointIdx: eePlaceJointIdx ?? 0,
            onPlaceEE: onPlaceEE ?? (() => { }),
            cameraView,
            framing: cameraFraming,
            reference: refBundle,
            refPlaybackFrameIdx,
            editRefMode,
            refEditableJoints,
            onRefJointMove,
            inPlace,
        });
        stage.setDarkMode(darkMode);
    });
    if (meshLoading)
        return (_jsxs("div", { className: styles.loadingBox, style: { height }, children: [_jsx(IconLoadingOutlineRegular, { className: styles.loadingIcon }), _jsx("span", { className: styles.loadingLabel, children: "Loading mesh\u2026" })] }));
    if (meshError)
        return _jsxs("div", { className: styles.errorBox, style: { height }, children: ["Mesh error: ", meshError] });
    if (!meshData)
        return _jsx("div", { className: styles.errorBox, style: { height }, children: "No mesh" });
    return (_jsx("div", { style: { height, width: "100%", position: "relative" }, children: _jsx("canvas", { ref: canvasRef, style: { display: "block", width: "100%", height: "100%" }, "data-testid": "pose-viewer-3d" }) }));
}
export const PoseViewer3D = memo(PoseViewer3DImpl);
//# sourceMappingURL=PoseViewer3D.js.map
