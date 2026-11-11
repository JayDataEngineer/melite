import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the H3-Image edit segment reads. */
export type EditFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "MiniMaxH3ImageConditioning";
    readonly max_images: number;
};
/** The gated params doc the edit segment reads (the card's schema
 *  walk validated types and bounds; the legacy alias rows ride
 *  beneath flat params exactly as the card schema declares them). */
export type EditParams = Record<string, unknown>;
/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted conditioning class refuses here, never
 *  silently routes to another lane's topology. `max_images` is the
 *  node's own truth (100 autogrow slots, anchor included) and
 *  floors at 1 — a degenerate cap is a DECL bug. Every read rides
 *  the typed lane reader built off the resolved row — a key the
 *  DECL never declared refuses loud.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @param model the resolved model row (its lane_inputs ∪ every
 *   variant's own is the DECL's declared key set)
 *  @returns the typed facts the segment factory reads */
export declare function parseEditFacts(raw: LaneInputsFacts, model: ModelFacts): EditFacts;
/** The edit action: the official H3-Image template lane — loaders →
 *  lora stack → text pair → per-picture pre-scale (4MP + 32-snap)
 *  → MiniMaxH3ImageConditioning (vae connected: reference latents
 *  anchor identity; the prompt cites <Picture n>) with the canvas
 *  sized by the scaled anchor (GetImageSize) or the stated pair →
 *  ConditioningZeroOut negative → KSampler on the conditioning's
 *  OWN latent → decode + save under <run>/edit. */
export declare const edit: ComfyActionSpec<EditParams, EditFacts>;
//# sourceMappingURL=actions.d.ts.map
