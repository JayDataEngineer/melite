import * as THREE from "three"
import { TransformControls } from "three/addons/controls/TransformControls.js"
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
import { makeLabelSprite, type Stage3D } from "@melite/card-base/client"
import { CM_TO_M } from "./poseStageSkeleton"
import type { AltSampleDecoded, LightingOrb, SkinMeshData } from "./poseStageTypes"

// ══ LightingOrbs ════════════════════════════════════════════════════
export function createLightingOrbs(deps: { stage: Stage3D; scene: THREE.Scene }) {
  const { stage, scene } = deps
  const orbs = {
    root: new THREE.Group(),
    entries: [] as {
      id: string
      group: THREE.Group
      sphereMat: THREE.MeshBasicMaterial
      light: THREE.PointLight
      tc: TransformControls | null
    }[],
    onChange: undefined as ((o: LightingOrb[]) => void) | undefined,
    onSelectOrb: undefined as ((id: string | null) => void) | undefined,
    orbs: [] as LightingOrb[],
    selectedOrb: null as string | null,
    constructorDone: false,
    update(list: LightingOrb[], selectedOrb: string | null): void {
      this.orbs = list
      this.selectedOrb = selectedOrb
      // Coarse rebuild: orb lists are tiny (≤ a handful).
      for (const e of this.entries) {
        e.group.removeFromParent()
        e.sphereMat.dispose()
        e.light.dispose()
        if (e.tc !== null) { e.tc.dispose(); (e.tc as unknown as THREE.Object3D).removeFromParent() }
      }
      this.entries = []
      for (const orb of list) {
        const group = new THREE.Group()
        group.position.set(orb.position[0], orb.position[1], orb.position[2])
        const sphereMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(orb.color), transparent: true,
          opacity: selectedOrb === orb.id ? 1.0 : 0.8,
        })
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), sphereMat)
        sphere.userData.pick = {
          click: (): void => { this.onSelectOrb?.(orb.id) },
          over: (): void => { document.body.style.cursor = "pointer" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        group.add(sphere)
        const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(orb.color), transparent: true, opacity: 0.15 })
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), haloMat))
        const light = new THREE.PointLight(new THREE.Color(orb.color), orb.intensity, orb.distance)
        light.castShadow = orb.castShadow
        group.add(light)
        this.root.add(group)
        this.entries.push({ id: orb.id, group, sphereMat, light, tc: null })
      }
      // Selected orb gets a translate gizmo (scene-rooted → world drags).
      const selIdx = list.findIndex(o => o.id === selectedOrb)
      if (selIdx >= 0) {
        const e = this.entries[selIdx]
        e.tc = new TransformControls(stage.camera, stage.canvas)
        e.tc.setSize(0.6)
        e.tc.setMode("translate")
        e.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          stage.controls.enabled = !(ev as unknown as { value: boolean }).value
        })
        const push = (): void => { this.handleOrbDrag(e.id) }
        e.tc.addEventListener("objectChange", push)
        e.tc.addEventListener("mouseUp", push)
        e.tc.attach(e.group)
        scene.add(e.tc as unknown as THREE.Object3D)
      }
    },
    handleOrbDrag(id: string): void {
      const i = this.orbs.findIndex(o => o.id === id)
      const e = this.entries.find(en => en.id === id)
      if (i < 0 || e === undefined || this.onChange === undefined) return
      const updated = [...this.orbs]
      updated[i] = {
        ...updated[i],
        position: [e.group.position.x, e.group.position.y, e.group.position.z],
      }
      this.onChange(updated)
    },
  }
  scene.add(orbs.root)
  return orbs
}

// ══ KeyframeGhost ═══════════════════════════════════════════════════
export function createKeyframeGhost(liftGroup: THREE.Group) {
  const ghost = {
    lines: null as THREE.LineSegments | null,
    geo: null as THREE.BufferGeometry | null,
    update(joints: Float32Array | null): void {
      if (joints === null) {
        if (this.lines !== null) this.lines.visible = false
        return
      }
      if (this.lines === null) {
        const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
        this.geo = new THREE.BufferGeometry()
        this.geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
        this.lines = new THREE.LineSegments(this.geo, mat)
        liftGroup.add(this.lines)
      }
      this.lines.visible = true
      const pos = this.geo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = joints[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = joints[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = joints[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = joints[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = joints[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = joints[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.geo!.computeBoundingSphere()
    },
  }
  return ghost
}

// ══ FootContactsOverlay ═════════════════════════════════════════════
export function createFootContacts(liftGroup: THREE.Group) {
  const contacts = {
    meshes: [] as THREE.Mesh[],
    mats: [] as THREE.MeshBasicMaterial[],
    ensure(): void {
      if (this.meshes.length > 0) return
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.04, 16), mat)
        mesh.rotation.x = -Math.PI / 2
        liftGroup.add(mesh)
        this.meshes.push(mesh)
        this.mats.push(mat)
      }
    },
    update(footContacts: number[][] | null, frameIdx: number, jointsFlat: Float32Array | null): void {
      const show = !!footContacts && footContacts.length > 0 && !!jointsFlat
      this.ensure()
      const colors = [0x3b82f6, 0xec4899, 0xa855f7, 0xef4444]
      for (const m of this.meshes) m.visible = show
      if (!show) return
      const fi = Math.max(0, Math.min(frameIdx, footContacts!.length - 1))
      const fc = footContacts![fi]
      if (!fc || fc.length < 4) { for (const m of this.meshes) m.visible = false; return }
      const stride = 77 * 3
      const frameCount = jointsFlat!.length / stride
      const idx = Math.max(0, Math.min(fi, frameCount - 1))
      const base = idx * stride
      const feet = [69, 74]
      const footPos = feet.map(j => [
        jointsFlat![base + j * 3] * CM_TO_M,
        jointsFlat![base + j * 3 + 1] * CM_TO_M,
        jointsFlat![base + j * 3 + 2] * CM_TO_M,
      ] as [number, number, number])
      // [L_heel, R_heel, L_toe, R_toe]
      const src = [footPos[0], footPos[1], footPos[0], footPos[1]]
      for (let i = 0; i < 4; i++) {
        const contact = fc[i]
        const dz = i < 2 ? -0.04 : 0.04
        const radius = 0.04 + contact * 0.04
        this.meshes[i].position.set(src[i][0], 0.005, src[i][2] + dz)
        this.meshes[i].scale.setScalar(radius / 0.04)
        this.mats[i].color.setHex(colors[i])
        this.mats[i].opacity = 0.2 + contact * 0.8
      }
    },
  }
  return contacts
}

// ══ StartingDirectionArrow ══════════════════════════════════════════
export function createDirectionArrow(liftGroup: THREE.Group) {
  const arrow = {
    group: null as THREE.Group | null,
    update(jointsFlat: Float32Array | null): void {
      const rebuild = (): void => {
        if (this.group !== null) { this.group.removeFromParent(); this.group = null }
        if (jointsFlat === null || jointsFlat.length < 6) return
        // Direction: root joint (0) movement between the first two frames.
        const stride = 77 * 3
        const frames = Math.floor(jointsFlat.length / stride)
        if (frames < 2) return
        const r0 = [jointsFlat[0] * CM_TO_M, jointsFlat[2] * CM_TO_M]
        const r1 = [jointsFlat[stride] * CM_TO_M, jointsFlat[stride + 2] * CM_TO_M]
        const dx = r1[0] - r0[0]
        const dz = r1[1] - r0[1]
        const len = Math.hypot(dx, dz)
        if (len < 0.01) return
        const angle = Math.atan2(dx, dz)
        const arrowLen = Math.min(0.8, len * 2 + 0.2)
        const g = new THREE.Group()
        g.position.set(r0[0], 0.01, r0[1])
        g.rotation.y = angle
        const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, arrowLen, 8), shaftMat)
        shaft.position.set(0, 0, arrowLen / 2)
        shaft.rotation.x = Math.PI / 2
        g.add(shaft)
        const headMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 })
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), headMat)
        head.position.set(0, 0, arrowLen)
        head.rotation.x = Math.PI / 2
        g.add(head)
        liftGroup.add(g)
        this.group = g
      }
      rebuild()
    },
    setVisible(v: boolean): void { if (this.group !== null) this.group.visible = v },
  }
  return arrow
}

// ══ AltSampleMeshes (meshes only — the shell decodes async) ═════════
export function createAltSamples() {
  const alts = {
    root: new THREE.Group(),
    samples: [] as AltSampleDecoded[],
    faces: [] as number[][],
    onCommit: (_i: number) => {},
    update(samples: AltSampleDecoded[], meshData: SkinMeshData | null, onCommit: (i: number) => void): void {
      this.onCommit = onCommit
      this.root.clear()
      this.samples = samples
      if (meshData === null || samples.length === 0) return
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]
        const g = new THREE.BufferGeometry()
        const arr = new Float32Array(s.verts)
        g.setAttribute("position", new THREE.BufferAttribute(arr, 3))
        g.setIndex(meshData.faces.flat(2))
        g.computeVertexNormals()
        const mat = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, transparent: true, opacity: 0.45, roughness: 0.7 })
        const mesh = new THREE.Mesh(g, mat)
        mesh.userData.pick = {
          click: (): void => { this.onCommit(s.idx) },
          over: (): void => { document.body.style.cursor = "pointer" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        const holder = new THREE.Group()
        holder.position.set(1.2 + i * 0.6, 0, -0.3)
        holder.add(mesh)
        const hintMat = new THREE.MeshBasicMaterial({ color: 0x98bdf7, transparent: true, opacity: 0.6 })
        const hint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hintMat)
        hint.position.set(0, 1.6, 0)
        holder.add(hint)
        this.root.add(holder)
      }
    },
  }
  return alts
}

// ══ ConstraintOverlays ══════════════════════════════════════════════
export function createConstraintOverlays(deps: { stage: Stage3D; scene: THREE.Scene }) {
  const { stage, scene } = deps
  const constraints = {
    root: new THREE.Group(),
    eeTC: null as TransformControls | null,
    eeGroups: [] as THREE.Group[],
    eeMats: [] as THREE.MeshBasicMaterial[],
    eeIds: [] as string[],
    points: [] as { id: string; frame: number; joint_name: string; position: [number, number, number] }[],
    editMode: false,
    selectedEEId: null as string | null,
    showLabels: true,
    onSelectEE: undefined as ((id: string | null) => void) | undefined,
    onChangeEEPoint: undefined as ((id: string, p: [number, number, number]) => void) | undefined,
    eeColor: { LeftHand: "#f59e0b", RightHand: "#ef4444", LeftFoot: "#10b981", RightFoot: "#3b82f6" } as Record<string, string>,
    update(
      root2dPoints: { frame: number; x: number; z: number }[],
      endEffectorPoints: { id: string; frame: number; joint_name: string; position: [number, number, number] }[],
      showLabels: boolean, editMode: boolean, selectedEEId: string | null,
    ): void {
      this.points = endEffectorPoints
      this.showLabels = showLabels
      this.editMode = editMode
      this.selectedEEId = selectedEEId
      this.root.clear()
      this.eeGroups = []
      this.eeMats = []
      this.eeIds = []
      for (const p of root2dPoints) {
        const g = new THREE.Group()
        g.position.set(p.x, 0.005, p.z)
        const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.04, 24), mat)
        ring.rotation.x = -Math.PI / 2
        g.add(ring)
        if (showLabels) {
          const label = makeLabelSprite(`F${p.frame}`, "#fcd34d", 0.035)
          label.position.set(0, 0.08, 0)
          g.add(label)
        }
        this.root.add(g)
      }
      for (const p of endEffectorPoints) {
        const color = this.eeColor[p.joint_name] ?? "#ffffff"
        const isSelected = editMode && selectedEEId === p.id
        const g = new THREE.Group()
        g.position.set(p.position[0], p.position[1], p.position[2])
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(isSelected ? "#ffffff" : color),
          transparent: true, opacity: isSelected ? 1.0 : 0.9,
        })
        const radius = isSelected ? 0.034 : 0.028
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat)
        sphere.userData.pick = {
          click: (): void => { if (editMode) this.onSelectEE?.(p.id) },
          over: (): void => { if (editMode) document.body.style.cursor = "move" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        g.add(sphere)
        if (isSelected) {
          const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.18 })
          g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), haloMat))
        }
        if (showLabels) {
          const label = makeLabelSprite(`${p.joint_name[0] ?? "E"}·F${p.frame}`, isSelected ? "#ffffff" : color, 0.03)
          label.position.set(0, 0.08, 0)
          g.add(label)
        }
        this.root.add(g)
        this.eeGroups.push(g)
        this.eeMats.push(mat)
        this.eeIds.push(p.id)
        // Translate gizmo on the selected EE (edit mode only). Listeners
        // are registered ONCE at creation and read the CURRENT selection —
        // rebuilds never accumulate stale per-point handlers.
        if (isSelected && this.onChangeEEPoint !== undefined) {
          if (this.eeTC === null) {
            this.eeTC = new TransformControls(stage.camera, stage.canvas)
            this.eeTC.setSize(0.7)
            this.eeTC.setMode("translate")
            this.eeTC.addEventListener("dragging-changed", (ev: THREE.Event) => {
              stage.controls.enabled = !(ev as unknown as { value: boolean }).value
            })
            this.eeTC.addEventListener("objectChange", () => {
              if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId)
            })
            this.eeTC.addEventListener("mouseUp", () => {
              if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId)
            })
            scene.add(this.eeTC as unknown as THREE.Object3D)
          }
          this.eeTC.attach(g)
          this.eeTC.enabled = true
        }
      }
      if (this.eeTC !== null && !(editMode && selectedEEId !== null && endEffectorPoints.some(pt => pt.id === selectedEEId))) {
        this.eeTC.detach()
        this.eeTC.enabled = false
      }
    },
    handleEEDrag(id: string): void {
      if (this.onChangeEEPoint === undefined) return
      const i = this.eeIds.indexOf(id)
      if (i < 0) return
      const g = this.eeGroups[i]
      this.onChangeEEPoint(id, [g.position.x, g.position.y, g.position.z])
    },
  }
  return constraints
}

// ══ EE placement plane (placingEE) ══════════════════════════════════
export function createEEPlacementPlane(liftGroup: THREE.Group) {
  const eePlane = {
    mesh: null as THREE.Mesh | null,
    setVisible(v: boolean): void { if (this.mesh !== null) this.mesh.visible = v },
    update(
      placingEE: boolean, eePlaceJointIdx: number,
      editableJoints: Float32Array | null, jointsFlat: Float32Array | null, frameIdx: number,
      onPlaceEE: (p: [number, number, number]) => void,
    ): void {
      if (placingEE && this.mesh === null) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat)
        this.mesh.rotation.x = -Math.PI / 2
        liftGroup.add(this.mesh)
      }
      if (this.mesh === null) return
      this.mesh.visible = placingEE
      if (!placingEE) return
      const ji = eePlaceJointIdx ?? 0
      const y = editableJoints ? editableJoints[ji * 3 + 1] * CM_TO_M
        : jointsFlat ? jointsFlat[(frameIdx * 77 + ji) * 3 + 1] * CM_TO_M
        : 1.0
      this.mesh.position.set(0, y, 0)
      this.mesh.userData.pick = {
        click: (point: THREE.Vector3): void => { onPlaceEE([point.x, y, point.z]) },
      }
    },
  }
  return eePlane
}
