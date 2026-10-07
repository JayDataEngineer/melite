import * as THREE from '@melite/three-client/client'
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
import { buildGeometry, computeMeshLiftY } from "./poseStageMesh.ts"
import { CM_TO_M } from "./poseStageSkeleton.ts"
import type { ReferenceManipHandle } from "./poseStageManipulators.ts"
import type { PoseStageProps, ReferenceBundle } from "./poseStageTypes.ts"

// ══ ReferenceMesh carrier ═══════════════════════════════════════════
export function createReferenceCarrier(deps: { liftGroup: THREE.Group; refManip: ReferenceManipHandle }) {
  const { liftGroup, refManip } = deps
  const reference = {
    root: null as THREE.Group | null,
    mesh: null as THREE.Mesh | null,
    geo: null as THREE.BufferGeometry | null,
    mat: null as THREE.MeshStandardMaterial | null,
    skeleton: null as { spheres: THREE.InstancedMesh; lines: THREE.LineSegments; boneGeo: THREE.BufferGeometry; dummy: THREE.Object3D } | null,
    scratch: new Float32Array(0),
    lastUploaded: -2,
    bundle: null as ReferenceBundle | null,
    lastSig: "",
    update(p: PoseStageProps): void {
      const b = p.reference
      const sig = b === null ? ""
        : [b.spec.deformedVerticesB64.length, b.spec.editedDeformedVerticesB64?.length ?? 0,
           b.spec.offset.join(","), b.meshData?.vertices.length ?? 0, b.flat?.length ?? 0,
           b.editedFlat?.length ?? 0, b.spec.jointFrames?.length ?? 0].join("|")
      if (sig !== this.lastSig) {
        this.lastSig = sig
        this.disposeMesh()
        if (b === null) { this.root?.removeFromParent(); this.root = null; this.skeleton?.spheres.removeFromParent(); this.skeleton?.lines.removeFromParent(); this.skeleton = null; return }
        this.bundle = b
        this.root = new THREE.Group()
        const jointFramesFlat = b.spec.jointFrames && b.spec.jointFrames.length >= 3
          ? new Float32Array(b.spec.jointFrames) : null
        const hasEdited = !!b.spec.editedDeformedVerticesB64 && !!b.editedFlat && b.editedFlat.length >= 3
        const activeFlat = hasEdited ? b.editedFlat : b.flat
        const isSkeletonOnly = !!jointFramesFlat && (!activeFlat || activeFlat.length < 3)
        if (isSkeletonOnly) {
          // Skeleton-only library clip: animated bones, amber palette.
          const refLiftDelta = 0
          this.root.position.set(b.spec.offset[0], refLiftDelta, b.spec.offset[1])
          const sphereGeo = new THREE.SphereGeometry(0.018, 8, 8)
          const sphereMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
          const spheres = new THREE.InstancedMesh(sphereGeo, sphereMat, 77)
          const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
          const boneGeo = new THREE.BufferGeometry()
          boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
          const boneMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })
          const lines = new THREE.LineSegments(boneGeo, boneMat)
          this.root.add(spheres); this.root.add(lines)
          this.skeleton = { spheres, lines, boneGeo, dummy: new THREE.Object3D() }
          ;(this.root as THREE.Group & { __skelFlat?: Float32Array }).__skelFlat = jointFramesFlat
        } else {
          if (b.meshData === null || activeFlat === null || activeFlat.length < 3) {
            // Not yet loaded — mount the offset group; content lands when
            // the shell's async fetches resolve (next update).
            liftGroup.add(this.root)
            return
          }
          const refLiftDelta = computeMeshLiftY(b.meshData) - computeMeshLiftY(p.meshData)
          this.root.position.set(b.spec.offset[0], refLiftDelta, b.spec.offset[1])
          this.geo = buildGeometry(b.meshData)
          const refFrameCount = hasEdited ? 1 : (b.spec.frameCount ?? 1)
          const numVerts = Math.floor(activeFlat.length / 3 / Math.max(1, refFrameCount))
          this.scratch = new Float32Array(numVerts * 3)
          this.mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(b.spec.color ?? "#9ca3af"),
            roughness: 0.55, metalness: 0.05, flatShading: false, side: THREE.DoubleSide,
            transparent: (b.spec.opacity ?? 0.42) < 1.0, opacity: b.spec.opacity ?? 0.42,
          })
          this.mesh = new THREE.Mesh(this.geo, this.mat)
          this.mesh.castShadow = true
          this.mesh.receiveShadow = true
          this.root.add(this.mesh)
          ;(this.root as THREE.Group & { __refFlat?: Float32Array }).__refFlat = activeFlat
          ;(this.root as THREE.Group & { __refFrames?: number }).__refFrames = refFrameCount
        }
        liftGroup.add(this.root)
        this.lastUploaded = -2
      } else if (b !== null && this.root !== null && this.mesh === null && this.skeleton === null) {
        // mounted but unloaded earlier — retry now that shell resolved
        this.lastSig = ""
        this.update(p)
        return
      }
      // per-update: frame upload (animated → follow playback idx)
      if (this.root === null) return
      if (this.skeleton !== null) {
        const flat = (this.root as THREE.Group & { __skelFlat?: Float32Array }).__skelFlat
        const fc = Math.max(1, Math.floor(flat!.length / (77 * 3)))
        const idx = fc > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, fc - 1)) : 0
        const base = idx * 77 * 3
        const d = this.skeleton.dummy
        for (let j = 0; j < 77; j++) {
          d.position.set(flat![base + j * 3] * CM_TO_M, flat![base + j * 3 + 1] * CM_TO_M, flat![base + j * 3 + 2] * CM_TO_M)
          d.scale.setScalar(1)
          d.updateMatrix()
          this.skeleton.spheres.setMatrixAt(j, d.matrix)
        }
        this.skeleton.spheres.instanceMatrix.needsUpdate = true
        const pos = this.skeleton.boneGeo.attributes.position as THREE.BufferAttribute
        const arr = pos.array as Float32Array
        for (let bb = 0; bb < SOMA77_BONE_CONNECTIONS.length; bb++) {
          const [pp, cc] = SOMA77_BONE_CONNECTIONS[bb]
          arr[bb * 6 + 0] = flat![base + pp * 3] * CM_TO_M
          arr[bb * 6 + 1] = flat![base + pp * 3 + 1] * CM_TO_M
          arr[bb * 6 + 2] = flat![base + pp * 3 + 2] * CM_TO_M
          arr[bb * 6 + 3] = flat![base + cc * 3] * CM_TO_M
          arr[bb * 6 + 4] = flat![base + cc * 3 + 1] * CM_TO_M
          arr[bb * 6 + 5] = flat![base + cc * 3 + 2] * CM_TO_M
        }
        pos.needsUpdate = true
        this.skeleton.boneGeo.computeBoundingSphere()
      } else if (this.mesh !== null && this.geo !== null) {
        const flat = (this.root as THREE.Group & { __refFlat?: Float32Array }).__refFlat
        const refFrames = (this.root as THREE.Group & { __refFrames?: number }).__refFrames ?? 1
        if (flat !== undefined) {
          const numVerts = this.scratch.length / 3
          const stride = numVerts * 3
          const refIdx = refFrames > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, refFrames - 1)) : 0
          if (refIdx !== this.lastUploaded) {
            const pos = this.geo.attributes.position as THREE.BufferAttribute
            const arr = pos.array as Float32Array
            const src = flat.subarray(refIdx * stride, refIdx * stride + stride)
            for (let i = 0; i < stride; i++) this.scratch[i] = src[i] * CM_TO_M
            arr.set(this.scratch, 0)
            pos.needsUpdate = true
            if (!(refFrames > 1 && p.animate)) {
              this.geo.computeVertexNormals()
              this.geo.computeBoundingSphere()
            }
            this.lastUploaded = refIdx
          }
        }
      }
      // Phase 3: parallel posing manipulator INSIDE the offset group.
      if (b !== null && p.editRefMode && p.refEditableJoints) {
        refManip.show(this.root)
        refManip.jointsFlat = p.refEditableJoints
        refManip.selectedJoint = p.selectedJoint ?? null
        refManip.selectedChain = p.selectedChain ?? null
        refManip.onSelectJoint = p.onSelectJoint
        refManip.onSelectChain = p.onSelectChain
        refManip.onJointMove = p.onRefJointMove ?? (() => {})
        refManip.gizmoMode = p.gizmoMode
        refManip.kinematicMode = p.kinematicMode ?? "fk"
        refManip.updateJoints()
        refManip.positionGizmo()
      } else {
        refManip.show(null)
      }
      refManip.syncGizmo()
    },
    disposeMesh(): void {
      this.mesh?.removeFromParent()
      this.geo?.dispose()
      this.mat?.dispose()
      this.mesh = null
      this.geo = null
      this.mat = null
    },
  }
  return reference
}
