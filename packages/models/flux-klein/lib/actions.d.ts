import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action encodes through the stock
 *  CLIPTextEncode over the flux2 multimodal tokenizer (CLIPLoader
 *  type "flux2"), and anything else at the door is drift, not a
 *  route. No sampling_shift: FLUX.2's shift is computed by the
 *  Flux2Scheduler node itself from steps and the canvas. */
export type T2IFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "CLIPTextEncode";
    readonly max_references: number;
};
/** The gated params doc the t2i segment reads (the card's schema
 *  walk validated types and bounds — a same-process typed
 *  boundary). */
export type T2IParams = {
    prompt: string;
    negative_prompt?: string;
    width: number;
    height: number;
    seed: number;
    steps: number;
    cfg: number;
    sampler: string;
    scheduler: string;
    reference_images?: string[];
};
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseT2IFacts(raw: LaneInputsFacts): T2IFacts;
/** The text-to-image action: the official FLUX.2 Klein 4B template —
 * UNETLoader + CLIPLoader(flux2) + VAELoader, ONE CLIPTextEncode for
 * the prompt, EmptyFlux2LatentImage at card resolution, and the
 * advanced sampling stack (Flux2Scheduler → KSamplerSelect,
 * RandomNoise, CFGGuider, SamplerCustomAdvanced) the FLUX.2 sigmas
 * require. Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM (the distilled template's own law): a BLANK
 * negative_prompt composes ConditioningZeroOut over the positive —
 * the true unconditional the 4-step distilled checkpoint was trained
 * against (encoding an empty string through the 8GB tokenizer buys
 * nothing); a STATED negative_prompt encodes through CLIPTextEncode —
 * a stated negative is never dropped.
 *
 * THE REFERENCE ARM (006/U1, the reference-guided t2i lane Klein is
 * reference-native for): a stated reference_images list scales each
 * image to 1 megapixel (the official edit template's own scaling),
 * encodes it through the VAE, and chains ReferenceLatent onto the
 * positive conditioning; the FIRST reference's GetImageSize sizes the
 * canvas — width/height wire to nothing on this arm, the same
 * conditional the qwen-img-21 lane carries. */
export declare const t2i: ComfyActionSpec<T2IParams, T2IFacts>;
//# sourceMappingURL=actions.d.ts.map
