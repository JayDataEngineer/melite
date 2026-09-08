/**
 * E3.2 — Variant CRUD tests for the timeline store.
 *
 * Covers:
 *  - addVariant stores a variant with minted id + createdAt
 *  - addVariant creates the variants[] array if missing
 *  - FIFO eviction past MAX_VARIANTS_PER_SEGMENT (4)
 *  - removeVariant removes a single variant by id
 *  - removeVariant is a no-op for unknown variant id
 *  - promoteVariant swaps videoUrl + demotes outgoing primary
 *  - promoteVariant demotes with the segment's seed
 *  - setVariants bulk-writes + evicts
 *  - Unknown segId is a no-op for all three operations
 *  - Variants are persisted through the strip/restore blob flow
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  useTimelineStore,
  flushPersist,
  MAX_VARIANTS_PER_SEGMENT,
} from "@melite-plugin/timeline/ui/store"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts"
import type { VideoVariant } from "@melite/contracts"

beforeEach(async () => {
  await flushPersist()
  useTimelineStore.getState().reset()
  localStorage.clear()
})

function makeVariant(seed: number, suffix = ''): Omit<VideoVariant, 'id' | 'createdAt'> {
  return {
    seed,
    videoUrl: `data:video/mp4;base64,AAAA${suffix}`,
    thumbnailUrl: `data:image/png;base64,TTTT${suffix}`,
    assetId: `asset_${seed}`,
  }
}

describe('E3.3 — Variant kind discriminator', () => {
  it('addVariant defaults kind to "seed" when not provided', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    const stored = useTimelineStore.getState().addVariant(seg.id, makeVariant(42))
    expect(stored!.kind).toBe('seed')
  })

  it('addVariant preserves an explicit kind', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    const stored = useTimelineStore.getState().addVariant(seg.id, {
      ...makeVariant(99),
      kind: 'retake',
    })
    expect(stored!.kind).toBe('retake')
  })

  it('setVariants defaults kind to "seed" when not provided', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setVariants(seg.id, [makeVariant(1), makeVariant(2)])
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants?.every((v) => v.kind === 'seed')).toBe(true)
  })

  it('setVariants preserves explicit kinds per variant', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setVariants(seg.id, [
      { ...makeVariant(1), kind: 'seed' },
      { ...makeVariant(2), kind: 'retake' },
      { ...makeVariant(3), kind: 'lipsync' },
    ])
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants?.map((v) => v.kind)).toEqual(['seed', 'retake', 'lipsync'])
  })

  it('promoteVariant demotes the outgoing primary with kind="seed"', () => {
    // Promote a kind='retake' variant; the demoted primary should land
    // back in the list with kind='seed' (we lose primary provenance).
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      videoUrl: 'data:video/mp4;base64,PRIMARY',
      params: { ...DEFAULT_SEGMENT_PARAMS, seed: 7 },
      status: 'ready',
    })
    const variant = useTimelineStore.getState().addVariant(seg.id, {
      ...makeVariant(99),
      kind: 'retake',
    })!
    useTimelineStore.getState().promoteVariant(seg.id, variant.id)
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    // Promoted retake is now the primary.
    expect(after.videoUrl).toBe(variant.videoUrl)
    expect(after.variants).toHaveLength(1)
    // The demoted primary lands with kind='seed' (information loss is
    // expected for the primary slot — see promoteVariant comment).
    expect(after.variants![0].kind).toBe('seed')
  })

  it('promoted variant is removed from the list regardless of kind', () => {
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      videoUrl: 'data:video/mp4;base64,PRIMARY',
      status: 'ready',
    })
    const v1 = useTimelineStore.getState().addVariant(seg.id, { ...makeVariant(1), kind: 'lipsync' })!
    const v2 = useTimelineStore.getState().addVariant(seg.id, { ...makeVariant(2), kind: 'retake' })!
    useTimelineStore.getState().promoteVariant(seg.id, v1.id)
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    // v1 promoted out, primary demoted in, v2 still in list.
    expect(after.variants!.find((v) => v.id === v1.id)).toBeUndefined()
    expect(after.variants!.find((v) => v.id === v2.id)).toBeDefined()
    expect(after.variants!.find((v) => v.id === v2.id)!.kind).toBe('retake')
  })
})

describe('E3.2 — Variant CRUD', () => {
  it('addVariant stores a variant with minted id + createdAt', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    const stored = useTimelineStore.getState().addVariant(seg.id, makeVariant(42))
    expect(stored).not.toBeNull()
    expect(stored!.id).toBeTruthy()
    expect(stored!.id).toMatch(/^var_/)
    expect(stored!.seed).toBe(42)
    expect(stored!.createdAt).toBeGreaterThan(0)
    expect(stored!.videoUrl).toMatch(/^data:video\/mp4/)
    expect(stored!.thumbnailUrl).toMatch(/^data:image\/png/)

    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants).toHaveLength(1)
    expect(after.variants![0].id).toBe(stored!.id)
  })

  it('addVariant creates variants[] when missing', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    expect(seg.variants).toBeUndefined()
    useTimelineStore.getState().addVariant(seg.id, makeVariant(1))
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(Array.isArray(after.variants)).toBe(true)
    expect(after.variants).toHaveLength(1)
  })

  it(`FIFO eviction past MAX_VARIANTS_PER_SEGMENT (${MAX_VARIANTS_PER_SEGMENT})`, () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    // Add MAX + 2 to confirm both overflow entries drop from the front.
    const ids: string[] = []
    for (let i = 0; i < MAX_VARIANTS_PER_SEGMENT + 2; i++) {
      const v = useTimelineStore.getState().addVariant(seg.id, makeVariant(i))
      ids.push(v!.id)
    }
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants).toHaveLength(MAX_VARIANTS_PER_SEGMENT)
    // FIFO: the first two should have been dropped.
    expect(after.variants!.map((v) => v.id)).toEqual(ids.slice(2))
  })

  it('removeVariant removes a single variant by id', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    const a = useTimelineStore.getState().addVariant(seg.id, makeVariant(1))
    const b = useTimelineStore.getState().addVariant(seg.id, makeVariant(2))
    useTimelineStore.getState().removeVariant(seg.id, a!.id)
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants).toHaveLength(1)
    expect(after.variants![0].id).toBe(b!.id)
  })

  it('removeVariant is a no-op for unknown variant id', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().addVariant(seg.id, makeVariant(1))
    useTimelineStore.getState().removeVariant(seg.id, 'var_does_not_exist')
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants).toHaveLength(1)
  })

  it('removeVariant is a no-op for unknown segment id', () => {
    useTimelineStore.getState().addSegment({ duration: 5 })
    const before = useTimelineStore.getState().segments
    useTimelineStore.getState().removeVariant('seg_unknown', 'var_x')
    expect(useTimelineStore.getState().segments).toBe(before)
  })

  it('promoteVariant swaps videoUrl + demotes outgoing primary', () => {
    // Primary has videoUrl=primaryURL with seed 7. Add a variant, then
    // promote it: variant's URL becomes primary, primary demotes into
    // variants[] with the segment's seed (7).
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      videoUrl: 'data:video/mp4;base64,PRIMARY',
      thumbnailUrl: 'data:image/png;base64,PRIMARY_THUMB',
      params: { ...DEFAULT_SEGMENT_PARAMS, seed: 7 },
      status: 'ready',
    })
    const variant = useTimelineStore.getState().addVariant(seg.id, makeVariant(99, 'V'))
    useTimelineStore.getState().promoteVariant(seg.id, variant!.id)

    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    // Promoted variant's videoUrl is now the primary.
    expect(after.videoUrl).toBe(variant!.videoUrl)
    expect(after.thumbnailUrl).toBe(variant!.thumbnailUrl)
    expect(after.params.seed).toBe(99) // promoted seed reflected in params
    expect(after.status).toBe('ready')
    // The variant list no longer contains the promoted entry.
    expect(after.variants!.find((v) => v.id === variant!.id)).toBeUndefined()
    // The outgoing primary was demoted as a NEW variant entry.
    expect(after.variants).toHaveLength(1)
    const demoted = after.variants![0]
    expect(demoted.videoUrl).toBe('data:video/mp4;base64,PRIMARY')
    expect(demoted.thumbnailUrl).toBe('data:image/png;base64,PRIMARY_THUMB')
    expect(demoted.seed).toBe(7) // outgoing segment's seed
    expect(demoted.id).not.toBe(variant!.id) // minted fresh
  })

  it('promoteVariant without an existing primary just promotes (no demote)', () => {
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      videoUrl: null,
    })
    const variant = useTimelineStore.getState().addVariant(seg.id, makeVariant(11))
    useTimelineStore.getState().promoteVariant(seg.id, variant!.id)
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.videoUrl).toBe(variant!.videoUrl)
    // No demotion because there was no primary; promoted variant removed from list.
    expect(after.variants).toHaveLength(0)
  })

  it('promoteVariant is a no-op for unknown variant id', () => {
    const seg = useTimelineStore.getState().addSegment({
      duration: 5,
      videoUrl: 'data:video/mp4;base64,PRIMARY',
    })
    useTimelineStore.getState().addVariant(seg.id, makeVariant(1))
    useTimelineStore.getState().promoteVariant(seg.id, 'var_unknown')
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.videoUrl).toBe('data:video/mp4;base64,PRIMARY') // unchanged
    expect(after.variants).toHaveLength(1) // unchanged
  })

  it('setVariants bulk-writes and applies eviction', () => {
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    const bulk = Array.from({ length: MAX_VARIANTS_PER_SEGMENT + 3 }, (_, i) =>
      makeVariant(i, `_${i}`),
    )
    useTimelineStore.getState().setVariants(seg.id, bulk)
    const after = useTimelineStore.getState().segments.find((s) => s.id === seg.id)!
    expect(after.variants).toHaveLength(MAX_VARIANTS_PER_SEGMENT)
    // FIFO: the first 3 dropped, last MAX_VARIANTS_PER_SEGMENT kept.
    expect(after.variants!.map((v) => v.seed)).toEqual(
      [3, 4, 5, 6],
    )
  })

  it('setVariants is a no-op for unknown segment id', () => {
    const before = useTimelineStore.getState().segments
    useTimelineStore.getState().setVariants('seg_unknown', [makeVariant(1)])
    expect(useTimelineStore.getState().segments).toBe(before)
  })

  it('addVariant is a no-op for unknown segment id', () => {
    const result = useTimelineStore.getState().addVariant('seg_unknown', makeVariant(1))
    expect(result).toBeNull()
  })
})

describe('E3.2 — Variant persistence', () => {
  it('variants survive a strip/restore round-trip through persist+load', async () => {
    // Build a segment with two variants, kick off a debounced persist, and
    // flush immediately so the blob save resolves before we read back.
    const seg = useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().addVariant(seg.id, makeVariant(1, 'ONE'))
    useTimelineStore.getState().addVariant(seg.id, makeVariant(2, 'TWO'))
    await flushPersist()

    // The persisted metadata in localStorage should contain the variants
    // array (with data: URLs stripped to blob refs).
    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).not.toBeNull()
    const meta = JSON.parse(raw!)
    const persisted = meta.segments.find((s: any) => s.id === seg.id)
    expect(persisted).toBeDefined()
    expect(persisted.variants).toHaveLength(2)
    // All variant blobs should have been replaced with TLB: refs.
    for (const v of persisted.variants) {
      expect(v.videoUrl).toMatch(/^TLB:var_/)
      expect(v.thumbnailUrl).toMatch(/^TLB:var_/)
    }
  })
})
