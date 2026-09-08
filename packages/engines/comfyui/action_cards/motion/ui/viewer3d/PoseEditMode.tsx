// PoseEditMode — interactive skeleton manipulation, keyframe gizmos, and lighting.
//
// Components:
//   • JointManipulator  — clickable joints + TransformControls gizmo for posing
//   • LightingOrbs      — movable point lights with visible orb spheres
//   • KeyframeMarkers   — 3D ghost of a saved keyframe pose (onion skin)
//
// Used by PoseViewer3D when editMode is enabled.

import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react"
import { useThree, } from "@react-three/fiber"
import { TransformControls } from "@react-three/drei"
import * as THREE from "three"
import type React from "react"
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
/** Centimeters → meters. SOMA-X/ANNY joints arrive in cm; the Three.js scene
 *  is authored in meters. Applied at every display boundary. The drag handler
 *  converts gizmo.position back to cm so IK/FK math stays in the native cm
 *  space (matching jointsFlat and the backend deformSomaJoints API). */
const CM_TO_M = 0.01

// ── Types ──────────────────────────────────────────────────────────────────

export interface LightingOrb {
  id: string
  position: [number, number, number]
  color: string
  intensity: number
  distance: number
  castShadow: boolean
}

export interface Keyframe {
  id: string
  frame: number
  joints: Float32Array  // 77 × 3
  label: string
}

// SOMA-77 joint display sizes — main body joints are bigger,
// finger/toe tip joints are smaller.
const JOINT_RADIUS: Record<number, number> = {}
function initJointRadii() {
  // Default radius
  for (let i = 0; i < 77; i++) JOINT_RADIUS[i] = 0.020
  // Major body joints — bigger, easier to grab
  const major = [0, 3, 6, 11, 12, 13, 14, 39, 40, 41, 42, 67, 68, 69, 72, 73, 74]
  for (const j of major) JOINT_RADIUS[j] = 0.028
  // Finger/toe tips — smaller
  const tips = [18, 23, 28, 33, 38, 46, 51, 56, 61, 66, 71, 76]
  for (const j of tips) JOINT_RADIUS[j] = 0.012
}
initJointRadii()

// ── Skeleton parent map (built once from bone connections) ────────────────
// child index → parent index. Root (0) has no parent (maps to -1).
const SOMA77_PARENT: number[] = (() => {
  const parent: number[] = new Array(77).fill(-1)
  for (const [p, c] of SOMA77_BONE_CONNECTIONS) parent[c] = p
  return parent
})()

/** Return the joint chain from `jointIdx` up to (and including) `chainRoot`,
 *  ordered root-first. Used by multi-joint selection and IK. */
function getJointChain(jointIdx: number, chainRoot = 0): number[] {
  const chain: number[] = []
  let cur = jointIdx
  let guard = 0
  while (cur >= 0 && cur < 77 && guard++ < 77) {
    chain.unshift(cur)
    if (cur === chainRoot) break
    cur = SOMA77_PARENT[cur]
  }
  return chain
}

/** Return ALL descendant joint indices of `jointIdx` (children, grandchildren, …).
 *  Uses SOMA77_PARENT to walk the tree. Used by FK rotation propagation. */
const SOMA77_CHILDREN: number[][] = (() => {
  const children: number[][] = Array.from({ length: 77 }, (): number[] => [])
  for (let i = 0; i < 77; i++) {
    const p = SOMA77_PARENT[i]
    if (p >= 0) children[p].push(i)
  }
  return children
})()

function getDescendants(jointIdx: number): number[] {
  const result: number[] = []
  const stack = [...SOMA77_CHILDREN[jointIdx]]
  while (stack.length > 0) {
    const cur = stack.pop()!
    result.push(cur)
    stack.push(...SOMA77_CHILDREN[cur])
  }
  return result
}

// ── CCD IK solver ─────────────────────────────────────────────────────────
// Given the current joint positions (flat, 77×3), a chain (root-first),
// a target world position, and the index of the end-effector, run several
// iterations of Cyclic Coordinate Descent to rotate joints in the chain so
// the end-effector reaches the target. Returns the new joint positions array.
//
// Note: this is a *positional* CCD — it treats each joint as a spherical
// joint (no joint limits) and rotates in 3D. It's the same approach as the
// classic robotics CCD formulation.
//
// Kimodo-TO (d): rotation of each chain joint now propagates to ALL of its
// descendants (not just the next chain joint), so when you drag a mid-chain
// joint (elbow, knee) the hands/fingers/feet follow instead of being left
// behind to disconnect. This makes IK usable on ANY joint, not just the 4
// canonical end-effectors.
function solveCCD(
  jointsFlat: Float32Array,
  chain: number[],
  target: THREE.Vector3,
  iterations = 8,
  tolerance = 0.005,
): Float32Array {
  if (chain.length < 2) return jointsFlat
  const out = new Float32Array(jointsFlat)  // copy
  const ee = chain[chain.length - 1]
  const eePos = new THREE.Vector3(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])

  // Early-out if already at target
  if (eePos.distanceTo(target) < tolerance) return out

  // Precompute each chain joint's full descendant set ONCE — reused every
  // iteration so we don't re-walk the tree in the hot loop.
  const chainDescendants = chain.map(j => getDescendants(j))

  const tmpJoint = new THREE.Vector3()
  const tmpEE = new THREE.Vector3()
  const curDir = new THREE.Vector3()
  const tgtDir = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  const cp = new THREE.Vector3()

  for (let iter = 0; iter < iterations; iter++) {
    // Walk from the joint just before the EE back to the chain root.
    for (let i = chain.length - 2; i >= 0; i--) {
      const j = chain[i]
      tmpJoint.set(out[j * 3], out[j * 3 + 1], out[j * 3 + 2])
      tmpEE.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])
      curDir.subVectors(tmpEE, tmpJoint).normalize()
      tgtDir.subVectors(target, tmpJoint).normalize()
      // Rotation axis = curDir × tgtDir; angle = acos(curDir · tgtDir)
      const dot = THREE.MathUtils.clamp(curDir.dot(tgtDir), -1, 1)
      const angle = Math.acos(dot)
      axis.crossVectors(curDir, tgtDir)
      if (axis.lengthSq() < 1e-8 || angle < 1e-5) continue
      axis.normalize()
      quat.setFromAxisAngle(axis, angle)
      // Rotate ALL descendants of this joint (not just the next chain
      // joint) so side-branches (fingers, toes) follow the rotation.
      for (const c of chainDescendants[i]) {
        cp.set(out[c * 3], out[c * 3 + 1], out[c * 3 + 2])
        cp.sub(tmpJoint).applyQuaternion(quat).add(tmpJoint)
        out[c * 3] = cp.x; out[c * 3 + 1] = cp.y; out[c * 3 + 2] = cp.z
      }
    }
    // Check convergence
    eePos.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])
    if (eePos.distanceTo(target) < tolerance) break
  }
  return out
}

// ── JointManipulator ──────────────────────────────────────────────────────
// Renders all 77 joints as individually clickable spheres + bones.
// When a joint is selected, a TransformControls gizmo appears for manipulation.
//
// Modes:
//   • fk        — gizmo rotates the selected joint; parent rotation propagates
//                 to children automatically (FK chain).
//   • ik        — when an end-effector joint is selected, gizmo becomes a
//                 translate target; CCD solver rotates the chain to reach it.
//   • multi-joint — shift+click selects a chain; gizmo rotates the whole chain.

// ── LiftAwareTransformControls ────────────────────────────────────────────
// three-stdlib's TransformControls positions its gizmo handles at the attached
// object's WORLD position but as LOCAL coordinates of its OWN parent. When the
// parent is a transformed group (e.g. the meshLiftY lift group at y≈1.02), the
// parent translation gets applied AGAIN → handles render at worldPos + liftY,
// i.e. ~1 m too high ("far above, out of view").
//
// Fix: set the controls' local position to the NEGATIVE of the parent group's
// world translation. The effective parent transform becomes identity, so
// world→local is 1:1 and handles land exactly at the attached object's world
// position. The attached object stays wherever it is in the tree; TransformControls
// reads its matrixWorld (correct world pos) and converts drag deltas back to the
// object's local frame via the parent inverse quaternion/scale, so drag math
// (object.position = raw local coords) is completely unchanged.
//
// NOTE: parent groups in this app only translate (no rotation/scale). If a
// rotated parent is ever introduced, extend this to decompose the full matrix.
export function LiftAwareTransformControls(
  props: React.ComponentProps<typeof TransformControls>,
) {
  const tcRef = useRef<any>(null)
  const tmpV = useMemo(() => new THREE.Vector3(), [])
  // Re-run after every commit (O(1) — just a getWorldPosition + set). This
  // catches the mount, identity/shape switches (meshLiftY changes), and any
  // ancestor repositioning. The guard avoids redundant matrix recomputation
  // when the offset hasn't changed.
  const lastKey = useRef("")
  useLayoutEffect(() => {
    const controls = tcRef.current
    if (!controls || !controls.parent) return
    controls.parent.getWorldPosition(tmpV)
    const key = `${tmpV.x.toFixed(6)},${tmpV.y.toFixed(6)},${tmpV.z.toFixed(6)}`
    if (key !== lastKey.current) {
      controls.position.set(-tmpV.x, -tmpV.y, -tmpV.z)
      controls.updateMatrix()
      lastKey.current = key
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })
  return <TransformControls ref={tcRef as any} {...props} />
}

export interface JointMoveEvent {
  /** Single-joint move (FK or IK root). */
  idx: number
  position: THREE.Vector3
  /** When set, contains all joint positions after the operation (IK / chain). */
  fullJoints?: Float32Array
}

export function JointManipulator({
  jointsFlat,
  selectedJoint,
  selectedChain,
  onSelectJoint,
  onSelectChain,
  onJointMove,
  gizmoMode = "rotate",
  kinematicMode = "fk",
  gizmoSize = 0.8,
}: {
  jointsFlat: Float32Array | null
  selectedJoint: number | null
  /** Selected chain (root-first) for multi-joint rotation, or null. */
  selectedChain?: number[] | null
  onSelectJoint: (idx: number | null, additive?: boolean) => void
  onSelectChain?: (chain: number[] | null) => void
  onJointMove: (e: JointMoveEvent) => void
  gizmoMode?: "rotate" | "translate"
  /** "fk" = forward kinematics (rotate joint), "ik" = inverse kinematics (translate target → CCD). */
  kinematicMode?: "fk" | "ik"
  gizmoSize?: number
}) {
  const jointMeshes = useRef<(THREE.Mesh | null)[]>([])
  const gizmoRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const { } = useThree()
  // Disable OrbitControls during gizmo drag so the camera doesn't rotate
  // while posing a joint.
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null

  // Build geometry/material per joint (different sizes)
  const jointGeos = useMemo(() => {
    const geos: THREE.SphereGeometry[] = []
    for (let i = 0; i < 77; i++) {
      geos[i] = new THREE.SphereGeometry(JOINT_RADIUS[i] || 0.02, 12, 12)
    }
    return geos
  }, [])

  // Bone line geometry
  const boneGeo = useMemo(() => {
    const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])
  const boneMat = useMemo(() => new THREE.LineBasicMaterial({
    color: "#ff8844", transparent: true, opacity: 0.5,
  }), [])

  // Update positions when joints change
  useEffect(() => {
    if (!jointsFlat) return
    // Update joint mesh positions (convert cm → m for display)
    for (let j = 0; j < 77; j++) {
      const mesh = jointMeshes.current[j]
      if (mesh) {
        mesh.position.set(
          jointsFlat[j * 3] * CM_TO_M,
          jointsFlat[j * 3 + 1] * CM_TO_M,
          jointsFlat[j * 3 + 2] * CM_TO_M,
        )
      }
    }
    // Update bone positions (convert cm → m for display)
    const pos = boneGeo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
      const [p, c] = SOMA77_BONE_CONNECTIONS[b]
      arr[b * 6 + 0] = jointsFlat[p * 3] * CM_TO_M
      arr[b * 6 + 1] = jointsFlat[p * 3 + 1] * CM_TO_M
      arr[b * 6 + 2] = jointsFlat[p * 3 + 2] * CM_TO_M
      arr[b * 6 + 3] = jointsFlat[c * 3] * CM_TO_M
      arr[b * 6 + 4] = jointsFlat[c * 3 + 1] * CM_TO_M
      arr[b * 6 + 5] = jointsFlat[c * 3 + 2] * CM_TO_M
    }
    pos.needsUpdate = true
    boneGeo.computeBoundingSphere()
  }, [jointsFlat, boneGeo])

  // Resolve the effective gizmo mode based on kinematic mode + joint type.
  // Kimodo-TO (d): IK (drag-to-position) now works for ANY joint, not just
  // the 4 canonical end-effectors. The chain root is auto-scoped to the
  // limb (shoulder/hip) so dragging an elbow doesn't rotate the torso.
  // Only the skeleton root (0) falls back to translate — there's no parent
  // to solve through, so dragging it just moves the whole character.
  const isIKActive = kinematicMode === "ik"
    && selectedJoint !== null
    && selectedJoint !== 0   // root has no chain to solve; translate instead
  const effectiveMode: "rotate" | "translate" = isIKActive ? "translate" : gizmoMode

  // Track whether the user is actively dragging the gizmo.  We use this to
  // avoid fighting with TransformControls — the gizmo-positioning useEffect
  // is skipped while dragging so the gizmo doesn't "jump".
  const draggingRef = useRef(false)
  // Previous gizmo rotation — used to compute incremental rotation deltas
  // for FK rotation propagation (so children rotate smoothly with the gizmo).
  const prevRotRef = useRef(new THREE.Euler(0, 0, 0))

  // Position the gizmo at the selected joint (skip during active drag)
  useEffect(() => {
    if (draggingRef.current) return  // don't fight the user's drag
    if (selectedJoint === null || !jointsFlat || !gizmoRef.current) return
    gizmoRef.current.position.set(
      jointsFlat[selectedJoint * 3] * CM_TO_M,
      jointsFlat[selectedJoint * 3 + 1] * CM_TO_M,
      jointsFlat[selectedJoint * 3 + 2] * CM_TO_M,
    )
    gizmoRef.current.rotation.set(0, 0, 0)
    prevRotRef.current.set(0, 0, 0)
  }, [selectedJoint, jointsFlat])

  // ── Gizmo drag handler ──
  // • IK mode (translate + end-effector): CCD solver reaches toward the target.
  // • FK rotate: reads the rotation delta, rotates all descendant joints around
  //   the selected joint (proper forward kinematics), then sends fullJoints.
  // • FK translate: moves the single joint to the gizmo position.
  const handleGizmoDrag = useCallback(() => {
    if (selectedJoint === null || !gizmoRef.current || !jointsFlat) return
    const gizmo = gizmoRef.current

    if (isIKActive) {
      // IK: solve a 2-joint chain [parent, selected] so dragging a joint
      // rotates ONLY its immediate parent. This gives clean isolation —
      // e.g. dragging the hand bends the elbow (ForeArm rotates) without
      // swinging the shoulder or upper arm. The previous design used the
      // full limb chain [Shoulder→…→Hand], which
      // distributed rotations across all chain joints: the shoulder and
      // arm swung even for small hand drags, and for inward targets
      // (toward the body) the 4-joint CCD DIVERGED (shoulder rotated
      // 100°+, hand ended up 2 m from the target). The 2-joint chain
      // converges instantly for any target (one shortest-arc rotation)
      // and never touches joints above the parent.
      const target = gizmo.position.clone().multiplyScalar(1 / CM_TO_M)
      const chainParent = SOMA77_PARENT[selectedJoint]
      if (chainParent < 0) return
      const chain = [chainParent, selectedJoint]
      const newJoints = solveCCD(jointsFlat, chain, target)
      onJointMove({ idx: selectedJoint, position: target, fullJoints: newJoints })
    } else if (effectiveMode === "rotate") {
      // FK rotate: compute the rotation delta since last frame and apply it
      // to all descendant joints (propagates rotation down the skeleton).
      const curRot = gizmo.rotation
      const prev = prevRotRef.current
      const dx = curRot.x - prev.x
      const dy = curRot.y - prev.y
      const dz = curRot.z - prev.z
      if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return

      // Pivot = selected joint position (stays fixed during rotation)
      const px = jointsFlat[selectedJoint * 3]
      const py = jointsFlat[selectedJoint * 3 + 1]
      const pz = jointsFlat[selectedJoint * 3 + 2]

      // Build rotation quaternion from the delta Euler angles
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, "XYZ"))

      // Apply rotation to every descendant
      const newJoints = new Float32Array(jointsFlat)
      const descendants = getDescendants(selectedJoint)
      const tmp = new THREE.Vector3()
      for (const j of descendants) {
        tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz)
        tmp.applyQuaternion(quat)
        newJoints[j * 3] = tmp.x + px
        newJoints[j * 3 + 1] = tmp.y + py
        newJoints[j * 3 + 2] = tmp.z + pz
      }

      // Save current rotation for next delta computation
      prevRotRef.current.copy(curRot)

      onJointMove({ idx: selectedJoint, position: new THREE.Vector3(px, py, pz), fullJoints: newJoints })
    } else {
      // FK translate: move just this joint to the gizmo position.
      // Convert gizmo.position from meters (display) back to cm (raw space).
      const target = gizmo.position.clone().multiplyScalar(1 / CM_TO_M)
      onJointMove({ idx: selectedJoint, position: target })
    }
  }, [selectedJoint, onJointMove, jointsFlat, isIKActive, effectiveMode])

  // Joint click handler — supports shift+click for multi-joint chain selection.
  const handleJointClick = useCallback((e: any, j: number) => {
    e.stopPropagation()
    const additive = e.shiftKey
    onSelectJoint(j, additive)
    if (additive && onSelectChain) {
      // Shift+click selects the chain from this joint up to root.
      onSelectChain(getJointChain(j, 0))
    } else if (onSelectChain) {
      onSelectChain(null)
    }
  }, [onSelectJoint, onSelectChain])

  if (!jointsFlat) return null

  return (
    <group>
      {/* Bones */}
      <lineSegments geometry={boneGeo} material={boneMat} />

      {/* Joints — individually clickable meshes */}
      {Array.from({ length: 77 }, (_, j) => {
        const inChain = selectedChain?.includes(j) ?? false
        return (
        <mesh
          key={j}
          ref={(el) => { jointMeshes.current[j] = el }}
          geometry={jointGeos[j]}
          position={[jointsFlat[j * 3] * CM_TO_M, jointsFlat[j * 3 + 1] * CM_TO_M, jointsFlat[j * 3 + 2] * CM_TO_M]}
          onClick={(e) => handleJointClick(e, j)}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(j)
            document.body.style.cursor = "pointer"
          }}
          onPointerOut={() => {
            setHovered(null)
            document.body.style.cursor = "auto"
          }}
        >
          <meshBasicMaterial
            color={
              selectedJoint === j ? "#00ff88"
              : inChain ? "#ff66ff"
              : hovered === j ? "#ffdd00"
              : "#ffcc66"
            }
          />
        </mesh>
        )
      })}

      {/* Click empty space to deselect */}
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => {
          if (e.intersections.length === 1) {
            onSelectJoint(null)
            onSelectChain?.(null)
          }
        }}
      >
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* TransformControls gizmo on selected joint */}
      {selectedJoint !== null && (
        <>
          <group ref={gizmoRef} />
          <LiftAwareTransformControls
            object={gizmoRef as React.RefObject<THREE.Object3D>}
            mode={effectiveMode}
            size={gizmoSize}
            onMouseDown={() => { draggingRef.current = true; if (controls) controls.enabled = false }}
            onChange={handleGizmoDrag}
            onMouseUp={() => { draggingRef.current = false; if (controls) controls.enabled = true; handleGizmoDrag() }}
          />
        </>
      )}
    </group>
  )
}

// ── LightingOrbs ──────────────────────────────────────────────────────────
// Movable point lights with visible orb spheres. Drag to position.

export function LightingOrbs({
  orbs,
  onChange,
  selectedOrb,
  onSelectOrb,
}: {
  orbs: LightingOrb[]
  onChange: (orbs: LightingOrb[]) => void
  selectedOrb: string | null
  onSelectOrb: (id: string | null) => void
}) {
  const orbRefs = useRef<(THREE.Group | null)[]>([])
  const [, setHovered] = useState<string | null>(null)
  // Access the scene's OrbitControls so we can disable it during gizmo drag
  // (prevents the camera from rotating while positioning a light).
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null

  const handleOrbDrag = useCallback((id: string) => {
    const ref = orbRefs.current.find((_, i) => orbs[i]?.id === id)
    if (!ref) return
    const idx = orbs.findIndex(o => o.id === id)
    if (idx < 0) return
    const updated = [...orbs]
    updated[idx] = {
      ...updated[idx],
      position: [ref.position.x, ref.position.y, ref.position.z],
    }
    onChange(updated)
  }, [orbs, onChange])

  return (
    <group>
      {orbs.map((orb, i) => (
        <group key={orb.id}>
          {/* Visible orb sphere */}
          <group ref={(el) => { orbRefs.current[i] = el }} position={orb.position}>
            <mesh
              onClick={(e) => { e.stopPropagation(); onSelectOrb(orb.id) }}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(orb.id); document.body.style.cursor = "pointer" }}
              onPointerOut={() => { setHovered(null); document.body.style.cursor = "auto" }}
            >
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial
                color={orb.color}
                transparent
                opacity={selectedOrb === orb.id ? 1.0 : 0.8}
              />
            </mesh>
            {/* Glow halo */}
            <mesh>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color={orb.color} transparent opacity={0.15} />
            </mesh>
          </group>

          {/* The actual light */}
          <pointLight
            position={orb.position}
            color={orb.color}
            intensity={orb.intensity}
            distance={orb.distance}
            castShadow={orb.castShadow}
          />

          {/* TransformControls for selected orb */}
          {selectedOrb === orb.id && (
            <TransformControls
              object={orbRefs.current[i] as unknown as THREE.Object3D}
              mode="translate"
              size={0.6}
              onMouseDown={() => { if (controls) controls.enabled = false }}
              onChange={() => handleOrbDrag(orb.id)}
              onMouseUp={() => { if (controls) controls.enabled = true; handleOrbDrag(orb.id) }}
            />
          )}
        </group>
      ))}
    </group>
  )
}

// ── KeyframeGhost ─────────────────────────────────────────────────────────
// Onion-skin rendering of a nearby keyframe — shows ghosted skeleton.

export function KeyframeGhost({
  joints,
  color = "#00ffff",
  opacity = 0.3,
}: {
  joints: Float32Array  // 77 × 3
  color?: string
  opacity?: number
}) {
  const lineRef = useRef<THREE.LineSegments>(null)

  const boneGeo = useMemo(() => {
    const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useEffect(() => {
    const pos = boneGeo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
      const [p, c] = SOMA77_BONE_CONNECTIONS[b]
      arr[b * 6 + 0] = joints[p * 3] * CM_TO_M
      arr[b * 6 + 1] = joints[p * 3 + 1] * CM_TO_M
      arr[b * 6 + 2] = joints[p * 3 + 2] * CM_TO_M
      arr[b * 6 + 3] = joints[c * 3] * CM_TO_M
      arr[b * 6 + 4] = joints[c * 3 + 1] * CM_TO_M
      arr[b * 6 + 5] = joints[c * 3 + 2] * CM_TO_M
    }
    pos.needsUpdate = true
    boneGeo.computeBoundingSphere()
  }, [joints, boneGeo])

  return (
    <lineSegments ref={lineRef} geometry={boneGeo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}
