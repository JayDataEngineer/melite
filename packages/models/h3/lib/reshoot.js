/** The CrossViewWarp pack's reprojection node (the pack registers
 *  exactly one; the id carries no suffix in the vendored copy). */
export const CROSSVIEW_WARP_NODE = 'CrossViewWarp';
/** The VDA pack's three-node depth chain (load → infer → visualize).
 *  The gray colormap output IS the brightness depth the warp node
 *  expects ("Brightness = depth; polarity is handled by
 *  invert_depth" — the DepthAnything polarity, matching the DA-V2
 *  node the warp's own doc names as the reference pairing). */
export const VDA_LOAD_NODE = 'LoadVideoDepthAnythingModel';
export const VDA_PROCESS_NODE = 'VideoDepthAnythingProcess';
export const VDA_OUTPUT_NODE = 'VideoDepthAnythingOutput';
/** VDA-Small — the ONE Apache-2.0 Video-Depth-Anything checkpoint
 *  (Base/Large are CC-BY-NC-4.0 and never ride a commercial card;
 *  license truth: research doc fetch table). The estate store landed
 *  exactly this file: checkpoints/video_depth_anything_vits.pth. */
export const VDA_CHECKPOINT = 'video_depth_anything_vits.pth';
/** Fun ControlNet Union 2.0 — the model patch the apply node loads.
 *  Kijai's Comfy-repack of alibaba-pai/MiniMax-H3-Fun-Controlnet-Union-2.0;
 *  MiniMax H3 Community License (worldwide EXCLUDING EU/UK/KR/US —
 *  every H3-derived asset inherits the posture; the card's docs carry
 *  the same frame). Lands under the engine's model_patches shelf
 *  (extra_model_folders maps model_patches → controlnet), the
 *  controlnet-relative subpath on both sides — the z-image union
 *  file's own convention. */
export const FUN_UNION_2_0_PATCH = 'h3-fun-controlnet/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors';
/** The warp node's magenta disocclusion fill (the pack's own hole
 *  color — crossview_warp_node.py MAGENTA) and the ColorToMask
 *  threshold that separates hole pixels from real ones. */
export const DISOCCLUSION_COLOR = { red: 255, green: 0, blue: 255 };
export const DISOCCLUSION_THRESHOLD = 10;
const num = (p, key) => {
    const v = p[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};
/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. */
export function readReshootKnobs(p) {
    return {
        orbit: num(p, 'reshoot_orbit') ?? 0,
        tilt: num(p, 'reshoot_tilt') ?? 0,
        dolly: num(p, 'reshoot_dolly') ?? 1.0,
        zoom: num(p, 'reshoot_zoom') ?? 50,
        pan: num(p, 'reshoot_pan') ?? 0,
        strength: num(p, 'reshoot_strength') ?? 1,
        depthRatio: num(p, 'reshoot_depth_ratio') ?? 6,
        smoothDepth: p.reshoot_smooth_depth === true,
        invertDepth: p.reshoot_invert_depth === true,
    };
}
/** The arm predicate: the master switch alone. A switch-on doc with
 *  no source clip stays ARMED and refuses loud at the chain build
 *  (the compose's missing-required law) — the clip check never
 *  quietly disarms the film. Absent or false = the compose never
 *  sees the chain (byte-stable graphs). */
export function reshootArmed(p) {
    return p.reshoot_enabled === true;
}
/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (reshoot_enabled + reshoot_clip and
 *   the camera knobs are read here)
 * @param g the run's graph builder
 * @returns the shared handles for the per-window apply seats
 */
export function buildH3Reshoot(p, g) {
    const clip = p.reshoot_clip.trim();
    if (clip === '') {
        throw new Error('h3 re-shoot: reshoot_enabled is on but reshoot_clip names no source clip — a re-shoot needs the video whose scene the new camera views');
    }
    const knobs = readReshootKnobs(p);
    // the source clip's frames (the audio track rides out — the
    // re-shoot's soundtrack is the generation's own)
    const frames = g.node('GetVideoComponents', {
        video: g.node('LoadVideo', { file: clip }).out(),
    }).out(0);
    // VDA-Small depth: video-consistent depth for the point cloud
    // (per-frame single-image depth flickers; the video model does not)
    const vdaModel = g.node(VDA_LOAD_NODE, { model: VDA_CHECKPOINT }).out();
    const depths = g.node(VDA_PROCESS_NODE, {
        vda_model: vdaModel,
        images: frames,
        input_size: 518,
        max_res: 1280,
        precision: 'fp16',
    }).out();
    const depthStack = g.node(VDA_OUTPUT_NODE, { depths, colormap: 'gray' }).out();
    // the warp inputs, spelled once for both passes (same pose, same
    // geometry — the two outputs stay aligned)
    const pose = {
        azimuth: knobs.orbit,
        elevation: knobs.tilt,
        distance: knobs.dolly,
        hfov: knobs.zoom,
        vertical_shift: knobs.pan,
        depth_ratio: knobs.depthRatio,
        smooth_depth: knobs.smoothDepth,
        invert_depth: knobs.invertDepth,
    };
    // pass 2 — the DEPTH conditioning: the depth stack reprojected
    // under the new camera (depth-as-brightness is a valid frames
    // input: the node splats the pixels it is given through the same
    // z-buffered warp, so the output IS the warped depth map)
    const control = g.node(CROSSVIEW_WARP_NODE, {
        ...pose,
        frames: depthStack,
        depth: depthStack,
    }).out();
    // pass 1 — the reprojected RGB: color anchor + the hole map's
    // source (identical pose → identical holes)
    const source = g.node(CROSSVIEW_WARP_NODE, {
        ...pose,
        frames,
        depth: depthStack,
    }).out();
    // the disocclusion mask: magenta holes → 1 (the apply node's own
    // semantics — "1 marks the regions to regenerate")
    const mask = g.node('ColorToMask', {
        images: source,
        invert: false,
        red: DISOCCLUSION_COLOR.red,
        green: DISOCCLUSION_COLOR.green,
        blue: DISOCCLUSION_COLOR.blue,
        threshold: DISOCCLUSION_THRESHOLD,
        per_batch: 16,
    }).out();
    const patch = g.node('ModelPatchLoader', { name: FUN_UNION_2_0_PATCH }).out();
    return { patch, control, mask, source };
}
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
export function applyH3Reshoot(g, model, vae, chain, p) {
    const strength = readReshootKnobs(p).strength;
    return g.node('MiniMaxH3FunControlNetApply', {
        model,
        model_patch: chain.patch,
        vae,
        strength,
        start_percent: 0,
        end_percent: 1,
        control_video: chain.control,
        mask: chain.mask,
        source_video: chain.source,
    }).out();
}
//# sourceMappingURL=reshoot.js.map