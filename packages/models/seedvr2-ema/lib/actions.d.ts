import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the upscale segment reads. */
export type UpscaleFacts = {
    readonly unet: string;
    readonly vae: string;
};
/** The gated params doc the upscale segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule). */
export type UpscaleParams = Record<string, unknown>;
/** The upscale facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseUpscaleFacts(raw: LaneInputsFacts): UpscaleFacts;
/** The upscale action: SeedVR2 — the DiT + VAE loaders from the
 * family's own weights, the upscaler at the stated resolution caps,
 * SaveImage under <run>/gen. */
export declare const upscale: ComfyActionSpec<UpscaleParams, UpscaleFacts>;
//# sourceMappingURL=actions.d.ts.map