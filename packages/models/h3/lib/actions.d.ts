import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
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