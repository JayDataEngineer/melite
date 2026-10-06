// host-face.spec.ts — THE DUAL-FACE MARKER CONTRACT (the one-row
// law for 3D).
//
// three-client is ROW-MOUNTED in the web profile: the loader applies
// the HOST face node-side and the CLIENT face is the browser graph
// row carrying the single compiled three copy. `registry.plugin`
// refuses a namespace without an apply, and a row that is a plugin
// node-side but a plain module in the browser kills the whole client
// plugin graph with an empty shell — so both faces carry the same
// three members (name, inject, apply).
//
// Both apply bodies are empty BY LAW (three and its six addon
// re-exports ride the client face, src/client/index.ts, which the
// loader serves as lib/client.js). So the contract pinned here is
// the MARKER itself — the shape the loader reads — and the fact that
// apply registers nothing on the ctx it is handed: an empty apply
// that started seating services would be a new registration site,
// not a marker.
import { expect, test, vi } from 'vitest'

import type { Context } from '@deepseek-ai/cordis'

import * as hostFace from '../src/host.ts'
import * as clientFace from '../src/client/index.ts'

/** A ctx that records every property the apply touches — an empty
 * marker must touch nothing at all. */
function watchCtx(): { ctx: Context; touched: string[] } {
  const touched: string[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_target, key) {
      touched.push(String(key))
      return vi.fn()
    },
    has(_target, key) {
      touched.push('has:' + String(key))
      return false
    },
  })
  return { ctx: ctx as unknown as Context, touched }
}

test('the host face carries the row marker the loader reads', () => {
  expect(hostFace.name).toBe('@melite/three-client')
  expect(Array.isArray(hostFace.inject)).toBe(true)
  expect(hostFace.inject).toEqual([])
  expect(typeof hostFace.apply).toBe('function')
})

test('the host apply registers NOTHING on the ctx it is handed', () => {
  const { ctx, touched } = watchCtx()
  expect(hostFace.apply(ctx)).toBeUndefined()
  expect(touched).toEqual([])
})

test('the client face carries the SAME marker — one row identity, two planes', () => {
  expect(clientFace.name).toBe(hostFace.name)
  expect(clientFace.inject).toEqual(hostFace.inject)
  expect(typeof clientFace.apply).toBe('function')
})

test('the client apply registers nothing either — the row exists for the browser graph', () => {
  const { ctx, touched } = watchCtx()
  expect(clientFace.apply(ctx)).toBeUndefined()
  expect(touched).toEqual([])
})

test('the client face re-exports the 3D surface every consumer requires', () => {
  // THE ONE-ROW LAW: these are the symbols the rewired consumers
  // import from '@melite/three-client/client' (card-base's stage3d
  // and glb atoms, the gallery mesh view, formats' GLB load path,
  // motion's viewer3d, the glb-viewer companion). A dropped export
  // is a consumer's bundle red — pinned here where the type system
  // cannot see runtime namespace members.
  for (const name of [
    'WebGLRenderer', 'Scene', 'PerspectiveCamera', 'Group', 'Mesh',
    'BufferAttribute', 'Color', 'Vector2', 'Vector3', 'SRGBColorSpace',
    'DRACOLoader', 'GLTFExporter', 'GLTFLoader', 'OrbitControls',
    'RoomEnvironment', 'TransformControls',
  ]) {
    expect(clientFace, `client face exports ${name}`).toHaveProperty(name)
  }
})
