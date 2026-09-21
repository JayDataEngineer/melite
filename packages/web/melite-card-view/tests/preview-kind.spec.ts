// preview-kind.spec.ts — THE PRIMARY-OUTPUT LAW (2026-09-13): the
// preview's kind is the card's DECLARED primary output (the served
// form-spec's outputs.default), never a url sniff; the sniff stands
// in only when the declaration is absent or non-previewable.
import { expect, test } from 'vitest'
import { paramsDiffKeys, previewKindFor, previewReportsFor, primaryKindFor } from '../src/client/CardsTab.tsx'
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

// ── THE PARAMS CHIP (output-component stroke — "old generations
//    that had different parameters") ─────────────────────────────

test('the chip names the KEYS that differ between the snapshot and the live params', () => {
  expect(paramsDiffKeys({ seed: 1, steps: 20 }, { seed: 2, steps: 20 })).toBe('seed')
  expect(paramsDiffKeys({ seed: 1 }, { seed: 1, lora: 'x' })).toBe('lora')
  expect(paramsDiffKeys({ a: 1, b: 2 }, { a: 9, b: 8 })).toBe('a, b')
})

test('same params, no chip — and absent snapshots (pre-stroke archives) never lie', () => {
  expect(paramsDiffKeys({ seed: 1 }, { seed: 1 })).toBeUndefined()
  expect(paramsDiffKeys(undefined, { seed: 1 })).toBeUndefined()
  expect(paramsDiffKeys(null, { seed: 1 })).toBeUndefined()
  expect(paramsDiffKeys({ seed: 1 }, undefined)).toBeUndefined()
  // arrays are not params maps — no chip, never a crash
  expect(paramsDiffKeys([1, 2], { seed: 1 })).toBeUndefined()
})

test('long diffs cap at four keys with an ellipsis (the compact chip)', () => {
  expect(paramsDiffKeys({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 }, {})).toBe('a, b, c, d…')
})

// ── THE REPORT HARVEST (ROADMAP 11e, primitive ①) ──────────────────────
// The named machine-readable verdicts a run writes beside its media
// (kind 'report'): only lawful entries harvest — the reader stays
// silent on degenerates (the contract's validator names them at the
// WRITER; the reader just never renders a broken face).

test('report harvest: lawful verdicts ride verbatim, keyed by name', () => {
  const out = previewReportsFor({
    result: {
      run_id: 'run-rig',
      reports: {
        validate: { kind: 'report', status: 'pass', title: 'gate', chips: ['uv'], rows: { tris: 14980 } },
        lint: { kind: 'report', status: 'warn' },
      },
    },
  })
  expect(out.length).toBe(2)
  expect(out[0]!.name).toBe('validate')
  expect(out[0]!.report).toEqual({ kind: 'report', status: 'pass', title: 'gate', chips: ['uv'], rows: { tris: 14980 } })
  expect(out[1]!.name).toBe('lint')
  expect(out[1]!.report).toEqual({ kind: 'report', status: 'warn' })
})

test('report harvest: wrong kind and bad status never render; a broken DISPLAY section strips, the entry stays', () => {
  const out = previewReportsFor({
    result: {
      reports: {
        wrong: { kind: 'table', status: 'pass' },
        badstatus: { kind: 'report', status: 'ok' },
        notobj: 7,
        arr: ['x'],
        badchips: { kind: 'report', status: 'pass', chips: ['ok', 3] },
        badrows: { kind: 'report', status: 'pass', rows: { deep: { x: 1 } } },
        badtitle: { kind: 'report', status: 'pass', title: '' },
      },
    },
  })
  // kind + status ARE the entry's identity (without them it is not a
  // report); title/chips/rows are display sections — a broken one
  // strips, the verdict itself still renders.
  expect(out.length).toBe(3)
  expect(out.map((e) => e.name)).toEqual(['badchips', 'badrows', 'badtitle'])
  expect(out[0]!.report).toEqual({ kind: 'report', status: 'pass' })
  expect(out[1]!.report).toEqual({ kind: 'report', status: 'pass' })
  // '' title → omitted (the atom's name law takes over)
  expect(out[2]!.report).toEqual({ kind: 'report', status: 'pass' })
})

test('report harvest: absent reports, non-object results — the empty list, never a crash', () => {
  expect(previewReportsFor({})).toEqual([])
  expect(previewReportsFor({ result: null })).toEqual([])
  expect(previewReportsFor({ result: { reports: null } })).toEqual([])
  expect(previewReportsFor({ result: { reports: ['x'] } })).toEqual([])
})
