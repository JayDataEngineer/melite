/**
 * store/variants — createVariantSlice (split from timelineStore.ts; pure move,
 * no logic changes).
 */
import type { VideoVariant } from "@melite/contracts"
import type { GetState, SetState } from "./createStore.ts"
import { MAX_VARIANTS_PER_SEGMENT, variantUid } from "./timelineIds.ts"
// the segment defaults are the CONTRACTS' (the same owner
// timelinePersistence and timelineSegments read — one default table)
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts"
import type { VariantInput } from "./timelineIds.ts"
import { pushHistory } from "./timelineHistory.ts"
import { schedulePersist } from "./timelinePersistence.ts"
import type { TimelineStore } from "./timelineStoreTypes.ts"

export function createVariantSlice(
  set: SetState<TimelineStore>,
  get: GetState<TimelineStore>,
): Pick<TimelineStore, "addVariant" | "removeVariant" | "promoteVariant" | "setVariants"> {
  return {
  // ── E3.2: Variant CRUD ────────────────────────────────────────────────────
  // These power the "Generate 4" → picker flow. Variants are stored on the
  // segment as `variants: VideoVariant[]`; the segment's primary `videoUrl`
  // is independent until the user explicitly promotes a variant. Eviction
  // is FIFO beyond MAX_VARIANTS_PER_SEGMENT so the picker never grows
  // unbounded (mirrors E1.3's "keep last 4 per segment" eviction policy).
  addVariant: (segId, variant) => {
    // Check segment existence BEFORE minting an id, so unknown segId is a
    // clean no-op that returns null (callers can detect the failure).
    if (!get().segments.some((seg) => seg.id === segId)) return null
    const stored: VideoVariant = {
      id: variant.id ?? variantUid(),
      seed: variant.seed,
      videoUrl: variant.videoUrl,
      assetId: variant.assetId,
      createdAt: variant.createdAt ?? Date.now(),
      thumbnailUrl: variant.thumbnailUrl ?? null,
      // E3.3: default to 'seed' for back-compat with E3.2 callers + the
      // Generate-4 flow. Retake/lipsync/manual explicitly set their kind.
      kind: variant.kind ?? 'seed',
    }
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      // Proven dead (2026-09-12): the caller synchronously verified the
      // target via get() and returned null otherwise; no await or
      // re-entrancy sits between, so the updater always finds it.
      /* v8 ignore next -- target always exists: sync get-then-set, no interleave (2026-09-12) */
      if (!target) return {}
      const existing = Array.isArray(target.variants) ? [...target.variants] : []
      existing.push(stored)
      // FIFO eviction past the cap (drop the oldest by createdAt).
      while (existing.length > MAX_VARIANTS_PER_SEGMENT) {
        existing.shift()
      }
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: existing } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
    return stored
  },

  removeVariant: (segId, variantId) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target || !Array.isArray(target.variants)) return {}
      const next = target.variants.filter((v) => v.id !== variantId)
      if (next.length === target.variants.length) return {} // no-op
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: next } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  promoteVariant: (segId, variantId) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target || !Array.isArray(target.variants)) return {}
      const promoted = target.variants.find((v) => v.id === variantId)
      if (!promoted) return {}
      // Demote the outgoing primary into the variants list as a fresh
      // variant entry. We mint a new id (not reuse the promoted variant's
      // id) so the entry has a stable identity in the picker UI. The seed
      // comes from the segment's params (the seed used to generate the
      // current primary); if absent, fall back to 0. E3.3: the demoted
      // entry's kind defaults to 'seed' — we don't track the primary's
      // provenance separately, so this loses kind info on demote. That's
      // acceptable: variants IN the list always carry their true kind.
      const demotedEntry: VideoVariant | null = target.videoUrl
        ? {
            id: variantUid(),
            // THE FAMILY DEFAULT, NOT ZERO (the census's M9): a
            // seedless persisted segment demoted to 0 recorded a REAL
            // deterministic seed 0 — a different render, which the
            // picker then misreports as provenance. The film clock's
            // default lives in DEFAULT_SEGMENT_PARAMS (42).
            seed: target.params?.seed ?? DEFAULT_SEGMENT_PARAMS.seed,
            videoUrl: target.videoUrl,
            assetId: target.assetId,
            createdAt: Date.now(),
            thumbnailUrl: target.thumbnailUrl ?? null,
            kind: 'seed',
          }
        : null
      // Remove the promoted variant from the list, then optionally prepend
      // the demoted primary. Prepending keeps the most recently demoted
      // take at the front of the picker (matches "recents first" UX).
      const remaining = target.variants.filter((v) => v.id !== variantId)
      const nextVariants = demotedEntry ? [demotedEntry, ...remaining] : remaining
      // Eviction still applies — demotion can push us over the cap.
      while (nextVariants.length > MAX_VARIANTS_PER_SEGMENT) {
        nextVariants.pop()
      }
      // Promote: swap primary fields with the variant's. We keep the
      // segment's existing `duration`, `start`, `prompt`, etc. — only the
      // video-asset fields move.
      const segments = s.segments.map((seg) => {
        if (seg.id !== segId) return seg
        return {
          ...seg,
          videoUrl: promoted.videoUrl,
          assetId: promoted.assetId ?? seg.assetId,
          thumbnailUrl: promoted.thumbnailUrl ?? seg.thumbnailUrl,
          // Reflect the promoted seed in params so a subsequent "regenerate"
          // picks up where this take left off.
          params: { ...seg.params, seed: promoted.seed },
          variants: nextVariants,
          status: 'ready' as const,
        }
      })
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  setVariants: (segId, variants) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target) return {}
      const stored: VideoVariant[] = variants.map((v) => ({
        id: v.id ?? variantUid(),
        seed: v.seed,
        videoUrl: v.videoUrl,
        assetId: v.assetId,
        createdAt: v.createdAt ?? Date.now(),
        thumbnailUrl: v.thumbnailUrl ?? null,
        // E3.3: default to 'seed' for back-compat.
        kind: v.kind ?? 'seed',
      }))
      // FIFO eviction past the cap.
      while (stored.length > MAX_VARIANTS_PER_SEGMENT) {
        stored.shift()
      }
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: stored } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },
  }
}
