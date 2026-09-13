// preview-kind.spec.ts — THE PRIMARY-OUTPUT LAW (2026-09-13): the
// preview's kind is the card's DECLARED primary output (the served
// form-spec's outputs.default), never a url sniff; the sniff stands
// in only when the declaration is absent or non-previewable.
import { expect, test } from 'vitest'
import { previewKindFor, primaryKindFor } from '../src/client/CardsTab.tsx'
import type { FormSpecDoc } from '@melite/card-base'

const spec = (outputs?: Record<string, string>): FormSpecDoc =>
  ({ form: 'x', fields: [], ...(outputs === undefined ? {} : { outputs }) }) as FormSpecDoc

test('the declared previewable kind always wins over the url shape', () => {
  expect(primaryKindFor(spec({ default: 'audio' }), '/out/hero.mp4')).toBe('audio')
  expect(primaryKindFor(spec({ default: 'mesh' }), '/out/scene.png')).toBe('mesh')
  expect(primaryKindFor(spec({ default: 'video' }), '/out/frame.png')).toBe('video')
  expect(primaryKindFor(spec({ default: 'image' }), '/out/clip.mp4')).toBe('image')
})

test('a non-previewable declaration falls to the url sniff (seg artifacts are pngs)', () => {
  // mask-studio declares 'seg' but its artifact IS a renderable png —
  // the sniff keeps its gallery alive
  expect(primaryKindFor(spec({ default: 'seg' }), '/out/mask.png')).toBe('image')
  expect(primaryKindFor(spec({ default: 'text' }), '/out/tags.png')).toBe('image')
  // …and to nothing when the artifacts are not renderable urls
  expect(primaryKindFor(spec({ default: 'text' }), '/out/tags.json')).toBe(null)
})

test('no spec in hand: the url sniff alone (flow rows without card identity)', () => {
  expect(primaryKindFor(null, '/out/hero.mp4')).toBe('video')
  expect(primaryKindFor(undefined, '/out/frame.png')).toBe('image')
  expect(primaryKindFor(spec(), '/out/frame.png')).toBe('image')
  expect(primaryKindFor(spec({ default: 'audio' }), '')).toBe('audio')
})

test('previewKindFor stays the pure url sniff (the fallback, pinned)', () => {
  expect(previewKindFor('/a/b.mp4')).toBe('video')
  expect(previewKindFor('/a/b.PNG?x=1')).toBe('image')
  expect(previewKindFor('/a/b.glb')).toBe('mesh')
  expect(previewKindFor('/a/song.mp3')).toBe('audio')
  expect(previewKindFor('/a/loop.wav')).toBe('audio')
  expect(previewKindFor('/a/model.gltf')).toBe('mesh')
  expect(previewKindFor('')).toBe(null)
})
