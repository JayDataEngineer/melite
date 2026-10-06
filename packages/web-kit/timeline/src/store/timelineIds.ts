/**
 * store/timelineIds — id minting for the timeline document (split from
 * timelineStore.ts; pure move, no logic changes).
 */
import type { VideoVariant } from "@melite/contracts"

export let _nextId = 1
export function uid(): string {
  return `seg_${_nextId++}_${Date.now().toString(36)}`
}

export let _nextVariantId = 1
export function variantUid(): string {
  return `var_${_nextVariantId++}_${Date.now().toString(36)}`
}

// E3.2: hard cap on retained variants per segment. New variants past this
// count evict the OLDEST non-primary variant (FIFO). Promoting a variant
// does NOT count against this cap (it stays in the list). The primary
// videoUrl is independent of this list — see promoteVariant.
export const MAX_VARIANTS_PER_SEGMENT = 4

/** E3.2: Input shape for addVariant/setVariants. The store mints `id`
 *  and `createdAt` if absent; callers may pass their own (e.g. tests). */
export type VariantInput = Omit<VideoVariant, 'id' | 'createdAt'> &
  Partial<Pick<VideoVariant, 'id' | 'createdAt'>>

/**
 * Bump the `uid` counter past every loaded `seg_<n>_` id so fresh ids
 * never collide with restored ones. Called by `initialize`; the loop is
 * a verbatim move from the store root (the counter lives in this module).
 */
export function syncUidCounter(allIds: string[]): void {
  for (const id of allIds) {
      const numMatch = id.match(/^seg_(\d+)_/)
      if (numMatch) {
        const num = parseInt(numMatch[1], 10)
        if (num >= _nextId) _nextId = num + 1
      }
    }
}
