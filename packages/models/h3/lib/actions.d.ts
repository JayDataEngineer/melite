import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { ComfyActionSpec } from '@melite/comfyui-card-kit';
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
