import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the 2511 edit segment reads. */
export type EditFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "TextEncodeQwenImageEditPlus";
    readonly max_images: number;
};
/** The gated params doc the edit segment reads (the card's schema
 *  walk validated types and bounds; the bag/region rows ride beneath
 *  flat params exactly as the card schema declares them). */
export type EditParams = Record<string, unknown>;
/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted encoder class (the 2.1 key on this
 *  family's row) refuses here — the legacy lane's silent else-branch
 *  would have built this lane on wrong weights. `max_images` is the
 *  stock node's own truth (image1/2/3 — 3 total) and floors at 1.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseEditFacts(raw: LaneInputsFacts): EditFacts;
export declare const edit: ComfyActionSpec<EditParams, EditFacts>;
//# sourceMappingURL=actions.d.ts.map
