/**
 * poseStage — the raw-three pose scene (the substrate law).
 *
 * THE PORT (2026-09-13): PoseViewer3D/PoseEditMode rode @react-three/fiber
 * + drei — the last r3f island in the card plane (the react-reconciler
 * version-skew boot crash is why the substrate exists). This module is the
 * 1:1 imperative port of that scene graph onto card-base's shared stage3d
 * core: every r3f child component became a subsystem with an update()
 * coarse-diff, useFrame became an ordered stage tick (anim clock BEFORE
 * skin upload — the declaration order of the old JSX tree), drei's
 * OrbitControls/Grid/ContactShadows/Text/Billboard/TransformControls became
 * three's own OrbitControls/GridHelper/ShadowMaterial plane/canvas-texture
 * sprites/addons TransformControls.
 *
 * Coordinate law (unchanged from the r3f original): ALL mesh/joint content
 * lives inside ONE lift group translated by meshLiftY (bind-mesh min-Y lift
 * + the in-place XZ anchor). Raw cm data → *CM_TO_M at ingestion; the group
 * carries the visual offset so drag handlers still receive RAW (cm-space)
 * coordinates. TransformControls gizmos attach to pivots INSIDE the group
 * but the gizmo itself is scene-rooted — world handles, local drag math,
 * which is the clean version of the old LiftAwareTransformControls fix
 * (its negative-offset hack existed only because drei nested the gizmo
 * inside the lifted group).
 */
import * as THREE from '@melite/three-client/client';
import { mountStage3D } from "@melite/card-base/client";
import { CM_TO_M } from "./poseStageSkeleton.js";
import { framedCameraPos } from "./poseStageCamera.js";
import { computeMeshLiftY } from "./poseStageMesh.js";
import { createAnimClock, createSkeletonOverlay, createSkinCarrier } from "./poseStageCarriers.js";
import { createJointManipulator, createReferenceManipulator } from "./poseStageManipulators.js";
import { createAltSamples, createConstraintOverlays, createDirectionArrow, createEEPlacementPlane, createFootContacts, createKeyframeGhost, createLightingOrbs, } from "./poseStageOverlays.js";
import { createReferenceCarrier } from "./poseStageReference.js";
import { STAGE_BACKGROUND_DARK, STAGE_BACKGROUND_LIGHT } from '@melite/card-base/client';
export { CM_TO_M, SOMA77_PARENT, getDescendants, getJointChain, solveCCD } from "./poseStageSkeleton.js";
export { cameraPosFor, framedCameraPos } from "./poseStageCamera.js";
export { buildGeometry, computeMeshLiftY, fetchBindMesh } from "./poseStageMesh.js";
export function mountPoseStage(canvas, opts) {
    const stage = mountStage3D(canvas, {
        fov: opts.fov,
        near: 0.05,
        far: 100,
        camera: opts.camera,
        target: [0, 0.9, 0],
        minDistance: 0.8,
        maxDistance: 12,
        maxPolarAngle: Math.PI / 1.85,
        alpha: false,
        // the old r3f Canvas's gl prop verbatim — the export dialog reads
        // the canvas back (toDataURL); without this the buffer clears
        // after present and every screenshot comes back blank
        preserveDrawingBuffer: true,
        onContextFailure: opts.onFail,
        // EMPTY-SPACE DESELECT: the old tree carried a radius-0.001
        // invisible sphere inside the joint manipulator (effectively dead
        // — no raycast could ever hit it) whose INTENT was click-nothing →
        // deselect. The raw stage makes the intent real: an empty click
        // while a manipulator is live clears the joint + chain selection.
        onEmptyClick: () => {
            if (refManip.root !== null) {
                refManip.onSelectJoint(null);
                refManip.onSelectChain?.(null);
            }
            else if (manip.active) {
                manip.onSelectJoint(null);
                manip.onSelectChain?.(null);
            }
        },
    });
    if (stage === null)
        return null;
    opts.onCanvasReady?.(canvas);
    const scene = stage.scene;
    const dark = opts.darkMode;
    stage.renderer.setClearColor(new THREE.Color(dark ? STAGE_BACKGROUND_DARK : STAGE_BACKGROUND_LIGHT));
    // ── Light rig (the orbs-vs-default switch is applied in update) ──────
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
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
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-4, 3, -2);
    scene.add(fill);
    const hemi = new THREE.HemisphereLight(0xcdd6f4, 0x1a1a2e, 0.35);
    scene.add(hemi);
    // Contact-shadow analogue: the floor catches the key light's shadow
    // through a ShadowMaterial plane (single grounded figure — same read as
    // the old ContactShadows pass; opacity is switched off under orb light).
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.55 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.001;
    ground.receiveShadow = true;
    scene.add(ground);
    // Kimodo grid floor (cell 0.25 m / section 1 m — the drei Grid args).
    const grid = new THREE.GridHelper(12, 48, 0x5a5a8a, 0x3a3a5a);
    const gridMat = grid.material;
    gridMat.transparent = true;
    gridMat.opacity = 0.9;
    scene.add(grid);
    // ── THE LIFT GROUP — all raw-space content lives here ────────────────
    const liftGroup = new THREE.Group();
    scene.add(liftGroup);
    const skin = createSkinCarrier(liftGroup);
    // Playback-decoupling ref: mirror of frameIdx, advanced by the anim tick
    // at 60fps, synced from props on every update (scrub / external set).
    const frameIdxRef = { current: 0 };
    const anim = createAnimClock(frameIdxRef);
    // Tick order = the old JSX declaration order: clock advances, then the
    // mesh uploads whatever idx it landed on (60fps, zero React renders).
    stage.addTick((delta) => anim.tick(delta));
    stage.addTick(() => {
        if (skin.geo === null || skin.mesh === null)
            return;
        const target = frameIdxRef.current;
        if (target !== skin.lastUploadedIdx)
            skin.uploadFrame(target, showBindPose0, anim0);
    });
    let showBindPose0 = true;
    let anim0 = false;
    const skeleton = createSkeletonOverlay(liftGroup);
    const manip = createJointManipulator({ stage, scene });
    const refManip = createReferenceManipulator({ stage, scene });
    const orbs = createLightingOrbs({ stage, scene });
    const ghost = createKeyframeGhost(liftGroup);
    const contacts = createFootContacts(liftGroup);
    const arrow = createDirectionArrow(liftGroup);
    let arrowJointsRef = null;
    const alts = createAltSamples();
    liftGroup.add(alts.root);
    const constraints = createConstraintOverlays({ stage, scene });
    liftGroup.add(constraints.root);
    const eePlane = createEEPlacementPlane(liftGroup);
    const reference = createReferenceCarrier({ liftGroup, refManip });
    // ══ The update() — coarse diffs per subsystem ═══════════════════════
    let lastCameraView = "";
    let lastFraming = "";
    let lastLiftY = NaN;
    let lastOrbSel = null;
    let orbsSig = "";
    let lastEEsSig = "";
    let lastR2dSig = "";
    let lastAltSig = "";
    let darkCur = opts.darkMode;
    function update(p) {
        // playback mirrors
        frameIdxRef.current = p.frameIdx;
        anim.animate = p.animate;
        anim.enabled = !p.showBindPose && !p.editMode;
        anim.frameCount = p.frameCount;
        anim.fps = p.fps;
        anim.speed = p.playbackSpeed;
        anim.setFrameIdx = p.setFrameIdx;
        // Reset the clock on play-start OR a new generation arriving while
        // playing (the old effect keyed [animate, frameCount]).
        if (p.animate && (!skinLastAnimate || anim.frameCount !== animLastFrameCount))
            anim.reset();
        animLastFrameCount = p.frameCount;
        showBindPose0 = p.showBindPose;
        anim0 = p.animate;
        // skin carrier
        skin.setMesh(p);
        skin.setData(p.deformedFlat);
        // structural upload: bind-pose toggle / data swap / animate pause —
        // the animate-false transition recomputes normals on the held frame.
        const structural = skin.lastUploadedIdx === -2 ||
            p.showBindPose !== showBindPosePrev ||
            p.animate === false && skinLastAnimate === true;
        if (structural) {
            skin.uploadFrame(frameIdxRef.current, p.showBindPose, p.animate);
        }
        skinLastAnimate = p.animate;
        showBindPosePrev = p.showBindPose;
        // lift group (mesh lift + in-place anchor)
        const liftY = computeMeshLiftY(p.meshData);
        let inPlaceX = 0, inPlaceZ = 0;
        if (p.inPlace && !p.showBindPose && p.soma77JointsFlat) {
            const stride = 77 * 3;
            const frameCount = Math.floor(p.soma77JointsFlat.length / stride);
            if (frameCount >= 1) {
                const r0x = p.soma77JointsFlat[0];
                const r0z = p.soma77JointsFlat[2];
                const fi = Math.max(0, Math.min(p.frameIdx, frameCount - 1));
                const base = fi * stride;
                inPlaceX = (r0x - p.soma77JointsFlat[base]) * CM_TO_M;
                inPlaceZ = (r0z - p.soma77JointsFlat[base + 2]) * CM_TO_M;
            }
        }
        if (liftY !== lastLiftY || liftGroup.position.x !== inPlaceX || liftGroup.position.z !== inPlaceZ) {
            liftGroup.position.set(inPlaceX, liftY, inPlaceZ);
            lastLiftY = liftY;
        }
        // lights: orbs wash out the default rig
        const hasOrbs = p.lightingOrbs.length > 0;
        ambient.intensity = hasOrbs ? 0.06 : (p.editMode ? 0.25 : 0.45);
        key.intensity = hasOrbs ? 0.0 : 1.0;
        key.castShadow = !hasOrbs;
        fill.intensity = hasOrbs ? 0.0 : 0.25;
        hemi.intensity = hasOrbs ? 0.08 : 0.35;
        groundMat.opacity = hasOrbs ? 0.0 : 0.55;
        const orbsSigNew = p.lightingOrbs.map(o => `${o.id}:${o.position.join(",")}:${o.color}:${o.intensity}:${o.distance}:${o.castShadow}`).join(";");
        if (orbsSigNew !== orbsSig || p.selectedOrb !== lastOrbSel) {
            orbsSig = orbsSigNew;
            lastOrbSel = p.selectedOrb;
            orbs.onChange = p.onLightingOrbsChange;
            orbs.onSelectOrb = p.onSelectOrb;
            orbs.update(p.lightingOrbs, p.selectedOrb);
        }
        // skeleton (display-only; kept-pose aware)
        skeleton.update(p.layers.skeleton && !p.editMode ? (p.editableJoints ?? p.soma77JointsFlat) : null, p.frameIdx);
        // manipulator (primary edit mode; suppressed while editing the reference)
        const manipOn = p.editMode && !p.editRefMode && !!p.editableJoints;
        if (manipOn) {
            manip.ensure(liftGroup);
            manip.active = true;
            manip.jointsFlat = p.editableJoints;
            manip.selectedJoint = p.selectedJoint;
            manip.selectedChain = p.selectedChain ?? null;
            manip.onSelectJoint = p.onSelectJoint;
            manip.onSelectChain = p.onSelectChain;
            manip.onJointMove = p.onJointMove;
            manip.gizmoMode = p.gizmoMode;
            manip.kinematicMode = p.kinematicMode ?? "fk";
            manip.root.visible = true;
            manip.updateJoints();
            manip.positionGizmo();
        }
        else {
            manip.active = false;
            if (manip.root !== null)
                manip.root.visible = false;
        }
        manip.syncGizmo();
        // overlays
        ghost.update(p.ghostJoints);
        contacts.update(p.footContacts, p.frameIdx, p.soma77JointsFlat);
        if (p.soma77JointsFlat !== arrowJointsRef) {
            arrowJointsRef = p.soma77JointsFlat;
            arrow.update(p.soma77JointsFlat);
        }
        arrow.setVisible(p.showStartingDirection && !p.editMode);
        const altSig = p.altSamples.map(s => s.idx).join(",") + "#" + p.meshData.vertices.length;
        if (altSig !== lastAltSig) {
            lastAltSig = altSig;
            alts.update(p.altSamples, p.meshData, p.onCommitSample);
        }
        else if (p.altSamples.length > 0) {
            alts.onCommit = p.onCommitSample;
        }
        // constraints
        const eesSig = p.endEffectorPoints.map(e => `${e.id}:${e.position.join(",")}:${e.frame}`).join(";");
        const r2dSig = p.root2dPoints.map(r => `${r.frame}:${r.x},${r.z}`).join(";");
        if (eesSig !== lastEEsSig || r2dSig !== lastR2dSig || constraints.editMode !== p.editMode
            || constraints.selectedEEId !== (p.selectedEEId ?? null)
            || constraints.showLabels !== p.showConstraintLabels) {
            lastEEsSig = eesSig;
            lastR2dSig = r2dSig;
            constraints.onSelectEE = p.onSelectEE;
            constraints.onChangeEEPoint = p.onChangeEEPoint;
            constraints.update(p.root2dPoints, p.endEffectorPoints, p.showConstraintLabels, p.editMode, p.selectedEEId ?? null);
        }
        // EE placement plane
        eePlane.update(p.placingEE, p.eePlaceJointIdx, p.editableJoints, p.soma77JointsFlat, p.frameIdx, p.onPlaceEE);
        // reference
        reference.update(p);
        // camera
        if (p.cameraView !== lastCameraView || p.framing !== lastFraming) {
            lastCameraView = p.cameraView;
            lastFraming = p.framing;
            applyCamera(p.cameraView, p.framing);
        }
    }
    let skinLastAnimate = false;
    let showBindPosePrev = true;
    let animLastFrameCount = 1;
    const framedCameraPosFor = (view, framing) => framedCameraPos(view, framing);
    const applyCamera = (view, framing) => {
        // azimuth views ride framedCameraPos (az-* handled inside cameraPosFor)
        const [pos, ty] = framedCameraPosFor(view, framing);
        stage.camera.position.set(pos[0], pos[1], pos[2]);
        stage.controls.target.set(0, ty, 0);
        stage.controls.update();
        stage.camera.lookAt(0, ty, 0);
    };
    return {
        threeCtx: { gl: stage.renderer, scene, camera: stage.camera },
        update,
        applyCamera,
        setDarkMode(dark) {
            if (dark !== darkCur) {
                darkCur = dark;
                stage.renderer.setClearColor(new THREE.Color(dark ? STAGE_BACKGROUND_DARK : STAGE_BACKGROUND_LIGHT));
            }
        },
        dispose() {
            manip.tc?.dispose();
            refManip.tc?.dispose();
            constraints.eeTC?.dispose();
            for (const e of orbs.entries)
                e.tc?.dispose();
            skin.geo?.dispose();
            skin.mat?.dispose();
            reference.disposeMesh();
            if (reference.skeleton !== null) {
                reference.skeleton.spheres.geometry.dispose();
                reference.skeleton.spheres.material.dispose();
                reference.skeleton.boneGeo.dispose();
                reference.skeleton.lines.material.dispose();
            }
            stage.dispose();
        },
    };
}
//# sourceMappingURL=poseStage.js.map
