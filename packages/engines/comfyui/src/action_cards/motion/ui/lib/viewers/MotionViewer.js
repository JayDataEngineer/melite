import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MotionViewer — renders a Kimodo motion NPZ on the NEUTRAL SOMAX bind mesh.
 *
 * This is a faithful client-side port of the kimodo demo's
 * vendor/kimodo/kimodo/viz/soma_skin.py SOMASkin.skin()+lbs(). The demo is
 * the reference renderer for Kimodo motions, and it skins on a NEUTRAL mesh
 * (skin_standard.npz: bind vertices + LBS weights for the SOMA-77 skeleton),
 * NOT a parametric body. That neutral mesh is the "base SOMAX mesh" that
 * actually deforms — distinct from the poser backend's `soma` engine (static,
 * no LBS weights, can't deform) and from `anny`/`mhr` (parametric bodies with
 * their own proportions).
 *
 * Flow (all client-side, no backend round-trip):
 *   1. Fetch the motion NPZ → posed_joints (T, 77, 3) + global_rot_mats
 *      (T, 77, 3, 3), both in METERS (Kimodo's native unit).
 *   2. Load the neutral skin (the kimodo provision door
 *      /v1/models/kimodo/provisions/skin_standard.npz — declared row,
 *      mount-streamed or on-demand acquired; module-cached) → bind
 *      vertices, faces, LBS indices/weights, inverse bind rig.
 *   3. For each frame, run LBS: affine[j] = (fk[j] · bindRigInv[j])[:3, :],
 *      v' = Σ_w weights[v,w] · (affine[indices[v,w]] · [bindV, 1]).
 *   4. Build a BufferGeometry from the neutral bind mesh; drive the position
 *      attribute per-frame from the deformed verts (already meters).
 *
 * Units: meters throughout. No cm↔m conversion — that was a poser-route
 * artifact. Floor lift + camera framing adapt to the figure's real bounds.
 *
 * Distinct from AnimatedGLBViewer (baked GLB clips) and PoseViewer3D (the
 * pose-editing scene). This is a lightweight autoplay preview for the assets
 * gallery: Kimodo motions carry no mesh, so we drape them over the neutral
 * SOMAX mesh exactly as the kimodo demo does.
 *
 * RENDERED ON THE SHARED RAW-THREE STAGE (card-base stage3d, the substrate
 * law) — the r3f Canvas/useFrame/OrbitControls tree was ported away
 * 1:1; playback stays ref-driven (frameIdxRef advanced in the stage tick,
 * React re-rendered at ~15fps for the transport bar only).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from '@melite/three-client/client';
import { mountStage3D, Skeleton, Tip } from '@melite/card-base/client';
import { Button, IconPauseOutlineRegular, IconPlayOutlineRegular, IconWarningTriangleOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { ScrubInput } from '@melite/cards/form-fields';
import { loadSomaSkin } from "@melite/formats";
import { loadMotionNpz, precomputeDeformedVerts } from "@melite/formats";
import styles from "./MotionViewer.module.css";
const FLOOR_LIFT_Y = 0.02;
// ── Geometry: neutral bind mesh, meters ────────────────────────────────────
function buildSkinGeometry(skin) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(skin.bindVertices.slice(), 3));
    // faces arrive as a Uint32Array (converted from int64 at load). Three.js
    // wants a typed index; Uint32 covers the 18056-vert topology.
    geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(skin.faces), 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
}
function computeFloorLift(deformedFlat) {
    let minY = Infinity;
    for (let i = 1; i < deformedFlat.length; i += 3) {
        if (deformedFlat[i] < minY)
            minY = deformedFlat[i];
    }
    return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y;
}
export default function MotionViewer({ url, className }) {
    const [skin, setSkin] = useState(null);
    const [deformedFlat, setDeformedFlat] = useState(null);
    const [frameCount, setFrameCount] = useState(0);
    const [fps, setFps] = useState(30);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(true);
    const playingRef = useRef(true);
    const frameIdxRef = useRef(0);
    const playGenRef = useRef(0);
    const [displayFrame, setDisplayFrame] = useState(0);
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    useEffect(() => {
        playingRef.current = playing;
        if (playing)
            playGenRef.current += 1;
    }, [playing]);
    // ── Load NPZ → neutral skin → client-side LBS for all frames ────────────
    // The load + precompute live in lib/motionNpz (single source of truth —
    // the Motion Card editor consumes the same functions).
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const motion = await loadMotionNpz(url);
                if (cancelled)
                    return;
                // Neutral SOMA skin (cached). Mirrors the kimodo demo's soma_skin path.
                const somaSkin = await loadSomaSkin();
                if (cancelled)
                    return;
                // Run LBS for every frame (meters, exactly as the demo does).
                const allVerts = precomputeDeformedVerts(motion, somaSkin);
                if (cancelled)
                    return;
                setSkin(somaSkin);
                setDeformedFlat(allVerts);
                setFrameCount(motion.T);
                setFps(motion.fps);
                setLoading(false);
            }
            catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Failed to load motion");
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [url]);
    const liftY = useMemo(() => (deformedFlat ? computeFloorLift(deformedFlat) : 0), [deformedFlat]);
    const framing = useMemo(() => {
        if (!deformedFlat)
            return null;
        let minY = Infinity, maxY = -Infinity;
        for (let i = 1; i < deformedFlat.length; i += 3) {
            const y = deformedFlat[i];
            if (y < minY)
                minY = y;
            if (y > maxY)
                maxY = y;
        }
        if (!isFinite(minY))
            return null;
        return { centerY: (minY + maxY) / 2 + liftY, height: maxY - minY };
    }, [deformedFlat, liftY]);
    // ── The raw-three stage (the r3f Canvas port) ───────────────────────────
    // Built once per (skin, deformedFlat) pair — a data swap rebuilds the
    // figure exactly like the old geo-memo remount did. Scene content:
    // the three-point light rig, the shadow-catching floor, the Kimodo grid,
    // the lifted figure group. Frame logic: the playback clock tick + the
    // mesh upload tick, registered IN THAT ORDER (the clock advances
    // frameIdxRef, the mesh reads it — one rAF, zero React renders).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !skin || !deformedFlat)
            return;
        const stage = mountStage3D(canvas, {
            fov: 40,
            near: 0.05,
            far: 50,
            camera: [0, 1.2, 3.5],
            target: [0, 0.9, 0],
            minDistance: 0.6,
            maxDistance: 12,
            maxPolarAngle: Math.PI / 1.85,
            alpha: false,
        });
        if (stage === null)
            return;
        stageRef.current = stage;
        stage.renderer.setClearColor("#0a0a0f");
        const scene = stage.scene;
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(5, 8, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 3;
        key.shadow.camera.bottom = -3;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 20;
        key.shadow.bias = -0.0005;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-4, 3, -2);
        scene.add(fill);
        scene.add(new THREE.HemisphereLight(0xcdd6f4, 0x1a1a2e, 0.35));
        // Contact-shadow analogue: the floor catches the key light's shadow
        // (PCFSoft) through a ShadowMaterial plane — same read as the old
        // ContactShadows pass for a single grounded figure.
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.5 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        const grid = new THREE.GridHelper(10, 40, 0x3a3a4a, 0x22222e);
        scene.add(grid);
        // The figure — lifted so feet clear the floor, per-frame verts.
        const group = new THREE.Group();
        group.position.y = liftY;
        scene.add(group);
        const geo = buildSkinGeometry(skin);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x9bd0f7,
            roughness: 0.55,
            metalness: 0.05,
            flatShading: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const numVerts = skin.vertexCount;
        const stride = numVerts * 3;
        let lastUploaded = -1;
        const uploadFrame = (idx) => {
            const pos = geo.attributes.position;
            const arr = pos.array;
            const frames = deformedFlat.length / stride;
            if (frames < 1)
                return;
            const clamped = Math.max(0, Math.min(idx, Math.floor(frames) - 1));
            const base = clamped * stride;
            // Already meters — copy straight in.
            arr.set(deformedFlat.subarray(base, base + stride), 0);
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            geo.computeBoundingSphere();
            lastUploaded = clamped;
        };
        // Playback clock (the PlaybackClock port), fused with the mesh upload
        // in ONE stage tick so the advance→read order is fixed: resume-from-
        // current-frame semantics preserved via the play generation counter,
        // then the mesh uploads whatever frameIdxRef landed on (skip when
        // unchanged — paused or rAF faster than fps).
        const time = { cur: 0 };
        let lastGen = -1;
        stage.addTick((delta) => {
            if (playingRef.current && frameCount >= 1) {
                if (playGenRef.current !== lastGen) {
                    lastGen = playGenRef.current;
                    time.cur = frameIdxRef.current / fps || 0;
                }
                time.cur += Math.min(delta, 0.1);
                frameIdxRef.current = Math.floor(time.cur / (1 / fps)) % frameCount;
            }
            const target = frameIdxRef.current;
            if (target !== lastUploaded)
                uploadFrame(target);
        });
        return () => {
            stageRef.current = null;
            stage.dispose();
            geo.dispose();
            mat.dispose();
            ground.geometry.dispose();
            ground.material.dispose();
            grid.geometry.dispose();
        };
    }, [skin, deformedFlat, liftY, frameCount, fps]);
    // ── Adaptive camera framing (the CameraRig port) ────────────────────────
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || !framing)
            return;
        const dist = Math.max(1.6, framing.height * 2.4);
        stage.camera.position.set(0, framing.centerY + framing.height * 0.15, dist);
        stage.controls.target.set(0, framing.centerY, 0);
        stage.controls.update();
        stage.camera.lookAt(0, framing.centerY, 0);
    }, [framing]);
    useEffect(() => {
        if (loading || error || frameCount < 1)
            return;
        const onKey = (e) => {
            const el = e.target;
            if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) || el?.isContentEditable)
                return;
            if (e.code === "Space") {
                e.preventDefault();
                setPlaying((p) => !p);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [loading, error, frameCount]);
    useEffect(() => {
        if (loading || error || frameCount < 1)
            return;
        let raf = 0;
        let last = 0;
        const tick = (t) => {
            if (t - last > 66) {
                setDisplayFrame(frameIdxRef.current);
                last = t;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [loading, error, frameCount]);
    const togglePlay = useCallback(() => setPlaying((p) => !p), []);
    const seek = useCallback((frac) => {
        if (frameCount < 1)
            return;
        const frame = Math.max(0, Math.min(frameCount - 1, Math.round(frac * (frameCount - 1))));
        frameIdxRef.current = frame;
        setDisplayFrame(frame);
        setPlaying(false);
    }, [frameCount]);
    const totalSec = frameCount > 0 && fps > 0 ? frameCount / fps : 0;
    const curSec = fps > 0 ? displayFrame / fps : 0;
    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const r = s - m * 60;
        return `${m}:${r.toFixed(1).padStart(4, "0")}`;
    };
    if (error) {
        return (_jsxs("div", { className: className ? `${styles.stateBox} ${className}` : styles.stateBox, children: [_jsx(IconWarningTriangleOutlineRegular, { className: styles.stateIcon }), _jsx("div", { className: styles.stateTitle, children: "Motion preview unavailable" }), _jsx("div", { className: styles.stateDetail, children: error })] }));
    }
    if (loading || !skin || !deformedFlat) {
        // Skeleton fills the viewer box while the motion data loads — reads
        // as "filling in" instead of a spinning dot.
        return (_jsx("div", { role: "status", "aria-busy": "true", "aria-label": "Loading motion", className: className ? `${styles.loadingBox} ${className}` : styles.loadingBox, children: _jsx(Skeleton, { className: styles.loadingSkeleton }) }));
    }
    return (_jsxs("div", { className: className ? `${styles.root} ${className}` : styles.root, children: [_jsx("canvas", { ref: canvasRef, className: styles.canvas, "data-testid": "motion-viewer-3d" }), frameCount > 0 && (_jsxs("div", { className: styles.transport, children: [_jsx(Tip, { tip: playing ? "Pause (Space)" : "Play (Space)", children: _jsx(Button, { variant: "ghost", onClick: togglePlay, className: styles.playBtn, "aria-label": playing ? "Pause (Space)" : "Play (Space)", children: playing ? _jsx(IconPauseOutlineRegular, { className: styles.playIcon }) : _jsx(IconPlayOutlineRegular, { className: `${styles.playIcon} ${styles.playIconNudge}` }) }) }), _jsxs("div", { className: styles.scrubWrap, children: [_jsx("div", { className: styles.scrubTrack }), _jsx("div", { className: styles.scrubPlayed, style: { width: `${frameCount > 1 ? (displayFrame / (frameCount - 1)) * 100 : 0}%` } }), _jsx(ScrubInput, { min: 0, max: Math.max(0, frameCount - 1), value: displayFrame, onChange: (e) => seek(Number(e.target.value) / Math.max(1, frameCount - 1)), "aria-label": "Seek" }), _jsx("div", { className: styles.scrubKnob, style: { left: `${frameCount > 1 ? (displayFrame / (frameCount - 1)) * 100 : 0}%` } })] }), _jsxs("div", { className: styles.timeLabel, children: [fmt(curSec), " / ", fmt(totalSec)] }), _jsxs("div", { className: styles.fpsBadge, children: [fps.toFixed(0), " fps \u00B7 ", frameCount, "f"] })] }))] }));
}
//# sourceMappingURL=MotionViewer.js.map
