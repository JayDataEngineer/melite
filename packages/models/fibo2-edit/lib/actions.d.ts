import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the Fibo 2.0 edit segment reads. */
export type EditFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "TextEncodeFibo2";
    readonly max_images: number;
};
/** The gated params doc the edit segment reads (the card's schema
 *  walk validated types and bounds; the bag/region rows ride beneath
 *  flat params exactly as the card schema declares them). */
export type EditParams = Record<string, unknown>;
/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted encoder class refuses here, never
 *  silently routes to another lane's topology. `max_images` is the
 *  node's own truth (16 total, anchor included) and floors at 1 —
 *  a degenerate cap is a DECL bug.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseEditFacts(raw: LaneInputsFacts): EditFacts;
/** The edit action: the Fibo 2.0 lane — loaders → lora stack → text
 *  pair → per-slot LoadImage anchors → TextEncodeFibo2 (the vae seat
 *  connected: reference latents splice into BOTH conditionings; an
 *  empty negative rides the trained null caption) → EITHER the
 *  region detailer tail (mask_mode crop_stitch) OR KSampler on the
 *  encoder's own emitted latent → decode + save under <run>/edit. */
export declare const edit: ComfyActionSpec<EditParams, EditFacts>;
//# sourceMappingURL=actions.d.ts.map