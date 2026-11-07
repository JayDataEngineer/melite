import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action encodes through the stock
 *  CLIPTextEncode over the moss tokenizer (CLIPLoader type
 *  "moss_image"), and anything else at the door is drift, not a
 *  route. The shift IS declared on this lane (5.0 — the template's
 *  own), so the door carries it and the build arms
 *  ModelSamplingAuraFlow on it. */
export type T2IFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly sampling_shift?: number;
    readonly text_encode_node: "CLIPTextEncode";
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
};
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane. Every read rides the typed
 *  lane reader built off the resolved row — a key the DECL never
 *  declared refuses loud.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @param model the resolved model row (its lane_inputs ∪ every
 *   variant's own is the DECL's declared key set)
 *  @returns the typed facts the segment factory reads */
export declare function parseT2IFacts(raw: LaneInputsFacts, model: ModelFacts): T2IFacts;
/** The text-to-image action: the official MOSS-Image template — the
 *  UNETLoader + the declared shift wrap + CLIPLoader (moss_image) +
 *  VAELoader, the CLIPTextEncode pair, EmptyFlux2LatentImage at card
 *  resolution, SLG DISARMED (the template's own default — the
 *  bypass, never the patch node), and the template's plain KSampler
 *  (sampler/scheduler ride the card's knobs, family defaults
 *  er_sde/simple). Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM: MOSS's SFT lane runs live guidance (CFG 3), so a
 * STATED negative_prompt encodes through CLIPTextEncode and bites; a
 * BLANK negative encodes the template's own reference default
 * ("nsfw, worst quality, bad anatomy, watermark, jpeg artifact") —
 * the template never composes a zeroed unconditional (a zeroed
 * negative fed the 2026-11-04 patch-grid artifact burn).
 *
 * No reference arm: the create card takes no reference inputs
 * (operator ruling, 2026-10-11) — a stated reference_images key
 * refuses at the card's gated resolve as an unknown param. */
export declare const t2i: ComfyActionSpec<T2IParams, T2IFacts>;
//# sourceMappingURL=actions.d.ts.map
