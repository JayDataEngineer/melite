/**
 * E2.3 — Ripple delete and roll edit store behaviour.
 *
 * Ripple delete:
 *   - removes the target and shifts later segments left by its duration
 *   - leaves earlier segments and overlaps untouched
 *   - refuses to ripple a locked segment
 *   - cleans up multi-select + relay references
 *
 * Roll edit:
 *   - transfers duration between adjacent left/right clips
 *   - keeps total timeline length constant
 *   - clamps delta so neither clip drops below 0.5s
 *   - no-op when the two clips aren't actually adjacent
 *   - no-op when either clip is locked
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from "@melite-plugin/timeline/ui/store"

beforeEach(() => {
  useTimelineStore.getState().reset()
})

/** Build three contiguous segments [0,5] [5,5] [10,5] and return ids. */
function setupThreeContiguous() {
  const a = useTimelineStore.getState().addSegment({ duration: 5 })
  const b = useTimelineStore.getState().addSegment({ duration: 5 })
  const c = useTimelineStore.getState().addSegment({ duration: 5 })
  // addSegment defaults start = order*5; force contiguous to be sure.
  useTimelineStore.getState().updateSegment(a.id, { start: 0, duration: 5 })
  useTimelineStore.getState().updateSegment(b.id, { start: 5, duration: 5 })
  useTimelineStore.getState().updateSegment(c.id, { start: 10, duration: 5 })
  return { a, b, c }
}

describe('E2.3 — rippleDelete', () => {
  it('removes the target and shifts later segments left by its duration', () => {
    const { a, b, c } = setupThreeContiguous()
    // Ripple B (the middle). C should shift from start=10 to start=5.
    useTimelineStore.getState().rippleDelete(b.id)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(2)
    const aAfter = segs.find(s => s.id === a.id)!
    const cAfter = segs.find(s => s.id === c.id)!
    expect(aAfter.start).toBe(0)       // untouched
    expect(aAfter.duration).toBe(5)
    expect(cAfter.start).toBe(5)       // shifted left by B's 5s
    expect(cAfter.duration).toBe(5)
  })

  it('leaves earlier segments untouched', () => {
    const { a, b } = setupThreeContiguous()
    useTimelineStore.getState().rippleDelete(b.id)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    expect(aAfter.start).toBe(0)
    expect(aAfter.duration).toBe(5)
  })

  it('does not shift segments that started before the target end (overlaps)', () => {
    // Overlapping layout: A=[0,5], B=[3,5] (overlaps A's tail), C=[8,5]
    const a = useTimelineStore.getState().addSegment({ duration: 5 })
    const b = useTimelineStore.getState().addSegment({ duration: 5 })
    const c = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().updateSegment(a.id, { start: 0 })
    useTimelineStore.getState().updateSegment(b.id, { start: 3 })
    useTimelineStore.getState().updateSegment(c.id, { start: 8 })
    // Ripple B. B's end is 8. C starts at 8 so C shifts by 5 → 3.
    // A starts at 0 (< 8), so A is untouched even though it overlapped B.
    useTimelineStore.getState().rippleDelete(b.id)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    const cAfter = useTimelineStore.getState().segments.find(s => s.id === c.id)!
    expect(aAfter.start).toBe(0)
    expect(cAfter.start).toBe(3)
  })

  it('refuses to ripple a locked segment', () => {
    const { b } = setupThreeContiguous()
    useTimelineStore.getState().toggleSegmentLock(b.id)
    useTimelineStore.getState().rippleDelete(b.id)
    // B is still there.
    expect(useTimelineStore.getState().segments).toHaveLength(3)
  })

  it('clears the deleted segment from multi-select', () => {
    const { b, c } = setupThreeContiguous()
    useTimelineStore.getState().toggleSegmentInSelection(b.id)
    useTimelineStore.getState().toggleSegmentInSelection(c.id)
    expect(useTimelineStore.getState().selectedSegmentIds.has(b.id)).toBe(true)
    useTimelineStore.getState().rippleDelete(b.id)
    expect(useTimelineStore.getState().selectedSegmentIds.has(b.id)).toBe(false)
    expect(useTimelineStore.getState().selectedSegmentIds.has(c.id)).toBe(true)
  })
})

describe('E2.3 — rollEdit', () => {
  it('transfers duration from right to left when delta > 0', () => {
    const { a, b } = setupThreeContiguous()
    useTimelineStore.getState().rollEdit(a.id, b.id, 1.5)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    const bAfter = useTimelineStore.getState().segments.find(s => s.id === b.id)!
    // Left grows by 1.5s; right shrinks and shifts by 1.5s.
    expect(aAfter.duration).toBeCloseTo(6.5, 5)
    expect(bAfter.start).toBeCloseTo(6.5, 5)
    expect(bAfter.duration).toBeCloseTo(3.5, 5)
    // Total length preserved: aAfter end == bAfter end == 10s.
    expect(aAfter.start + aAfter.duration + bAfter.duration).toBeCloseTo(10, 5)
  })

  it('transfers duration from left to right when delta < 0', () => {
    const { a, b } = setupThreeContiguous()
    useTimelineStore.getState().rollEdit(a.id, b.id, -2)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    const bAfter = useTimelineStore.getState().segments.find(s => s.id === b.id)!
    expect(aAfter.duration).toBeCloseTo(3, 5)
    expect(bAfter.start).toBeCloseTo(3, 5)
    expect(bAfter.duration).toBeCloseTo(7, 5)
  })

  it('clamps delta so neither clip drops below 0.5s', () => {
    const { a, b } = setupThreeContiguous()
    // Try to grow A by 100s — should clamp to (B.dur - 0.5) = 4.5s.
    useTimelineStore.getState().rollEdit(a.id, b.id, 100)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    const bAfter = useTimelineStore.getState().segments.find(s => s.id === b.id)!
    expect(aAfter.duration).toBeCloseTo(9.5, 5)
    expect(bAfter.duration).toBeCloseTo(0.5, 5)
  })

  it('clamps negative delta so left clip keeps at least 0.5s', () => {
    const { a, b } = setupThreeContiguous()
    useTimelineStore.getState().rollEdit(a.id, b.id, -100)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    const bAfter = useTimelineStore.getState().segments.find(s => s.id === b.id)!
    expect(aAfter.duration).toBeCloseTo(0.5, 5)
    expect(bAfter.duration).toBeCloseTo(9.5, 5)
  })

  it('is a no-op when the two clips are not adjacent', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 2 })
    const b = useTimelineStore.getState().addSegment({ duration: 2 })
    // Place a gap between them: A=[0,2], B=[10,2]
    useTimelineStore.getState().updateSegment(a.id, { start: 0 })
    useTimelineStore.getState().updateSegment(b.id, { start: 10 })
    useTimelineStore.getState().rollEdit(a.id, b.id, 1)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    expect(aAfter.duration).toBe(2)  // unchanged
  })

  it('is a no-op when either clip is locked', () => {
    const { a, b } = setupThreeContiguous()
    useTimelineStore.getState().toggleSegmentLock(b.id)
    useTimelineStore.getState().rollEdit(a.id, b.id, 1.5)
    const aAfter = useTimelineStore.getState().segments.find(s => s.id === a.id)!
    expect(aAfter.duration).toBe(5)  // unchanged
  })

  it('zero delta is a no-op (does not push history)', () => {
    const { a, b } = setupThreeContiguous()
    const before = useTimelineStore.getState().segments
    useTimelineStore.getState().rollEdit(a.id, b.id, 0)
    const after = useTimelineStore.getState().segments
    // Reference-equal segments array → no state change.
    expect(after).toBe(before)
  })
})
