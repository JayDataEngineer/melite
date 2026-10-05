import * as THREE from "three";
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats";
import { buildGeometry } from "./poseStageMesh.js";
import { CM_TO_M } from "./poseStageSkeleton.js";
export function createSkinCarrier(liftGroup) {
    // ══ SkinCarrier (the SkinnedHumanoid port) ══════════════════════════
    // Bind geometry per meshData; per-frame uploads from deformedFlat with
    // the cm→m scale; normals/bounds skipped while animating (the freeze
    // fix) and recomputed on pause/structural change.
    const skin = {
        mesh: null,
        geo: null,
        mat: null,
        scratch: new Float32Array(0),
        lastUploadedIdx: -2,
        meshData: null,
        deformedFlat: null,
        numVerts: 0,
        lastAnimate: false,
        setMesh(p) {
            this.numVerts = p.numVerts;
            if (this.meshData !== p.meshData) {
                this.meshData = p.meshData;
                this.geo?.dispose();
                this.geo = buildGeometry(p.meshData);
                this.scratch = new Float32Array(p.numVerts * 3);
                if (this.mesh === null) {
                    this.mat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(p.color),
                        roughness: 0.55,
                        metalness: 0.05,
                        flatShading: false,
                        side: THREE.DoubleSide,
                    });
                    this.mesh = new THREE.Mesh(this.geo, this.mat);
                    this.mesh.castShadow = true;
                    this.mesh.receiveShadow = true;
                    liftGroup.add(this.mesh);
                }
                else {
                    this.mesh.geometry = this.geo;
                }
                this.lastUploadedIdx = -2; // force structural re-upload
            }
            const opacity = p.editMode ? Math.min(p.opacity, 0.85) : p.opacity;
            if (this.mat !== null) {
                this.mat.color.set(p.color);
                this.mat.opacity = opacity;
                this.mat.transparent = opacity < 1.0;
                this.mat.wireframe = p.layers.wireframe;
            }
        },
        setData(deformedFlat) {
            if (this.deformedFlat !== deformedFlat) {
                this.deformedFlat = deformedFlat;
                this.lastUploadedIdx = -2;
            }
        },
        uploadFrame(idx, showBindPose, animate) {
            const geo = this.geo;
            if (geo === null || this.meshData === null)
                return;
            const pos = geo.attributes.position;
            const arr = pos.array;
            const meshVertCount = this.meshData.vertices.length;
            const canDeform = !showBindPose && !!this.deformedFlat && meshVertCount === this.numVerts;
            if (!canDeform) {
                // Reset to bind pose. SOMA meshes are cm → m; GLB meshes are already m.
                const isSoma = meshVertCount === 18056;
                const scale = isSoma ? CM_TO_M : 1.0;
                const verts = this.meshData.vertices;
                for (let i = 0; i < verts.length; i++) {
                    arr[i * 3] = verts[i][0] * scale;
                    arr[i * 3 + 1] = verts[i][1] * scale;
                    arr[i * 3 + 2] = verts[i][2] * scale;
                }
                this.lastUploadedIdx = -1; // bind pose — no frame idx
                pos.needsUpdate = true;
                geo.computeVertexNormals();
                geo.computeBoundingSphere();
                return;
            }
            const stride = this.numVerts * 3;
            const frameCount = this.deformedFlat.length / stride;
            const clamped = Math.max(0, Math.min(idx, frameCount - 1));
            const base = clamped * stride;
            // Deformed verts arrive in cm — converted to meters into the scratch
            // buffer (no per-vertex allocs at 60fps).
            const src = this.deformedFlat.subarray(base, base + stride);
            for (let i = 0; i < stride; i++)
                this.scratch[i] = src[i] * CM_TO_M;
            arr.set(this.scratch, 0);
            pos.needsUpdate = true;
            // Normals/bounds skipped during playback (the freeze fix — adjacent
            // frames are visually identical); recomputed on pause (the structural
            // update path fires when animate goes false).
            if (!animate) {
                geo.computeVertexNormals();
                geo.computeBoundingSphere();
            }
            this.lastUploadedIdx = clamped;
        },
    };
    return skin;
}
export function createAnimClock(frameIdxRef) {
    // ══ AnimClock (the AnimController port) ═════════════════════════════
    const anim = {
        time: 0,
        uiAccum: 0,
        lastSyncedIdx: -1,
        animate: false,
        enabled: false,
        frameCount: 1,
        fps: 30,
        speed: 1,
        setFrameIdx: (_f) => { },
        reset() { this.time = 0; this.uiAccum = 0; },
        tick(delta) {
            if (!this.animate || !this.enabled || this.frameCount < 2)
                return;
            this.time += delta * this.speed;
            const frameDelta = Math.floor(this.time * this.fps);
            if (frameDelta > 0) {
                this.time -= frameDelta / this.fps;
                const newIdx = (frameIdxRef.current + frameDelta) % this.frameCount;
                if (newIdx !== frameIdxRef.current)
                    frameIdxRef.current = newIdx;
            }
            this.uiAccum += delta;
            if (this.uiAccum >= 0.1) {
                this.uiAccum = 0;
                const cur = frameIdxRef.current;
                if (cur !== this.lastSyncedIdx) {
                    this.lastSyncedIdx = cur;
                    this.setFrameIdx(cur);
                }
            }
        },
    };
    return anim;
}
export function createSkeletonOverlay(liftGroup) {
    // ══ SkeletonOverlay carrier ═════════════════════════════════════════
    const skeleton = {
        spheres: null,
        lines: null,
        boneGeo: null,
        dummy: new THREE.Object3D(),
        ensure() {
            if (this.spheres !== null)
                return;
            const sphereGeo = new THREE.SphereGeometry(0.018, 8, 8);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
            this.spheres = new THREE.InstancedMesh(sphereGeo, sphereMat, 77);
            const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
            this.boneGeo = new THREE.BufferGeometry();
            this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.7 });
            this.lines = new THREE.LineSegments(this.boneGeo, boneMat);
            liftGroup.add(this.spheres);
            liftGroup.add(this.lines);
        },
        update(jointsFlat, frameIdx) {
            if (jointsFlat === null) {
                if (this.spheres !== null)
                    this.spheres.visible = false;
                if (this.lines !== null)
                    this.lines.visible = false;
                return;
            }
            this.ensure();
            this.spheres.visible = true;
            this.lines.visible = true;
            const stride = 77 * 3;
            const frameCount = jointsFlat.length / stride;
            const idx = Math.max(0, Math.min(frameIdx, frameCount - 1));
            const base = idx * stride;
            for (let j = 0; j < 77; j++) {
                this.dummy.position.set(jointsFlat[base + j * 3] * CM_TO_M, jointsFlat[base + j * 3 + 1] * CM_TO_M, jointsFlat[base + j * 3 + 2] * CM_TO_M);
                this.dummy.scale.setScalar(1);
                this.dummy.updateMatrix();
                this.spheres.setMatrixAt(j, this.dummy.matrix);
            }
            this.spheres.instanceMatrix.needsUpdate = true;
            const pos = this.boneGeo.attributes.position;
            const arr = pos.array;
            for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
                const [pp, cc] = SOMA77_BONE_CONNECTIONS[b];
                arr[b * 6 + 0] = jointsFlat[base + pp * 3] * CM_TO_M;
                arr[b * 6 + 1] = jointsFlat[base + pp * 3 + 1] * CM_TO_M;
                arr[b * 6 + 2] = jointsFlat[base + pp * 3 + 2] * CM_TO_M;
                arr[b * 6 + 3] = jointsFlat[base + cc * 3] * CM_TO_M;
                arr[b * 6 + 4] = jointsFlat[base + cc * 3 + 1] * CM_TO_M;
                arr[b * 6 + 5] = jointsFlat[base + cc * 3 + 2] * CM_TO_M;
            }
            pos.needsUpdate = true;
            this.boneGeo.computeBoundingSphere();
        },
    };
    return skeleton;
}
//# sourceMappingURL=poseStageCarriers.js.map
