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
/** The pose + conditioning knobs the chain reads (the RESHOOT_MOD
 * bag entry's own wire names — the flat reshoot_* doc prefix died
 * with the fourth-mod-bag unification; the card's field rows own
 * the bounds, these are the names on the wire). */
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
/** The dial bands — MIRRORED from the card's RESHOOT_MOD field rows
 *  (the UI's own bounds; the wall judges the two homes in 1:1
 *  agreement). The flat schema's zod bounds died with the knob
 *  group; a bag entry rides the compose door as a loose dict, so
 *  the READER owns the refusal — out-of-domain dials refuse LOUD
 *  here, ahead of the engine, never as a ComfyUI widget 400. */
export declare const RESHOOT_DIAL_BOUNDS: Readonly<Record<string, readonly [number, number]>>;
/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. */
export declare function readReshootKnobs(p: Record<string, unknown>): ReshootKnobs;
/** The arm predicate: BAG PRESENCE — the same law as the replace/
 *  repair/extend arms (the fourth-mod-bag unification: a commission
 * is armed when its bag carries an entry). A bag whose entry names
 * no source clip stays ARMED and refuses loud at the chain build
 * (the compose's missing-required law) — the clip check never
 * quietly disarms the film. Absent or empty bag = the compose never
 * sees the chain (byte-stable graphs). */
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
 * @param p the gated compose doc (the reshoot bag's entry carries
 *   source_clip + the camera knobs; reshootArmed gates the build)
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
