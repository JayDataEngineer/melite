import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action builds the 2.1 encoder
 *  graph, and anything else at the door is drift, not a route. */
export type T2IFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly vae: string;
    readonly clip_type: string;
    readonly text_encode_node: "TextEncodeQwenImage21";
    readonly sampling_shift?: number;
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
    /** audit 004/C4 (2026-10-22): the family's own reference seat —
     *  the only t2i whose encoder reads references. Absent/empty
     *  keeps the bare-template graph. */
    reference_images?: string[];
};
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseT2IFacts(raw: LaneInputsFacts): T2IFacts;
/** The text-to-image action: the official 2.1 template — ONE
 *  TextEncodeQwenImage21 emitting positive (out 0) and negative
 *  (out 1), EmptyLatentImage at card resolution, KSampler, decode +
 *  save under <run>/gen. Creation order IS node-id order (the
 *  recipe law) and matches the legacy lane arm exactly. THE
 *  REFERENCE SEAT (audit 004/C4, 2026-10-22 — supersedes the
 *  2026-10-11 no-seat ruling): stated reference_images ride
 *  per-slot LoadImage anchors into the encoder's images.image_N
 *  autogrow slots (the edit lane's proven wiring) with vae on the
 *  encoder for the reference-latent splice; unstated keeps the
 *  bare-template graph byte-identical. */
export declare const t2i: ComfyActionSpec<T2IParams, T2IFacts>;
//# sourceMappingURL=actions.d.ts.map
