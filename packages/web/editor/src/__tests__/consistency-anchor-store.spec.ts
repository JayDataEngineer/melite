/**
 * E3.5 — Consistency anchor store tests (data layer).
 *
 * Covers:
 *  - Global anchor set / clear / persistence round-trip.
 *  - Effective anchor resolution: per-segment override > global > null.
 *  - Unknown segment id → effective anchor falls back to global.
 *  - Persistence: the anchor's b64 is stripped to a TLB: blob ref on
 *    save and restored on load (verified via the localStorage metadata).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore, flushPersist } from "@melite-plugin/timeline/ui/store"
import type { ConsistencyAnchor } from "@melite/contracts"

beforeEach(async () => {
  await flushPersist()
  useTimelineStore.getState().reset()
  localStorage.clear()
})

const ANCHOR: ConsistencyAnchor = {
  assetId: 'asset_face_1',
  b64: 'data:image/png;base64,FACEIMG',
}
const OVERRIDE: ConsistencyAnchor = {
  assetId: 'asset_face_2',
  b64: 'data:image/png;base64,OTHERFACE',
}

describe('E3.5 — Global consistency anchor', () => {
  it('starts null', () => {
    expect(useTimelineStore.getState().globalConsistencyAnchor).toBeNull()
  })

  it('setGlobalConsistencyAnchor stores the anchor', () => {
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().globalConsistencyAnchor).toEqual(ANCHOR)
  })

  it('setGlobalConsistencyAnchor(null) clears the anchor', () => {
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    useTimelineStore.getState().setGlobalConsistencyAnchor(null)
    expect(useTimelineStore.getState().globalConsistencyAnchor).toBeNull()
  })

  it('reset() clears the anchor', async () => {
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    await flushPersist()
    useTimelineStore.getState().reset()
    expect(useTimelineStore.getState().globalConsistencyAnchor).toBeNull()
  })
})

describe('E3.5 — getEffectiveConsistencyAnchor (inheritance)', () => {
  it('returns null when no global or per-segment anchor is set', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(seg.id)).toBeNull()
  })

  it('returns the global anchor when no per-segment override exists', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(seg.id)).toEqual(ANCHOR)
  })

  it('returns the per-segment override when it exists (beats global)', () => {
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      consistencyAnchor: OVERRIDE,
    })
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(seg.id)).toEqual(OVERRIDE)
  })

  it('returns the global anchor for a segment with consistencyAnchor: null', () => {
    // Explicit null on the segment is treated as "inherit global", NOT as
    // "no anchor". This lets users clear an override without losing the
    // global reference.
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      consistencyAnchor: null,
    })
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(seg.id)).toEqual(ANCHOR)
  })

  it('falls back to global for an unknown segment id', () => {
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor('seg_unknown')).toEqual(ANCHOR)
  })

  it('returns null for unknown segment id when no global anchor is set', () => {
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor('seg_unknown')).toBeNull()
  })

  it('different segments can have different effective anchors', () => {
    const segA = useTimelineStore.getState().addSegment({
      duration: 5,
      consistencyAnchor: OVERRIDE,
    })
    const segB = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(segA.id)).toEqual(OVERRIDE)
    expect(useTimelineStore.getState().getEffectiveConsistencyAnchor(segB.id)).toEqual(ANCHOR)
  })
})

describe('E3.5 — Consistency anchor persistence', () => {
  it('global anchor b64 is stripped to a TLB: blob ref on persist', async () => {
    useTimelineStore.getState().setGlobalConsistencyAnchor(ANCHOR)
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).not.toBeNull()
    const meta = JSON.parse(raw!)
    expect(meta.globalConsistencyAnchor).toBeDefined()
    expect(meta.globalConsistencyAnchor.assetId).toBe('asset_face_1')
    // The b64 data URL should have been replaced with a TLB: ref.
    expect(meta.globalConsistencyAnchor.b64).toMatch(/^TLB:anchor_global$/)
  })

  it('null anchor persists as null (no blob key)', async () => {
    // Add a segment so schedulePersist has something to flush (flushPersist
    // only writes when there's a pending debounced write).
    useTimelineStore.getState().addSegment({ duration: 5 })
    await flushPersist()
    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).not.toBeNull()
    const meta = JSON.parse(raw!)
    expect(meta.globalConsistencyAnchor).toBeNull()
  })

  it('per-segment override anchor is NOT stripped (lives on the segment)', async () => {
    // Per-segment anchors ride on the segment's persistence path — they're
    // NOT in BLOB_FIELDS, so they persist inline as data URLs. This test
    // documents that contract: the segment's consistencyAnchor.b64 stays
    // a data URL in the metadata (it's the global one that gets stripped).
    useTimelineStore.getState().addSegment({
      duration: 5,
      consistencyAnchor: OVERRIDE,
    })
    await flushPersist()
    const raw = localStorage.getItem('tech_noir_timeline')
    const meta = JSON.parse(raw!)
    const seg = meta.segments[0]
    expect(seg.consistencyAnchor).toEqual(OVERRIDE)
    expect(seg.consistencyAnchor.b64).toBe('data:image/png;base64,OTHERFACE')
  })
})
