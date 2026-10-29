// reshoot.ts — THE CAMERA RE-SHOOT CHAIN (feature 024, the ComfyUI
// "Open Source Higgsfield" competition entry): take a source clip +
// a new camera intent, reproject the scene's point cloud under the
// new camera, and drive H3 with Fun ControlNet Depth conditioning so
// the same scene renders from the moved camera. No native H3
// geometric/camera conditioning exists — the camera control IS this
// depth-warp chain (research: dev_docs/research/2026-10-27-h3-openjutsu-camera-reshoot.md).
//
// THE CHAIN (all in-graph, one build per compose, shared by every
// window — the per-window model chain consumes the SHARED handles so
// a multi-window film pays for depth + warp exactly once):
//
//   loadVideo(source_clip — the shared loader law, force-rate-24 VHS)
//     → frames at the film clock
//   LoadVideoDepthAnythingModel(vits) → VideoDepthAnythingProcess
//     → VideoDepthAnythingOutput(gray) → depth stack (brightness RGB)
//   CrossViewWarp(depth stack as frames, depth=depth stack, pose)
//     → warped depth   ← the Fun ControlNet DEPTH conditioning
//   CrossViewWarp(frames, depth=depth stack, same pose)
//     → reprojected RGB (magenta disocclusion holes)
//   ColorToMask(reprojected RGB, magenta) → disocclusion MASK
//     (1 = regenerate — the node's own semantics)
//   per window: MiniMaxH3FunControlNetApply(model, model_patch=union
//     2.0, vae, strength, control_video=warped depth, mask,
//     source_video=reprojected RGB) → the window's sampler stack.
//
// THE TWO WARPS share one pose and one geometry source, so the
// warped depth and the reprojected RGB align pixel-for-pixel; the
// depth conditioning tells the model WHERE surfaces sit in the new
// view, the reprojected RGB anchors color behind the inpaint mask,
// and the mask invents exactly the disoccluded regions.
//
// THE DECLARED PACK SURFACE — the arm's own requires (the RESHOOT_MOD
// kind's arm-conditional list, enforced only when the bag is armed):
// ComfyUI-CrossViewWarp (the vendored warp pack, estate manifest's
// video-plane row), ComfyUI-KJNodes (ColorToMask),
// ComfyUI-MiniMaxH3Mod (the Fun ControlNet apply node),
// ComfyUI-VideoHelperSuite (the shared loader law below). The VDA
// three-node depth chain rides upstream
// github.com/yuvraj108c/ComfyUI-Video-Depth-Anything — NOT yet
// provisioned estate-side (the named feature-024 debt; the arm
// declares the pack ids it can, the VDA provisioning is owed with
// the live GPU proof). The viggle-animate parallel lane this chain
// once leaned on is EXTERMINATED (operator 2026-11-12) — no
// reference survives.
import { loadVideo } from './chainEdit.js';
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
const num = (e, key, fallback) => {
    const v = e[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
/** The dial bands — MIRRORED from the card's RESHOOT_MOD field rows
 *  (the UI's own bounds; the wall judges the two homes in 1:1
 *  agreement). The flat schema's zod bounds died with the knob
 *  group; a bag entry rides the compose door as a loose dict, so
 *  the READER owns the refusal — out-of-domain dials refuse LOUD
 *  here, ahead of the engine, never as a ComfyUI widget 400. */
export const RESHOOT_DIAL_BOUNDS = {
    orbit: [-180, 180],
    tilt: [-90, 90],
    dolly: [0.1, 3],
    zoom: [20, 120],
    pan: [-1, 1],
    strength: [0, 10],
    depth_ratio: [1.5, 1000],
};
const banded = (e, key, fallback) => {
    const v = num(e, key, fallback);
    const [lo, hi] = RESHOOT_DIAL_BOUNDS[key];
    if (v < lo || v > hi) {
        throw new Error(`h3 re-shoot: the bag's ${key} dial is ${v} — outside the camera band [${lo}, ${hi}] (the card's Reshoot rows state the same bounds); refuse ahead of the engine, never a widget 400`);
    }
    return v;
};
/** The bag's first (and only — max_stack 1) entry, typed loose. */
const bagEntry = (p) => {
    const bag = p.reshoot;
    if (!Array.isArray(bag) || bag.length === 0)
        return undefined;
    const e = bag[0];
    return typeof e === 'object' && e !== null && !Array.isArray(e)
        ? e
        : undefined;
};
/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. */
export function readReshootKnobs(p) {
    const e = bagEntry(p) ?? {};
    return {
        orbit: banded(e, 'orbit', 0),
        tilt: banded(e, 'tilt', 0),
        dolly: banded(e, 'dolly', 1.0),
        zoom: banded(e, 'zoom', 50),
        pan: banded(e, 'pan', 0),
        strength: banded(e, 'strength', 1),
        depthRatio: banded(e, 'depth_ratio', 6),
        smoothDepth: e.smooth_depth === true,
        invertDepth: e.invert_depth === true,
    };
}
/** The arm predicate: BAG PRESENCE — the same law as the replace/
 *  repair/extend arms (the fourth-mod-bag unification: a commission
 *  is armed when its bag is a NON-EMPTY ARRAY, whatever its entry's
 *  shape). A non-object entry and a bag whose entry names no source
 *  clip both stay ARMED and refuse loud at the chain build (the
 *  compose's missing-required law) — neither quietly disarms the
 *  film. Absent or empty bag = the compose never sees the chain
 *  (byte-stable graphs). */
export function reshootArmed(p) {
    const bag = p.reshoot;
    return Array.isArray(bag) && bag.length > 0;
}
/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (the reshoot bag's entry carries
 *   source_clip + the camera knobs; reshootArmed gates the build)
 * @param g the run's graph builder
 * @returns the shared handles for the per-window apply seats
 */
export function buildH3Reshoot(p, g) {
    const entry = bagEntry(p);
    const clip = (entry?.source_clip ?? '').trim();
    if (clip === '') {
        throw new Error('h3 re-shoot: the reshoot bag carries an entry but names no source clip — a re-shoot needs the video whose scene the new camera views');
    }
    const knobs = readReshootKnobs(p);
    // THE SHARED LOADER LAW (the fourth-mod-bag unification, §8): the
    // clip rides the same force-rate-24 VHS seat the swap/repair/
    // extend sources ride (chainEdit loadVideo) — never its own
    // LoadVideo→GetVideoComponents pair. The depth + warps read the
    // film clock's frames; the audio track rides out (slot 2 unused —
    // the re-shoot's soundtrack is the generation's own).
    const frames = loadVideo(g, clip)[0];
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
    // THE DEPTH-FRAME GRID MATCH (F13d, the live burn run-e7a5182d153c-
    // 88fd3236): VDA returns at its OWN internal resolution (max_res
    // 1280 → 1280×718 on a 1312×736 clip) and CrossViewWarp multiplies
    // the depth against full-size frames — `ValueError: operands could
    // not be broadcast together (736,1312) (718,1280)`. VDA exposes no
    // match-to-input toggle, so the depth stack RESIZES TO THE FRAMES'
    // OWN GRID here, before both warps: ImageResizeKJ with get_image_size
    // wired to the frames (width/height 0 — the reference owns the
    // size), keep_proportion false (an exact grid copy, never a letter-
    // box), bilinear (depth is a scalar field — interpolation is safe,
    // no nearest stair-steps in the point cloud).
    const depthMatched = g.node('ImageResizeKJ', {
        image: depthStack,
        width: 0,
        height: 0,
        upscale_method: 'bilinear',
        keep_proportion: false,
        divisible_by: 0,
        get_image_size: frames,
    }).out();
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
        frames: depthMatched,
        depth: depthMatched,
    }).out();
    // pass 1 — the reprojected RGB: color anchor + the hole map's
    // source (identical pose → identical holes)
    const source = g.node(CROSSVIEW_WARP_NODE, {
        ...pose,
        frames,
        depth: depthMatched,
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