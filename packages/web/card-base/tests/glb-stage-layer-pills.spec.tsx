// @vitest-environment happy-dom
// glb-stage-layer-pills.spec.tsx — THE LAYER PILL WALL (S7j, LAW 4).
//
// THE INVARIANT: the stage's four layer votes (Shaded/Wireframe/
// Skeleton/Weights) ride the catalog Pill — the interactive capsule
// (ui-primitives Pill.tsx:26-35: onClick renders the button with
// css.pill + css.interactive, active && css.active) — with
// aria-pressed carried on the Pill rest channel and the pressed mark
// on Pill's own active face, the flip owned by the CALLER's state.
// NOT the retired hand-painted chip buttons.
//
// RED WHEN THE CURE IS TOGGLED OUT: a raw <button class=layerChip>
// carries neither Pill's own faces nor its active face — the class
// arms below fail while the click arms keep passing (the point: the
// wall judges the catalog seam, not just the click).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement as h, useState } from 'react'

import { GlbStagePreview, type StageLayers } from '../src/glb-stage.tsx'
import { chromeCopy } from '../src/locales/chromeCopy.ts'

type Layers = StageLayers

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/** A minimal valid GLB (the layers spec's crafted one — walls stand
 *  alone; the load itself is the stage spec's subject, not this
 *  wall's, but a real parse keeps the layer row's own mount honest). */
function craftGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'root' }],
    meshes: [{ name: 'm', primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{
      bufferView: 0, componentType: 5126, count: 3, type: 'VEC3',
      max: [1, 1, 0], min: [0, 0, 0],
    }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  })
  const jsonBytes = new TextEncoder().encode(json)
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4
  const bin = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.byteLength
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonBytes.length + jsonPad, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(buf, 20, jsonBytes.length).set(jsonBytes)
  const binAt = 20 + jsonBytes.length + jsonPad
  view.setUint32(binAt, bin.byteLength, true)
  view.setUint32(binAt + 4, 0x004e4942, true)
  new Uint8Array(buf, binAt + 8, bin.byteLength).set(new Uint8Array(bin.buffer))
  return buf
}

function stubGlbDoor(): void {
  const glb = craftGlb()
  vi.stubGlobal('fetch', (async (): Promise<Response> =>
    new Response(glb, { status: 200, headers: { 'content-type': 'model/gltf-binary' } })) as typeof fetch)
}

/** THE OWNER HARNESS: the layer vote's write channel lands in owner
 *  state and re-seats the stage — the real caller contract (the
 *  component never owns the flip; Pill's active face reads props). */
function StageHost(props: { seen: Layers[] }): ReturnType<typeof h> {
  const [layers, setLayers] = useState<Layers>({ wireframe: false, skeleton: false, weights: false })
  return h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/pill-wall.glb' }],
    layers,
    onLayers: (next: Layers) => { props.seen.push(next); setLayers(next) },
  })
}

/** The four vote chips, by name — Pill renders real buttons. */
const chips = (): Record<string, HTMLElement> => ({
  Shaded: screen.getByRole('button', { name: 'Shaded' }),
  Wireframe: screen.getByRole('button', { name: 'Wireframe' }),
  Skeleton: screen.getByRole('button', { name: 'Skeleton' }),
  Weights: screen.getByRole('button', { name: 'Weights' }),
})

test('THE CAPSULE: every vote chip is the catalog Pill (its own faces), pressed state on aria-pressed', async () => {
  stubGlbDoor()
  render(h(StageHost, { seen: [] }))
  await screen.findByRole('button', { name: 'Shaded' })
  const c = chips()
  for (const el of Object.values(c)) {
    // Pill's own module faces — hashed under the test pipeline, so
    // the assertion rides the face NAME (a raw hand-rolled chip
    // carries only the owner class, neither face)
    expect(el.className, 'the chip rides Pill\'s pill face').toMatch(/_pill_/)
    expect(el.className, 'the chip is Pill\'s interactive face').toMatch(/_interactive_/)
  }
  // the pressed mark rides aria-pressed through the Pill rest channel
  expect(c.Shaded!.getAttribute('aria-pressed')).toBe('true')
  expect(c.Wireframe!.getAttribute('aria-pressed')).toBe('false')
  // and the pressed chip carries Pill's OWN active face (the regex,
  // not a substring: 'interactive' ends with 'active')
  expect(c.Shaded!.className, 'the pressed chip is Pill-active').toMatch(/_active_/)
  expect(c.Wireframe!.className, 'the idle chip is not Pill-active').not.toMatch(/_active_/)
  // the row keeps its group name (the caller-facing aria contract)
  expect(screen.getByRole('group', { name: chromeCopy.meshLayersLabel })).not.toBeNull()
})

test('THE VOTE: clicking a pill writes the caller\'s channel and the caller\'s state flips the face', () => {
  stubGlbDoor()
  const seen: Layers[] = []
  render(h(StageHost, { seen }))
  const wire = screen.getByRole('button', { name: 'Wireframe' })
  fireEvent.click(wire)
  expect(seen[0]).toEqual({ wireframe: true, skeleton: false, weights: false })
  // the owner re-seated: the wireframe pill is Pill-active + pressed,
  // the shaded vote cleared
  const c = chips()
  expect(c.Wireframe!.getAttribute('aria-pressed')).toBe('true')
  expect(c.Wireframe!.className).toMatch(/_active_/)
  expect(c.Shaded!.getAttribute('aria-pressed')).toBe('false')
  expect(c.Shaded!.className).not.toMatch(/_active_/)
  // overlays stack independently of the shade vote
  fireEvent.click(c.Skeleton!)
  expect(seen[1]).toEqual({ wireframe: true, skeleton: true, weights: false })
  expect(c.Skeleton!.getAttribute('aria-pressed')).toBe('true')
  // back to shaded: the wireframe vote clears, the skeleton vote rides
  fireEvent.click(c.Shaded!)
  expect(seen[2]).toEqual({ wireframe: false, skeleton: true, weights: false })
  expect(c.Shaded!.getAttribute('aria-pressed')).toBe('true')
  expect(c.Wireframe!.getAttribute('aria-pressed')).toBe('false')
  expect(c.Skeleton!.getAttribute('aria-pressed')).toBe('true')
})
