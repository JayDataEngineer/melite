import { describe, expect, it } from 'vitest'
import assert from 'node:assert/strict'
import {
  CALL_KNOB_KEYS,
  GRID_BASE_FRAMES,
  GRID_MAX_FRAMES,
  GRID_STEP_FRAMES,
  IMAGE_BUS_SLOTS,
  KNOB_ORDER,
  LEGACY_KNOB_KEY,
  REF_CAPS,
  SEAM_OVERLAP_FRAMES,
  assertCarriedSpanGrid,
  assertGridLength,
  carriedSpanGrid,
  deliveredFrames,
  gridSnap,
  imageReferenceCap,
  joinRefList,
  migrateCallKnobKey,
  normalizeDeclaredRefs,
  refGenreOf,
  spanOverlap,
  spanStanzaFrames,
  splitRefList,
  transitionOverlap,
} from '@melite/models-h3/timelineContract'

const span = (start: number, end: number, transition?: string) =>
  transition === undefined ? { start, end } : { start, end, transition }

describe('timeline geometry', () => {
  it('owns the seam and carry-inclusive stanza grid', () => {
    assert.equal(SEAM_OVERLAP_FRAMES, 22)
    assert.equal(spanOverlap(span(0, 56)), 22)
    assert.equal(spanOverlap(span(0, 56, 'cut')), 0)
    assert.equal(transitionOverlap('cut'), 0)
    assert.equal(transitionOverlap('extend'), 22)
    assert.equal(transitionOverlap(undefined), 22)
    assert.equal(spanStanzaFrames(span(0, 56)), 56)
    assert.equal(spanStanzaFrames(span(56, 124), 22), 90)
    assert.equal(spanStanzaFrames(span(0, 1)), GRID_BASE_FRAMES)
    assert.equal(spanStanzaFrames(span(0, 9000)), GRID_MAX_FRAMES)
  })

  it('snaps and validates the render grid', () => {
    assert.equal(gridSnap(10), 22)
    assert.equal(gridSnap(68), 73)
    assert.equal(gridSnap(400), 362)
    assert.equal(assertGridLength(124, 'test'), 124)
    assert.throws(() => assertGridLength(136, 'test'), /nearest legal: 141f/)
    assert.throws(() => assertGridLength(1000, 'test'), /nearest legal: 362f/)
    assert.throws(() => assertGridLength(21, 'test'), /nearest legal: 22f/)
    assert.throws(() => assertGridLength('124', 'test'), /nearest legal: 124f/)
    assert.throws(() => assertGridLength(Number.NaN, 'test'), /nearest legal: 124f/)
  })

  it('accepts grid-exact carried spans and names the illegal neighboring ends', () => {
    const lower = carriedSpanGrid(span(124, 277), 22)
    assert.equal(lower.generatedStart, 102)
    assert.equal(lower.generatedEnd, 277)
    assert.equal(assertCarriedSpanGrid(span(124, 277), 'test', 22), 175)
    assert.equal(assertCarriedSpanGrid(span(124, 294), 'test', 22), 192)
    assert.throws(
      () => assertCarriedSpanGrid(span(124, 282), 'calls[1]', 22),
      /calls\[1\]: authored range 124→282 cannot land on the 22\+17k carried grid; generated snapped range 102→277; legal neighboring end frames 277 and 294/,
    )
    assert.throws(
      () => assertCarriedSpanGrid(span(100, 500), 'max', 22),
      /max: authored range 100→500 cannot land.*legal neighboring end frames 440/,
    )
  })

  it('reports delivered frames for first, cut, and carried calls', () => {
    assert.equal(deliveredFrames({ start_frame: 0, end_frame: 48 }, 0), 48)
    assert.equal(deliveredFrames({ start_frame: 0, end_frame: 48, transition: 'cut' }, 1), 48)
    assert.equal(deliveredFrames({ start_frame: 0, end_frame: 48 }, 1), 26)
    assert.equal(deliveredFrames({ start_frame: 0, end_frame: 10 }, 1), 0)
  })
})

describe('reference contract', () => {
  it('owns the image bus and media caps', () => {
    assert.equal(IMAGE_BUS_SLOTS, 9)
    // refmods (audit 010/R1): the RefMod loader's own MAX_SLOTS —
    // conditioning-side, no image-bus spend.
    assert.deepEqual(REF_CAPS, { images: 8, videos: 3, audios: 3, refmods: 8 })
    assert.equal(imageReferenceCap(false), 8)
    assert.equal(imageReferenceCap(true), 7)
  })

  it('splits, normalizes, joins, and merges without shredding data URLs', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo='
    assert.deepEqual(splitRefList(undefined), [])
    assert.deepEqual(splitRefList('a, b,\tc'), ['a', 'b', 'c'])
    assert.deepEqual(splitRefList(`${data}, still`), [data, 'still'])
    assert.deepEqual(normalizeDeclaredRefs(['a', '', 1]), ['a'])
    assert.deepEqual(normalizeDeclaredRefs('a, b'), ['a', 'b'])
    assert.deepEqual(normalizeDeclaredRefs(42), [])
    assert.equal(joinRefList([' a ', '', 2]), 'a, 2')
    assert.equal(joinRefList([]), undefined)
    assert.equal(joinRefList(' a '), 'a')
    assert.equal(joinRefList(null), undefined)
  })

  it('classifies estate names and URL extensions', () => {
    assert.equal(refGenreOf('video_w1_main'), 'video')
    assert.equal(refGenreOf('video_w1_prev'), 'image')
    assert.equal(refGenreOf('still', 'https://x/a.png?token=1'), 'image')
    assert.equal(refGenreOf('clip', 'https://x/a.mp4'), 'video')
    assert.equal(refGenreOf('voice', 'https://x/a.wav'), 'audio')
    assert.equal(refGenreOf('notes'), 'other')
  })
})

describe('call knob contract', () => {
  it('derives the set from one ordered tuple and maps legacy names', () => {
    assert.equal(KNOB_ORDER[0], 'steps')
    assert.equal(KNOB_ORDER.at(-1), 'length')
    assert.equal(new Set(KNOB_ORDER).size, KNOB_ORDER.length)
    assert.equal(CALL_KNOB_KEYS.size, KNOB_ORDER.length)
    for (const key of KNOB_ORDER) assert.ok(CALL_KNOB_KEYS.has(key))
    for (const target of Object.values(LEGACY_KNOB_KEY)) assert.ok(CALL_KNOB_KEYS.has(target))
    assert.equal(migrateCallKnobKey('sampling_steps'), 'steps')
    assert.equal(migrateCallKnobKey('unknown'), 'unknown')
    expect(CALL_KNOB_KEYS.has('sampling_steps')).toBe(false)
    assert.equal(GRID_STEP_FRAMES, 17)
  })
})
