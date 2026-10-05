import * as THREE from "three"
import { TransformControls } from "three/addons/controls/TransformControls.js"
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
import type { Stage3D } from "@melite/card-base/client"
import { CM_TO_M, SOMA77_PARENT, getDescendants, getJointChain, solveCCD } from "./poseStageSkeleton.ts"
import type { JointMoveEvent } from "./poseStageTypes.ts"

// SOMA-77 joint display sizes (verbatim).
const JOINT_RADIUS: Record<number, number> = {}
for (let i = 0; i < 77; i++) JOINT_RADIUS[i] = 0.020
for (const j of [0, 3, 6, 11, 12, 13, 14, 39, 40, 41, 42, 67, 68, 69, 72, 73, 74]) JOINT_RADIUS[j] = 0.028
for (const j of [18, 23, 28, 33, 38, 46, 51, 56, 61, 66, 71, 76]) JOINT_RADIUS[j] = 0.012

// ══ JointManipulator (the PoseEditMode port) ════════════════════════
// 77 clickable joint spheres + bones + a scene-rooted TransformControls
// whose pivot lives in the lift group (raw m local). FK rotate/translate
// + IK CCD — the drag handlers verbatim.
export function createJointManipulator(deps: { stage: Stage3D; scene: THREE.Scene }) {
  const { stage, scene } = deps
  const manip = {
    root: null as THREE.Group | null,
    jointMeshes: [] as THREE.Mesh[],
    jointMats: [] as THREE.MeshBasicMaterial[],
    boneGeo: null as THREE.BufferGeometry | null,
    pivot: new THREE.Group(),
    tc: null as TransformControls | null,
    hovered: -1,
    dragging: false,
    prevRot: new THREE.Euler(0, 0, 0),
    active: false,
    jointsFlat: null as Float32Array | null,
    selectedJoint: null as number | null,
    selectedChain: null as number[] | null,
    onSelectJoint: (_i: number | null, _a?: boolean) => {},
    onSelectChain: undefined as ((c: number[] | null) => void) | undefined,
    onJointMove: (_e: JointMoveEvent) => {},
    gizmoMode: "rotate" as "rotate" | "translate",
    kinematicMode: "fk" as "fk" | "ik",
    get isIKActive(): boolean {
      return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0
    },
    get effectiveMode(): "rotate" | "translate" {
      return this.isIKActive ? "translate" : this.gizmoMode
    },
    ensure(root: THREE.Group): void {
      if (this.root !== null) return
      this.root = new THREE.Group()
      root.add(this.root)
      const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
      this.boneGeo = new THREE.BufferGeometry()
      this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5 })
      this.root.add(new THREE.LineSegments(this.boneGeo, boneMat))
      for (let j = 0; j < 77; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS[j] || 0.02, 12, 12), mat)
        mesh.userData.pick = {
          click: (_point: THREE.Vector3, ev: MouseEvent | PointerEvent): void => {
            this.handleJointClick(j, ev)
          },
          over: (): void => { this.hovered = j; document.body.style.cursor = "pointer"; this.paint() },
          out: (): void => { if (this.hovered === j) this.hovered = -1; document.body.style.cursor = "auto"; this.paint() },
        }
        this.jointMeshes[j] = mesh
        this.jointMats[j] = mat
        this.root.add(mesh)
      }
      root.add(this.pivot)
    },
    handleJointClick(j: number, ev: MouseEvent | PointerEvent): void {
      const additive = ev.shiftKey
      this.onSelectJoint(j, additive)
      if (this.onSelectChain !== undefined) {
        this.onSelectChain(additive ? getJointChain(j, 0) : null)
      }
    },
    paint(): void {
      for (let j = 0; j < 77; j++) {
        const inChain = this.selectedChain?.includes(j) ?? false
        this.jointMats[j].color.set(
          this.selectedJoint === j ? "#00ff88"
          : inChain ? "#ff66ff"
          : this.hovered === j ? "#ffdd00"
          : "#ffcc66",
        )
      }
    },
    updateJoints(): void {
      const jf = this.jointsFlat
      if (jf === null) return
      for (let j = 0; j < 77; j++) {
        this.jointMeshes[j].position.set(
          jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
        )
      }
      const pos = this.boneGeo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.boneGeo!.computeBoundingSphere()
      this.paint()
    },
    positionGizmo(): void {
      if (this.dragging) return
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const j = this.selectedJoint
      this.pivot.position.set(
        jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
      )
      this.pivot.rotation.set(0, 0, 0)
      this.prevRot.set(0, 0, 0)
    },
    handleGizmoDrag(): void {
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const selectedJoint = this.selectedJoint
      if (this.isIKActive) {
        // IK: 2-joint chain [parent, selected] — clean isolation (the
        // full-limb CCD diverged; see the old comment, preserved).
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        const chainParent = SOMA77_PARENT[selectedJoint]
        if (chainParent < 0) return
        const newJoints = solveCCD(jf, [chainParent, selectedJoint], target)
        this.onJointMove({ idx: selectedJoint, position: target, fullJoints: newJoints })
      } else if (this.effectiveMode === "rotate") {
        // FK rotate: delta-Euler → rotate all descendants around the pivot.
        const curRot = this.pivot.rotation
        const prev = this.prevRot
        const dx = curRot.x - prev.x
        const dy = curRot.y - prev.y
        const dz = curRot.z - prev.z
        if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return
        const px = jf[selectedJoint * 3]
        const py = jf[selectedJoint * 3 + 1]
        const pz = jf[selectedJoint * 3 + 2]
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, "XYZ"))
        const newJoints = new Float32Array(jf)
        const descendants = getDescendants(selectedJoint)
        const tmp = new THREE.Vector3()
        for (const j of descendants) {
          tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz)
          tmp.applyQuaternion(quat)
          newJoints[j * 3] = tmp.x + px
          newJoints[j * 3 + 1] = tmp.y + py
          newJoints[j * 3 + 2] = tmp.z + pz
        }
        this.prevRot.copy(curRot)
        this.onJointMove({ idx: selectedJoint, position: new THREE.Vector3(px, py, pz), fullJoints: newJoints })
      } else {
        // FK translate: move just this joint to the gizmo position (cm).
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        this.onJointMove({ idx: selectedJoint, position: target })
      }
    },
    syncGizmo(): void {
      const want = this.active && this.selectedJoint !== null && this.jointsFlat !== null
      if (want && this.tc === null) {
        this.tc = new TransformControls(stage.camera, stage.canvas)
        this.tc.setSize(0.8)
        this.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          const on = (ev as unknown as { value: boolean }).value
          stage.controls.enabled = !on
          this.dragging = on
        })
        this.tc.addEventListener("mouseDown", () => { this.dragging = true; this.prevRot.set(0, 0, 0) })
        this.tc.addEventListener("objectChange", () => this.handleGizmoDrag())
        this.tc.addEventListener("mouseUp", () => { this.dragging = false; this.handleGizmoDrag() })
        scene.add(this.tc as unknown as THREE.Object3D)
      }
      if (this.tc === null) return
      if (want) {
        this.tc.attach(this.pivot)
        this.tc.setMode(this.effectiveMode)
        this.tc.enabled = true
      } else {
        this.tc.detach()
        this.tc.enabled = false
      }
    },
  }
  return manip
}

// ══ ReferenceManipulator (editRefMode's manipulator inside the
//    reference's offset group — origin-aligned local frame) ══════════
// Shares the pivot/TC pattern but its own joints + handlers.
export function createReferenceManipulator(deps: { stage: Stage3D; scene: THREE.Scene }) {
  const { stage, scene } = deps
  const refManip = {
    root: null as THREE.Group | null,
    jointMeshes: [] as THREE.Mesh[],
    jointMats: [] as THREE.MeshBasicMaterial[],
    boneGeo: null as THREE.BufferGeometry | null,
    pivot: new THREE.Group(),
    tc: null as TransformControls | null,
    hovered: -1,
    dragging: false,
    prevRot: new THREE.Euler(0, 0, 0),
    jointsFlat: null as Float32Array | null,
    selectedJoint: null as number | null,
    selectedChain: null as number[] | null,
    onSelectJoint: (_i: number | null, _a?: boolean) => {},
    onSelectChain: undefined as ((c: number[] | null) => void) | undefined,
    onJointMove: (_e: JointMoveEvent) => {},
    gizmoMode: "rotate" as "rotate" | "translate",
    kinematicMode: "fk" as "fk" | "ik",
    ensure(root: THREE.Group): void {
      if (this.root !== null) { if (this.root.parent !== root) root.add(this.root); return }
      this.root = new THREE.Group()
      root.add(this.root)
      const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
      this.boneGeo = new THREE.BufferGeometry()
      this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5 })
      this.root.add(new THREE.LineSegments(this.boneGeo, boneMat))
      for (let j = 0; j < 77; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS[j] || 0.02, 12, 12), mat)
        mesh.userData.pick = {
          click: (_point: THREE.Vector3, ev: MouseEvent | PointerEvent): void => {
            const additive = ev.shiftKey
            this.onSelectJoint(j, additive)
            if (this.onSelectChain !== undefined) {
              this.onSelectChain(additive ? getJointChain(j, 0) : null)
            }
          },
          over: (): void => { this.hovered = j; document.body.style.cursor = "pointer"; this.paint() },
          out: (): void => { if (this.hovered === j) this.hovered = -1; document.body.style.cursor = "auto"; this.paint() },
        }
        this.jointMeshes[j] = mesh
        this.jointMats[j] = mat
        this.root.add(mesh)
      }
      root.add(this.pivot)
    },
    paint(): void {
      for (let j = 0; j < 77; j++) {
        const inChain = this.selectedChain?.includes(j) ?? false
        this.jointMats[j].color.set(
          this.selectedJoint === j ? "#00ff88"
          : inChain ? "#ff66ff"
          : this.hovered === j ? "#ffdd00"
          : "#ffcc66",
        )
      }
    },
    updateJoints(): void {
      const jf = this.jointsFlat
      if (jf === null || this.root === null) return
      for (let j = 0; j < 77; j++) {
        this.jointMeshes[j].position.set(
          jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
        )
      }
      const pos = this.boneGeo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.boneGeo!.computeBoundingSphere()
      this.paint()
    },
    get isIKActive(): boolean {
      return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0
    },
    get effectiveMode(): "rotate" | "translate" {
      return this.isIKActive ? "translate" : this.gizmoMode
    },
    positionGizmo(): void {
      if (this.dragging) return
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const j = this.selectedJoint
      this.pivot.position.set(
        jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
      )
      this.pivot.rotation.set(0, 0, 0)
      this.prevRot.set(0, 0, 0)
    },
    handleGizmoDrag(): void {
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const selectedJoint = this.selectedJoint
      if (this.isIKActive) {
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        const chainParent = SOMA77_PARENT[selectedJoint]
        if (chainParent < 0) return
        const newJoints = solveCCD(jf, [chainParent, selectedJoint], target)
        this.onJointMove({ idx: selectedJoint, position: target, fullJoints: newJoints })
      } else if (this.effectiveMode === "rotate") {
        const curRot = this.pivot.rotation
        const prev = this.prevRot
        const dx = curRot.x - prev.x
        const dy = curRot.y - prev.y
        const dz = curRot.z - prev.z
        if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return
        const px = jf[selectedJoint * 3]
        const py = jf[selectedJoint * 3 + 1]
        const pz = jf[selectedJoint * 3 + 2]
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, "XYZ"))
        const newJoints = new Float32Array(jf)
        const descendants = getDescendants(selectedJoint)
        const tmp = new THREE.Vector3()
        for (const j of descendants) {
          tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz)
          tmp.applyQuaternion(quat)
          newJoints[j * 3] = tmp.x + px
          newJoints[j * 3 + 1] = tmp.y + py
          newJoints[j * 3 + 2] = tmp.z + pz
        }
        this.prevRot.copy(curRot)
        this.onJointMove({ idx: selectedJoint, position: new THREE.Vector3(px, py, pz), fullJoints: newJoints })
      } else {
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        this.onJointMove({ idx: selectedJoint, position: target })
      }
    },
    syncGizmo(): void {
      const want = this.root !== null && this.selectedJoint !== null && this.jointsFlat !== null
      if (want && this.tc === null) {
        this.tc = new TransformControls(stage.camera, stage.canvas)
        this.tc.setSize(0.8)
        this.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          const on = (ev as unknown as { value: boolean }).value
          stage.controls.enabled = !on
          this.dragging = on
        })
        this.tc.addEventListener("mouseDown", () => { this.dragging = true; this.prevRot.set(0, 0, 0) })
        this.tc.addEventListener("objectChange", () => this.handleGizmoDrag())
        this.tc.addEventListener("mouseUp", () => { this.dragging = false; this.handleGizmoDrag() })
        scene.add(this.tc as unknown as THREE.Object3D)
      }
      if (this.tc === null) return
      if (want) {
        this.tc.attach(this.pivot)
        this.tc.setMode(this.effectiveMode)
        this.tc.enabled = true
      } else {
        this.tc.detach()
        this.tc.enabled = false
      }
    },
    show(root: THREE.Group | null): void {
      if (root === null) {
        if (this.root !== null) this.root.visible = false
        this.pivot.visible = false
      } else {
        this.ensure(root)
        this.root!.visible = true
        this.pivot.visible = true
      }
    },
  }
  return refManip
}

export type JointManipHandle = ReturnType<typeof createJointManipulator>
export type ReferenceManipHandle = ReturnType<typeof createReferenceManipulator>
