/**
 * poser-figure.tsx — THE NATIVE FIGURE STAGE (stroke 90 + the live
 * follow-up, 2026-09-17: "these knobs do LITERALLY NOTHING — they
 * are supposed to CHANGE THE BODY"). The figure is not a
 * static portrait: it is SHAPED BY THE CARD'S LIVE PARAMS — the 11
 * identity coeffs and the non-zero local_changes ride the SAME
 * shared bind-mesh module the body studios use
 * (@melite/formats/poserSkin — ONE fetch surface, ONE per-signature
 * cache across the estate; the module's own header records the
 * dedup law: "the positional form is how the two pre-dedup copies
 * drifted"). The 2026-09-06 law stands: NEVER the low-poly GLB
 * export, always the /poser shaped bind mesh (18,056 verts, smooth
 * normals).
 *
 * SUBSTRATE LAW (verbatim, glb-stage.tsx): RAW three.js — imperative
 * scene in a useEffect, NO @react-three. three is a pure leaf
 * library; mounts like any imperative canvas lib.
 *
 * DRAG LAW: slider drags emit streams; the fetch debounces 120ms
 * and the module's cache (coeffs rounded 0.1, local changes 0.02)
 * collapses identical shapes. The SCENE mounts once per card; shape
 * commits SWAP THE GEOMETRY in place — no canvas flicker per drag.
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import * as THREE from '@melite/three-client/client'
import { fetchBindMesh, type SkinMeshData } from '@melite/formats/poserSkin'
import { mountStage3D } from './stage3d.ts'
import { autoFitToHeight } from './glb-stage.tsx'
import { fieldsOf, type FormSpecDoc, type SpecValues } from './spec.ts'
import { rejectionVoice } from './rejection-voice.ts'
import s from './preview.module.css'

/** The bind-mesh doc the geometry builder reads (SkinMeshData's
 * pinned subset: xyz verts, index-triplet faces). */
export interface PoserMeshDoc {
  vertices: number[][]
  faces: number[][]
}

/** Pure: the resolved params → the identity coeff vector (the
 * identity group's fields, order-sorted, values from the resolved
 * map). null when the spec has no identity group OR any dim is not
 * a finite number — a PARTIAL vector would mis-shape the body
 * (every dim must ride or none do; the neutral GET is the
 * fallback). */
export function figureCoeffsOf(spec: FormSpecDoc | null, value: SpecValues): number[] | null {
  if (spec === null) return null
  const fields = fieldsOf(spec)
    .filter((f) => f.group === 'identity')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (fields.length === 0) return null
  const coeffs: number[] = []
  for (const f of fields) {
    const v = value[f.name]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    coeffs.push(v)
  }
  return coeffs
}

/** Pure: the resolved params → the local-changes map (the morph
 * group's fields, NON-ZERO finite values only — the sparse law:
 * absent = the engine's own 0). null when empty or no morph group
 * (the caller omits the arm; the fetch rides the neutral GET). */
export function figureLocalChangesOf(spec: FormSpecDoc | null, value: SpecValues): Record<string, number> | null {
  if (spec === null) return null
  const out: Record<string, number> = {}
  for (const f of fieldsOf(spec)) {
    if (f.group !== 'morph') continue
    const v = value[f.name]
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) out[f.name] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Pure: the door's JSON → a three geometry (unit-testable without
 * WebGL). Float32 positions, uint32 indices, computed smooth
 * normals (the door ships unindexed soup; the weld-free normals are
 * the poser's own smooth-shading intent — the design doc's word). */
export function figureGeometry(doc: PoserMeshDoc): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(doc.vertices.flat(), 3))
  g.setIndex(doc.faces.flat())
  g.computeVertexNormals()
  return g
}

/** The shape signature — identity coeffs + local changes as one
 * stable string (the effect's dep; a new shape re-fetches, an
 * identical one does not). */
export function figureShapeSig(identityCoeffs?: number[] | null, localChanges?: Record<string, number> | null): string {
  const c = identityCoeffs !== undefined && identityCoeffs !== null && identityCoeffs.length > 0
    ? identityCoeffs.map((v) => v.toFixed(2)).join(',') : ''
  const l = localChanges !== undefined && localChanges !== null
    ? Object.entries(localChanges).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(',') : ''
  return `${c}|${l}`
}

/** The resting camera radius (mount default [2.2, 1.6, 2.6]) —
 * framing scales AGAINST this base, so framing 1.2 ≈ the resting
 * view and 3.0 pulls the camera back to the factor's own word. */
const BASE_CAMERA_RADIUS = Math.hypot(2.2, 1.6, 2.6)

/** Pure: the resolved params → the figure camera arms. The poser's
 * camera verbs are NAME-KEYED ('framing' = distance factor,
 * 'focal_length' = lens mm): a card that declares them drives the
 * figure viewport's camera LIVE (the studio's camera rail); a card
 * that doesn't (or non-finite values) omits both — the stage's own
 * resting camera stands. */
export function figureCameraOf(spec: FormSpecDoc | null, value: SpecValues): { framing?: number; focalLength?: number } {
  if (spec === null) return {}
  const out: { framing?: number; focalLength?: number } = {}
  const framing = value['framing']
  if (typeof framing === 'number' && Number.isFinite(framing) && framing > 0) out.framing = framing
  const focal = value['focal_length']
  if (typeof focal === 'number' && Number.isFinite(focal) && focal > 0) out.focalLength = focal
  return out
}

/** THE NATIVE FIGURE — the /poser shaped bind mesh on the shared
 * stage core (same light rig + floor grid as the GLB stage, the
 * preview-port interaction law: ONE look across ports). Fetch
 * failures voice themselves in the DOM (the loud-errors law);
 * WebGL absence refuses loud, never a blank silent canvas. */
export function PoserFigureStage({ identityModel, identityCoeffs, localChanges, framing, focalLength, label }: {
  /** the identity model the door shapes ('anny') */
  identityModel: string
  /** the card's LIVE identity dims (the 11 coeffs, label order) */
  identityCoeffs?: number[] | null
  /** the card's LIVE non-zero morph weights (label → weight) */
  localChanges?: Record<string, number> | null
  /** the card's LIVE camera distance factor (the turnaround rail) */
  framing?: number | null
  /** the card's LIVE lens mm (the turnaround rail) */
  focalLength?: number | null
  label?: string
}): ReturnType<typeof h> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const stageRef = useRef<{ camera?: THREE.PerspectiveCamera; controls?: { update: () => void }; dispose: () => void } | null>(null)
  const [doc, setDoc] = useState<SkinMeshData | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const sig = figureShapeSig(identityCoeffs, localChanges)
  // A MODEL CHANGE is a different body — the old doc retires (the
  // loading face returns honestly). A SHAPE change is NOT: the doc
  // survives the refetch (see the drag law below) so the scene and
  // canvas STAY MOUNTED while the next shape is in flight.
  useEffect(() => {
    setDoc(null)
    setFailed(null)
  }, [identityModel])
  useEffect(() => {
    let alive = true
    // THE DRAG LAW: debounce the stream; the module cache collapses
    // identical signatures so a settled shape never re-fetches. The
    // current doc is KEPT while the next is in flight (never
    // setDoc(null) here — a null mid-drag unmounts the canvas and
    // the whole scene, and a slow POST reads as 'the preview
    // vanished'; the body stays, then the geometry swaps).
    const timer = setTimeout(() => {
      setFailed(null)
      fetchBindMesh({
        identityModel,
        ...(identityCoeffs !== undefined && identityCoeffs !== null && identityCoeffs.length > 0 ? { identityCoeffs } : {}),
        ...(localChanges !== undefined && localChanges !== null && Object.keys(localChanges).length > 0 ? { localChanges } : {}),
      })
        .then((d) => { if (alive) setDoc(d) })
        .catch((e: unknown) => { if (alive) setFailed(rejectionVoice(e)) })
    }, 120)
    return () => { alive = false; clearTimeout(timer) }
    // sig (not the arrays): a stable string dep — identityCoeffs and
    // localChanges are re-derived objects per render; the signature
    // is the shape identity (identityModel rides it via the fetch).
  }, [identityModel, sig])
  const hasDoc = doc !== null
  useEffect(() => {
    if (!hasDoc) return
    // (no canvas-null guard — the sibling's law, verbatim: this
    // body runs only when doc !== null, and every such commit
    // renders the canvas face; doc flips null→doc in one batch
    // with the canvas, so the ref is always committed here.)
    const canvas = canvasRef.current!
    const stage = mountStage3D(canvas, {
      fov: 40,
      camera: [2.2, 1.6, 2.6],
      target: [0, 0.8, 0],
      toneMapping: THREE.NoToneMapping,
      onContextFailure: (m) => setFailed(m),
    })
    if (stage === null) return
    stageRef.current = stage
    const scene = stage.scene
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.4))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 5, 2)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(-3, 2, -2)
    scene.add(fill)
    const grid = new THREE.GridHelper(6, 24, 0xbbbbbb, 0xdddddd)
    const gridMat = grid.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.35
    scene.add(grid)
    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xc9b8a8, roughness: 0.72, metalness: 0.04 }),
    )
    meshRef.current = mesh
    scene.add(mesh)
    return () => {
      stageRef.current = null
      meshRef.current = null
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      grid.geometry.dispose()
      stage.dispose()
    }
  }, [hasDoc]) // eslint-disable-line react-hooks/exhaustive-deps
  // THE GEOMETRY SWAP: each shape commit replaces the mesh's
  // geometry in place — the scene, lights, and camera survive every
  // drag (no flicker); autoFit re-anchors the new body's height.
  useEffect(() => {
    const mesh = meshRef.current
    if (mesh === null || doc === null) return
    const next = figureGeometry(doc)
    mesh.geometry.dispose()
    mesh.geometry = next
    autoFitToHeight(mesh)
  }, [doc])
  // THE CAMERA RAIL (the turnaround knobs' live arm): framing sets
  // the camera DISTANCE (the current orbit direction preserved —
  // the user's orbit survives a framing drag); focal_length sets
  // the lens (35mm-stills vertical fov, 24mm gate). Both update IN
  // PLACE — no remount, no refetch (a camera fact never touches
  // the mesh).
  useEffect(() => {
    const stage = stageRef.current
    const camera = stage?.camera
    if (camera === undefined) return
    if (typeof framing === 'number' && Number.isFinite(framing) && framing > 0) {
      const radius = camera.position.length()
      if (radius > 0) {
        camera.position.multiplyScalar((BASE_CAMERA_RADIUS * framing) / radius)
        stage?.controls?.update()
      }
    }
    if (typeof focalLength === 'number' && Number.isFinite(focalLength) && focalLength > 0) {
      camera.fov = (2 * Math.atan(12 / focalLength) * 180) / Math.PI
      camera.updateProjectionMatrix()
    }
    // hasDoc rides the deps so a SAVED camera state (a card whose
    // framing was dragged before the stage mounted) applies at
    // mount — not only on the next drag.
  }, [framing, focalLength, hasDoc])
  return h('div', { className: s.stagePreview, 'data-viewport': label ?? 'poser-figure' },
    // THE BODY-STAYS LAW: a failure with a doc in hand overlays the
    // banner on the STILL-MOUNTED canvas (the drag never kills the
    // body); the full failed face shows only when nothing renders.
    failed !== null && doc === null
      ? h('div', { className: s.empty, 'data-testid': 'figure-failed' }, 'figure failed: ' + failed)
      : doc === null
        ? h('div', { className: s.empty, 'data-testid': 'figure-loading' }, 'loading figure…')
        : h('canvas', { ref: canvasRef, className: s.stageCanvas, 'data-testid': 'stage-preview-figure' }),
    failed !== null && doc !== null
      ? h('div', { className: s.figureError, 'data-testid': 'figure-failed' }, 'figure failed: ' + failed)
      : null,
  )
}
