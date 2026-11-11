import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action builds the H3-Image
 *  conditioning graph, and anything else at the door is drift, not
 *  a route. */
export type T2IFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "MiniMaxH3ImageConditioning";
};
/** The gated params doc the t2i segment reads (the card's schema
 *  walk validated types and bounds — a same-process typed
 *  boundary). negative_prompt: the lane zeroes the negative by
 *  design (ConditioningZeroOut at cfg 1) — a stated non-empty
 *  value refuses below, never drops silently. */
export type T2IParams = {
    prompt: string;
    negative_prompt?: string | null;
    width: number;
    height: number;
    seed: number;
    steps: number;
    cfg: number;
    sampler: string;
    scheduler: string;
};
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown conditioning class refuses here, never
 *  silently routes to a stock lane. Every read rides the typed lane
 *  reader built off the resolved row — a key the DECL never
 *  declared refuses loud.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @param model the resolved model row (its lane_inputs ∪ every
 *   variant's own is the DECL's declared key set)
 *  @returns the typed facts the segment factory reads */
export declare function parseT2IFacts(raw: LaneInputsFacts, model: ModelFacts): T2IFacts;
/** The text-to-image action: the official H3-Image template — ONE
 *  MiniMaxH3ImageConditioning at the stated canvas (the node's own
 *  area law: ~2048x2048 working area, 32-multiple canvas), the
 *  negative zeroed, KSampler on the conditioning's OWN emitted
 *  latent (its second output — the node sizes the canvas latent
 *  from its own width/height inputs), decode + save under
 *  <run>/gen. Reference pictures ride the EDIT sibling
 *  (h3-image-edit, the image-edit card) — this t2i lane is
 *  prompt-only (the phantom-port law: the image-gen reference
 *  seat fires on qwen-img-21 alone). */
export declare const t2i: ComfyActionSpec<T2IParams, T2IFacts>;
//# sourceMappingURL=actions.d.ts.map
