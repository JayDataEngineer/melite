import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
/** The CrossViewWarp pack's reprojection node (the pack registers
 *  exactly one; the id carries no suffix in the vendored copy). */
export declare const CROSSVIEW_WARP_NODE = "CrossViewWarp";
/** The VDA pack's three-node depth chain (load → infer → visualize).
 *  The gray colormap output IS the brightness depth the warp node
 *  expects ("Brightness = depth; polarity is handled by
 *  invert_depth" — the DepthAnything polarity, matching the DA-V2
 *  node the warp's own doc names as the reference pairing). */
export declare const VDA_LOAD_NODE = "LoadVideoDepthAnythingModel";
export declare const VDA_PROCESS_NODE = "VideoDepthAnythingProcess";
export declare const VDA_OUTPUT_NODE = "VideoDepthAnythingOutput";
/** VDA-Small — the ONE Apache-2.0 Video-Depth-Anything checkpoint
 *  (Base/Large are CC-BY-NC-4.0 and never ride a commercial card;
 *  license truth: research doc fetch table). The estate store landed
 *  exactly this file: checkpoints/video_depth_anything_vits.pth. */
export declare const VDA_CHECKPOINT = "video_depth_anything_vits.pth";
/** Fun ControlNet Union 2.0 — the model patch the apply node loads.
 *  Kijai's Comfy-repack of alibaba-pai/MiniMax-H3-Fun-Controlnet-Union-2.0;
 *  MiniMax H3 Community License (worldwide EXCLUDING EU/UK/KR/US —
 *  every H3-derived asset inherits the posture; the card's docs carry
 *  the same frame). Lands under the engine's model_patches shelf
 *  (extra_model_folders maps model_patches → controlnet), the
 *  controlnet-relative subpath on both sides — the z-image union
 *  file's own convention. */
export declare const FUN_UNION_2_0_PATCH = "h3-fun-controlnet/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors";
/** The warp node's magenta disocclusion fill (the pack's own hole
 *  color — crossview_warp_node.py MAGENTA) and the ColorToMask
 *  threshold that separates hole pixels from real ones. */
export declare const DISOCCLUSION_COLOR: {
    readonly red: 255;
    readonly green: 0;
    readonly blue: 255;
};
export declare const DISOCCLUSION_THRESHOLD = 10;
/** The pose + conditioning knobs the chain reads (the carrier walk
 *  has already typed and bounded them; these are the wire names). */
export interface ReshootKnobs {
    readonly orbit: number;
    readonly tilt: number;
    readonly dolly: number;
    readonly zoom: number;
    readonly pan: number;
    readonly strength: number;
    readonly depthRatio: number;
    readonly smoothDepth: boolean;
    readonly invertDepth: boolean;
}
/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. */
export declare function readReshootKnobs(p: Record<string, unknown>): ReshootKnobs;
/** The arm predicate: the master switch alone. A switch-on doc with
 *  no source clip stays ARMED and refuses loud at the chain build
 *  (the compose's missing-required law) — the clip check never
 *  quietly disarms the film. Absent or false = the compose never
 *  sees the chain (byte-stable graphs). */
export declare function reshootArmed(p: Record<string, unknown>): boolean;
/** The run-level chain handles: built once per compose (film or
 *  single window), consumed by every window's apply seat. */
export interface ReshootChain {
    /** Fun ControlNet Union 2.0, loaded once. */
    readonly patch: OutputHandle;
    /** The warped depth stack — the DEPTH conditioning (the new view's
     *  surfaces; magenta at the disocclusions). */
    readonly control: OutputHandle;
    /** The disocclusion mask — 1 where the new view must be invented. */
    readonly mask: OutputHandle;
    /** The reprojected RGB — the color anchor behind the mask. */
    readonly source: OutputHandle;
}
/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (reshoot_enabled + reshoot_clip and
 *   the camera knobs are read here)
 * @param g the run's graph builder
 * @returns the shared handles for the per-window apply seats
 */
export declare function buildH3Reshoot(p: Record<string, unknown>, g: GraphBuilder): ReshootChain;
/**
 * The per-window apply seat: patch the window's model with the union
 * 2.0 conditioning (warped depth + disocclusion mask + reprojected
 * RGB anchor). Mounted after the sigma shift, before the picks chain
 * — the re-shoot is the camera spine; file-based picks refine on top.
 *
 * @param g the window's (scoped) builder
 * @param model the window's model so far (post sigma shift)
 * @param vae the window's video VAE (the apply node encodes through it)
 * @param chain the shared run-level handles
 * @param p the gated doc (reshoot_strength rides)
 * @returns the patched model handle for the scheduler chain
 */
export declare function applyH3Reshoot(g: GraphBuilder, model: OutputHandle, vae: OutputHandle, chain: ReshootChain, p: Record<string, unknown>): OutputHandle;
//# sourceMappingURL=reshoot.d.ts.map
