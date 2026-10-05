import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * MotionExportDialog — the Motion Card's export surface.
 *
 * The user MANUALLY frames a shot and picks render modes — there is no
 * default export.
 *
 * Render modes (any subset, user-selected — Export is disabled until ≥1):
 * • {tag}_mesh.png     — raw mesh render (background per the picker)
 * • {tag}_openpose.png — COCO-18 skeleton at the SAME camera (pixel-aligned)
 * • {tag}_depth.png    — grayscale depth pass (MeshDepthMaterial)
 *
 * ONE FRAMING (2026-08-15, round 2 — the preset square is GONE): the STAGE
 * RECTANGLE over the live 3D stage (rendered by MotionCardEditor while this
 * dialog is open). The camera is the user's own orbit — export is SCREENSHOT
 * SEMANTICS: render the scene with the camera AS IS (buffer upscaled, aspect
 * untouched), crop the rect, scale its long edge to the output resolution.
 * The output inherits the rect's aspect — 2:3 portrait, 16:9 wide, whatever
 * was framed.
 *
 * SIZING (2026-08-15 round 3 — PIXELS, "height and width should always be
 * pixels"): the OUTPUT SIZE (outW × outH, typed in px) is the export truth.
 * The stage rectangle is just the framing TOOL — its PIXEL aspect is locked
 * to outW:outH by the parent (MotionCardEditor refits on every size change
 * and every corner drag), so it can sit ANY size on screen and still export
 * the typed pixels ("I can't really output a 768 by 1024 because I don't
 * have room" — room was never needed; the rect's on-screen size ≠ the
 * output resolution). Drag its BODY to move, drag ANY of its FOUR corners
 * to resize (aspect-locked, opposite corner anchored), type the POSITION in
 * percent here, type the SIZE in pixels here.
 *
 * PRE-RUN EXPORT: the rest pose (T=1) is a full export subject — the stage
 * renders the neutral mannequin before any GPU run, so framing + exporting
 * works immediately ("do I have to actually make motion to output a frame?"
 * — no). Only the Downloads scope needs a run (no NPZ asset exists yet —
 * its button is disabled until npzUrl).
 *
 * Scope:
 * • Single view — the framed rect at the user's angle, current frame.
 * • 8-angle batch — the SAME rect, automated around the azimuth ring: the
 *   camera is re-aimed at each preset (position + lookAt only), then the
 *   identical render + crop runs. ZERO extra image manipulation — the
 *   framing work is done once and reused eight times ("it is just
 *   automated and done for the user").
 * • Downloads — the raw motion NPZ + the auto-baked GLB preview.
 *
 * PIXEL-ALIGNMENT CONTRACT: mesh + openpose + depth come from the SAME
 * camera state. Mesh/depth are off-screen passes of the live three.js
 * scene (threeCtxRef); openpose projects the COCO-18 joints through that
 * exact camera matrix + the viewer's group transform (lift + optional
 * in-place root pin), then remaps into the crop region so the skeleton
 * sits on the mesh.
 *
 * BACKGROUNDS: Preserve (default — the stage's OWN background, including a
 * user-uploaded custom background image), Transparent, or a flat color.
 *
 * LAYOUT: the panel is IN-FLOW — a flex sibling of the stage inside the
 * editor, never a fixed overlay. Opening it PUSHES the viewport narrower
 * (the mesh is never covered — "it literally goes over the mesh we need
 * to see" fixed at the layout level, not with z-index).
 *
 * DESTINATION: browser download — the ONE delivery path.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Download, X, Camera, FileBox, Box, Palette, Check, Layers, RotateCw, Film, ChevronLeft, ChevronRight, PlayAlt as Play, Pause, Crop, Frame, } from '@melite/card-base/client';
import { AZIMUTH_PRESETS, soma77ToCoco18, azimuthCameraPos, } from "@melite/formats";
import { renderOpenPoseCanvas } from "@melite/formats";
import { Input } from "@deepseek-ai/dsh-client-ui-primitives";
import { useToastStore } from '@melite/card-base/client';
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { Tip } from "./kit.js";
import { cn } from '@melite/card-base/client';
import s from "./export-dialog.module.css";
import { STAGE_BACKGROUND_DARK } from '@melite/card-base/client';
/** Long-edge PRESETS are GONE (2026-08-15 round 4, "do we need resolution
 *  presets anymore when we type the pixel resolutions?"): the typed px
 *  inputs are the one size UI — nothing shadows them. */
/** "preserve" = the stage's OWN background (a user-uploaded custom image or
 *  the default dark) — carried into the export untouched; "transparent" =
 *  nulled for the mesh pass (alpha PNG); hex = a flat color swapped in for
 *  the render and restored after. */
const BACKGROUNDS = [
    { label: "Preserve", value: "preserve" },
    { label: "Transparent", value: "transparent" },
    { label: "Black", value: "#000000" },
    { label: "White", value: "#ffffff" },
    { label: "Dark", value: STAGE_BACKGROUND_DARK },
];
const RENDER_MODES = [
    { id: "mesh", label: "Raw mesh", desc: "Mannequin render" },
    { id: "openpose", label: "OpenPose", desc: "COCO-18 skeleton" },
    { id: "depth", label: "Depth", desc: "Grayscale depth map" },
];
const TARGET_HEIGHT = 0.9; // the pose studio's camera target height
// Depth pass near/far — tight around the figure at the ~3.4m viewing distance
// so the grayscale range is spread over the body (not compressed to one shade).
const DEPTH_NEAR = 1.5;
const DEPTH_FAR = 5.0;
const MAX_RENDER = 2048; // cap on the oversized export render (GPU guard)
let _depthMat = null;
function depthMaterial() {
    return _depthMat ??= new THREE.MeshDepthMaterial();
}
export const DEFAULT_STAGE_RECT = { x: 0.25, y: 0.1, w: 0.5, h: 0.8 };
export function MotionExportDialog({ open, onClose, npz, npzUrl, glbUrl, frameIdx, onFrameChange, displayJointsM, liftY, inPlace, threeCtxRef, stageRect, onStageRectChange, outW, outH, onOutSize, onFramePreset }) {
    const [scope, setScope] = useState("single");
    const [bgIdx, setBgIdx] = useState(0); // Preserve (the stage's own bg)
    const [exporting, setExporting] = useState(false);
    // Frame playback inside the dialog — lets the user SCRUB to the exact frame
    // they want to export without closing the dialog. Mirrors the motion studio.
    const [previewing, setPreviewing] = useState(false);
    // Manual render-mode selection. NONE by default — the user picks each time.
    const [enabledModes, setEnabledModes] = useState(new Set());
    const toast = useToastStore((s) => s.addToast);
    // Track the current frame in a ref so the setInterval closure never goes
    // stale (frameIdx prop changes every tick but the interval is created once).
    const frameRef = useRef(frameIdx);
    frameRef.current = frameIdx;
    // Auto-play loop — advances frameIdx at the NPZ's native fps; stops at T.
    useEffect(() => {
        if (!previewing || !onFrameChange)
            return;
        const frameDur = 1000 / (npz.fps || 30);
        const id = window.setInterval(() => {
            const next = frameRef.current + 1;
            if (next >= npz.T) {
                setPreviewing(false);
                return;
            }
            onFrameChange(next);
        }, frameDur);
        return () => window.clearInterval(id);
    }, [previewing, onFrameChange, npz.fps, npz.T]);
    // Stop the preview loop when the dialog closes so it doesn't leak.
    useEffect(() => { if (!open)
        setPreviewing(false); }, [open]);
    // ── LIVE framing (screenshot semantics) ───────────────────────────────────
    // The stage canvas's CSS size — the aspect source of truth. The live
    // camera's own aspect equals it, so rendering at the SAME ratio changes
    // nothing about the projection: the export is literally what the user
    // framed on screen, upscaled.
    const stageDims = useCallback(() => {
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready — retry the export");
        const el = ctx.gl.domElement;
        return { w: el.clientWidth || el.width || 1, h: el.clientHeight || el.height || 1 };
    }, [threeCtxRef]);
    /** Screenshot pass at the LIVE camera: buffer upscaled, aspect untouched
     *  (the render size keeps the stage ratio), camera never moved. Background
     *  per the picker: "preserve" leaves the stage's own (a custom image
     *  carries into the export), "transparent" nulls it (alpha PNG), a hex
     *  swaps a flat color in for the render and restores after. */
    const renderLive = useCallback((w, h, bg) => {
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready");
        const { gl, scene } = ctx;
        const camera = ctx.camera;
        const origBg = scene.background;
        const origW = gl.domElement.width;
        const origH = gl.domElement.height;
        try {
            if (bg === "transparent")
                scene.background = null;
            else if (bg !== "preserve")
                scene.background = new THREE.Color(bg);
            gl.setSize(w, h, false);
            gl.render(scene, camera);
            return gl.domElement.toDataURL("image/png");
        }
        finally {
            scene.background = origBg;
            gl.setSize(origW, origH, false);
            gl.render(scene, camera); // repaint the live canvas
        }
    }, [threeCtxRef]);
    /** Depth variant of the screenshot pass (same untouched camera, tight
     *  near/far so the body fills the grayscale range). */
    const renderDepthLive = useCallback((w, h) => {
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready");
        const { gl, scene } = ctx;
        const camera = ctx.camera;
        const origNear = camera.near;
        const origFar = camera.far;
        const origOverride = scene.overrideMaterial;
        const origBg = scene.background;
        const origW = gl.domElement.width;
        const origH = gl.domElement.height;
        try {
            camera.near = DEPTH_NEAR;
            camera.far = DEPTH_FAR;
            camera.updateProjectionMatrix();
            gl.setSize(w, h, false);
            scene.overrideMaterial = depthMaterial();
            scene.background = null; // clean depth — only meshes contribute
            gl.render(scene, camera);
            return gl.domElement.toDataURL("image/png");
        }
        finally {
            scene.overrideMaterial = origOverride;
            scene.background = origBg;
            gl.setSize(origW, origH, false);
            camera.near = origNear;
            camera.far = origFar;
            camera.updateProjectionMatrix();
            gl.render(scene, camera);
        }
    }, [threeCtxRef]);
    /** Project the displayed COCO-18 joints through the LIVE camera into
     *  (w, h) pixels (w/h == the stage ratio == camera.aspect — no swap),
     *  applying the viewer's group transform (lift + in-place pin). */
    const projectToPixelsLive = useCallback((w, h) => {
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready");
        const camera = ctx.camera;
        const root0 = npz.posedJoints;
        const rootF = npz.posedJoints.subarray(frameIdx * 77 * 3, frameIdx * 77 * 3 + 3);
        const gx = inPlace ? root0[0] - rootF[0] : 0;
        const gz = inPlace ? root0[2] - rootF[2] : 0;
        const coco = soma77ToCoco18(displayJointsM); // (18, 3) meters
        const out = new Float32Array(18 * 3);
        const v = new THREE.Vector3();
        for (let i = 0; i < 18; i++) {
            v.set(coco[i * 3] + gx, coco[i * 3 + 1] + liftY, coco[i * 3 + 2] + gz);
            v.project(camera);
            const visible = v.z >= -1 && v.z <= 1;
            out[i * 3] = ((v.x + 1) / 2) * w;
            out[i * 3 + 1] = ((1 - v.y) / 2) * h;
            out[i * 3 + 2] = visible ? 0.9 : 0;
        }
        return out;
    }, [threeCtxRef, npz, frameIdx, displayJointsM, liftY, inPlace]);
    // ── Camera + projection state for one azimuth ────────────────────────────
    // Returns the camera for the given view (mutates the live camera's position
    // + orientation — the caller restores). The 8-angle batch uses this to run
    // the IDENTICAL screenshot flow at each ring position: position + lookAt
    // only, aspect/fov/distance per the ring, so the rect crop applies as-is.
    const cameraForView = useCallback((view) => {
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready — retry the export");
        const camera = ctx.camera;
        // The visual target: the figure's root position as the viewer shows it
        // (pinned to frame 0 when in-place, else the current frame).
        const root = inPlace
            ? npz.posedJoints // frame 0 root
            : npz.posedJoints.subarray(frameIdx * 77 * 3, frameIdx * 77 * 3 + 3);
        const tx = root[0];
        const tz = root[2];
        const [px, py, pz] = azimuthCameraPos(view);
        camera.position.set(px + tx, py, pz + tz);
        camera.lookAt(tx, TARGET_HEIGHT, tz);
        return camera;
    }, [threeCtxRef, npz, frameIdx, inPlace]);
    /** Run `fn` with the camera at an azimuth preset (batch), or with the
     *  user's own camera untouched (single view — null). Saves position +
     *  orientation, restores + repaints after, so the live stage never shows
     *  a stale batch angle. */
    const withCameraAt = useCallback((view, fn) => {
        if (view === null)
            return fn();
        const ctx = threeCtxRef.current;
        if (!ctx)
            throw new Error("3D context not ready");
        const camera = ctx.camera;
        const origPos = camera.position.clone();
        const origQuat = camera.quaternion.clone();
        cameraForView(view);
        try {
            return fn();
        }
        finally {
            camera.position.copy(origPos);
            camera.quaternion.copy(origQuat);
            ctx.gl.render(ctx.scene, camera); // repaint the user's view
        }
    }, [threeCtxRef, cameraForView]);
    const toggleMode = (m) => setEnabledModes((prev) => {
        const next = new Set(prev);
        if (next.has(m))
            next.delete(m);
        else
            next.add(m);
        return next;
    });
    const downloadDataUrl = (dataUrl, filename) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };
    /** Load a PNG data URL into a canvas (for cropping). */
    const dataUrlToCanvas = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            c.getContext("2d").drawImage(img, 0, 0);
            resolve(c);
        };
        img.onerror = reject;
        img.src = url;
    });
    /** Crop a full screenshot to the STAGE RECT (free aspect), scale to
     *  (ow, oh) — the long edge is the chosen resolution. */
    const cropToRectOutput = async (fullUrl, rect, ow, oh) => {
        const full = await dataUrlToCanvas(fullUrl);
        const FW = full.width;
        const FH = full.height;
        const o = document.createElement("canvas");
        o.width = ow;
        o.height = oh;
        const ctx = o.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(full, rect.x * FW, rect.y * FH, rect.w * FW, rect.h * FH, 0, 0, ow, oh);
        return o.toDataURL("image/png");
    };
    /** ONE delivery path for every export: the browser download. */
    const deliver = async (dataUrl, filename) => {
        downloadDataUrl(dataUrl, filename);
    };
    const deliverBlob = async (blob, filename) => {
        downloadBlob(blob, filename);
    };
    /** THE export path (one framing, 2026-08-15 round 3): one pass per mode
     *  through the screenshot flow — the user's camera when `view` is null,
     *  an azimuth preset when it isn't (the batch) — buffer upscaled at the
     *  stage ratio, cropped to the stage rect, scaled to the TYPED PIXEL size
     *  (outW × outH — exactly what the user asked for, not a derived edge).
     *  The rect's pixel aspect == outW:outH (the parent locks it), so the crop
     *  maps 1:1 with no distortion. The SAME crop for every angle. */
    const exportOneLive = useCallback(async (tag, view) => {
        const bg = BACKGROUNDS[bgIdx].value;
        // "preserve" for the openpose canvas: the stage's own bg COLOR when it
        // is one (a custom image can't tile onto the 2D skeleton canvas — the
        // mannequin stage dark stands in); hex/transparent pass through.
        const opBg = bg === "preserve"
            ? (() => {
                const s = threeCtxRef.current?.scene.background;
                return s instanceof THREE.Color ? `#${s.getHexString()}` : STAGE_BACKGROUND_DARK;
            })()
            : bg;
        const ow = outW;
        const oh = outH;
        const edge = Math.max(ow, oh);
        // Upscale factor: the rect's PIXEL region (normalized × stage px — the
        // stage's own aspect mediates) must carry ≥ the typed output in native
        // pixels, capped by MAX_RENDER on the buffer's long edge.
        const { w: sw, h: sh } = stageDims();
        const need = Math.max(ow / Math.max(stageRect.w * sw, 2), oh / Math.max(stageRect.h * sh, 2));
        const k = Math.min(need, MAX_RENDER / Math.max(sw, sh));
        const FW = Math.max(2, Math.round(sw * k));
        const FH = Math.max(2, Math.round(sh * k));
        for (const m of RENDER_MODES.map((r) => r.id)) {
            if (!enabledModes.has(m))
                continue;
            const filename = `${tag}_${m}.png`;
            if (m === "openpose") {
                // Project into the FULL screenshot space, remap by the rect into
                // the output, then into 1024-space (renderOpenPoseCanvas speaks 1024).
                const px = withCameraAt(view, () => projectToPixelsLive(FW, FH));
                const kp = [];
                const minX = stageRect.x * FW;
                const minY = stageRect.y * FH;
                const spanX = stageRect.w * FW;
                const spanY = stageRect.h * FH;
                for (let i = 0; i < 18; i++) {
                    const ox = ((px[i * 3] - minX) / spanX) * ow;
                    const oy = ((px[i * 3 + 1] - minY) / spanY) * oh;
                    kp.push((ox * 1024) / ow, (oy * 1024) / oh, px[i * 3 + 2]);
                }
                const blob = renderOpenPoseCanvas(kp, {
                    width: ow, height: oh,
                    background: opBg,
                    lineWidth: Math.max(2, Math.round(edge / 256)),
                    pointRadius: Math.max(3, Math.round(edge / 200)),
                });
                await deliverBlob(blob, filename);
            }
            else {
                const fullUrl = withCameraAt(view, () => m === "depth" ? renderDepthLive(FW, FH) : renderLive(FW, FH, bg));
                const outUrl = await cropToRectOutput(fullUrl, stageRect, ow, oh);
                await deliver(outUrl, filename);
            }
            await new Promise((r) => setTimeout(r, 80)); // pacing between files
        }
        return { ow, oh };
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outW, outH, bgIdx, enabledModes, stageRect, stageDims, renderLive, renderDepthLive, projectToPixelsLive, withCameraAt]);
    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            if (scope === "single") {
                await exportOneLive("stage", null);
                toast("success", `Exported the framed rect (${[...enabledModes].join(" + ")}) at ${outW} × ${outH}`);
            }
            else if (scope === "batch") {
                toast("info", "Rendering 8 angles…");
                for (const p of AZIMUTH_PRESETS) {
                    await exportOneLive(String(p.angle), p.cameraView);
                }
                toast("success", `Exported ${AZIMUTH_PRESETS.length} angles — same rect (${[...enabledModes].join(" + ")}) at ${outW} × ${outH}`);
            }
            else {
                // Downloads — raw motion NPZ + baked GLB. Needs a RUN (the rest pose
                // has no asset URL); the scope button is disabled pre-run, this guard
                // is the backstop.
                if (!npzUrl)
                    throw new Error("no motion asset yet — run the card first");
                const resp = await fetch(npzUrl);
                if (!resp.ok)
                    throw new Error(`Motion asset fetch failed: ${resp.status}`);
                downloadBlob(await resp.blob(), `kimodo-motion-${Date.now()}.npz`);
                if (glbUrl) {
                    const gresp = await fetch(glbUrl);
                    if (gresp.ok) {
                        downloadBlob(await gresp.blob(), `kimodo-motion-${Date.now()}.glb`);
                    }
                }
                toast("success", "Motion NPZ" + (glbUrl ? " + GLB" : "") + " downloaded");
            }
            // STAY OPEN (2026-08-15 round 4, "when I save the image it throws me out
            // of the view!"): an export is not a departure — the user is still
            // framing, tweaking the frame/background for the next shot. The toast
            // confirms the save; the X / Cancel / rail toggle close the panel when
            // the user says so. No auto-close after ANY scope.
        }
        catch (e) {
            toast("error", `Export failed: ${e.message}`);
        }
        finally {
            setExporting(false);
        }
    }, [scope, enabledModes, exportOneLive, outW, outH, npzUrl, glbUrl, toast]);
    if (!open)
        return null;
    const noModes = enabledModes.size === 0;
    // TYPED POSITION (2026-08-15 round 3): x/y in percent of the stage,
    // clamped so the rect's far edge stays inside (the SIZE is pixels now —
    // the rect's w/h are the parent's aspect-locked business, not typed here).
    const setRectPos = (part, pct) => {
        if (!onStageRectChange)
            return;
        if (!Number.isFinite(pct))
            return;
        const r = { ...stageRect };
        const v = Math.max(0, Math.min(100, pct)) / 100;
        if (part === "x")
            r.x = Math.min(v, 1 - r.w);
        else
            r.y = Math.min(v, 1 - r.h);
        onStageRectChange(r);
    };
    // TYPED PIXELS (2026-08-15 round 3, "height and width should always be
    // pixels"): write one output dimension (8..4096 clamp); the parent refits
    // the stage rect's aspect to the new w:h. The OTHER dimension is untouched
    // — typing W alone re-aims the aspect, typing both is exact.
    const setOutDim = (dim, px) => {
        if (!onOutSize)
            return;
        if (!Number.isFinite(px))
            return;
        const v = Math.max(8, Math.min(4096, Math.round(px)));
        onOutSize(dim === "w" ? v : outW, dim === "h" ? v : outH);
    };
    return (
    // IN-FLOW PANEL (2026-08-15 round 2): a flex SIBLING of the stage inside
    // the editor's row — never fixed, never a backdrop. Opening it PUSHES the
    // viewport narrower so the character is never covered ("it literally goes
    // over the mesh we need to see" was a fixed-overlay bug, fixed by layout).
    _jsxs("div", { className: s.panel, children: [_jsxs("div", { className: s.head, children: [_jsxs("div", { className: s.headTitle, children: [_jsx(Download, { className: s.headIcon }), _jsx("span", { className: s.headText, children: "Export Motion" }), _jsxs("span", { className: s.frameChip, children: ["frame ", frameIdx + 1, "/", npz.T] })] }), _jsx(Button, { variant: "ghost", onClick: onClose, "aria-label": "Close", className: s.closeBtn, children: _jsx(X, { className: s.i16 }) })] }), _jsxs("div", { className: s.body, children: [_jsx("div", { className: s.scopeGrid, children: [
                            // The batch runs the SAME screenshot flow at the azimuth ring —
                            // position + lookAt only, identical crop. No preset framing anywhere.
                            { id: "single", label: "Single view", icon: Camera, desc: "The framed rectangle" },
                            { id: "batch", label: "8-angle batch", icon: Layers, desc: "Same rect, the ring — automated" },
                            { id: "downloads", label: "Downloads", icon: FileBox, desc: npzUrl ? "NPZ + GLB" : "needs a run" },
                        ].map((m) => (_jsxs(Button, { variant: "ghost", onClick: () => setScope(m.id), disabled: m.id === "downloads" && !npzUrl, title: m.id === "downloads" && !npzUrl ? "Run the card first — the raw NPZ exists after a run" : undefined, className: cn(s.scopeBtn, scope === m.id ? s.scopeBtnActive : s.scopeBtnIdle), children: [_jsxs("div", { className: s.scopeBtnRow, children: [_jsx(m.icon, { className: s.i14 }), _jsx("span", { className: s.scopeLabel, children: m.label }), scope === m.id && _jsx(Check, { className: s.scopeCheck })] }), _jsx("span", { className: s.scopeDesc, children: m.desc })] }, m.id))) }), scope !== "downloads" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: s.stack2, children: [_jsxs("div", { className: s.secTitle, children: [_jsx(Crop, { className: s.i12 }), " Frame the shot"] }), _jsxs("div", { className: s.livePanel, "data-testid": "export-live-panel", children: [_jsxs("div", { className: s.livePanelHead, children: [_jsx(Frame, { className: s.i12 }), " Rectangle on the stage"] }), _jsxs("p", { className: s.liveHelp, children: ["Drag the ", _jsx("span", { className: s.liveHelpStrong, children: "rectangle over the character" }), " \u2014 its body moves it, its corners resize it (aspect-locked). The rectangle is just the framing tool: ", _jsx("span", { className: s.liveHelpStrong, children: "any size on screen exports the typed pixels below" }), ". The camera is yours \u2014 orbit/zoom for the angle."] }), _jsx("div", { className: s.fieldGrid, "data-testid": "export-rect-inputs", children: ["x", "y"].map((part) => (_jsxs("label", { className: s.field, children: [_jsxs("span", { className: s.fieldLabel, children: [part, " pos %"] }), _jsx(Input, { type: "number", min: 0, max: 100, step: 1, "aria-label": `Rectangle ${part} position (percent)`, "data-testid": `export-rect-${part}`, value: Math.round(stageRect[part] * 100), onChange: (e) => setRectPos(part, Number(e.target.value)), disabled: !onStageRectChange, className: s.numInput })] }, part))) }), _jsx("div", { className: s.fieldGrid, "data-testid": "export-out-inputs", children: ["w", "h"].map((dim) => (_jsxs("label", { className: s.field, children: [_jsx("span", { className: s.fieldLabel, children: dim === "w" ? "width px" : "height px" }), _jsx(Input, { type: "number", min: 8, max: 4096, step: 1, "aria-label": `Output ${dim === "w" ? "width" : "height"} (pixels)`, "data-testid": `export-out-${dim}`, value: dim === "w" ? outW : outH, onChange: (e) => setOutDim(dim, Number(e.target.value)), disabled: !onOutSize, className: s.numInput })] }, dim))) }), _jsxs("div", { className: s.outRow, children: [_jsx("span", { className: s.outDim, children: "output" }), _jsxs("span", { "data-testid": "export-rect-readout", className: s.outVal, children: [outW, " \u00D7 ", outH] })] }), _jsxs("div", { className: s.presetRow, children: [_jsx(Button, { variant: "ghost", onClick: () => onFramePreset ? onFramePreset("reset") : onStageRectChange?.(DEFAULT_STAGE_RECT), className: s.presetBtn, children: "Reset frame" }), _jsx(Button, { variant: "ghost", onClick: () => onFramePreset ? onFramePreset("whole") : onStageRectChange?.({ x: 0, y: 0, w: 1, h: 1 }), className: s.presetBtn, children: "Whole stage" })] })] })] }), _jsxs("div", { className: s.stack2, children: [_jsxs("div", { className: s.secHead, children: [_jsxs("div", { className: s.secTitle, children: [_jsx(Layers, { className: s.i12 }), " Render modes"] }), noModes && (_jsx("span", { className: s.modesWarn, children: "pick at least one" }))] }), _jsx("div", { className: s.modeGrid, children: RENDER_MODES.map((m) => {
                                            const on = enabledModes.has(m.id);
                                            return (_jsxs(Button, { variant: "ghost", onClick: () => toggleMode(m.id), className: cn(s.modeCard, on ? s.modeCardActive : s.modeCardIdle), children: [_jsxs("div", { className: s.scopeBtnRow, children: [_jsx("span", { className: s.scopeLabel, children: m.label }), on && _jsx(Check, { className: s.scopeCheck })] }), _jsx("span", { className: s.scopeDesc, children: m.desc })] }, m.id));
                                        }) })] }), onFrameChange && npz.T > 1 && (_jsxs("div", { className: s.stack2, children: [_jsxs("div", { className: s.secHead, children: [_jsxs("div", { className: s.secTitle, children: [_jsx(Film, { className: s.i12 }), " Frame"] }), _jsxs("div", { className: s.scrubRow, children: [_jsx(Tip, { tip: previewing ? "Pause preview" : "Play preview", children: _jsx(Button, { variant: "ghost", onClick: () => setPreviewing((p) => !p), "aria-label": previewing ? "Pause preview" : "Play preview", className: s.scrubPlay, children: previewing
                                                                ? _jsx(Pause, { className: s.i12 })
                                                                : _jsx(Play, { className: s.i12 }) }) }), _jsxs("span", { className: s.scrubCount, children: [frameIdx + 1, " / ", npz.T] })] })] }), _jsxs("div", { className: s.scrubRow, children: [_jsx(Button, { variant: "ghost", onClick: () => onFrameChange(Math.max(0, frameIdx - 1)), disabled: frameIdx <= 0, className: s.stepBtn, children: _jsx(ChevronLeft, { className: s.i12 }) }), _jsx("input", { type: "range", min: 0, max: npz.T - 1, value: frameIdx, onChange: (e) => onFrameChange(Number(e.target.value)), className: s.range }), _jsx(Button, { variant: "ghost", onClick: () => onFrameChange(Math.min(npz.T - 1, frameIdx + 1)), disabled: frameIdx >= npz.T - 1, className: s.stepBtn, children: _jsx(ChevronRight, { className: s.i12 }) })] })] })), _jsxs("div", { className: s.stack2, children: [_jsxs("div", { className: s.secTitle, children: [_jsx(Palette, { className: s.i12 }), " Background"] }), _jsx("div", { className: s.bgGrid, children: BACKGROUNDS.map((b, i) => (_jsx(Button, { variant: "ghost", onClick: () => setBgIdx(i), className: cn(s.bgBtn, bgIdx === i ? s.bgBtnActive : s.bgBtnIdle), children: b.label }, b.label))) })] })] })), _jsxs("div", { className: s.summary, children: [_jsxs("div", { className: s.summaryRow, children: [_jsx(RotateCw, { className: s.i12 }), _jsx("span", { children: scope === "single"
                                            ? `Stage frame — ${noModes ? "no modes selected" : [...enabledModes].map((m) => `stage_${m}.png`).join(" + ")}`
                                            : scope === "batch"
                                                ? `${AZIMUTH_PRESETS.length} angles, same rect — ${noModes ? "no modes selected" : [...enabledModes].map((m) => `{angle}_${m}.png`).join(" + ")}`
                                                : "Raw motion NPZ" + (glbUrl ? " + baked GLB" : "") })] }), glbUrl && (_jsxs("div", { className: s.summaryRow, children: [_jsx(Box, { className: s.i12 }), _jsx("span", { children: "GLB preview available for download" })] }))] })] }), _jsxs("div", { className: s.foot, children: [_jsx(Button, { variant: "ghost", onClick: onClose, className: s.footGhost, children: "Close" }), _jsx(Button, { variant: "primary", onClick: handleExport, disabled: exporting || (scope !== "downloads" && noModes) || (scope === "downloads" && !npzUrl), className: s.footPrimary, children: exporting ? "Exporting…" : `Export ${scope === "single" ? "the frame" : scope === "batch" ? "8 angles" : "files"}` })] })] }));
}
//# sourceMappingURL=MotionExportDialog.js.map
