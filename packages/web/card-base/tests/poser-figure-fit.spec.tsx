// @vitest-environment happy-dom
// poser-figure-fit.spec.ts — THE EXTREME-FIGURE WALL (the
// operator's bug sweep, 2026-11-05: "sometimes when I change a
// parameter, the figure in the preview becomes extremely large").
// The geometry swap re-fit the mesh WITHOUT resetting the previous
// fit's transform: fitObjectToHeight measures the WORLD box (the
// stale scale + offsets ride in), so each swap compounds — world
// height after swap n+1 = 1.6/S_n, and a shape stream alternating
// raw sizes (a morph crossing a threshold) oscillates the scale
// exponentially: 0.8 → 4 → 0.2 → 16 — an eight-meter figure.
// The cure is fitFigureMesh: identity reset, then the one fit.
// Pure three math — no renderer, no DOM (Object3D transforms only).
import { describe, it, expect } from 'vitest'
import * as THREE from '@melite/three-client/client'
import { fitFigureMesh } from '../src/poser-figure.tsx'

/** A rectangular slab's mesh doc at the given size (bbox-only
 * truth: any closed index triplets serve the box). Width/depth stay
 * under the height — the body's own law (fitObjectToHeight anchors
 * the MAX dim; the wall's truth is the height). */
const slab = (h: number) => ({
  vertices: [
    [-0.25, 0, -0.125], [0.25, 0, -0.125], [-0.25, h, -0.125], [0.25, h, -0.125],
    [-0.25, 0, 0.125], [0.25, 0, 0.125], [-0.25, h, 0.125], [0.25, h, 0.125],
  ] as number[][],
  faces: [
    [0, 1, 2], [1, 3, 2], [4, 6, 5], [5, 6, 7],
    [0, 4, 1], [1, 4, 5], [2, 3, 6], [3, 7, 6],
  ] as number[][],
})

const worldHeight = (mesh: THREE.Mesh): number =>
  new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).y

describe('fitFigureMesh (the extreme-figure cure)', () => {
  it('fits a fresh mesh to the 1.6 law', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial())
    fitFigureMesh(mesh, slab(2))
    expect(worldHeight(mesh)).toBeCloseTo(1.6, 5)
  })

  it('a size-CHANGING shape stream stays at 1.6 (the stale-transform compounding is dead)', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial())
    // the alternating stream that exploded under the old swap:
    // 2m → 0.5m → 2m → 0.5m — world height must stay pinned.
    for (const h of [2, 0.5, 2, 0.5, 0.5, 2]) {
      fitFigureMesh(mesh, slab(h))
      expect(worldHeight(mesh)).toBeCloseTo(1.6, 5)
    }
  })

  it('every shape anchors its max dim at 1.6 (a 1m body and a 3m body read the same size)', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial())
    fitFigureMesh(mesh, slab(1))
    expect(worldHeight(mesh)).toBeCloseTo(1.6, 5)
    fitFigureMesh(mesh, slab(3))
    expect(worldHeight(mesh)).toBeCloseTo(1.6, 5)
    // the widest dim is anchored too (fitObjectToHeight's maxDim law)
    const box = new THREE.Box3().setFromObject(mesh)
    expect(Math.max(...box.getSize(new THREE.Vector3()).toArray())).toBeCloseTo(1.6, 5)
  })
})
