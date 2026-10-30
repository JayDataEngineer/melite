// reshoot.ts — THE CAMERA RE-SHOOT CHAIN (feature 024), reworked
// 2026-11-13 onto the OFFICIAL implementation: Comfy-Org's
// comfy-reshoot reference app (github.com/comfy-org/comfy-reshoot),
// workflows/generate.api.json at pack revision fbb1e93c7193329ff3ce
// 7c17f95166b539687876. The first cut (VDA brightness depth + a
// Fun ControlNet Union 2.0 patch) was the low-quality path — the
// operator's order: "get the official source from comfyui and
// adapt it to our mod." The verified chain, verbatim:
//
//   LoadVideo(core, VIDEO) → CrossViewPrepareClip
//     (24 fps resample, H3's 17k+5 frame grid, aspect 'source',
//      0.5 MP, multiple 32 — the grid-safety node)
//   LoadMoGeModel(moge_2_vitl_normal_fp16) → MoGeInference
//     (resolution_level 2, fov 0, batch 4, force_projection,
//      apply_mask, refine_steps 3 — METRIC geometry with
//      intrinsics, not brightness depth)
//   CrossViewWarp(frames=prepared, moge_geometry=geometry, pose)
//     → warp  ← the geometric guide (magenta = disocclusion)
//   the prepared clip rides MiniMaxH3ReferenceToVideo's
//     ref_videos.ref_video_0 (the appearance/identity reference)
//   the warp rides MiniMaxH3AddGuide(image=warp, frame_idx 0)
//     — the H3-native guide pin, the same lane as the estate's
//     keyframe pins
//   the CrossView LoRA (Cseti v1 @3500, trigger `crossview`,
//     strength band 0.5–1, default the official 0.8) rides the model chain LAST (after the
//     distill lora + sigma shift), LoraLoaderModelOnly.
//
// The engine's ComfyUI core serves LoadVideo (nodes_video.py),
// LoadMoGeModel/MoGeInference (nodes_moge.py) and the H3 trio
// (nodes_minimax_h3.py); the pack provision is ComfyUI-CrossViewWarp
// ONLY. Weights: moge_2_vitl_normal_fp16.safetensors already on the
// engine's geometry_estimation shelf; the CrossView LoRA lands as a
// family provision (sha256 in src/index.ts, one truth).
//
// THE DECLARED PACK SURFACE — the arm's own requires (the RESHOOT_MOD
// kind's arm-conditional list, enforced only when the bag is armed):
// ComfyUI-CrossViewWarp (the vendored warp pack at the official fork
// revision — CrossViewPrepareClip + CrossViewWarp). The retired VDA
// depth chain (ComfyUI-Video-Depth-Anything, never provisioned) and
// the Fun ControlNet apply seat (ComfyUI-MiniMaxH3Mod,
// ComfyUI-KJNodes ColorToMask) died with the rework.
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'

/** The pack's clip-normalization node (the official chain's first
 *  stage — resamples to 24 fps, snaps the frame count to H3's 17k+5
 *  grid, centre-crops to the requested aspect at the pixel budget).
 *  The F13d grid-match burn this node kills at the source: the old
 *  chain resized VDA depth onto full-size frames by hand. */
export const CROSSVIEW_PREPARE_NODE = 'CrossViewPrepareClip'

/** The pack's reprojection node (the one class the pack always
 *  carried; the official graph wires moge_geometry, the metric
 *  input — never the legacy brightness-depth seat). */
export const CROSSVIEW_WARP_NODE = 'CrossViewWarp'

/** Core MoGe nodes (engine comfy_extras/nodes_moge.py — v0.37+,
 *  no pack provision rides them). */
export const MOGE_LOAD_NODE = 'LoadMoGeModel'
export const MOGE_INFER_NODE = 'MoGeInference'

/** MoGe-2 ViTL normal fp16 — the official workflow's one geometry
 *  checkpoint (Comfy-Org/MoGe on HF), already on the engine's
 *  geometry_estimation shelf. */
export const MOGE_MODEL = 'moge_2_vitl_normal_fp16.safetensors'

/** The CrossView LoRA (Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1
 *  on HF, the _3500 step file comfy-reshoot pins): trained against
 *  the warp guide, it is what makes H3 FOLLOW the moved camera.
 *  Arm-functional, not a Modifiers row — the Fun ControlNet patch
 *  precedent (a per-arm model file provisioned by the family, never
 *  a user-picked distill seat; the catalog is for adapters a user
 *  stacks freely, and this one is meaningless outside a reshoot). */
export const CROSSVIEW_LORA =
  'h3/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors'

/** The LoRA's trigger word (the pack's own docs + the official
 *  graph's prompt is exactly `crossview.`) — rides the r2v prompt
 *  when the arm is armed, or the LoRA does not fire. */
export const CROSSVIEW_TRIGGER = 'crossview'

/** The pose + conditioning knobs the chain reads (the RESHOOT_MOD
 *  bag entry's own wire names — the card's field rows own the
 *  bounds, these are the names on the wire). */
export interface ReshootKnobs {
  readonly orbit: number
  readonly tilt: number
  readonly dolly: number
  readonly zoom: number
  readonly pan: number
  readonly strength: number
  readonly depthRatio: number
  readonly smoothDepth: boolean
  readonly invertDepth: boolean
}

const num = (e: Record<string, unknown>, key: string, fallback: number): number => {
  const v = e[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** The dial bands — MIRRORED from the card's RESHOOT_MOD field rows
 *  (the UI's own bounds; the wall judges the two homes in 1:1
 *  agreement). A bag entry rides the compose door as a loose dict,
 *  so the READER owns the refusal — out-of-domain dials refuse LOUD
 *  here, ahead of the engine, never as a ComfyUI widget 400. */
export const RESHOOT_DIAL_BOUNDS: Readonly<Record<string, readonly [number, number]>> = {
  orbit: [-180, 180],
  tilt: [-90, 90],
  dolly: [0.1, 3],
  zoom: [20, 120],
  pan: [-1, 1],
  strength: [0.5, 1],
  depth_ratio: [1.5, 1000],
}

const banded = (e: Record<string, unknown>, key: string, fallback: number): number => {
  const v = num(e, key, fallback)
  const [lo, hi] = RESHOOT_DIAL_BOUNDS[key]!
  if (v < lo || v > hi) {
    throw new Error(
      `h3 re-shoot: the bag's ${key} dial is ${v} — outside the camera band [${lo}, ${hi}] (the card's Reshoot rows state the same bounds); refuse ahead of the engine, never a widget 400`,
    )
  }
  return v
}

/** The bag's first (and only — max_stack 1) entry, typed loose. */
const bagEntry = (p: Record<string, unknown>): Record<string, unknown> | undefined => {
  const bag = p.reshoot
  if (!Array.isArray(bag) || bag.length === 0) return undefined
  const e = bag[0]
  return typeof e === 'object' && e !== null && !Array.isArray(e)
    ? (e as Record<string, unknown>)
    : undefined
}

/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. The
 *  strength default is the official 0.8 (the LoRA's own tested
 *  band is 0.5–1, served default 0.8). */
export function readReshootKnobs(p: Record<string, unknown>): ReshootKnobs {
  const e = bagEntry(p) ?? {}
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
  }
}

/** The arm predicate: BAG PRESENCE — the same law as the replace/
 *  repair/extend arms (the fourth-mod-bag unification: a commission
 *  is armed when its bag is a NON-EMPTY ARRAY, whatever its entry's
 *  shape). A non-object entry and a bag whose entry names no source
 *  clip both stay ARMED and refuse loud at the chain build (the
 *  compose's missing-required law) — neither quietly disarms the
 *  film. Absent or empty bag = the compose never sees the chain
 *  (byte-stable graphs). */
export function reshootArmed(p: Record<string, unknown>): boolean {
  const bag = p.reshoot
  return Array.isArray(bag) && bag.length > 0
}

/** The r2v prompt seat under the arm: the trigger word leads (the
 *  official graph's prompt is exactly `crossview.` — the LoRA fires
 *  on the word's presence, the estate's own motion prose follows). */
export function reshootPrompt(prompt: string): string {
  return `${CROSSVIEW_TRIGGER}. ${prompt}`.trim()
}

/** The run-level chain handles: built once per compose (film or
 *  single window), consumed by every window's two seats. */
export interface ReshootChain {
  /** The prepared source frames — the appearance/identity
   *  reference (the official chain's ref_videos.ref_video_0). */
  readonly refFrames: OutputHandle
  /** The warp — the geometric guide for the moved camera (the
   *  official chain's MiniMaxH3AddGuide image seat). */
  readonly warp: OutputHandle
}

/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (the reshoot bag's entry carries
 *   source_clip + the camera knobs; reshootArmed gates the build)
 * @param g the run's graph builder
 * @returns the shared handles for the per-window seats
 */
export function buildH3Reshoot(p: Record<string, unknown>, g: GraphBuilder): ReshootChain {
  const entry = bagEntry(p)
  const clip = ((entry?.source_clip as string | undefined) ?? '').trim()
  if (clip === '') {
    throw new Error(
      'h3 re-shoot: the reshoot bag carries an entry but names no source clip — a re-shoot needs the video whose scene the new camera views',
    )
  }
  const knobs = readReshootKnobs(p)
  // THE OFFICIAL LOADER (the 2026-11-13 rework): core LoadVideo, the
  // one node that emits the VIDEO type CrossViewPrepareClip demands.
  // The sibling arms' VHS seat stays theirs — VHS serves force-rate
  // frames + audio for chains that consume frames; this chain hands
  // the WHOLE video to the prepare node, which owns the resample
  // (24 fps), the frame-grid snap and the crop — the staged leaf
  // binds by name on the same input directory both loaders read.
  const video = g.node('LoadVideo', { file: clip }).out(0)
  // stage 1 — normalize: every downstream grid fact (width, height,
  // length) comes from THIS node's outputs, never the raw clip
  const prep = g.node(CROSSVIEW_PREPARE_NODE, {
    video,
    duration: 5.0,
    aspect_ratio: 'source',
    megapixels: 0.5,
    multiple: 32,
  })
  // metric geometry — MoGe-2 with forced projection and mask refine
  // (the official literals; brightness depth died with the old chain)
  const moge = g.node(MOGE_LOAD_NODE, { model_name: MOGE_MODEL }).out(0)
  const geometry = g.node(MOGE_INFER_NODE, {
    moge_model: moge,
    image: prep.out(0),
    resolution_level: 2,
    fov_x_degrees: 0,
    batch_size: 4,
    force_projection: true,
    apply_mask: true,
    refine_steps: 3,
  }).out(0)
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
  }).out(0)
  return { refFrames: prep.out(0), warp }
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
export function applyH3ReshootModel(
  g: GraphBuilder,
  model: OutputHandle,
  p: Record<string, unknown>,
): OutputHandle {
  return g.node('LoraLoaderModelOnly', {
    model,
    lora_name: CROSSVIEW_LORA,
    strength_model: readReshootKnobs(p).strength,
  }).out()
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
export function applyH3ReshootCond(
  g: GraphBuilder,
  cond: OutputHandle,
  latent: OutputHandle,
  vae: OutputHandle,
  chain: ReshootChain,
): OutputHandle {
  return g.node('MiniMaxH3AddGuide', {
    positive: cond,
    latent,
    vae,
    image: chain.warp,
    frame_idx: 0,
  }).out(0)
}
