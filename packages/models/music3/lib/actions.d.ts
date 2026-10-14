import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the compose segment reads. */
export type MusicFacts = {
    readonly unet: string;
    readonly text_encoder: string;
    readonly clip_type: string;
    readonly vae: string;
};
/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported mint below is a pass-through). */
export type MusicParams = Record<string, unknown>;
/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseMusicFacts(raw: LaneInputsFacts): MusicFacts;
/** The compose action: MiniMax Music 3 — UNET/CLIP/VAE loaders from
 * the family's own weights, MiniMaxMusic3TextEncode on the caption
 * + lyrics, KSampler euler/simple over the empty music latent,
 * VAEDecodeAudio, SaveAudioAdvanced mp3 under <run>/music. */
export declare const compose: ComfyActionSpec<MusicParams, MusicFacts>;
//# sourceMappingURL=actions.d.ts.map
