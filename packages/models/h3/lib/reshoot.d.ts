import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
/** The pack's clip-normalization node (the official chain's first
 *  stage — resamples to 24 fps, snaps the frame count to H3's 17k+5
 *  grid, centre-crops to the requested aspect at the pixel budget).
 *  The F13d grid-match burn this node kills at the source: the old
 *  chain resized VDA depth onto full-size frames by hand. */
export declare const CROSSVIEW_PREPARE_NODE = "CrossViewPrepareClip";
/** The pack's reprojection node (the one class the pack always
 *  carried; the official graph wires moge_geometry, the metric
 *  input — never the legacy brightness-depth seat). */
export declare const CROSSVIEW_WARP_NODE = "CrossViewWarp";
/** Core MoGe nodes (engine comfy_extras/nodes_moge.py — v0.37+,
 *  no pack provision rides them). */
export declare const MOGE_LOAD_NODE = "LoadMoGeModel";
export declare const MOGE_INFER_NODE = "MoGeInference";
/** MoGe-2 ViTL normal fp16 — the official workflow's one geometry
 *  checkpoint (Comfy-Org/MoGe on HF), already on the engine's
 *  geometry_estimation shelf. */
export declare const MOGE_MODEL = "moge_2_vitl_normal_fp16.safetensors";
/** The CrossView LoRA (Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1
 *  on HF, the _3500 step file comfy-reshoot pins): trained against
 *  the warp guide, it is what makes H3 FOLLOW the moved camera.
 *  Arm-functional, not a Modifiers row — the Fun ControlNet patch
 *  precedent (a per-arm model file provisioned by the family, never
 *  a user-picked distill seat; the catalog is for adapters a user
 *  stacks freely, and this one is meaningless outside a reshoot). */
export declare const CROSSVIEW_LORA = "h3/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors";
/** The LoRA's trigger word (the pack's own docs + the official
 *  graph's prompt is exactly `crossview.`) — rides the r2v prompt
 *  when the arm is armed, or the LoRA does not fire. */
export declare const CROSSVIEW_TRIGGER = "crossview";
/** The pose + conditioning knobs the chain reads (the RESHOOT_MOD
 *  bag entry's own wire names — the card's field rows own the
 *  bounds, these are the names on the wire). */
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
 *  agreement). A bag entry rides the compose door as a loose dict,
 *  so the READER owns the refusal — out-of-domain dials refuse LOUD
 *  here, ahead of the engine, never as a ComfyUI widget 400. */
export declare const RESHOOT_DIAL_BOUNDS: Readonly<Record<string, readonly [number, number]>>;
/** The neutral pose is the identity camera (no orbit, no tilt, the
 *  source distance, a normal 50° lens, no framing shift) — an armed
 *  re-shoot with untouched knobs re-renders the scene from the same
 *  viewpoint rather than inventing a move nobody asked for. The
 *  strength default is the official 0.8 (the LoRA's own tested
 *  band is 0.5–1, served default 0.8). */
export declare function readReshootKnobs(p: Record<string, unknown>): ReshootKnobs;
/** The arm predicate: BAG PRESENCE — the same law as the replace/
 *  repair/extend arms (the fourth-mod-bag unification: a commission
 *  is armed when its bag is a NON-EMPTY ARRAY, whatever its entry's
 *  shape). A non-object entry and a bag whose entry names no source
 *  clip both stay ARMED and refuse loud at the chain build (the
 *  compose's missing-required law) — neither quietly disarms the
 *  film. Absent or empty bag = the compose never sees the chain
 *  (byte-stable graphs). */
export declare function reshootArmed(p: Record<string, unknown>): boolean;
/** The r2v prompt seat under the arm: the trigger word leads (the
 *  official graph's prompt is exactly `crossview.` — the LoRA fires
 *  on the word's presence, the estate's own motion prose follows). */
export declare function reshootPrompt(prompt: string): string;
/** The run-level chain handles: built once per compose (film or
 *  single window), consumed by every window's two seats. */
export interface ReshootChain {
    /** The prepared source frames — the appearance/identity
     *  reference (the official chain's ref_videos.ref_video_0). */
    readonly refFrames: OutputHandle;
    /** The warp — the geometric guide for the moved camera (the
     *  official chain's MiniMaxH3AddGuide image seat). */
    readonly warp: OutputHandle;
}
/**
 * Build the re-shoot chain on the run's graph (once per compose).
 *
 * @param p the gated compose doc (the reshoot bag's entry carries
 *   source_clip + the camera knobs; reshootArmed gates the build)
 * @param g the run's graph builder
 * @returns the shared handles for the per-window seats
 */
export declare function buildH3Reshoot(p: Record<string, unknown>, g: GraphBuilder): ReshootChain;
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
export declare function applyH3ReshootModel(g: GraphBuilder, model: OutputHandle, p: Record<string, unknown>): OutputHandle;
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
export declare function applyH3ReshootCond(g: GraphBuilder, cond: OutputHandle, latent: OutputHandle, vae: OutputHandle, chain: ReshootChain): OutputHandle;
//# sourceMappingURL=reshoot.d.ts.map