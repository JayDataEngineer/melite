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
/** The edit action: the anchored instruction-edit lane — loaders →
 *  lora stack → text pair → per-slot LoadImage anchors →
 *  TextEncodeQwenImageEditPlus pair (refs on the stock node's native
 *  image2/image3 optionals) → ModelSamplingAuraFlow 1.0 → the
 *  lanpaint arm, the crop_stitch region detailer, or the plain
 *  VAEEncode-of-source → KSampler → decode + save under <run>/edit. */
export declare const edit: ComfyActionSpec<EditParams, EditFacts>;
//# sourceMappingURL=actions.d.ts.map
