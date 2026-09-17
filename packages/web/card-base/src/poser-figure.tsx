/**
 * poser-figure.tsx — THE NATIVE FIGURE STAGE (stroke 90, 2026-09-17:
 * the keep-all-features order — "Where the [REDACTED 2026-11-05] is the 3js preview?"
 * "CONVERT means DON'T LOSE FUNCTIONALITY"). The studio's viewport
 * capability moves to the base form's preview seam: the /poser shaped
 * bind mesh (18,056 verts, 36,108 tris, smooth normals — the
 * 2026-09-06 law: NEVER the low-poly GLB export, which the operator
 * rejected as "low quality — you are rendering GLB and not native
 * ANNY").
 *
 * SUBSTRATE LAW (verbatim, glb-stage.tsx): RAW three.js — imperative
 * scene in a useEffect, NO @react-three. three is a pure leaf
 * library; mounts like any imperative canvas lib.
 *
 * THE WIRE SHAPE (the door, live-pinned): { vertices: number[][]
 * (xyz, cm-scale, Y-up), faces: number[][] (index triplets),
 * bind_joints: number[][], identity_model: string }.
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { mountStage3D } from './stage3d.ts'
import { autoFitToHeight } from './glb-stage.tsx'
import s from './preview.module.css'

/** The door's wire shape (the pinned subset the stage reads). */
export interface PoserMeshDoc {
  vertices: number[][]
  faces: number[][]
  bind_joints?: number[][]
  identity_model?: string
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

/** THE NATIVE FIGURE — fetched from the estate door, rendered on the
 * shared stage core (same light rig + floor grid as the GLB stage,
 * the preview-port interaction law: ONE look across ports). The
 * fetch failures voice themselves in the DOM (the loud-errors law);
 * WebGL absence refuses loud, never a blank silent canvas. */
export function PoserFigureStage({ door, identityModel, label }: {
  /** the estate door path ('/v1/poser/mesh') */
  door: string
  /** the identity model the door shapes ('anny') */
  identityModel: string
  label?: string
}): ReturnType<typeof h> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [doc, setDoc] = useState<PoserMeshDoc | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setDoc(null)
    setFailed(null)
    fetch(`${door}?identity_model=${encodeURIComponent(identityModel)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`figure door HTTP ${r.status}`)
        return r.json() as Promise<PoserMeshDoc>
      })
      .then((d) => { if (alive) setDoc(d) })
      .catch((e: unknown) => { if (alive) setFailed(e instanceof Error ? e.message : 'figure fetch failed') })
    return () => { alive = false }
  }, [door, identityModel])
  useEffect(() => {
    if (doc === null) return
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
      figureGeometry(doc),
      new THREE.MeshStandardMaterial({ color: 0xc9b8a8, roughness: 0.72, metalness: 0.04 }),
    )
    autoFitToHeight(mesh)
    scene.add(mesh)
    return () => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      grid.geometry.dispose()
      stage.dispose()
    }
  }, [doc]) // eslint-disable-line react-hooks/exhaustive-deps
  return h('div', { className: s.stagePreview, 'data-viewport': label ?? 'poser-figure' },
    failed !== null
      ? h('div', { className: s.empty, 'data-testid': 'figure-failed' }, 'figure failed: ' + failed)
      : doc === null
        ? h('div', { className: s.empty, 'data-testid': 'figure-loading' }, 'loading figure…')
        : h('canvas', { ref: canvasRef, className: s.stageCanvas, 'data-testid': 'stage-preview-figure' }),
  )
}
