// @vitest-environment happy-dom
/**
 * The shared GLB viewport's decision layer (the old Stage law, lean
 * cut). WebGL is absent headless — the Canvas paint proof lives on
 * the lane; HERE we prove the states + the autoFit port.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import * as THREE from 'three'

import { GlbViewport, autoFitToHeight } from '../src/client/glb-viewport.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('no run → the honest empty state (no Canvas mounted)', () => {
  render(createElement(GlbViewport, { url: null }))
  expect(screen.getByText('Run the card to see the mesh')).toBeTruthy()
  expect(document.querySelector('canvas')).toBeNull()
})

test('a pending url shows the honest loading state (WebGL-less headless)', () => {
  // the model load is pending — the honest loading state shows while the Canvas mounts
  render(createElement(GlbViewport, { url: '/melite-media/runs/r1/mesh.glb' }))
  expect(screen.getByText('loading mesh…')).toBeTruthy()
})

test('autoFitToHeight — the ONE normalization (old glbLoad law, ported)', () => {
  // a 100×100×100 box centered at origin → height 1.6, feet on y=0, centered XZ
  const root = new THREE.Group()
  const geo = new THREE.BoxGeometry(100, 100, 100)
  root.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()))
  const { box, height } = autoFitToHeight(root, 1.6)
  expect(height).toBeCloseTo(1.6, 1)
  expect(box.min.y).toBeCloseTo(0, 2)
  const center = new THREE.Vector3()
  box.getCenter(center)
  expect(Math.abs(center.x)).toBeLessThan(1e-6)
  expect(Math.abs(center.z)).toBeLessThan(1e-6)
})
