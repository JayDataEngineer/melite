/**
 * E2.6 — Segment lock & group behavior in the timeline store.
 *
 * Lock:
 *   - toggleSegmentLock flips `locked`
 *   - removeSegment refuses to remove a locked segment
 *
 * Group:
 *   - groupSelectedSegments returns a groupId and stamps it on every
 *     selected segment
 *   - ungroupSegments clears the groupId
 *   - grouping <2 segments is a no-op (returns null)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from "@melite-plugin/timeline/ui/store"

beforeEach(() => {
  useTimelineStore.getState().reset()
})

describe('E2.6 — toggleSegmentLock', () => {
  it('flips locked false → true', () => {
    const s = useTimelineStore.getState().addSegment({ duration: 2 })
    expect(s.locked).toBeFalsy()
    const nowLocked = useTimelineStore.getState().toggleSegmentLock(s.id)
    expect(nowLocked).toBe(true)
    const after = useTimelineStore.getState().segments.find(x => x.id === s.id)
    expect(after?.locked).toBe(true)
  })

  it('flips locked true → false on second toggle', () => {
    const s = useTimelineStore.getState().addSegment({ duration: 2 })
    useTimelineStore.getState().toggleSegmentLock(s.id)
    const stillLocked = useTimelineStore.getState().toggleSegmentLock(s.id)
    expect(stillLocked).toBe(false)
  })
})

describe('E2.6 — removeSegment respects lock', () => {
  it('removes an unlocked segment normally', () => {
    const s = useTimelineStore.getState().addSegment({ duration: 2 })
    useTimelineStore.getState().removeSegment(s.id)
    expect(useTimelineStore.getState().segments).toHaveLength(0)
  })

  it('refuses to remove a locked segment', () => {
    const s = useTimelineStore.getState().addSegment({ duration: 2 })
    useTimelineStore.getState().toggleSegmentLock(s.id)
    useTimelineStore.getState().removeSegment(s.id)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe(s.id)
  })
})

describe('E2.6 — groupSelectedSegments', () => {
  it('returns null when only one segment is selected', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 2 })
    useTimelineStore.getState().setSelectedSegment(a.id)
    expect(useTimelineStore.getState().groupSelectedSegments()).toBeNull()
  })

  it('returns null when nothing is selected', () => {
    useTimelineStore.getState().addSegment({ duration: 2 })
    useTimelineStore.getState().addSegment({ duration: 2 })
    expect(useTimelineStore.getState().groupSelectedSegments()).toBeNull()
  })

  it('stamps every selected segment with the same groupId', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 2 })
    const b = useTimelineStore.getState().addSegment({ duration: 2 })
    const c = useTimelineStore.getState().addSegment({ duration: 2 })
    const st = useTimelineStore.getState()
    st.toggleSegmentInSelection(a.id)
    st.toggleSegmentInSelection(b.id)
    st.toggleSegmentInSelection(c.id)
    const gid = useTimelineStore.getState().groupSelectedSegments()
    expect(gid).toBeTruthy()
    const segs = useTimelineStore.getState().segments
    expect(segs.every(s => s.groupId === gid)).toBe(true)
  })

  it('ungroupSegments clears the groupId', () => {
    const a = useTimelineStore.getState().addSegment({ duration: 2 })
    const b = useTimelineStore.getState().addSegment({ duration: 2 })
    const st = useTimelineStore.getState()
    st.toggleSegmentInSelection(a.id)
    st.toggleSegmentInSelection(b.id)
    const gid = useTimelineStore.getState().groupSelectedSegments()
    useTimelineStore.getState().ungroupSegments(gid!)
    const segs = useTimelineStore.getState().segments
    expect(segs.every(s => s.groupId == null)).toBe(true)
  })
})
