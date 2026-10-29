import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { ComfyActionSpec } from '@melite/comfyui-card-kit';
/** THE LORA PLANE'S ONE OWNER (the swap build, 2026-10-28 — operator:
 * "KEEP OUR CURRENT LORA SETUP FOR NOW"): the stack_data string every
 * compose on this family reads — the doc's `loras` mod bag resolved
 * by the service, else the absent-bag family default. The film
 * renderer and the swap renderer (swap.ts) BOTH come through here;
 * neither may hand-roll a stack or a fixed accelerator row.
 * @param p the walked doc params */
export declare function h3LoraStackOf(p: Record<string, unknown>): string;
/** THE MARRIED SHIFT'S ONE OWNER (same law as the lora plane): the
 * sigma-shift grid the doc's lora plane owns — a pinned shift is the
 * user's word, an unstated one marries the bag's highest-count row
 * (marriedBagKnob), else the doc's own row. Both renderers read this.
 * @param p the walked doc params */
export declare function h3ShiftVideoOf(p: Record<string, unknown>): number;
/** The family's lane files that are NOT engine-general members
 * (the complexity floor's stroke 1): the encoder and the two VAEs
 * are invariants of THIS package's lane — no variant varies them,
 * so they live beside the parser that reads them, never in a row
 * a family could drift. The unet alone rides the DECL row: quants
 * and hybrids vary it per route. sr_vae is the seedvr2-ema DECL's
 * own row (its lane_inputs.vae) duplicated HERE as the invariant
 * the super-resolution branch loads — the sr_model DiT rides the
 * param enum instead (joined to the engine combo), and this const
 * is the one home the VAE filename owns in this package (the
 * video drift audit, 2026-10-13: a bare literal at the node seat
 * was a second copy nobody owned). */
export declare const LANE_FILES: {
    readonly clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors";
    readonly vae_video: "minimax_h3_video_vae_int8_convrot.safetensors";
    readonly vae_audio: "minimax_h3_audio_vae_fp32.safetensors";
    readonly sr_vae: "ema_vae_fp16.safetensors";
};
/** The film's audio sample rate — ONE home for the join's rate law
 * (F12, 2026-11-12: MeliteConcatVideos refuses members whose audio
 * rates differ, and the H3 sound VAE emits 32 kHz while demuxed film
 * rides 48 kHz — the first extend press died exactly there). Every
 * JOIN leg states this rate at its own door via filmJoinAudio; a
 * member's origin rate never leaks into the concat. */
export declare const FILM_AUDIO_RATE = 48000;
/** THE JOIN-RATE DOOR: one spelling for every audio leg that feeds a
 * join's CreateVideo — the leg passes MeliteAudioResample at
 * FILM_AUDIO_RATE (engine-core bandlimited sinc; equal-rate input
 * passes the SAME dict through, so a leg already at the film rate
 * pays nothing but the stated law).
 * @param g the run's graph builder
 * @param audio the leg's AUDIO output handle */
export declare function filmJoinAudio(g: GraphBuilder, audio: OutputHandle): OutputHandle;
/** The h3 facts door: the resolved lane_inputs parsed into the
 * loader names the renderers read (the unet from the row; the
 * three invariants from the package's own LANE_FILES).
 *
 * @param raw the resolved lane_inputs (family ⊕ variant) */
export interface H3Facts {
    readonly unet: string;
    readonly clip: string;
    readonly vae_video: string;
    readonly vae_audio: string;
}
export declare function parseH3Facts(raw: unknown): H3Facts;
/** The overlay re-check the film loop voices per stanza (the same
 *  carrier the card's compose gate walks — ONE schema, imported).
 *  Exported so the card's single-call lift judges through the same
 *  re-check (the h3-b duplicate is gone: one owner). */
export declare const assertOverlayGated: (doc: Record<string, unknown>, where: string) => void;
/** THE FILE-JOIN PRIMITIVE, half 1 — the boundary chain (the
 * multi-window unification, 2026-11-12 — the film tail's own §20
 * law, ONE spelling for every join-by-file seat). ONE MeliteUnload
 * boundary per save, token-chained in film order: the final token
 * transitively depends on EVERY save, so any downstream decode
 * provably waits for them all — and each member's passthrough
 * tensor dies at its own boundary (the memory law; the flush is
 * idempotent, weights stay resident).
 * @param g the run's graph builder
 * @param saves the members' SaveVideo passthroughs, film order
 * @returns the chain's final token — the ordering proof */
export declare function chainSaveBoundaries(g: GraphBuilder, saves: readonly OutputHandle[]): OutputHandle;
/** THE FILE-JOIN PRIMITIVE, half 2 — the concat + container (the
 * film tail's own law, ONE spelling for every join-by-file seat):
 * MeliteConcatVideos decodes the saved FILES back CPU-side strictly
 * after the boundary token; CreateVideo → SaveVideo delivers the
 * joined film.
 * @param g the run's graph builder
 * @param prefixes the members' SaveVideo prefixes, film order
 * @param after the boundary chain's final token (the ordering proof)
 * @param out the joined film's filename_prefix
 * @param opts.audio an audio override for the container mux (the
 *  film's mixed stem); absent = the concat's own decoded audio
 * @param opts.append an exact saved-file path wired as the LAST
 *  member after the prefix list (the multi-window extend's assembled
 *  extension — ChainAssemble's video_path output; DAG-proven by its
 *  own data dependency, no boundary needed)
 * @returns the joined film's SaveVideo passthrough */
export declare function concatSavedFilms(g: GraphBuilder, prefixes: readonly string[], after: OutputHandle, out: string, opts?: {
    audio?: OutputHandle;
    append?: OutputHandle;
}): OutputHandle;
/** The seam's cross-window wires: the RAW decode + sampler handles
 *  of one rendered window (pre-trim, pre-sharpen — the true tail). */
export interface WindowHandles {
    latOut: OutputHandle;
    vdec: OutputHandle;
    vadec: OutputHandle;
    /** the DELIVERED clip — post-trim, post-sharpen: exactly the
     *  streams that window's own SaveVideo plays; the film concat's
     *  currency (the film must not differ from its windows). */
    filmImages: OutputHandle;
    filmAudio: OutputHandle;
    /** the window's SaveVideo VIDEO passthrough — the film tail's
     *  ordering wire: the MeliteUnload boundary consumes it, so the
     *  file loaders provably wait for the saves (and the passthrough
     *  tensor dies at the boundary — the §20 law). Assigned by BOTH
     *  family arms (every family path saves); the film tail refuses
     *  loud if a future arm forgets. */
    savePassthrough?: OutputHandle;
}
export declare const film: ComfyActionSpec<Record<string, unknown>, H3Facts>;
//# sourceMappingURL=actions.d.ts.map