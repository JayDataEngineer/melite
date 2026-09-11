/**
 * E4.5 — Duplicate-with-offset (seed bump) store action tests.
 *
 * Verifies the seed arithmetic, contiguous insertion order, later-
 * segment shift, render-state clearing, and the edge cases (count ≤ 0,
 * unknown id).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore, flushPersist } from "@melite-plugin/timeline/ui/store"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts"

beforeEach(async () => {
  await flushPersist()
  useTimelineStore.getState().reset()
  localStorage.clear()
})

function withParams(overrides: Record<string, any> = {}) {
  return { ...DEFAULT_SEGMENT_PARAMS, ...overrides }
}

describe('duplicateWithOffset (E4.5)', () => {
  it('returns [] for an unknown source id', () => {
    expect(useTimelineStore.getState().duplicateWithOffset('nope', 3)).toEqual([])
  })

  it('returns [] for count ≤ 0', () => {
    const a = useTimelineStore.getState().addSegment({})
    expect(useTimelineStore.getState().duplicateWithOffset(a.id, 0)).toEqual([])
    expect(useTimelineStore.getState().duplicateWithOffset(a.id, -2)).toEqual([])
  })

  it('creates exactly N copies', () => {
    const a = useTimelineStore.getState().addSegment({})
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 4)
    expect(copies).toHaveLength(4)
    expect(useTimelineStore.getState().segments).toHaveLength(5) // source + 4
  })

  it('bumps seed by 1 on each copy (source.seed + i)', () => {
    const a = useTimelineStore.getState().addSegment({
      params: withParams({ seed: 100 }),
    })
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    // Copies are returned in insertion order (1..N).
    expect(copies[0].params.seed).toBe(101)
    expect(copies[1].params.seed).toBe(102)
    expect(copies[2].params.seed).toBe(103)
  })

  it('does NOT mutate the source segment seed', () => {
    const a = useTimelineStore.getState().addSegment({
      params: withParams({ seed: 50 }),
    })
    useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    const src = useTimelineStore.getState().segments.find((s) => s.id === a.id)!
    expect(src.params.seed).toBe(50)
  })

  it('inserts copies IMMEDIATELY after the source (contiguous block)', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 5 })
    const b = useTimelineStore.getState().addSegment({ duration: 5 })
    // Duplicate a (which is at order 0). The 2 copies should land
    // between a and b in the segments array.
    useTimelineStore.getState().duplicateWithOffset(a.id, 2)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(4)
    expect(segs[0].id).toBe(a.id)
    // Two new copies follow.
    expect(segs[1].params.seed).toBe(a.params.seed + 1)
    expect(segs[2].params.seed).toBe(a.params.seed + 2)
    // b is pushed to the end.
    expect(segs[3].id).toBe(b.id)
  })

  it('shifts later segments right by count × source.duration', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 5 })
    const b = useTimelineStore.getState().addSegment({ duration: 5 })
    // a starts at 0, b starts at 5. After duplicating a 3 times
    // (3 × 5s = 15s inserted), b should start at 5 + 15 = 20.
    useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    const bAfter = useTimelineStore.getState().segments.find((s) => s.id === b.id)!
    expect(bAfter.start).toBe(20)
  })

  it('clears render state on every copy (status, videoUrl, thumbnail)', () => {
    const a = useTimelineStore.getState().addSegment({
      status: 'ready',
      videoUrl: 'data:video/mp4;base64,AAAA',
      thumbnailUrl: 'data:image/png;base64,BBBB',
    })
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 2)
    for (const c of copies) {
      expect(c.status).toBe('empty')
      expect(c.videoUrl).toBeNull()
      expect(c.thumbnailUrl).toBeNull()
      expect(c.assetId).toBeUndefined()
    }
  })

  it('clears variants on copies (alternate takes do not carry over)', () => {
    const a = useTimelineStore.getState().addSegment({})
    useTimelineStore.getState().addVariant(a.id, {
      seed: 1, videoUrl: 'data:video/mp4;x', createdAt: Date.now(),
    })
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 2)
    expect(copies[0].variants).toEqual([])
    expect(copies[1].variants).toEqual([])
  })

  it('does not inherit locked or groupId from the source', () => {
    const a = useTimelineStore.getState().addSegment({ locked: true, groupId: 'g1' })
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 2)
    for (const c of copies) {
      expect(c.locked).toBe(false)
      expect(c.groupId).toBeNull()
    }
  })

  it('copies inherit the source prompt + params (minus seed bump)', () => {
    const a = useTimelineStore.getState().addSegment({
      prompt: 'a red car',
      negativePrompt: 'blurry',
      params: withParams({ seed: 7, guideScale: 6.6, model: 'wan-vace' }),
    })
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 2)
    expect(copies[0].prompt).toBe('a red car')
    expect(copies[0].negativePrompt).toBe('blurry')
    expect(copies[0].params.guideScale).toBe(6.6)
    expect(copies[0].params.model).toBe('wan-vace')
    expect(copies[0].params.seed).toBe(8) // bumped
    expect(copies[1].params.seed).toBe(9)
  })

  it('updates totalDuration to account for inserted copies', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 5 })
    // totalDuration was 5. After duplicating 3 times (15s), it's 20.
    useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    expect(useTimelineStore.getState().playback.totalDuration).toBe(20)
  })

  it('each copy gets a distinct new id (no collision with source)', () => {
    const a = useTimelineStore.getState().addSegment({})
    const copies = useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    const ids = copies.map((c) => c.id)
    expect(new Set(ids).size).toBe(3) // unique among themselves
    expect(ids).not.toContain(a.id)
  })

  it('works when duplicating the LAST segment (no later segments to shift)', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 5 })
    const b = useTimelineStore.getState().addSegment({ duration: 5 })
    // Duplicate b (the last one) — no shift needed, just append.
    const copies = useTimelineStore.getState().duplicateWithOffset(b.id, 2)
    expect(copies).toHaveLength(2)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(4)
    // a unchanged at the front, b next, then 2 copies.
    expect(segs[0].id).toBe(a.id)
    expect(segs[1].id).toBe(b.id)
    expect(segs[2].start).toBe(10) // b.start (5) + b.duration (5)
    expect(segs[3].start).toBe(15)
  })

  it('records history (undo restores the pre-duplicate state)', () => {
    const a = useTimelineStore.getState().addSegment({})
    const before = useTimelineStore.getState().segments.length
    useTimelineStore.getState().duplicateWithOffset(a.id, 3)
    expect(useTimelineStore.getState().segments.length).toBe(before + 3)
    useTimelineStore.getState().undo()
    expect(useTimelineStore.getState().segments.length).toBe(before)
  })
})
