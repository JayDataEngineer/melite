/** The pack's clip-normalization node (the official chain's first
 *  stage — resamples to 24 fps, snaps the frame count to H3's 17k+5
 *  grid, centre-crops to the requested aspect at the pixel budget).
 *  The F13d grid-match burn this node kills at the source: the old
 *  chain resized VDA depth onto full-size frames by hand. */
export const CROSSVIEW_PREPARE_NODE = 'CrossViewPrepareClip';
/** The pack's reprojection node (the one class the pack always
 *  carried; the official graph wires moge_geometry, the metric
 *  input — never the legacy brightness-depth seat). */
export const CROSSVIEW_WARP_NODE = 'CrossViewWarp';
/** Core MoGe nodes (engine comfy_extras/nodes_moge.py — v0.37+,
 *  no pack provision rides them). */
export const MOGE_LOAD_NODE = 'LoadMoGeModel';
export const MOGE_INFER_NODE = 'MoGeInference';
/** The prepare node's own clock (it resamples every clip to 24 fps
 *  before the warp sees it) — the unit the guide duration is stated
 *  in. */
export const CROSSVIEW_PREP_FPS = 24;
/** The shortest window a re-shoot will guide: one second of prepared
 *  motion. Below this the warp carries no usable parallax and the
 *  guide outlives the window it is pinned into. */
export const CROSSVIEW_MIN_GUIDE_FRAMES = CROSSVIEW_PREP_FPS;
/**
 * The guide's duration for the windows this run will render (F28,
 * 2026-10-30). The prepare node emits ONE clip pinned at frame 0
 * into EVERY window, so the guide must be no longer than the
 * SHORTEST window — the round-4 burn pinned a 124-frame guide into a
 * 90-frame window and the engine refused at the AddGuide seat
 * (`a 124 frame guide clip at frame_idx 0 does not fit in the
 * video's 90 frames`), killing the whole arm below 124-frame windows.
 * The compose now derives the duration from the window's own frames
 * and refuses a window too short to carry the camera at COMPOSE,
 * naming the law — never at the engine.
 *
 * @param windowFrames the shortest window this run will render, doc
 *   frames (the render's own stanza snap)
 * @returns the duration in seconds for CrossViewPrepareClip
 */
export function crossviewGuideSeconds(windowFrames) {
    if (!Number.isFinite(windowFrames) || windowFrames <= 0) {
        throw new Error('h3 re-shoot: the guide needs the window length in frames — a re-shoot window of ' + String(windowFrames) + ' frames cannot carry the camera guide');
    }
    if (windowFrames < CROSSVIEW_MIN_GUIDE_FRAMES) {
        throw new Error('h3 re-shoot: window too short for the camera guide — ' + String(Math.round(windowFrames)) + ' frames is below the ' + String(CROSSVIEW_MIN_GUIDE_FRAMES) + '-frame floor (one second at ' + String(CROSSVIEW_PREP_FPS) + ' fps); author the re-shoot call on a longer span');
    }
    return windowFrames / CROSSVIEW_PREP_FPS;
}
/** MoGe-2 ViTL normal fp16 — the official workflow's one geometry
 *  checkpoint (Comfy-Org/MoGe on HF), already on the engine's
 *  geometry_estimation shelf. */
export const MOGE_MODEL = 'moge_2_vitl_normal_fp16.safetensors';
/** The CrossView LoRA (Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1
 *  on HF, the _3500 step file comfy-reshoot pins): trained against
 *  the warp guide, it is what makes H3 FOLLOW the moved camera.
 *  Arm-functional, not a Modifiers row — the Fun ControlNet patch
 *  precedent (a per-arm model file provisioned by the family, never
 *  a user-picked distill seat; the catalog is for adapters a user
 *  stacks freely, and this one is meaningless outside a reshoot). */
export const CROSSVIEW_LORA = 'h3/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors';
/** The LoRA's trigger word (the pack's own docs + the official
 *  graph's prompt is exactly `crossview.`) — rides the r2v prompt
 *  when the arm is armed, or the LoRA does not fire. */
export const CROSSVIEW_TRIGGER = 'crossview';
const num = (e, key, fallback) => {
    const v = e[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
/** The dial bands — MIRRORED from the card's RESHOOT_MOD field rows
 *  (the UI's own bounds; the wall judges the two homes in 1:1
 *  agreement). A bag entry rides the compose door as a loose dict,
 *  so the READER owns the refusal — out-of-domain dials refuse LOUD
 *  here, ahead of the engine, never as a ComfyUI widget 400. */
export const RESHOOT_DIAL_BOUNDS = {
    orbit: [-180, 180],
    tilt: [-90, 90],
    dolly: [0.1, 3],
    zoom: [20, 120],
    pan: [-1, 1],
    strength: [0.5, 1],
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
 *  viewpoint rather than inventing a move nobody asked for. The
 *  strength default is the official 0.8 (the LoRA's own tested
 *  band is 0.5–1, served default 0.8). */
export function readReshootKnobs(p) {
    const e = bagEntry(p) ?? {};
    return {
        orbit: banded(e, 'orbit', 0),
        tilt: banded(e, 'tilt', 0),
        dolly: banded(e, 'dolly', 1.0),
        zoom: banded(e, 'zoom', 50),
        pan: banded(e, 'pan', 0),
        strength: banded(e, 'strength', 0.8),
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
/** The r2v prompt seat under the arm: the trigger word leads (the
 *  official graph's prompt is exactly `crossview.` — the LoRA fires
 *  on the word's presence, the estate's own motion prose follows). */
export function reshootPrompt(prompt) {
    return `${CROSSVIEW_TRIGGER}. ${prompt}`.trim();
}
/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (the reshoot bag's entry carries
 *   source_clip + the camera knobs; reshootArmed gates the build)
 * @param g the run's graph builder
 * @param windowFrames the SHORTEST window this run renders (the guide
 *   is pinned into every window, so its duration derives from this —
 *   F28)
 * @returns the shared handles for the per-window seats
 */
export function buildH3Reshoot(p, g, windowFrames) {
    const entry = bagEntry(p);
    const clip = (entry?.source_clip ?? '').trim();
    if (clip === '') {
        throw new Error('h3 re-shoot: the reshoot bag carries an entry but names no source clip — a re-shoot needs the video whose scene the new camera views');
    }
    const knobs = readReshootKnobs(p);
    // THE OFFICIAL LOADER (the 2026-11-13 rework): core LoadVideo, the
    // one node that emits the VIDEO type CrossViewPrepareClip demands.
    // The sibling arms' VHS seat stays theirs — VHS serves force-rate
    // frames + audio for chains that consume frames; this chain hands
    // the WHOLE video to the prepare node, which owns the resample
    // (24 fps), the frame-grid snap and the crop — the staged leaf
    // binds by name on the same input directory both loaders read.
    const video = g.node('LoadVideo', { file: clip }).out(0);
    // stage 1 — normalize: every downstream grid fact (width, height,
    // length) comes from THIS node's outputs, never the raw clip
    // F31 (2026-10-30): the prepare node's pixel budget is the RENDER
    // TARGET's, never the pack's 0.5 MP default. The round-4 researh
    // measured the cost of the default: a 0.97 MP plate squeezed to
    // ~942×530 fed BOTH ref_video_0 and the guide for a 1344×768
    // render — 48 % of the plate discarded, then reconstructed at
    // 2.06×, which is the soft render the operator saw. The budget
    // therefore tracks the window shape the doc states.
    const targetW = p.width;
    const targetH = p.height;
    if (!Number.isFinite(targetW) || !Number.isFinite(targetH)) {
        throw new Error('h3 re-shoot: the plate budget reads the render target — the doc carries no finite width/height (' + String(targetW) + '×' + String(targetH) + '); re-shoot documents walk the schema first (1344×768 are the declared defaults)');
    }
    const targetMp = (targetW * targetH) / 1_000_000;
    const prep = g.node(CROSSVIEW_PREPARE_NODE, {
        video,
        duration: crossviewGuideSeconds(windowFrames),
        aspect_ratio: 'source',
        megapixels: Number(targetMp.toFixed(3)),
        multiple: 32,
    });
    // metric geometry — MoGe-2 with forced projection and mask refine
    // (the official literals; brightness depth died with the old chain)
    const moge = g.node(MOGE_LOAD_NODE, { model_name: MOGE_MODEL }).out(0);
    const geometry = g.node(MOGE_INFER_NODE, {
        moge_model: moge,
        image: prep.out(0),
        resolution_level: 2,
        fov_x_degrees: 0,
        batch_size: 4,
        force_projection: true,
        apply_mask: true,
        refine_steps: 3,
    }).out(0);
    // the warp — every literal below is the official graph's own
    // (pose dials from the bag, the rest the verified posture)
    const warp = g.node(CROSSVIEW_WARP_NODE, {
        frames: prep.out(0),
        moge_geometry: geometry,
        azimuth: knobs.orbit,
        elevation: knobs.tilt,
        distance: knobs.dolly,
        hfov: knobs.zoom,
        vertical_shift: knobs.pan,
        depth_ratio: knobs.depthRatio,
        smooth_depth: knobs.smoothDepth,
        invert_depth: knobs.invertDepth,
        roll_lock: false,
        pivot_override: false,
        pivot_x: 0.0,
        pivot_y: 0.0,
        pivot_z: 1.05,
        use_keyframes: false,
        frame_count: 0,
        keyframes: '',
        interp_motion: 'linear',
        interpolation: 'linear',
        keep_source_aim: true,
        preview_size: 384,
        frame_index: 1,
    }).out(0);
    // F30 (2026-10-30) — THE HOLE FILL, the "two girls" cure. The warp
    // paints disocclusions PURE MAGENTA in RGB, and the holes inherit
    // the SUBJECT's shape (the region behind her the moved camera
    // newly sees). Pinning that holed plate as the guide while the
    // UNWARPED clip rode ref_video_0 gave H3 two contradictory priors
    // — "she stands at A" and "a girl-shaped void at B" — and it
    // satisfied both: her at A plus a second figure in the void
    // (round-4 receipt §8.6, warp-only proof). ONE filler now runs
    // before anything sees the warp: the magenta mask (ColorToMask)
    // grown + feathered (GrowMaskWithBlur) composites the PREPARED
    // plate's pixels over the holes (ImageCompositeMasked) — the void
    // carries the source's own content, never a colour and never a
    // subject silhouette. The filled plate then serves BOTH priors
    // (refFrames and the guide pin) so the two rails agree by
    // construction.
    const holeMask = g.node('ColorToMask', {
        images: warp, invert: false,
        red: 255, green: 0, blue: 255, threshold: 10, per_batch: 16,
    }).out(0);
    const softHoles = g.node('GrowMaskWithBlur', {
        mask: holeMask, expand: 3, incremental_expandrate: 0.0,
        tapered_corners: true, flip_input: false, blur_radius: 12.0,
        lerp_alpha: 1.0, decay_factor: 1.0, fill_holes: false,
    }).out(0);
    const plate = g.node('ImageCompositeMasked', {
        destination: warp, source: prep.out(0), x: 0, y: 0,
        resize_source: false, mask: softHoles,
    }).out(0);
    return { refFrames: plate, warp: plate };
}
/**
 * The per-window MODEL seat: the CrossView LoRA on the window's
 * model, post sigma shift (the official order — the distill lora
 * loads first, the shift + attention ride over it, the CrossView
 * LoRA applies LAST so the camera-trained adapters win). Mounted
 * ahead of the file-based picks chain — the camera spine; picks
 * refine on top.
 *
 * @param g the window's (scoped) builder
 * @param model the window's model so far (post sigma shift)
 * @param p the gated doc (the strength dial rides, band 0.5–1)
 * @returns the LoRA-loaded model handle for the scheduler chain
 */
export function applyH3ReshootModel(g, model, p) {
    return g.node('LoraLoaderModelOnly', {
        model,
        lora_name: CROSSVIEW_LORA,
        strength_model: readReshootKnobs(p).strength,
    }).out();
}
/**
 * The per-window CONDITIONING seat: the warp pinned into the
 * window's own AV latent at row 0 through MiniMaxH3AddGuide — the
 * H3-native guide lane (the same node the estate's keyframe pins
 * ride), the official chain's image seat verbatim. Mounts AFTER the
 * arm's own guide pins (audio first, keyframes next, the camera
 * spine last — the strongest structural prior closes the chain).
 *
 * @param g the window's (scoped) builder
 * @param cond the window's positive conditioning so far
 * @param latent the window's latent (the guide pins into it)
 * @param vae the window's video VAE (the guide image encodes through it)
 * @param chain the shared run-level handles
 * @returns the guide-wrapped conditioning for the guider
 */
export function applyH3ReshootCond(g, cond, latent, vae, chain) {
    return g.node('MiniMaxH3AddGuide', {
        positive: cond,
        latent,
        vae,
        image: chain.warp,
        frame_idx: 0,
    }).out(0);
}
//# sourceMappingURL=reshoot.js.map
