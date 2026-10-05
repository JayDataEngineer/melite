import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the mesh segment reads (the lift chain's
 * five load keys, resolved from the row's lane_inputs). */
export type MeshFacts = {
    readonly unet: string;
    readonly vae: string;
    readonly texture_vae: string;
    readonly clip_vision: string;
    readonly background_removal: string;
};
/** The gated params doc the mesh segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the seed arrives minted through the declared seed-sentinel rule,
 * so the ported chain's own mint is a pass-through). */
export type MeshParams = Record<string, unknown>;
/** The mesh facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing load key refuses field-named here,
 * never composes a loader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseMeshFacts(raw: LaneInputsFacts): MeshFacts;
/** The mesh action: pixal_t1 — pixel-aligned conditioning. The
 * padded crop (pad 1.1) feeds BOTH Pixal3DConditioning and
 * (camera_fov=auto) the MoGe depth pass, so framing agrees by
 * construction. */
export declare const mesh: ComfyActionSpec<MeshParams, MeshFacts>;
//# sourceMappingURL=actions.d.ts.map
