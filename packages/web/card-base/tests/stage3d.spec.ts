// @vitest-environment happy-dom
// stage3d.spec.ts — THE SHARED RAW-THREE STAGE CORE, headless half:
// happy-dom serves NO WebGL context (canvas.getContext('webgl2')
// returns null — proven by probe), so the mount's context-failure
// contract + the context-free label sprite are the headless-provable
// surface. Everything past a live WebGLRenderer (controls, ticks,
// picking, rAF, resize, dispose) is a permanent-exemption candidate —
// the exact missing API is named in the final report.
import { afterEach, expect, test, vi } from 'vitest'

import { makeLabelSprite, mountStage3D } from '../src/stage3d.ts'

afterEach(() => { vi.restoreAllMocks() })

test('THE CONTEXT-FAILURE CONTRACT: no WebGL headless — the mount refuses null (never a throw)', () => {
  expect(mountStage3D(document.createElement('canvas'))).toBeNull()
})

test('THE CONTEXT-FAILURE CONTRACT: the sink voices three\'s own message', () => {
  const seen: string[] = []
  expect(mountStage3D(document.createElement('canvas'), { onContextFailure: (m) => { seen.push(m) } })).toBeNull()
  expect(seen).toEqual(['Error creating WebGL context.'])
})

test('THE CONTEXT-FAILURE CONTRACT: a context that dies non-Error voices the fallback (never empty)', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    throw 'context-gone'
  })
  const seen: string[] = []
  expect(mountStage3D(document.createElement('canvas'), { onContextFailure: (m) => { seen.push(m) } })).toBeNull()
  expect(seen).toEqual(['WebGL unavailable'])
})

test('THE LABEL SPRITE: context-free — the sprite seats with the canvas aspect even when 2d is absent', () => {
  // happy-dom serves no 2d context either (getContext('2d') → null) —
  // the sprite still seats (blank map, honest scale), never a throw
  const sprite = makeLabelSprite('Hi', '#ffffff', 2)
  expect(sprite.scale.x).toBeCloseTo(4, 6)
  expect(sprite.scale.y).toBe(2)
  expect(sprite.scale.z).toBe(1)
  expect(sprite.material.map).not.toBeNull()
})
