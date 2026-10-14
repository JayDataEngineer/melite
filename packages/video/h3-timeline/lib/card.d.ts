import type { Context } from '@melite/comfyui-card-kit/card-definition';
import { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract';
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema';
/** The card's boarding roster: ONE family. The retired h3 and
 *  h3-keyframe family packages survive as VARIANT ROUTES on the h3
 *  family (timeline → h3-timeline, fl2va → h3-fl2va, ref2va →
 *  h3-ref2va, timeline-ref2va → h3-timeline-ref, keyframe →
 *  h3-keyframe), so old drafts resolve migration-free. The family is
 *  the CHECKPOINT id `h3` — never a lane name; the card id
 *  `h3-timeline` (the usecase surface) keeps its own name. The id
 *  comes from the family's own DECL, and with it the lane's files. */
export declare const BOARDED: string[];
export declare const VARIANT_ADDRESSES: string[];
/** THE FAMILY ACTION BINDING (the atom vocabulary's video stroke):
 *  the h3 family's declared film action composes the whole lane-true
 *  segment from the gated, lifted doc this card's plane produced —
 *  resolved off the DECL at boarding (the interlock: an unbound
 *  family refuses loud, never a legacy fallback). */
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export declare function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void;
//# sourceMappingURL=card.d.ts.map
