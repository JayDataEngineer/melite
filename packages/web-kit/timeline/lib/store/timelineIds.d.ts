/**
 * store/timelineIds — id minting for the timeline document (split from
 * timelineStore.ts; pure move, no logic changes).
 */
import type { VideoVariant } from "@melite/contracts";
export declare let _nextId: number;
export declare function uid(): string;
export declare let _nextVariantId: number;
export declare function variantUid(): string;
export declare const MAX_VARIANTS_PER_SEGMENT = 4;
/** E3.2: Input shape for addVariant/setVariants. The store mints `id`
 *  and `createdAt` if absent; callers may pass their own (e.g. tests). */
export type VariantInput = Omit<VideoVariant, 'id' | 'createdAt'> & Partial<Pick<VideoVariant, 'id' | 'createdAt'>>;
/**
 * Bump the `uid` counter past every loaded `seg_<n>_` id so fresh ids
 * never collide with restored ones. Called by `initialize`; the loop is
 * a verbatim move from the store root (the counter lives in this module).
 */
export declare function syncUidCounter(allIds: string[]): void;
