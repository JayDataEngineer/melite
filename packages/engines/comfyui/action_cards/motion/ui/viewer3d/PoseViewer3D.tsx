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
 */
import { useRef, useMemo, useState, useEffect, useCallback, memo } from "react"
import type React from "react"
import { Loader2 } from "../../../ui-icons"
import styles from "./PoseViewer3D.module.css"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Grid, ContactShadows, Text, Billboard } from "@react-three/drei"
import * as THREE from "three"
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
import {
  JointManipulator, LightingOrbs, KeyframeGhost, LiftAwareTransformControls,
  type JointMoveEvent,
  type LightingOrb,
} from "./PoseEditMode"
import { apiFetch } from "@melite/catalog"
import { azimuthCameraPos, type MotionAzimuth } from "@melite/formats"

// ── Types ─────────────────────────────────────────────────────────────────
interface SkinMeshData {
  vertices: number[][]
  faces: number[][]
}

// ── API helpers ───────────────────────────────────────────────────────────
// Per-identity-model bind-mesh cache. All meshes share SOMA's 18056-vertex
// layout but have DIFFERENT face triangulations, so we cache per model and
// refetch when the user switches mesh (soma / mhr / anny).
const _meshCache: Map<string, SkinMeshData> = new Map()

async function fetchBindMesh(
  identityModel: string = "anny",
  identityCoeffs?: number[] | null,
  localChanges?: Record<string, number> | null,
  customTargets?: Record<string, number> | null,
): Promise<SkinMeshData> {
  const key = identityModel || "anny"
  // Shaped meshes (custom coefficients) get their own cache entry so that
  // re-opening the dialog with the same coeffs doesn't refetch. The signature
  // rounds to 1 decimal place — enough to avoid redundant fetches for visually
  // identical shapes without exploding the cache.
  const coeffsSig = identityCoeffs && identityCoeffs.length > 0
    ? identityCoeffs.map(v => v.toFixed(1)).join(",")
    : null
  // Detail morphs contribute to the cache key too — sorted for stability.
  const lcEntries = localChanges && Object.keys(localChanges).length > 0
    ? Object.entries(localChanges)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  // Custom .target blends get the same treatment — sorted, rounded, joined.
  // An anime character (customTargets set) must not collide with the neutral
  // baseline in the cache, otherwise the loaded mesh would render as neutral.
  const ctEntries = customTargets && Object.keys(customTargets).length > 0
    ? Object.entries(customTargets)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const cacheKey = [key, coeffsSig, lcEntries, ctEntries].filter(Boolean).join("|")
  const cached = _meshCache.get(cacheKey)
  if (cached) return cached

  let data: SkinMeshData
  if (coeffsSig || lcEntries || ctEntries) {
    // POST with identity_coeffs + local_changes + custom_targets for a shaped
    // bind mesh (~30 ms server-side). Only include fields that have real values.
    const res = await apiFetch("/poser/skin/mesh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_model: key,
        ...(coeffsSig ? { identity_coeffs: identityCoeffs } : {}),
        ...(lcEntries ? { local_changes: localChanges } : {}),
        ...(ctEntries ? { custom_targets: customTargets } : {}),
      }),
    })
    if (!res.ok) throw new Error(`Failed to fetch shaped mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  } else {
    const res = await apiFetch(`/poser/skin/mesh?identity_model=${encodeURIComponent(key)}`)
    if (!res.ok) throw new Error(`Failed to fetch mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  }
  _meshCache.set(cacheKey, data)
  return data
}

// ── Geometry builder ──────────────────────────────────────────────────────
// The bind pose, deformed vertices, and joint positions all arrive in the
// SAME raw coordinate space from the backend (SOMA-X uses centimeters — a
// 168 cm tall human body). The Three.js scene (camera, grid, lights) is
// set up for METERS (camera at [2.74, 1.88, 5.68], grid cellSize 0.25 m).
// We convert cm → m at ingestion so every downstream system (geometry,
// skeleton overlay, gizmo positions, lift computation) works in meters.
//
// We compute a single Y-offset (`meshLiftY`) from the bind mesh's minimum Y
// and apply it as a GROUP transform in the Scene — NOT per-vertex in
// buildGeometry. This guarantees the mesh, deformed mesh, and skeleton
// overlay are ALL in the same lifted space, eliminating the edit-mode
// desync where the body detached from the joints.
//
// (Previously, only buildGeometry lifted the bind mesh, while deformed
// vertices and joints were copied verbatim — a three-way mismatch.)
const CM_TO_M = 0.01
const FLOOR_LIFT_Y = 0.02

/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
function computeMeshLiftY(meshData: SkinMeshData): number {
  // SOMA meshes are in cm; custom GLB meshes are already in meters.
  const isSoma = meshData.vertices.length === 18056
  const scale = isSoma ? CM_TO_M : 1.0
  let minY = Infinity
  for (const v of meshData.vertices) {
    const yMeters = v[1] * scale
    if (yMeters < minY) minY = yMeters
  }
  return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y
}

function buildGeometry(meshData: SkinMeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const verts = meshData.vertices
  const arr = new Float32Array(verts.length * 3)
  // SOMA meshes are in cm → convert to meters. Custom GLB meshes are
  // already in meters (glTF standard) — no conversion needed.
  const isSoma = verts.length === 18056
  const scale = isSoma ? CM_TO_M : 1.0
  for (let i = 0; i < verts.length; i++) {
    arr[i * 3] = verts[i][0] * scale
    arr[i * 3 + 1] = verts[i][1] * scale
    arr[i * 3 + 2] = verts[i][2] * scale
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3))
  const idx = meshData.faces.flat(2)
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ── SkinnedHumanoid ──────────────────────────────────────────────────────
function SkinnedHumanoid({
  meshData,
  deformedFlat,
  numVerts,
  frameIdx,
  frameIdxRef,
  showBindPose,
  opacity = 1.0,
  wireframe = false,
  color = "#98bdf7",
  animate = false,
}: {
  meshData: SkinMeshData
  deformedFlat: Float32Array | null
  numVerts: number
  frameIdx: number
  /** Ref-mirror of frameIdx, kept in sync by Scene on every render and
   *  advanced every rAF by AnimController during playback. When provided,
   *  per-frame uploads happen in useFrame (60fps, no React re-renders)
   *  instead of useEffect — eliminating the cascade of TextToPoseTab
   *  re-renders that froze the page on play. The useEffect still handles
   *  structural changes (deformedFlat swap, showBindPose toggle, mesh swap). */
  frameIdxRef?: React.MutableRefObject<number>
  showBindPose: boolean
  opacity?: number
  wireframe?: boolean
  color?: string
  /** When true (playback), skip computeVertexNormals — adjacent frames have
   *  near-identical normals (motion is smooth) and the recompute is ~5-15ms
   *  for the 36K-face SOMA mesh, which at 30fps ate 30-50% of the frame
   *  budget and froze the page. The effect recompiles the dep list, so the
   *  FIRST frame after animate goes false (pause) recomputes normals and
   *  restores accurate lighting on the held pose. */
  animate?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  // Build geometry once from bind mesh (raw — the lift is a group transform)
  const geo = useMemo(() => buildGeometry(meshData), [meshData])
  // Keep a Float32Array scratch buffer for frame uploads (avoids GC churn).
  const scratch = useMemo(() => new Float32Array(numVerts * 3), [numVerts])
  // Last frame idx uploaded to the GPU. Compared against frameIdxRef.current
  // in useFrame to skip redundant uploads when the idx hasn't changed (paused,
  // or rAF firing faster than playback fps).
  const lastUploadedIdx = useRef<number>(frameIdx)

  // Upload a frame's vertices into the geometry buffer. Shared by the
  // structural useEffect (initial / showBindPose / deformedFlat swap) and
  // the per-frame useFrame (playback + scrubbing). Returns the idx uploaded.
  const uploadFrame = useCallback((idx: number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const meshVertCount = meshData.vertices.length
    const canDeform = !showBindPose && !!deformedFlat && meshVertCount === numVerts
    if (!canDeform) {
      // Reset to bind pose. SOMA meshes are cm → m; GLB meshes are already m.
      const isSoma = meshVertCount === 18056
      const scale = isSoma ? CM_TO_M : 1.0
      const verts = meshData.vertices
      for (let i = 0; i < verts.length; i++) {
        arr[i * 3] = verts[i][0] * scale
        arr[i * 3 + 1] = verts[i][1] * scale
        arr[i * 3 + 2] = verts[i][2] * scale
      }
      lastUploadedIdx.current = -1  // bind pose — no frame idx
      pos.needsUpdate = true
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
      return -1
    }
    const stride = numVerts * 3
    const frameCount = deformedFlat.length / stride
    const clamped = Math.max(0, Math.min(idx, frameCount - 1))
    const base = clamped * stride
    // Deformed vertices arrive in cm (same as bind mesh). Convert to meters
    // so they match the scaled geometry buffer.
    const src = deformedFlat.subarray(base, base + stride)
    for (let i = 0; i < stride; i++) {
      scratch[i] = src[i] * CM_TO_M
    }
    arr.set(scratch, 0)
    pos.needsUpdate = true
    // computeVertexNormals is O(faces) — ~5-15ms for the SOMA mesh (36,108
    // faces). During playback (animate=true), adjacent frames have nearly
    // identical normals (smooth motion), so the recompute is wasted work
    // that ate 30-50% of the per-frame budget and froze the page on play.
    // Skip it while animating; the transition to animate=false fires the
    // structural effect below which recomputes once on the held frame.
    // Same for computeBoundingSphere — O(V) for 18K verts, the sphere
    // barely changes between adjacent smooth-motion frames and the mesh
    // is always on-screen in the card.
    if (!animate) {
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
    }
    lastUploadedIdx.current = clamped
    return clamped
  }, [geo, meshData.vertices, showBindPose, deformedFlat, numVerts, scratch, animate])

  // Structural upload — fires on bind-pose toggle, deformedFlat swap, mesh
  // change, or animate toggle (so pausing recomputes normals on the held
  // frame). The per-frame idx is NOT in deps — playback advances the idx via
  // frameIdxRef and useFrame reads it at 60fps without triggering React.
  useEffect(() => {
    const idx = frameIdxRef?.current ?? frameIdx
    uploadFrame(idx)
  }, [uploadFrame, frameIdx, frameIdxRef])

  // Per-frame upload — reads frameIdxRef (advanced by AnimController every
  // rAF during playback, or synced by Scene on scrub). Skips when the idx
  // hasn't changed (paused, or rAF firing faster than playback fps). This is
  // the heart of the playback-decoupling fix: 60fps mesh updates with ZERO
  // React re-renders vs the old path that fired setFrameIdx → TextToPoseTab
  // re-render → PoseViewer3D re-render → 5400 lines of JSX → freeze.
  useFrame(() => {
    if (!frameIdxRef) return  // legacy caller — useEffect path handles it
    const target = frameIdxRef.current
    if (target === lastUploadedIdx.current) return
    uploadFrame(target)
  })

  return (
    <mesh ref={meshRef} geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        flatShading={false}
        side={THREE.DoubleSide}
        transparent={opacity < 1.0}
        opacity={opacity}
        wireframe={wireframe}
      />
    </mesh>
  )
}

// ── SkeletonOverlay ─────────────────────────────────────────────────────
// Renders SOMA-77 joint spheres + bone lines on top of the mesh.
// Mirrors Kimodo's SkeletonMesh (viz/scene.py) — used in editing mode and
// for debugging the pose.
function SkeletonOverlay({
  jointsFlat,
  numJoints,
  frameIdx,
  jointColor = "#ffcc66",
  boneColor = "#ff8844",
}: {
  jointsFlat: Float32Array | null
  numJoints: number
  frameIdx: number
  jointColor?: string
  boneColor?: string
}) {
  const sphereRef = useRef<THREE.InstancedMesh>(null)
  const lineRef = useRef<THREE.LineSegments>(null)

  // Build geometry for bones once
  const boneGeo = useMemo(() => {
    const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6) // 2 verts × 3
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  // Update joint + bone positions when frame changes
  useEffect(() => {
    if (!jointsFlat) return
    const stride = numJoints * 3
    const frameCount = jointsFlat.length / stride
    const idx = Math.max(0, Math.min(frameIdx, frameCount - 1))
    const base = idx * stride

    // Update spheres via instanced matrix
    if (sphereRef.current) {
      const dummy = new THREE.Object3D()
      for (let j = 0; j < numJoints; j++) {
        dummy.position.set(
          jointsFlat[base + j * 3] * CM_TO_M,
          jointsFlat[base + j * 3 + 1] * CM_TO_M,
          jointsFlat[base + j * 3 + 2] * CM_TO_M,
        )
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        sphereRef.current.setMatrixAt(j, dummy.matrix)
      }
      sphereRef.current.instanceMatrix.needsUpdate = true
    }

    // Update bone line positions
    if (lineRef.current) {
      const pos = boneGeo.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [p, c] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jointsFlat[base + p * 3] * CM_TO_M
        arr[b * 6 + 1] = jointsFlat[base + p * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jointsFlat[base + p * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jointsFlat[base + c * 3] * CM_TO_M
        arr[b * 6 + 4] = jointsFlat[base + c * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jointsFlat[base + c * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      boneGeo.computeBoundingSphere()
    }
  }, [jointsFlat, numJoints, frameIdx, boneGeo])

  if (!jointsFlat) return null

  return (
    <group>
      <instancedMesh ref={sphereRef} args={[undefined, undefined, numJoints]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={jointColor} />
      </instancedMesh>
      <lineSegments ref={lineRef} geometry={boneGeo}>
        <lineBasicMaterial color={boneColor} transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}

// ── AnimController ──────────────────────────────────────────────────────
// Drives playback at the r3F frame rate (60fps) by advancing frameIdxRef
// every useFrame. The 3D mesh reads frameIdxRef in its own useFrame and
// uploads geometry at 60fps with ZERO React re-renders. setFrameIdx (the
// React state setter) is called THROTTLED at ~10fps purely for UI sync
// (timeline playhead + frame counter) — without throttling, every playback
// frame triggered a full TextToPoseTab re-render (5400+ lines of JSX) and
// froze the page ("Also freezed when I hit play as well").
function AnimController({
  frameCount,
  frameIdx,
  frameIdxRef,
  setFrameIdx,
  animate,
  enabled,
  fps = 30,
  speed = 1,
}: {
  frameCount: number
  frameIdx: number
  /** Mutable ref mirroring frameIdx. Advanced every rAF during playback so
   *  SkinnedHumanoid.useFrame can read it at 60fps without React re-renders. */
  frameIdxRef: React.MutableRefObject<number>
  setFrameIdx: (f: number) => void
  animate: boolean
  enabled: boolean
  fps?: number
  speed?: number
}): null {
  const timeRef = useRef(0)
  // UI-sync accumulator — flushes setFrameIdx every ~100ms so the timeline
  // playhead stays reasonably in sync without per-frame React renders.
  const uiAccumRef = useRef(0)
  // Last idx pushed to React state. Avoids redundant setFrameIdx calls when
  // the throttled UI sync fires between playback frames.
  const lastSyncedIdx = useRef<number>(frameIdx)

  useEffect(() => {
    if (animate) {
      timeRef.current = 0
      uiAccumRef.current = 0
    }
  }, [animate, frameCount])

  useFrame((_, delta) => {
    if (!animate || !enabled || frameCount < 2) return
    // ── Advance the ref (drives the mesh at 60fps, no React) ───────────
    timeRef.current += delta * speed
    const frameDelta = Math.floor(timeRef.current * fps)
    if (frameDelta > 0) {
      timeRef.current -= frameDelta / fps
      const newIdx = (frameIdxRef.current + frameDelta) % frameCount
      if (newIdx !== frameIdxRef.current) {
        frameIdxRef.current = newIdx
      }
    }
    // ── Throttled UI sync (~10fps — playhead + frame counter only) ─────
    // 100ms cadence is imperceptible for the playhead position but cuts
    // React re-renders 3-6× during playback (was 30-60/s, now 10/s).
    uiAccumRef.current += delta
    if (uiAccumRef.current >= 0.1) {
      uiAccumRef.current = 0
      const current = frameIdxRef.current
      if (current !== lastSyncedIdx.current) {
        lastSyncedIdx.current = current
        setFrameIdx(current)
      }
    }
  })

  return null
}

// ── InPlaceRootOffset helper ─────────────────────────────────────────────
// Computes the per-frame root XZ delta from frame 0 and returns the NEGATIVE
// delta so the Scene can apply it as a group offset, keeping the character
// anchored at origin during playback even when the motion has root
// translation (walking, running).
//
// Mirrors Kimodo's demo scene "in-place" button: the skeleton/mesh still
// performs the full motion (arm swings, leg cycles, etc.) but the root
// doesn't drift across the floor. This is a VIEWER-SIDE transform — it does
// NOT modify the underlying deformedFlat / jointsFlat data, so exporting
// the motion still produces the original root-translated trajectory.
//
// Root joint is SOMA-77 joint 0 (pelvis). Its XZ is at [0] and [2] in the
// flat per-frame array. The Y component is preserved (vertical motion is
// part of the action — jumping in place should still show Y bounce).
function useInPlaceOffset(
  soma77JointsFlat: Float32Array | null,
  numJoints: number,
  frameIdx: number,
  enabled: boolean,
): [number, number] {
  return useMemo(() => {
    if (!enabled || !soma77JointsFlat) return [0, 0]
    const stride = numJoints * 3
    const frameCount = Math.floor(soma77JointsFlat.length / stride)
    if (frameCount < 1) return [0, 0]
    const r0x = soma77JointsFlat[0]
    const r0z = soma77JointsFlat[2]
    const fi = Math.max(0, Math.min(frameIdx, frameCount - 1))
    const base = fi * stride
    return [(r0x - soma77JointsFlat[base]) * CM_TO_M, (r0z - soma77JointsFlat[base + 2]) * CM_TO_M]
  }, [soma77JointsFlat, numJoints, frameIdx, enabled])
}

// ── FootContactsOverlay ───────────────────────────────────────────────────
// Visualizes foot-contact probabilities (T, 4) as colored markers on the
// floor under each foot. Red = high contact probability, faint = no contact.
// Mirrors Kimodo's foot-contact visualization.
function FootContactsOverlay({
  footContacts,
  frameIdx,
  soma77JointsFlat,
}: {
  footContacts: number[][] | null
  frameIdx: number
  soma77JointsFlat: Float32Array | null
}) {
  const groupRef = useRef<THREE.Group>(null)

  if (!footContacts || footContacts.length === 0 || !soma77JointsFlat) return null
  const fi = Math.max(0, Math.min(frameIdx, footContacts.length - 1))
  const fc = footContacts[fi]  // [L_heel, R_heel, L_toe, R_toe]
  if (!fc || fc.length < 4) return null

  // Joint indices in SOMA-77: LeftFoot=69, RightFoot=74
  const stride = 77 * 3
  const frameCount = soma77JointsFlat.length / stride
  const idx = Math.max(0, Math.min(fi, frameCount - 1))
  const base = idx * stride
  const leftFoot: [number, number, number] = [
    soma77JointsFlat[base + 69 * 3] * CM_TO_M,
    soma77JointsFlat[base + 69 * 3 + 1] * CM_TO_M,
    soma77JointsFlat[base + 69 * 3 + 2] * CM_TO_M,
  ]
  const rightFoot: [number, number, number] = [
    soma77JointsFlat[base + 74 * 3] * CM_TO_M,
    soma77JointsFlat[base + 74 * 3 + 1] * CM_TO_M,
    soma77JointsFlat[base + 74 * 3 + 2] * CM_TO_M,
  ]

  const heels: { pos: [number, number, number]; contact: number; color: string }[] = [
    { pos: leftFoot, contact: fc[0], color: "#3b82f6" },
    { pos: rightFoot, contact: fc[1], color: "#ec4899" },
    { pos: leftFoot, contact: fc[2], color: "#a855f7" },
    { pos: rightFoot, contact: fc[3], color: "#ef4444" },
  ]

  return (
    <group ref={groupRef}>
      {heels.map((h, i) => {
        // Offset the markers slightly in z so they don't overlap
        const dz = (i < 2 ? -0.04 : 0.04)
        const opacity = 0.2 + h.contact * 0.8
        const radius = 0.04 + h.contact * 0.04
        return (
          <mesh key={i} position={[h.pos[0], 0.005, h.pos[2] + dz]}>
            <ringGeometry args={[radius * 0.7, radius, 16]} />
            <meshBasicMaterial color={h.color} transparent opacity={opacity} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

// ── StartingDirectionArrow ────────────────────────────────────────────────
// Shows an arrow on the floor indicating the motion's starting direction.
// Direction is inferred from the root joint (joint 0) movement between
// the first two frames.
function StartingDirectionArrow({
  soma77JointsFlat,
}: {
  soma77JointsFlat: Float32Array | null
}) {
  if (!soma77JointsFlat || soma77JointsFlat.length < 77 * 3 * 2) return null
  const stride = 77 * 3
  const frameCount = soma77JointsFlat.length / stride
  if (frameCount < 2) return null

  const r0: [number, number, number] = [
    soma77JointsFlat[0] * CM_TO_M, soma77JointsFlat[1] * CM_TO_M, soma77JointsFlat[2] * CM_TO_M,
  ]
  const step = Math.min(5, frameCount - 1)
  const r1: [number, number, number] = [
    soma77JointsFlat[step * stride] * CM_TO_M,
    soma77JointsFlat[step * stride + 1] * CM_TO_M,
    soma77JointsFlat[step * stride + 2] * CM_TO_M,
  ]
  const dx = r1[0] - r0[0]
  const dz = r1[2] - r0[2]
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.01) return null

  const angle = Math.atan2(dx, dz)
  // Arrow from r0 in the direction (dx, dz), on the floor plane
  const arrowLen = Math.min(0.8, len * 2 + 0.2)
  return (
    <group position={[r0[0], 0.01, r0[2]]} rotation={[0, angle, 0]}>
      {/* Shaft */}
      <mesh position={[0, 0, arrowLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, arrowLen, 8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
      </mesh>
      {/* Arrowhead */}
      <mesh position={[0, 0, arrowLen]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 12]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

// ── AltSampleMeshes ───────────────────────────────────────────────────────
// Renders alternate sample meshes (when num_samples > 1) as ghosted figures
// offset to the side. Clicking commits that sample.
const ALT_NUM_VERTS = 18056

function AltSampleMesh({
  verts,
  faces,
  offset,
  idx,
  onCommit,
}: {
  verts: Float32Array
  faces: number[][]
  offset: [number, number]
  idx: number
  onCommit: (idx: number) => void
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const arr = new Float32Array(verts)
    // Raw vertices — the lift is applied via the group transform in Scene.
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3))
    g.setIndex(faces.flat(2))
    g.computeVertexNormals()
    return g
  }, [verts, faces])

  return (
    <group position={[offset[0], 0, offset[1]]}>
      <mesh
        geometry={geo}
        onClick={(e) => { e.stopPropagation(); onCommit(idx) }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { document.body.style.cursor = "auto" }}
      >
        <meshStandardMaterial color="#a8a8a8" transparent opacity={0.45} roughness={0.7} />
      </mesh>
      {/* Click target hint */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#98bdf7" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function AltSampleMeshes({
  altSamples,
  meshData,
  onCommit,
}: {
  altSamples: { sample_idx: number; deformed_vertices_b64: string }[]
  meshData: SkinMeshData | null
  onCommit: (idx: number) => void
}) {
  // Decode each alt sample's deformed verts to get the first frame.
  // ASYNC: each sample's base64 is ~13MB (full motion); synchronous atob
  // froze the main thread for 500ms × N samples. Now uses native fetch
  // decode, loading samples one at a time and updating state as each
  // completes, so the UI stays responsive throughout.
  const [samples, setSamples] = useState<
    { idx: number; verts: Float32Array; sampleIdx: number }[]
  >([])

  useEffect(() => {
    if (!altSamples || altSamples.length === 0) {
      setSamples([])
      return
    }
    let cancelled = false
    const decoded: { idx: number; verts: Float32Array; sampleIdx: number }[] = []
    ;(async () => {
      for (let i = 0; i < altSamples.length; i++) {
        if (cancelled) return
        const s = altSamples[i]
        try {
          const res = await fetch(
            `data:application/octet-stream;base64,${s.deformed_vertices_b64}`,
          )
          if (cancelled) return
          const buf = await res.arrayBuffer()
          if (cancelled) return
          const flat = new Float32Array(buf)
          const frame0 = flat.subarray(0, ALT_NUM_VERTS * 3)
          decoded.push({
            idx: i + 1,
            verts: new Float32Array(frame0),
            sampleIdx: s.sample_idx,
          })
          if (!cancelled) setSamples([...decoded])
        } catch (e) {
          // NO SILENT SWALLOW — log so sample drops don't look like "no alts."
          console.error("[PoseViewer3D] alt-sample decode failed:", e)
        }
      }
    })()
    return () => { cancelled = true }
  }, [altSamples])

  if (!meshData || samples.length === 0) return null

  return (
    <group>
      {samples.map((s, i) => (
        <AltSampleMesh
          key={s.idx}
          verts={s.verts}
          faces={meshData.faces}
          offset={[1.2 + i * 0.6, -0.3]}
          idx={s.idx}
          onCommit={onCommit}
        />
      ))}
    </group>
  )
}

// ── ReferenceMesh (Kimodo-TO (c) phase 1 + 2 + 3) ──────────────────────────
// A second SOMAX mesh offset in XZ alongside the primary. Phase 1: frozen at
// a captured single-frame pose. Phase 2: full motion that plays back in sync
// with the primary timeline (frame-index locked, clamped to the reference's
// range). Phase 3: posable in parallel — when editRefMode is true the user
// drags joints inside the offset group and the mesh re-skins via the same
// deformSomaJoints path as the primary. Fetches its own bind mesh so the
// captured identity can differ from the primary's current identity.
export interface ReferenceMeshSpec {
  /** Deformed vertices as base64 float32. Either a single frame
   *  (NUM_VERTS * 3 floats, frameCount=1) OR a multi-frame stream
   *  (frameCount * NUM_VERTS * 3 floats, frameCount > 1). */
  deformedVerticesB64: string
  /** Number of frames encoded in deformedVerticesB64. 1 (default) = static
   *  snapshot. >1 = animated, plays in sync with the primary timeline. */
  frameCount?: number
  /** Reference fps — informational for now (frame-index sync, not time sync). */
  fps?: number
  /** Identity model used to fetch the matching bind-mesh topology. Captured
   *  at snapshot time so switching the primary's identity afterwards doesn't
   *  corrupt the reference (verts/topo stay aligned). */
  identityModel?: string
  identityCoeffs?: number[] | null
  localChanges?: Record<string, number> | null
  /** Community MakeHuman .target blends (Anny only) — captured alongside the
   *  snapshot so the reference's bind mesh fetch matches the character that
   *  was active when the snapshot was taken. */
  customTargets?: Record<string, number> | null
  /** XZ offset in world units. */
  offset: [number, number]
  opacity?: number
  color?: string
  // ── Phase 3: parallel posing ──
  /** SOMA-77 joint positions captured alongside the snapshot (flat 77×3,
   *  origin-aligned LOCAL frame — the XZ offset is applied by the parent
   *  group, so these are NOT world coords). Required to make the reference
   *  posable. Multi-frame references store joints for frame 0 only (posing
   *  is a single-frame operation for MVP). */
  joints?: number[] | null
  /** Live-edited joints when the user is posing the reference in parallel.
   *  Float32Array of 77×3, same origin-aligned local frame as `joints`.
   *  Null until the first joint move; the manipulator falls back to `joints`. */
  editedJoints?: Float32Array | null
  /** Re-skinned deformed verts produced by deformSomaJoints(editedJoints).
   *  When present, rendered INSTEAD of the original deformedVerticesB64 so
   *  the user sees their edits live. Single-frame (frameCount=1) regardless
   *  of the reference's original frame count — posing freezes the motion. */
  editedDeformedVerticesB64?: string | null
  /** Multi-frame SOMA-77 joint positions for SKELETON-ONLY playback (flat
   *  T×77×3). Loaded from corpus/CMU library clips, which carry joint
   *  positions but no pre-skinned mesh. When present and no mesh is
   *  available (empty deformedVerticesB64), the reference renders as an
   *  animated skeleton (bones + joints) indexed by playbackFrameIdx — no
   *  per-frame re-skinning needed, so loading is instant. */
  jointFrames?: number[] | null
}

function ReferenceMesh({
  spec,
  playbackFrameIdx = 0,
  primaryMeshLiftY = 0,
  // Phase 3: joint-editing pass-through. When editRefMode is true, a
  // JointManipulator is rendered INSIDE the offset group so its joint coords
  // stay origin-aligned (local) — exactly the frame deformSomaJoints expects
  // on re-skin. The gizmo appears at offset+local in world space, matching
  // the offset mesh.
  editRefMode = false,
  editableJoints,
  selectedJoint,
  onSelectJoint,
  onSelectChain,
  onJointMove,
  selectedChain,
  gizmoMode,
  kinematicMode,
  animate = false,
}: {
  spec: ReferenceMeshSpec
  /** Primary's current frame index — the reference follows it when animated. */
  playbackFrameIdx?: number
  /** Primary mesh's lift Y — used to compensate for being inside the primary's
   *  lift group. The reference computes its own liftY from its own meshData,
   *  then offsets by (refLiftY - primaryMeshLiftY) so the reference's feet
   *  land at the correct floor regardless of identity-model differences. */
  primaryMeshLiftY?: number
  editRefMode?: boolean
  editableJoints?: Float32Array | null
  selectedJoint?: number | null
  onSelectJoint?: (idx: number | null, additive?: boolean) => void
  onSelectChain?: (chain: number[] | null) => void
  onJointMove?: (e: JointMoveEvent) => void
  selectedChain?: number[] | null
  gizmoMode?: "rotate" | "translate"
  kinematicMode?: "fk" | "ik"
  /** Whether the primary timeline is animating — forwarded to the inner
   *  SkinnedHumanoid so it can skip computeVertexNormals during playback. */
  animate?: boolean
}) {
  const [meshData, setMeshData] = useState<SkinMeshData | null>(null)
  const [flat, setFlat] = useState<Float32Array | null>(null)
  // Re-skinned verts (phase 3). Decoded separately from the original so the
  // user can reset to the snapshot without re-fetching.
  const [editedFlat, setEditedFlat] = useState<Float32Array | null>(null)

  // Fetch this reference's own bind mesh (may differ from primary's identity).
  // The fetchBindMesh cache is keyed on identity + coeffs + localChanges +
  // customTargets, so if the reference matches the primary, this is a
  // synchronous cache hit.
  useEffect(() => {
    let cancel = false
    fetchBindMesh(spec.identityModel ?? "anny", spec.identityCoeffs, spec.localChanges, spec.customTargets)
      .then((d) => { if (!cancel) setMeshData(d) })
      .catch((e) => console.error("ReferenceMesh bind fetch failed:", e))
    return () => { cancel = true }
  }, [spec.identityModel, spec.identityCoeffs, spec.localChanges, spec.customTargets])

  // Decode the ORIGINAL deformed vertices (single- or multi-frame). Used as
  // fallback when no edit has been applied. ASYNC via fetch(data:...) so a
  // multi-frame base64 (~17MB for a 60-frame motion) doesn't freeze the main
  // thread for 500-800ms the way the previous atob + charCodeAt loop did
  // (same fix applied to the primary mesh's deformedVerticesB64 decode).
  // An empty deformedVerticesB64 means skeleton-only mode (library clip with
  // jointFrames but no mesh) — skip decoding entirely.
  useEffect(() => {
    if (!spec.deformedVerticesB64) { setFlat(null); return }
    let cancelled = false
    setFlat(null)
    ;(async () => {
      try {
        const res = await fetch(
          `data:application/octet-stream;base64,${spec.deformedVerticesB64}`,
        )
        if (cancelled) return
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setFlat(new Float32Array(buf))
      } catch (e) {
        if (!cancelled) {
          console.error("ReferenceMesh decode failed:", e)
          setFlat(null)
        }
      }
    })()
    return () => { cancelled = true }
  }, [spec.deformedVerticesB64])

  // Decode the EDITED deformed vertices (phase 3) when present. Single-frame,
  // small payload — but still async for consistency with the path above.
  useEffect(() => {
    if (!spec.editedDeformedVerticesB64) { setEditedFlat(null); return }
    let cancelled = false
    setEditedFlat(null)
    ;(async () => {
      try {
        const res = await fetch(
          `data:application/octet-stream;base64,${spec.editedDeformedVerticesB64}`,
        )
        if (cancelled) return
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setEditedFlat(new Float32Array(buf))
      } catch (e) {
        if (!cancelled) {
          console.error("ReferenceMesh edited decode failed:", e)
          setEditedFlat(null)
        }
      }
    })()
    return () => { cancelled = true }
  }, [spec.editedDeformedVerticesB64])

  // When editing, prefer the edited verts; fall back to the original capture.
  // Editing always produces a single-frame result, so refIdx is forced to 0
  // and refFrameCount is treated as 1.
  const hasEdited = !!spec.editedDeformedVerticesB64 && !!editedFlat && editedFlat.length >= 3
  const activeFlat = hasEdited ? editedFlat! : flat

  // Skeleton-only mode: library clip (corpus/CMU) loaded into reference B with
  // multi-frame joint positions but no pre-skinned mesh. We render an animated
  // SkeletonOverlay instead of SkinnedHumanoid — instant load, no per-frame
  // re-skinning. The primary stays generation-driven; B is the bone figure.
  const jointFramesFlat = useMemo(() => {
    if (!spec.jointFrames || spec.jointFrames.length < 3) return null
    return new Float32Array(spec.jointFrames)
  }, [spec.jointFrames])
  const isSkeletonOnly = !!jointFramesFlat && (!activeFlat || activeFlat.length < 3)

  // Compute the reference's own lift Y. Since this component is rendered
  // inside the PRIMARY's lift group, we subtract primaryMeshLiftY so the
  // reference mesh's feet land at the correct floor position regardless
  // of identity-model differences. NOTE: called unconditionally BEFORE any
  // early return — React's rules-of-hooks requires the same hook order on
  // every render, and the spec can transition between skeleton-only and
  // mesh modes (library clip → captured motion), which would otherwise flip
  // the hook count and throw "Rendered more hooks than during the previous
  // render." Returns 0 when there's no mesh (skeleton-only / not yet loaded).
  const refLiftDelta = useMemo(() => {
    if (!meshData) return 0
    return computeMeshLiftY(meshData) - primaryMeshLiftY
  }, [meshData, primaryMeshLiftY])

  if (isSkeletonOnly) {
    // No mesh to lift; the SkeletonOverlay already draws in SOMA-77 world units
    // (meters), which is the same coordinate space as the primary's lift group.
    const skelFrameCount = Math.max(1, Math.floor(jointFramesFlat!.length / (77 * 3)))
    const skelIdx = skelFrameCount > 1
      ? Math.max(0, Math.min(playbackFrameIdx, skelFrameCount - 1))
      : 0
    return (
      <group position={[spec.offset[0], 0, spec.offset[1]]}>
        <SkeletonOverlay
          jointsFlat={jointFramesFlat}
          numJoints={77}
          frameIdx={skelIdx}
          // Amber palette distinguishes the library-clip skeleton (B) from the
          // brand-blue primary mesh. Joints brighter than bones for readability.
          jointColor="#fbbf24"
          boneColor="#f59e0b"
        />
      </group>
    )
  }

  if (!meshData || !activeFlat || activeFlat.length < 3) return null

  const refFrameCount = hasEdited ? 1 : (spec.frameCount ?? 1)
  const numVerts = Math.floor(activeFlat.length / 3 / Math.max(1, refFrameCount))
  if (numVerts < 3) return null

  // Static (frameCount<=1, or editing) → always frame 0. Animated → follow
  // the primary's scrub position, clamped to the reference's range.
  const refIdx = refFrameCount > 1
    ? Math.max(0, Math.min(playbackFrameIdx, refFrameCount - 1))
    : 0

  return (
    <group position={[spec.offset[0], refLiftDelta, spec.offset[1]]}>
      <SkinnedHumanoid
        meshData={meshData}
        deformedFlat={activeFlat}
        numVerts={numVerts}
        frameIdx={refIdx}
        showBindPose={false}
        opacity={spec.opacity ?? 0.42}
        color={spec.color ?? "#9ca3af"}
        // Reference clip plays only when it has multiple frames AND the
        // primary timeline is animating — same skip-normal logic applies.
        animate={refFrameCount > 1 && animate}
      />
      {/* Phase 3: parallel posing. Render the JointManipulator INSIDE the
          offset group so joint coords stay origin-aligned (local). The gizmo
          appears at offset+local in world space, matching the mesh. Drag
          updates come back as local positions — exactly what deformSomaJoints
          expects on re-skin. */}
      {editRefMode && editableJoints && onJointMove && (
        <JointManipulator
          jointsFlat={editableJoints}
          // Unpassed (undefined) IS unselected: the manipulator's none
          // guard is `=== null`, and undefined would slip it into NaN
          // joint positions (gate-caught real bug, 2026-09-12).
          selectedJoint={selectedJoint ?? null}
          selectedChain={selectedChain}
          onSelectJoint={onSelectJoint ?? (() => {})}
          onSelectChain={onSelectChain}
          onJointMove={onJointMove}
          gizmoMode={gizmoMode}
          kinematicMode={kinematicMode}
        />
      )}
    </group>
  )
}

// ── ConstraintOverlays ────────────────────────────────────────────────────
// Renders root-2D markers (amber rings on the floor) and end-effector markers
// (per-limb colored spheres) for all currently-visible constraint points.
//
// Kimodo-TO method #1 (EE constraints as 3D locators): in edit mode, each EE
// sphere is draggable. Click to select → a translate gizmo appears → drag to
// position the target anywhere in 3D space. The constraint says "this limb
// reaches HERE at frame N"; Kimodo solves the chain during generation. No
// joint-by-joint posing required.
function ConstraintOverlays({
  root2dPoints, endEffectorPoints, showLabels,
  editMode = false,
  selectedEEId = null, onSelectEE, onChangeEEPoint,
}: {
  root2dPoints: { frame: number; x: number; z: number }[]
  endEffectorPoints: { id: string; frame: number; joint_name: string; position: [number, number, number] }[]
  showLabels: boolean
  editMode?: boolean
  selectedEEId?: string | null
  onSelectEE?: (id: string | null) => void
  onChangeEEPoint?: (id: string, position: [number, number, number]) => void
}) {
  const eeColor: Record<string, string> = {
    LeftHand: "#f59e0b", RightHand: "#ef4444",
    LeftFoot: "#10b981", RightFoot: "#3b82f6",
  }
  // Refs for each EE marker group — needed for TransformControls attachment.
  const eeRefs = useRef<(THREE.Group | null)[]>([])
  const [hoveredEE, setHoveredEE] = useState<string | null>(null)
  // Access OrbitControls so we can disable it during locator drag (otherwise
  // the camera rotates while the user is trying to position a target).
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null

  // Push the dragged group's world position back to parent state.
  const handleEEDrag = useCallback((id: string) => {
    if (!onChangeEEPoint) return
    const ref = eeRefs.current.find((_, i) => endEffectorPoints[i]?.id === id)
    if (!ref) return
    onChangeEEPoint(id, [ref.position.x, ref.position.y, ref.position.z])
  }, [endEffectorPoints, onChangeEEPoint])

  return (
    <group>
      {root2dPoints.map((p, i) => (
        <group key={`r2d-${i}`} position={[p.x, 0.005, p.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.025, 0.04, 24]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} side={2} />
          </mesh>
          {showLabels && (
            <Billboard position={[0, 0.08, 0]}>
              <Text fontSize={0.035} color="#fcd34d" anchorX="center" anchorY="middle">
                {`F${p.frame}`}
              </Text>
            </Billboard>
          )}
        </group>
      ))}
      {endEffectorPoints.map((p, i) => {
        const color = eeColor[p.joint_name] ?? "#ffffff"
        const isSelected = editMode && selectedEEId === p.id
        return (
        <group key={`ee-${p.id}`}>
          {/* Locator sphere — click to select in edit mode. Slightly larger
              when selected/hovered for visibility. */}
          <group ref={(el) => { eeRefs.current[i] = el }} position={p.position}>
            <mesh
              onClick={editMode && onSelectEE ? (e) => { e.stopPropagation(); onSelectEE(p.id) } : undefined}
              onPointerOver={editMode && onSelectEE ? (e) => {
                e.stopPropagation(); setHoveredEE(p.id); document.body.style.cursor = "move"
              } : undefined}
              onPointerOut={editMode ? () => {
                setHoveredEE(null); document.body.style.cursor = "auto"
              } : undefined}
            >
              <sphereGeometry args={[isSelected ? 0.034 : (hoveredEE === p.id ? 0.032 : 0.028), 16, 16]} />
              <meshBasicMaterial
                color={isSelected ? "#ffffff" : color}
                transparent
                opacity={isSelected ? 1.0 : 0.9}
              />
            </mesh>
            {/* Glow halo when selected/hovered for clear affordance */}
            {(isSelected || hoveredEE === p.id) && (
              <mesh>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.18} />
              </mesh>
            )}
            {showLabels && (
              <Billboard position={[0, 0.08, 0]}>
                <Text fontSize={0.03} color={isSelected ? "#ffffff" : color} anchorX="center" anchorY="middle">
                  {`${p.joint_name[0] ?? "E"}·F${p.frame}`}
                </Text>
              </Billboard>
            )}
          </group>

          {/* Translate gizmo on the selected EE locator (edit mode only).
              Dragging moves the target in 3D — Kimodo solves the chain at
              generation time, so the user positions the goal, not the joints. */}
          {isSelected && onChangeEEPoint && (
            <LiftAwareTransformControls
              object={eeRefs.current[i] as unknown as THREE.Object3D}
              mode="translate"
              size={0.7}
              onMouseDown={() => { if (controls) controls.enabled = false }}
              onChange={() => handleEEDrag(p.id)}
              onMouseUp={() => { if (controls) controls.enabled = true; handleEEDrag(p.id) }}
            />
          )}
        </group>
        )
      })}
    </group>
  )
}

// ── Scene ────────────────────────────────────────────────────────────────
// CameraRig — imperatively moves the camera + OrbitControls target when the
// cameraView prop changes. This is necessary because <Canvas camera={...}>
// only applies the position ON MOUNT; subsequent changes to the prop are
// ignored by R3F. Without this, the Demo/Front/Side/3-Q buttons do nothing.
// The Motion Card's 8 azimuth views (az-0…az-315, Blender convention:
// 0 = front / 90 = right) ride the same path — additive to the legacy 4.
function cameraPosFor(view: string): [number, number, number] {
  switch (view) {
    case "side": return [3.2, 1.2, 0.01]
    case "three-quarter": return [2.4, 1.4, 2.4]
    case "front": return [0, 1.2, 3.4]
    default:
      if (view.startsWith("az-")) return azimuthCameraPos(view as MotionAzimuth)
      return [2.74, 1.88, 5.68] // "demo"
  }
}

/** Camera framing (2026-08-15, the "not always zoomed out" ask; tightened
 *  same day after "way too zoomed out" for BOTH modes): the azimuth ring
 *  now frames snugly per mode instead of parking on the distant 3.4m ring.
 *  FOV is 45° (vertical), tan(22.5°) ≈ 0.414 — full at 2.6m covers ~2.25m
 *  (whole figure + headroom), upper at 1.25m covers ~1.05m (head→chest).
 *  Same azimuth, so the rotate arrows compose with it. Pure VIEW state:
 *  affects nothing but where the camera sits (never a param, never
 *  exported). */
export type CameraFraming = "full" | "upper"
const FRAMING: Record<CameraFraming, { dist: number; camY: number; targetY: number }> = {
  full: { dist: 2.6, camY: 1.15, targetY: 0.92 },
  upper: { dist: 1.25, camY: 1.5, targetY: 1.3 },
}
// Legacy fixed views (pose studio's front/side/demo) keep their own
// positions; "upper" just pulls them toward a chest-height target.
const LEGACY_TARGET_Y: Record<CameraFraming, number> = { full: 0.9, upper: 1.32 }
const LEGACY_DIST_SCALE: Record<CameraFraming, number> = { full: 1, upper: 0.5 }

/** cameraPosFor + framing → [camera position, target Y]. Azimuth views
 *  re-place the camera on the SAME azimuth at the framing's distance and
 *  height; legacy views scale toward the framed target. */
export function framedCameraPos(
  view: string, framing: CameraFraming,
): [[number, number, number], number] {
  const base = cameraPosFor(view)
  if (view.startsWith("az-")) {
    const angle = Math.atan2(base[0], base[2])
    const f = FRAMING[framing]
    return [[Math.sin(angle) * f.dist, f.camY, Math.cos(angle) * f.dist], f.targetY]
  }
  const ty = LEGACY_TARGET_Y[framing]
  const s = LEGACY_DIST_SCALE[framing]
  const dir: [number, number, number] = [base[0], base[1] - 0.9, base[2]]
  return [[dir[0] * s, ty + dir[1] * s, dir[2] * s], ty]
}

function CameraRig({ cameraView, framing }: { cameraView: string; framing: CameraFraming }): null {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3; update: () => void
  } | null
  useEffect(() => {
    const [pos, ty] = framedCameraPos(cameraView, framing)
    camera.position.set(pos[0], pos[1], pos[2])
    if (controls) {
      controls.target.set(0, ty, 0)
      controls.update()
    }
    camera.lookAt(0, ty, 0)
  }, [cameraView, framing, camera, controls])
  return null
}

function Scene({
  meshData, deformedFlat, numVerts, frameCount, frameIdx, setFrameIdx,
  animate, showBindPose, opacity, wireframe, color, fps,
  soma77JointsFlat, showSkeleton,
  editMode, editableJoints, selectedJoint, onSelectJoint, onJointMove,
  gizmoMode, lightingOrbs, onLightingOrbsChange, selectedOrb, onSelectOrb,
  selectedChain, onSelectChain, kinematicMode,
  ghostJoints,
  playbackSpeed, footContacts, showFootContacts, showStartingDirection,
  altSamples, onCommitSample,
  root2dPoints, endEffectorPoints, showConstraintLabels,
  selectedEEId, onSelectEE, onChangeEEPoint,
  placingEE, eePlaceJointIdx, onPlaceEE,
  cameraView,
  framing,
  referenceMesh,
  refPlaybackFrameIdx,
  editRefMode, refEditableJoints, onRefJointMove,
  inPlace,
}: {
  meshData: SkinMeshData
  deformedFlat: Float32Array | null
  numVerts: number
  frameCount: number
  frameIdx: number
  setFrameIdx: (f: number) => void
  animate: boolean
  showBindPose: boolean
  opacity: number
  wireframe: boolean
  color: string
  fps: number
  soma77JointsFlat: Float32Array | null
  showSkeleton: boolean
  editMode: boolean
  editableJoints: Float32Array | null
  selectedJoint: number | null
  onSelectJoint: (idx: number | null, additive?: boolean) => void
  onSelectChain?: (chain: number[] | null) => void
  onJointMove: (e: JointMoveEvent) => void
  selectedChain?: number[] | null
  kinematicMode?: "fk" | "ik"
  gizmoMode: "rotate" | "translate"
  lightingOrbs: LightingOrb[]
  onLightingOrbsChange: (orbs: LightingOrb[]) => void
  selectedOrb: string | null
  onSelectOrb: (id: string | null) => void
  ghostJoints: Float32Array | null
  playbackSpeed: number
  footContacts: number[][] | null
  showFootContacts: boolean
  showStartingDirection: boolean
  altSamples: { sample_idx: number; deformed_vertices_b64: string }[]
  onCommitSample: (idx: number) => void
  root2dPoints: { frame: number; x: number; z: number }[]
  endEffectorPoints: { id: string; frame: number; joint_name: string; position: [number, number, number] }[]
  showConstraintLabels: boolean
  selectedEEId?: string | null
  onSelectEE?: (id: string | null) => void
  onChangeEEPoint?: (id: string, position: [number, number, number]) => void
  placingEE: boolean
  eePlaceJointIdx: number
  onPlaceEE: (position: [number, number, number]) => void
  cameraView: string
  framing: CameraFraming
  referenceMesh?: ReferenceMeshSpec | null
  /** The reference's own playback frame — independent of the primary's
   *  frameIdx so two figures can play different clips at different timings. */
  refPlaybackFrameIdx?: number
  // ── Phase 3: parallel reference posing ──
  /** When true, the reference mesh shows a JointManipulator and joint moves
   *  route to onRefJointMove (separate from the primary's onJointMove). */
  editRefMode?: boolean
  /** The joints the reference is currently displaying (editedJoints or the
   *  snapshot fallback). Parent resolves this so the manipulator + gizmo
   *  stay in sync with the source-of-truth state. */
  refEditableJoints?: Float32Array | null
  onRefJointMove?: (e: JointMoveEvent) => void
  /** When true, viewer pins the root joint at origin during playback so the
   *  character animates in place (running, walking) without translating
   *  across the floor. Viewer-side only — doesn't modify the data. */
  inPlace?: boolean
}) {
  // ── Uniform Y-offset for all 3D content ──────────────────────────────
  // The backend returns mesh vertices, deformed vertices, and joint positions
  // all in the SAME raw coordinate space. We compute a single lift offset
  // from the bind mesh's minimum Y and apply it as a GROUP transform wrapping
  // ALL 3D content (mesh + skeleton + joints + overlays). This guarantees:
  //
  //   1. Bind mesh, deformed mesh, and joints are ALWAYS co-registered.
  //   2. Entering edit mode doesn't shift the mesh (same group for both).
  //   3. Joint manipulations produce raw-space positions (the group handles
  //      the visual offset, so onJointMove receives unlifted coordinates).
  //
  // The floor grid, contact shadows, and lights stay OUTSIDE the group.
  const meshLiftY = useMemo(() => computeMeshLiftY(meshData), [meshData])

  // ── Playback-decoupling ref ───────────────────────────────────────────
  // Mirror of frameIdx that AnimController advances every rAF and
  // SkinnedHumanoid reads in useFrame. Synced here on every render so
  // external frameIdx changes (timeline scrub, generate result, frame
  // buttons) propagate to the ref — then AnimController's rAF loop takes
  // over during playback. Without this, every playback frame triggered
  // setFrameIdx → TextToPoseTab re-render (5400 lines) → freeze. Now the
  // mesh plays at 60fps via useFrame and React state updates at ~10fps.
  const frameIdxRef = useRef<number>(frameIdx)
  frameIdxRef.current = frameIdx

  // In-place offset: when inPlace is true, compute the root joint's XZ
  // delta from frame 0 and apply the negative as a group offset so the
  // character stays anchored at origin during playback (item g).
  const [inPlaceX, inPlaceZ] = useInPlaceOffset(
    soma77JointsFlat, 77, frameIdx, !!inPlace && !showBindPose,
  )

  return (
    <>
      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.1}
        minDistance={0.8}
        maxDistance={12}
        maxPolarAngle={Math.PI / 1.85}
        // makeDefault registers this as the scene's default controls so
        // TransformControls (lights + joints) auto-disable it during gizmo
        // drag, AND so useThree((s) => s.controls) resolves to this instance.
      />
      <CameraRig cameraView={cameraView} framing={framing} />
      <AnimController
        frameCount={frameCount}
        frameIdx={frameIdx}
        frameIdxRef={frameIdxRef}
        setFrameIdx={setFrameIdx}
        animate={animate}
        enabled={!showBindPose && !editMode}
        fps={fps}
        speed={playbackSpeed}
      />
      {/* When user lighting orbs are active, drop the default rig so the orbs
          actually drive the scene (otherwise the key/fill/ambient wash them out). */}
      {(() => {
        const hasOrbs = lightingOrbs.length > 0
        return (
          <>
            <ambientLight intensity={hasOrbs ? 0.06 : (editMode ? 0.25 : 0.45)} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={hasOrbs ? 0.0 : 1.0}
              castShadow={!hasOrbs}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-3}
              shadow-camera-right={3}
              shadow-camera-top={3}
              shadow-camera-bottom={-3}
              shadow-camera-near={0.5}
              shadow-camera-far={20}
              shadow-bias={-0.0005}
            />
            <directionalLight position={[-4, 3, -2]} intensity={hasOrbs ? 0.0 : 0.25} />
            <hemisphereLight args={["#cdd6f4", "#1a1a2e", hasOrbs ? 0.08 : 0.35]} />
          </>
        )
      })()}

      {/* Lighting orbs — user-placed point lights */}
      {lightingOrbs.length > 0 && (
        <LightingOrbs
          orbs={lightingOrbs}
          onChange={onLightingOrbsChange}
          selectedOrb={selectedOrb}
          onSelectOrb={onSelectOrb}
        />
      )}

      {/* Contact shadow under the figure — disabled when orbs are active (it is
          keyed to the default sun direction and would look wrong under orb light). */}
      <ContactShadows
        position={[0, 0.001, 0]}
        scale={6}
        far={3}
        blur={2.5}
        opacity={lightingOrbs.length > 0 ? 0.0 : 0.55}
        resolution={1024}
        color="#000000"
      />

      {/* Infinite grid floor — matches Kimodo's viser theme */}
      <Grid
        position={[0, 0, 0]}
        args={[12, 12]}
        cellSize={0.25}
        cellThickness={0.5}
        cellColor="#3a3a5a"
        sectionSize={1}
        sectionThickness={1.0}
        sectionColor="#5a5a8a"
        fadeDistance={14}
        fadeStrength={1.2}
        infiniteGrid
      />

      {/* ── Lifted content group ─────────────────────────────────────────
          ALL 3D content that displays mesh vertices or joint positions is
          wrapped in a single group translated by meshLiftY. This guarantees
          the bind mesh, deformed mesh, skeleton overlay, joint manipulator,
          and all constraint overlays share the SAME coordinate space.

          Proof of correctness:
          - Bind mesh vertices: raw → group adds liftY → visual = raw + liftY
          - Deformed vertices: raw → group adds liftY → visual = raw + liftY
          - Joint positions: raw → group adds liftY → visual = raw + liftY
          - JointManipulator gizmo: set to raw LOCAL position → group converts
            to world (raw + liftY). Drag produces LOCAL (raw) positions →
            sent to parent as raw → deformSomaJoints receives raw ✓
          - Entering edit mode: mesh stays in the SAME group (no jump) ✓ */}
      <group position={[inPlaceX, meshLiftY, inPlaceZ]}>

      <SkinnedHumanoid
        meshData={meshData}
        deformedFlat={deformedFlat}
        numVerts={numVerts}
        frameIdx={frameIdx}
        frameIdxRef={frameIdxRef}
        showBindPose={showBindPose}
        opacity={editMode ? Math.min(opacity, 0.85) : opacity}
        wireframe={wireframe}
        color={color}
        animate={animate}
      />

      {/* Reference mesh — frozen posed snapshot OR full motion playing
          independently from the primary timeline (its own clip at a time
          offset). Self-contained: fetches its own bind mesh so it can
          outlive changes to the primary's identity. */}
      {referenceMesh && (
        <ReferenceMesh
          spec={referenceMesh}
          playbackFrameIdx={refPlaybackFrameIdx ?? frameIdx}
          primaryMeshLiftY={meshLiftY}
          editRefMode={editRefMode}
          editableJoints={refEditableJoints}
          selectedJoint={selectedJoint}
          onSelectJoint={onSelectJoint}
          onSelectChain={onSelectChain}
          onJointMove={onRefJointMove}
          selectedChain={selectedChain}
          gizmoMode={gizmoMode}
          kinematicMode={kinematicMode}
          animate={animate}
        />
      )}

      {/* Foot contacts overlay (Kimodo Visualize parity) */}
      {showFootContacts && !editMode && (
        <FootContactsOverlay
          footContacts={footContacts}
          frameIdx={frameIdx}
          soma77JointsFlat={soma77JointsFlat}
        />
      )}

      {/* Starting direction arrow (Kimodo Visualize parity) */}
      {showStartingDirection && !editMode && (
        <StartingDirectionArrow soma77JointsFlat={soma77JointsFlat} />
      )}

      {/* Constraint overlays — root-2D rings + end-effector markers.
          In edit mode, EE markers become draggable 3D locators (Kimodo-TO
          method #1): click to select, drag the translate gizmo to set the
          target position; Kimodo solves the chain at generation time. */}
      {(root2dPoints.length > 0 || endEffectorPoints.length > 0) && (
        <ConstraintOverlays
          root2dPoints={root2dPoints}
          endEffectorPoints={endEffectorPoints}
          showLabels={showConstraintLabels}
          editMode={editMode}
          selectedEEId={selectedEEId ?? null}
          onSelectEE={onSelectEE}
          onChangeEEPoint={onChangeEEPoint}
        />
      )}

      {/* Alternate sample meshes — click to commit (Kimodo multi-sample parity) */}
      {altSamples.length > 0 && (
        <AltSampleMeshes
          altSamples={altSamples}
          meshData={meshData}
          onCommit={onCommitSample}
        />
      )}

      {/* Onion-skin ghost of nearby keyframe */}
      {ghostJoints && <KeyframeGhost joints={ghostJoints} />}

      {/* Skeleton overlay — display-only mode. When a kept pose is active
          (!editMode but editableJoints survived exitEditMode(true)), show its
          bones so the skeleton matches the kept mesh instead of the underlying
          motion. editableJoints is single-frame (77×3) so SkeletonOverlay
          always reads frame 0 regardless of frameIdx — matching the single-
          frame kept mesh. */}
      {showSkeleton && !editMode && (
        <SkeletonOverlay
          jointsFlat={editableJoints ?? soma77JointsFlat}
          numJoints={77}
          frameIdx={frameIdx}
        />
      )}

      {/* Interactive joint manipulation — primary edit mode. Suppressed when
          editRefMode is on (Phase 3) so the user is unambiguously editing
          character B; the reference's manipulator renders inside ReferenceMesh. */}
      {editMode && !editRefMode && editableJoints && (
        <JointManipulator
          jointsFlat={editableJoints}
          selectedJoint={selectedJoint}
          selectedChain={selectedChain}
          onSelectJoint={onSelectJoint}
          onSelectChain={onSelectChain}
          onJointMove={onJointMove}
          gizmoMode={gizmoMode}
          kinematicMode={kinematicMode}
        />
      )}

      {/* ── EE 3D locator placement plane (method #1: no-pose-required) ──
          When placingEE is true, an invisible horizontal plane at the target
          joint's current height captures click events. The intersection point
          is sent back to the parent as a [x, y, z] world position, which
          creates an EndEffectorPoint at that 3D location. */}
      {placingEE && (() => {
        const ji = eePlaceJointIdx ?? 0
        const y = editableJoints ? editableJoints[ji * 3 + 1] * CM_TO_M
          : soma77JointsFlat ? soma77JointsFlat[(frameIdx * 77 + ji) * 3 + 1] * CM_TO_M
          : 1.0
        return (
          <mesh
            position={[0, y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={(e) => { e.stopPropagation(); onPlaceEE([e.point.x, y, e.point.z]) }}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )
      })()}

      </group>
    </>
  )
}

// ── Main component ──────────────────────────────────────────────────────
export interface PoseViewer3DProps {
  /** Pre-computed deformed vertices — base64-encoded float32 binary (T, V, 3). */
  deformedVerticesB64?: string | null
  /** Pre-computed deformed vertices as a raw Float32Array (T, V, 3) IN CM.
   *  When provided, this is used DIRECTLY — no base64 encode/decode roundtrip.
   *  The motion card passes the full-motion LBS result here (up to 32MB) to
   *  avoid the ~500ms synchronous encode + async decode of the b64 path.
   *  Ignored when `editedDeformedB64` is set (edit override wins). */
  deformedVertsDirect?: Float32Array | null
  frameIdx: number
  onFrameChange?: (f: number) => void
  animate?: boolean
  cameraView?: "front" | "side" | "three-quarter" | "demo" | MotionAzimuth
  /** Camera framing: "full" (whole figure) or "upper" (half-body — closer,
   *  chest-height target, same azimuth). View state only. */
  cameraFraming?: CameraFraming
  height?: string
  opacity?: number
  wireframe?: boolean
  color?: string
  fps?: number
  forceBindPose?: boolean
  soma77Joints?: [number, number, number][][] | null
  /** Pre-flattened soma77 joints as a Float32Array (T × 77 × 3). When
   *  provided, skips the nested→flat conversion in the flatten memo — avoids
   *  11,550 small array allocations + GC pressure per generation. */
  soma77JointsFlat?: Float32Array | null
  showSkeleton?: boolean
  // ── Edit mode (interactive skeleton manipulation) ──
  editMode?: boolean
  /** Editable joint positions for the current frame (77 × 3 Float32Array). */
  editableJoints?: Float32Array | null
  selectedJoint?: number | null
  onSelectJoint?: (idx: number | null, additive?: boolean) => void
  onSelectChain?: (chain: number[] | null) => void
  onJointMove?: (e: JointMoveEvent) => void
  selectedChain?: number[] | null
  /** "fk" = forward kinematics, "ik" = inverse kinematics (CCD). */
  kinematicMode?: "fk" | "ik"
  gizmoMode?: "rotate" | "translate"
  /** Override deformed vertices (used during edit mode re-skinning). */
  editedDeformedB64?: string | null
  // ── Lighting ──
  lightingOrbs?: LightingOrb[]
  onLightingOrbsChange?: (orbs: LightingOrb[]) => void
  selectedOrb?: string | null
  onSelectOrb?: (id: string | null) => void
  // ── Keyframe onion-skin ──
  ghostJoints?: Float32Array | null
  // ── Visualization (Kimodo Visualize tab parity) ──
  cameraFov?: number
  darkMode?: boolean
  playbackSpeed?: number
  /** Mesh identity: "soma" | "mhr" | "anny". Triggers a bind-mesh refetch. */
  identityModel?: string
  /** Identity coefficients for body-shape morphing (MHR: 45 PCA, Anny: 11
   *  phenotype). When present, the viewer POSTs to /poser/skin/mesh for a
   *  shaped bind mesh instead of the default GET. */
  identityCoeffs?: number[] | null
  /** Anny-only detail morphs: sparse {label: value} for the 139 local-change
   *  blendshapes. Included in the POST body so the bind mesh reflects them. */
  localChanges?: Record<string, number> | null
  /** Anny-only community MakeHuman .target blends (e.g. anime_stylized_enhanced).
   *  Same role as localChanges — included in the POST so the bind mesh reflects
   *  the loaded character's full identity spec, not just the phenotype sliders. */
  customTargets?: Record<string, number> | null
  footContacts?: number[][] | null
  showFootContacts?: boolean
  showStartingDirection?: boolean
  // ── Multi-sample (Kimodo parity) ──
  altSamples?: { sample_idx: number; deformed_vertices_b64: string }[]
  onCommitSample?: (idx: number) => void
  // ── Constraint overlay data (Kimodo parity) ──
  root2dPoints?: { frame: number; x: number; z: number }[]
  endEffectorPoints?: { id: string; frame: number; joint_name: string; position: [number, number, number] }[]
  showConstraintLabels?: boolean
  // ── EE locator drag (Kimodo-TO method #1: EE constraints as 3D locators) ──
  // When editMode is on, the user can click an EE marker to select it, then
  // drag a translate gizmo to reposition the target. onSelectEE captures the
  // selection; onChangeEEPoint commits the dragged position back to state.
  selectedEEId?: string | null
  onSelectEE?: (id: string | null) => void
  onChangeEEPoint?: (id: string, position: [number, number, number]) => void
  // ── EE placement mode (method #1: click in viewport to place locator) ──
  // When true, clicking anywhere in the viewport places an EE constraint
  // at the clicked 3D position for the limb tracked by eePlaceJointIdx.
  placingEE?: boolean
  /** SOMA-77 index of the target joint (for computing the click-plane height). */
  eePlaceJointIdx?: number
  onPlaceEE?: (position: [number, number, number]) => void
  // ── Reference mesh (Kimodo-TO (c) phase 1 / 2 / 3) ──
  /** A second SOMAX mesh frozen at a captured pose, offset in XZ. Pass null
   *  to hide. The spec captures identity at snapshot time so it stays
   *  self-contained when the primary's identity changes. */
  referenceMesh?: ReferenceMeshSpec | null
  /** The reference mesh's own playback frame index — INDEPENDENT of the
   *  primary's frameIdx. When omitted, falls back to the primary frame so
   *  the legacy synced-playback behaviour is preserved. The parent derives
   *  this from a master timeline + per-track time offset so two figures can
   *  carry different clips (e.g. a sword swing + a fall) with adjustable
   *  timing. */
  refPlaybackFrameIdx?: number
  // ── Phase 3: parallel reference posing ──
  /** When true, render a JointManipulator inside the reference's offset group
   *  and route joint drags to onRefJointMove (separate from the primary). */
  editRefMode?: boolean
  /** The reference's current joints (editedJoints or snapshot fallback). */
  refEditableJoints?: Float32Array | null
  onRefJointMove?: (e: JointMoveEvent) => void
  /** Exposes the live WebGL canvas element (for screenshot capture). */
  onCanvasReady?: (el: HTMLCanvasElement | null) => void
  /** Exposes {gl, scene, camera} for depth/normal/canny/openpose capture. */
  threeCtxRef?: React.MutableRefObject<{ gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera } | null>
  /**
   * In-place motion toggle (item g): when true, the viewer pins the root
   * joint at origin during playback so the character animates in place
   * (running, walking) without translating across the floor. Viewer-side
   * only — does NOT modify the underlying motion data or exports.
   *
   * Mirrors Kimodo's demo scene "in-place" button.
   */
  inPlace?: boolean
  /**
   * Custom bind mesh override (item d). When provided, the viewer uses
   * this mesh data instead of fetching from /poser/skin/mesh. The mesh
   * MUST have SOMA-77-compatible topology (18056 verts + matching face
   * indices) for the LBS skinning to produce correct deformations.
   * The CustomMeshLoader component validates the vertex count before
   * passing data through.
   */
  customBindMesh?: SkinMeshData | null
}

// Keeps a ref pointing at the live Three.js primitives so callers can do
// off-screen render passes (depth, normal, canny, openpose) without needing
// a separate React state cycle.
function ThreeCtxSync({
  ctxRef,
}: {
  ctxRef: React.MutableRefObject<{ gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera } | null>
}): null {
  const gl = useThree((s) => s.gl) as THREE.WebGLRenderer
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  ctxRef.current = { gl, scene, camera }
  return null
}

const NUM_VERTS = 18056

// ── PoseViewer3D (memoized) ──────────────────────────────────────────────
// Wrapped in React.memo so typing in the prompt bar, dragging sliders in
// unrelated dialogs, or any other state change in TextToPoseTab that does
// NOT affect PoseViewer3D's actual props no longer re-renders the 3D scene.
// Pre-memo, every keystroke in the bottom PromptBubbleBar fired a full
// TextToPoseTab re-render that cascaded into PoseViewer3D (heavy: Canvas,
// WebGL, all the overlays) and froze the page ("WHen I try to type in the
// bottom bar, it all freezes"). Memo shallow-compares props; if nothing
// PoseViewer3D cares about changed, the subtree is skipped entirely.
//
// The default shallow comparator is correct here: callbacks from
// TextToPoseTab are expected to be useCallback-stable; arrays/objects are
// either stable refs from useMemo or values that change semantically (and
// SHOULD trigger a re-render). frameIdx changes during playback are now
// throttled to ~10fps by AnimController (was 30-60fps), so memo re-renders
// during playback are bounded.
function PoseViewer3DImpl({
  deformedVerticesB64,
  deformedVertsDirect,
  frameIdx,
  onFrameChange,
  animate = false,
  cameraView = "demo",
  cameraFraming = "full",
  height = "100%",
  opacity = 1.0,
  wireframe = false,
  color = "#98bdf7",
  fps = 30,
  forceBindPose = false,
  soma77Joints = null,
  soma77JointsFlat: soma77JointsFlatProp = null,
  showSkeleton = false,
  editMode = false,
  editableJoints = null,
  selectedJoint = null,
  onSelectJoint,
  onSelectChain,
  onJointMove,
  selectedChain = null,
  kinematicMode = "fk",
  gizmoMode = "rotate",
  editedDeformedB64 = null,
  lightingOrbs = [],
  onLightingOrbsChange,
  selectedOrb = null,
  onSelectOrb,
  ghostJoints = null,
  cameraFov = 45,
  darkMode = true,
  playbackSpeed = 1,
  // Mesh identity: "anny" (default) | "mhr" | "soma" (legacy). Refetches
  // the bind mesh (different face topology) when this changes.
  identityModel = "anny",
  identityCoeffs = null,
  localChanges = null,
  customTargets = null,
  footContacts = null,
  showFootContacts = false,
  showStartingDirection = false,
  altSamples = [],
  onCommitSample = () => {},
  root2dPoints = [],
  endEffectorPoints = [],
  showConstraintLabels = true,
  selectedEEId = null,
  onSelectEE,
  onChangeEEPoint,
  placingEE = false,
  eePlaceJointIdx,
  onPlaceEE,
  referenceMesh = null,
  refPlaybackFrameIdx,
  editRefMode = false,
  refEditableJoints,
  onRefJointMove,
  onCanvasReady,
  threeCtxRef,
  inPlace = false,
  customBindMesh = null,
}: PoseViewer3DProps) {
  const [meshData, setMeshData] = useState<SkinMeshData | null>(null)
  const [meshLoading, setMeshLoading] = useState(true)
  const [meshError, setMeshError] = useState<string | null>(null)
  const [deformedFlat, setDeformedFlat] = useState<Float32Array | null>(null)

  // Flatten soma77Joints into a Float32Array for the skeleton overlay.
  // When the caller passes soma77JointsFlat (pre-computed), use it directly
  // — avoids the 11,550 small-array allocation + immediate flatten.
  const soma77JointsFlat = useMemo(() => {
    if (soma77JointsFlatProp) return soma77JointsFlatProp
    if (!soma77Joints || soma77Joints.length === 0) return null
    const T = soma77Joints.length
    const flat = new Float32Array(T * 77 * 3)
    for (let f = 0; f < T; f++) {
      const frame = soma77Joints[f]
      if (!frame || frame.length < 77) continue
      for (let j = 0; j < 77; j++) {
        const ji = (f * 77 + j) * 3
        flat[ji] = frame[j][0]
        flat[ji + 1] = frame[j][1]
        flat[ji + 2] = frame[j][2]
      }
    }
    return flat
  }, [soma77Joints, soma77JointsFlatProp])

  // Fetch bind mesh on mount AND when the identity mesh, coefficients, or
  // detail morphs change. soma/mhr/anny have different face topologies on the
  // same 18056-vertex layout; custom coefficients produce a shaped variant of
  // the bind mesh. Debounced so rapid slider movement in the BodyShapeDialog
  // doesn't spam the server (each POST is ~30 ms but we batch consecutive
  // changes).
  const coeffsKey = identityCoeffs && identityCoeffs.length > 0
    ? identityCoeffs.map(v => v.toFixed(1)).join(",")
    : ""
  // Detail-morph cache key: sorted label=value pairs, rounded to 0.05.
  const localChangesKey = localChanges && Object.keys(localChanges).length > 0
    ? Object.entries(localChanges)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",")
    : ""
  // Custom .target blends cache key — same shape as localChangesKey so a
  // character with customTargets set is refetched when the user picks a
  // different character (or clears back to neutral).
  const customTargetsKey = customTargets && Object.keys(customTargets).length > 0
    ? Object.entries(customTargets)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",")
    : ""
  useEffect(() => {
    // Custom mesh override (item d): if the user loaded a GLB, use it
    // directly instead of fetching from /poser/skin/mesh. The override
    // bypasses the debounce since it's already in-memory data.
    if (customBindMesh) {
      setMeshData(customBindMesh)
      setMeshLoading(false)
      setMeshError(null)
      return
    }
    let cancel = false
    setMeshLoading(true)
    setMeshError(null)
    const timer = setTimeout(() => {
      fetchBindMesh(identityModel, identityCoeffs, localChanges, customTargets)
        .then((d) => { if (!cancel) { setMeshData(d); setMeshLoading(false) } })
        .catch((e) => { if (!cancel) { setMeshError((e as Error).message); setMeshLoading(false) } })
    }, 60) // 60 ms debounce — coalesce rapid slider drags into one fetch
    return () => { cancel = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityModel, coeffsKey, localChangesKey, customTargetsKey, customBindMesh])

  // Decode deformed_vertices_b64 → Float32Array ONCE (no nested array build).
  // A sculpted pose (editedDeformedB64) takes priority whenever it is present —
  // both DURING edit mode AND after "Done ✓" (keepPose) exits edit mode. The
  // previous logic (editMode ? edited ?? orig : orig) discarded the kept sculpt
  // the instant editMode went false, reverting to the source frame / T-pose —
  // the "keep reverts to T-pose" bug. Now the kept-pose indicator UI (Resume /
  // Revert in TextToPoseTab) is what clears editedDeformedB64 via
  // exitEditMode(false) when the user wants the original motion back.
  //
  // ASYNC DECODE: For 60 frames × 18056 verts × 3 floats × 4 bytes = ~13MB,
  // the old atob() + char-code loop froze the main thread for 500-800ms —
  // the "weird lag state after generation" bug. Using fetch(data:) offloads
  // base64 decode to the browser's native networking stack (optimised C++),
  // which is both faster AND non-blocking.
  const activeB64 = editedDeformedB64 ?? deformedVerticesB64
  useEffect(() => {
    // Direct Float32Array path — skip the base64 encode/decode roundtrip
    // entirely. The motion card passes pre-deformed verts (cm) directly;
    // this avoids the ~300ms synchronous vertsToB64 + ~200ms async decode
    // for the full motion (up to 32MB). Only used when no edit override
    // is active (edits are small single-frame b64 payloads — fast).
    if (deformedVertsDirect && !editedDeformedB64) {
      setDeformedFlat(deformedVertsDirect)
      return
    }
    if (!activeB64) {
      setDeformedFlat(null)
      return
    }
    let cancelled = false
    setDeformedFlat(null) // clear immediately so old data doesn't flash
    ;(async () => {
      try {
        const res = await fetch(
          `data:application/octet-stream;base64,${activeB64}`,
        )
        if (cancelled) return
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setDeformedFlat(new Float32Array(buf))
      } catch (e) {
        if (!cancelled)
          console.error("Failed to decode deformed_vertices_b64:", e)
        // Fallback: synchronous decode (small payloads only — single-frame
        // edits). This path is ~0.2ms for 1 frame so the freeze is negligible.
        try {
          const binary = atob(activeB64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          if (!cancelled) setDeformedFlat(new Float32Array(bytes.buffer))
        } catch (e2) {
          if (!cancelled) {
            console.error("Fallback decode also failed:", e2)
            setDeformedFlat(null)
          }
        }
      }
    })()
    return () => { cancelled = true }
  }, [activeB64, deformedVertsDirect, editedDeformedB64])

  const hasDeformed = !!deformedFlat && deformedFlat.length >= NUM_VERTS * 3
  const computedFrameCount = hasDeformed
    ? Math.floor(deformedFlat!.length / (NUM_VERTS * 3))
    : 0

  const showBindPose = forceBindPose || !hasDeformed || !meshData

  const cameraPos: [number, number, number] = useMemo(
    () => framedCameraPos(cameraView, cameraFraming)[0],
    [cameraView, cameraFraming],
  )

  if (meshLoading)
    return (
      <div className={styles.loadingBox} style={{ height }}>
        <Loader2 className={styles.loadingIcon} />
        <span className={styles.loadingLabel}>Loading mesh…</span>
      </div>
    )
  if (meshError)
    return <div className={styles.errorBox} style={{ height }}>Mesh error: {meshError}</div>

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: cameraPos, fov: cameraFov, near: 0.05, far: 100 }}
        // 'percentage' (PCFShadowMap) instead of the default 'soft'
        // (PCFSoftShadowMap) — three r184 deprecated PCFSoftShadowMap and
        // emits "WebGLShadowMap: PCFSoftShadowMap has been deprecated.
        // Using PCFShadowMap anyway." on every Canvas mount. PCFShadowMap
        // is now the recommended soft-shadow type and produces equivalent
        // quality after the r155 shadow refactor.
        shadows="percentage"
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(darkMode ? "#0e0e1a" : "#e4e4f0"))
          onCanvasReady?.(gl.domElement)
        }}
      >
        {threeCtxRef && <ThreeCtxSync ctxRef={threeCtxRef} />}
        <Scene
          meshData={meshData!}
          deformedFlat={hasDeformed ? deformedFlat : null}
          numVerts={NUM_VERTS}
          frameCount={computedFrameCount || 1}
          frameIdx={frameIdx}
          setFrameIdx={onFrameChange ?? (() => {})}
          animate={animate}
          showBindPose={showBindPose}
          opacity={opacity}
          wireframe={wireframe}
          color={color}
          fps={fps}
          soma77JointsFlat={soma77JointsFlat}
          showSkeleton={showSkeleton}
          editMode={editMode}
          editableJoints={editableJoints}
          selectedJoint={selectedJoint}
          onSelectJoint={onSelectJoint ?? (() => {})}
          onSelectChain={onSelectChain}
          onJointMove={onJointMove ?? (() => {})}
          selectedChain={selectedChain}
          kinematicMode={kinematicMode}
          gizmoMode={gizmoMode}
          lightingOrbs={lightingOrbs}
          onLightingOrbsChange={onLightingOrbsChange ?? (() => {})}
          selectedOrb={selectedOrb}
          onSelectOrb={onSelectOrb ?? (() => {})}
          ghostJoints={ghostJoints}
          playbackSpeed={playbackSpeed}
          footContacts={footContacts}
          showFootContacts={showFootContacts}
          showStartingDirection={showStartingDirection}
          altSamples={altSamples}
          onCommitSample={onCommitSample}
          root2dPoints={root2dPoints}
          endEffectorPoints={endEffectorPoints}
          showConstraintLabels={showConstraintLabels}
          selectedEEId={selectedEEId}
          onSelectEE={onSelectEE}
          onChangeEEPoint={onChangeEEPoint}
          placingEE={placingEE}
          eePlaceJointIdx={eePlaceJointIdx ?? 0}
          onPlaceEE={onPlaceEE ?? (() => {})}
          cameraView={cameraView}
          framing={cameraFraming}
          referenceMesh={referenceMesh}
          refPlaybackFrameIdx={refPlaybackFrameIdx}
          editRefMode={editRefMode}
          refEditableJoints={refEditableJoints}
          onRefJointMove={onRefJointMove}
          inPlace={inPlace}
        />
      </Canvas>
    </div>
  )
}

export const PoseViewer3D = memo(PoseViewer3DImpl)
