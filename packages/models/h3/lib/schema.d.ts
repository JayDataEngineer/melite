import z from '@deepseek-ai/schemastery';
import { normalizeDeclaredRefs } from './timelineContract.js';
export declare const FAMILIES: readonly ["t4r", "t4_open", "t4_chain"];
export type Family = (typeof FAMILIES)[number];
export declare const wireList: typeof normalizeDeclaredRefs;
export declare const H3_RECOMMENDED_SAMPLERS: readonly ["euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun", "res_multistep", "res_multistep_cfg_pp", "er_sde", "seeds_2", "seeds_3"];
export declare const JSON_ARRAY_PARAMS: readonly ["calls", "audio_clips", "keyframes"];
/** The fps rail's own bounds, one home: the row declares them and the
 *  internal seconds rail derives its own bounds from them (see
 *  fps_seconds) — a second rail must never invent a rival bound. */
export declare const FPS_RAIL_MIN = 1;
export declare const FPS_RAIL_MAX = 120;
/** The refinement window's DECLARED default — one home for the seat,
 *  the schema walk, and every wall/receipt that judges the unstated
 *  rider (the SOTA plan's researched 0.30–0.35 band; 1.0 is the
 *  taomate full-denoise mechanic, opt-in). */
export declare const REFINE_DENOISE_DEFAULT = 0.35;
/** THE OUTPUT-NAME SLUG LAW (the file-plane seat on the carrier
 *  below): a filename segment and nothing else — the stem lands
 *  inside a SaveVideo / SaveImage prefix, so no space, slash, dot,
 *  or case may ride it. Shared by the carrier (the walk's boundary
 *  refusal) and the compose tail helper at the carrier's foot. */
export declare const OUTPUT_NAME_SLUG_RE: RegExp;
export declare const paramSchema: z<Schemastery.ObjectS<NoInfer<{
    image: z<string, string, "plain">;
    last_frame: z<string, string, "plain">;
    ref_images: z<string[], string[], "plain">;
    ref_videos: z<string[], string[], "plain">;
    ref_video_trims: z<({
        start_time?: number | null | undefined;
        duration?: number | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        start_time: z<number, number, "defined">;
        duration: z<number, number, "defined">;
    }>>[], "plain">;
    ref_audios: z<string[], string[], "plain">;
    ref_mods: z<string[], string[], "plain">;
    refmod_mode: z<string, string, "defined">;
    refmod_pool: z<number, number, "defined">;
    refmod_identity: z<number, number, "defined">;
    refmod_save: z<boolean, boolean, "defined">;
    duck_depth_db: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    width: z<number, number, "defined">;
    height: z<number, number, "defined">;
    length: z<number, number, "defined">;
    fps: z<number, number, "defined">;
    steps: z<number, number, "defined">;
    second_pass_enabled: z<boolean, boolean, "defined">;
    sharpen_enabled: z<boolean, boolean, "defined">;
    sharpen_strength: z<number, number, "defined">;
    interpolate_enabled: z<boolean, boolean, "defined">;
    denoise: z<number, number, "defined">;
    sampler_name: z<string, string, "defined">;
    sched_name: z<string, string, "defined">;
    refine_lora: z<string, string, "defined">;
    refine_strength: z<number, number, "plain">;
    refine_steps: z<number, number, "plain">;
    refine_denoise: z<number, number, "defined">;
    upscale_route: z<string, string, "defined">;
    upscale_model: z<string, string, "defined">;
    attention_backend: z<string, string, "defined">;
    interp_model: z<string, string, "defined">;
    interp_multiplier: z<number, number, "defined">;
    sr_switch: z<boolean, boolean, "defined">;
    sr_resolution: z<number, number, "defined">;
    sr_model: z<string, string, "defined">;
    ref_image_size: z<string, string, "defined">;
    shift_video: z<number, number, "defined">;
    shift_audio: z<number, number, "defined">;
    sla_enabled: z<boolean, boolean, "defined">;
    sla_sparsity: z<number, number, "defined">;
    sla_block_size: z<string, string, "defined">;
    sla_min_seq_len: z<number, number, "defined">;
    sla_dense_last_steps: z<number, number, "defined">;
    sla_dense_steps: z<string, string, "defined">;
    sla_dense_backend: z<string, string, "defined">;
    sla_reference_protection: z<string, string, "defined">;
    sla_protect_audio: z<boolean, boolean, "defined">;
    sla_stabilize_motion: z<boolean, boolean, "plain">;
    sla_disable_fp16_accum: z<boolean, boolean, "defined">;
    sharpen_method: z<string, string, "defined">;
    sharpen_radius: z<number, number, "plain">;
    sharpen_threshold: z<number, number, "plain">;
    sharpen_iterations: z<number, number, "plain">;
    k: z<number, number, "plain">;
    noise_seed: z<number, number, "plain">;
    fps_seconds: z<number, number, "plain">;
    output_name: z<string, string, "plain">;
    interp_switch: z<boolean, boolean, "plain">;
    sharpen_switch: z<boolean, boolean, "plain">;
    sla_switch: z<boolean, boolean, "plain">;
    image_name: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    image: z<string, string, "plain">;
    last_frame: z<string, string, "plain">;
    ref_images: z<string[], string[], "plain">;
    ref_videos: z<string[], string[], "plain">;
    ref_video_trims: z<({
        start_time?: number | null | undefined;
        duration?: number | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        start_time: z<number, number, "defined">;
        duration: z<number, number, "defined">;
    }>>[], "plain">;
    ref_audios: z<string[], string[], "plain">;
    ref_mods: z<string[], string[], "plain">;
    refmod_mode: z<string, string, "defined">;
    refmod_pool: z<number, number, "defined">;
    refmod_identity: z<number, number, "defined">;
    refmod_save: z<boolean, boolean, "defined">;
    duck_depth_db: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    width: z<number, number, "defined">;
    height: z<number, number, "defined">;
    length: z<number, number, "defined">;
    fps: z<number, number, "defined">;
    steps: z<number, number, "defined">;
    second_pass_enabled: z<boolean, boolean, "defined">;
    sharpen_enabled: z<boolean, boolean, "defined">;
    sharpen_strength: z<number, number, "defined">;
    interpolate_enabled: z<boolean, boolean, "defined">;
    denoise: z<number, number, "defined">;
    sampler_name: z<string, string, "defined">;
    sched_name: z<string, string, "defined">;
    refine_lora: z<string, string, "defined">;
    refine_strength: z<number, number, "plain">;
    refine_steps: z<number, number, "plain">;
    refine_denoise: z<number, number, "defined">;
    upscale_route: z<string, string, "defined">;
    upscale_model: z<string, string, "defined">;
    attention_backend: z<string, string, "defined">;
    interp_model: z<string, string, "defined">;
    interp_multiplier: z<number, number, "defined">;
    sr_switch: z<boolean, boolean, "defined">;
    sr_resolution: z<number, number, "defined">;
    sr_model: z<string, string, "defined">;
    ref_image_size: z<string, string, "defined">;
    shift_video: z<number, number, "defined">;
    shift_audio: z<number, number, "defined">;
    sla_enabled: z<boolean, boolean, "defined">;
    sla_sparsity: z<number, number, "defined">;
    sla_block_size: z<string, string, "defined">;
    sla_min_seq_len: z<number, number, "defined">;
    sla_dense_last_steps: z<number, number, "defined">;
    sla_dense_steps: z<string, string, "defined">;
    sla_dense_backend: z<string, string, "defined">;
    sla_reference_protection: z<string, string, "defined">;
    sla_protect_audio: z<boolean, boolean, "defined">;
    sla_stabilize_motion: z<boolean, boolean, "plain">;
    sla_disable_fp16_accum: z<boolean, boolean, "defined">;
    sharpen_method: z<string, string, "defined">;
    sharpen_radius: z<number, number, "plain">;
    sharpen_threshold: z<number, number, "plain">;
    sharpen_iterations: z<number, number, "plain">;
    k: z<number, number, "plain">;
    noise_seed: z<number, number, "plain">;
    fps_seconds: z<number, number, "plain">;
    output_name: z<string, string, "plain">;
    interp_switch: z<boolean, boolean, "plain">;
    sharpen_switch: z<boolean, boolean, "plain">;
    sla_switch: z<boolean, boolean, "plain">;
    image_name: z<string, string, "plain">;
}>>, "plain">;
/** The composed prefix tail for a doc's output_name — `_<slug>` when
 *  spelled, '' when absent. The DELIVERABLE prefix sites thread this
 *  (the film `h3_t4_film`, the extend film `extend_film`, the
 *  re-shoot plates `reshoot_warp` / `reshoot_orbit`); a stem that
 *  escaped the boundary walk (a legacy draft, a hand-built doc)
 *  refuses HERE loud, naming the law — a bad stem must never reach
 *  a filename. An empty string is the label seam's silence law:
 *  no stem, no tail, no refusal. */
export declare function outputNameTailOf(p: Record<string, unknown>): string;
/** Schemastery objects are lenient (unknown/missing keys ride); the
 *  family-admission laws are the renderer's own validators, ported:
 *  unknown variant + family-conditional key admission on EXPLICIT
 *  params only (the python gate reads model_fields_set). The t4r
 *  staged-image law rides compose (it reads the merged value). The
 *  renderer-vocabulary keys (variant, k, ctx_*, sla_*, ...) are NOT
 *  declared knobs — old drafts keep working because the schema admits
 *  them and the compose door overlays explicit params last (the
 *  img-to-mesh filename_prefix precedent). */
/** THE REFINE CARD'S PLANE SURFACE (2026-11-13): the knobs the
 *  masked-edit plane reads for a standalone refine. PICKED off the
 *  film carrier — never re-declared — so the refine card's defaults
 *  are the family's own (one owner; a family dial retune reaches
 *  every surface that composes the plane). Known knobs only: a typo
 *  refuses here, at load. */
export declare const REFINE_PLANE_KEYS: readonly ["sched_name", "shift_video", "shift_audio", "sla_enabled", "sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps", "sla_protect_audio", "sla_dense_steps", "sla_dense_backend", "sla_disable_fp16_accum", "sla_stabilize_motion", "sla_reference_protection"];
export declare const refinePlaneSchema: z<Schemastery.ObjectS<NoInfer<{
    [k: string]: z;
}>>, Schemastery.ObjectT<NoInfer<{
    [k: string]: z;
}>>, "plain">;
/** The wire tolerance for interpolate_enabled: the bench add-door's
 *  "false"/"true" string literal folds to a boolean before the walk;
 *  any other string refuses loud. Booleans and every other key pass
 *  verbatim.
 * @param raw the pre-walk params record
 * @returns the record with interpolate_enabled narrowed to boolean */
export declare const coerceWireBoolean: (raw: Record<string, unknown>) => Record<string, unknown>;
/** THE PIN ROW SHAPE (one law, two seats): the doc walk and the compose
 *  gate both run this BEFORE any placement math — a row must carry a
 *  whole film-absolute frame and a non-empty image ref. Exported so the
 *  walk's refusal and the build door's are the same literal (the
 *  gate-and-walk wall pins them); placement and media existence stay
 *  the compose gate's, which owns the doc's calls/windows. */
export declare function assertKeyframeRowShape(rows: readonly unknown[]): void;
/** The compose-admission walk over a raw doc (the card gate's
 *  model_validator port): array and boolean wire tolerances restored,
 *  keyframe rows shape-judged, shot rows judged (per-call vocabulary,
 *  int spans, tiling, seam/grid/guide gates), the window family
 *  derived, and the family-conditional key gates run. A refusal names
 *  the row and the cure; a passing doc returns the walked params with
 *  the __steps_pinned/__shift_pinned stamps added.
 * @param v the raw doc (absent = the fresh-card draft)
 * @returns the walked params record the compose reads */
export declare function schema(v: unknown): Record<string, unknown>;
export declare const carrier: z<Schemastery.ObjectS<NoInfer<{
    image: z<string, string, "plain">;
    last_frame: z<string, string, "plain">;
    ref_images: z<string[], string[], "plain">;
    ref_videos: z<string[], string[], "plain">;
    ref_video_trims: z<({
        start_time?: number | null | undefined;
        duration?: number | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        start_time: z<number, number, "defined">;
        duration: z<number, number, "defined">;
    }>>[], "plain">;
    ref_audios: z<string[], string[], "plain">;
    ref_mods: z<string[], string[], "plain">;
    refmod_mode: z<string, string, "defined">;
    refmod_pool: z<number, number, "defined">;
    refmod_identity: z<number, number, "defined">;
    refmod_save: z<boolean, boolean, "defined">;
    duck_depth_db: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    width: z<number, number, "defined">;
    height: z<number, number, "defined">;
    length: z<number, number, "defined">;
    fps: z<number, number, "defined">;
    steps: z<number, number, "defined">;
    second_pass_enabled: z<boolean, boolean, "defined">;
    sharpen_enabled: z<boolean, boolean, "defined">;
    sharpen_strength: z<number, number, "defined">;
    interpolate_enabled: z<boolean, boolean, "defined">;
    denoise: z<number, number, "defined">;
    sampler_name: z<string, string, "defined">;
    sched_name: z<string, string, "defined">;
    refine_lora: z<string, string, "defined">;
    refine_strength: z<number, number, "plain">;
    refine_steps: z<number, number, "plain">;
    refine_denoise: z<number, number, "defined">;
    upscale_route: z<string, string, "defined">;
    upscale_model: z<string, string, "defined">;
    attention_backend: z<string, string, "defined">;
    interp_model: z<string, string, "defined">;
    interp_multiplier: z<number, number, "defined">;
    sr_switch: z<boolean, boolean, "defined">;
    sr_resolution: z<number, number, "defined">;
    sr_model: z<string, string, "defined">;
    ref_image_size: z<string, string, "defined">;
    shift_video: z<number, number, "defined">;
    shift_audio: z<number, number, "defined">;
    sla_enabled: z<boolean, boolean, "defined">;
    sla_sparsity: z<number, number, "defined">;
    sla_block_size: z<string, string, "defined">;
    sla_min_seq_len: z<number, number, "defined">;
    sla_dense_last_steps: z<number, number, "defined">;
    sla_dense_steps: z<string, string, "defined">;
    sla_dense_backend: z<string, string, "defined">;
    sla_reference_protection: z<string, string, "defined">;
    sla_protect_audio: z<boolean, boolean, "defined">;
    sla_stabilize_motion: z<boolean, boolean, "plain">;
    sla_disable_fp16_accum: z<boolean, boolean, "defined">;
    sharpen_method: z<string, string, "defined">;
    sharpen_radius: z<number, number, "plain">;
    sharpen_threshold: z<number, number, "plain">;
    sharpen_iterations: z<number, number, "plain">;
    k: z<number, number, "plain">;
    noise_seed: z<number, number, "plain">;
    fps_seconds: z<number, number, "plain">;
    output_name: z<string, string, "plain">;
    interp_switch: z<boolean, boolean, "plain">;
    sharpen_switch: z<boolean, boolean, "plain">;
    sla_switch: z<boolean, boolean, "plain">;
    image_name: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    image: z<string, string, "plain">;
    last_frame: z<string, string, "plain">;
    ref_images: z<string[], string[], "plain">;
    ref_videos: z<string[], string[], "plain">;
    ref_video_trims: z<({
        start_time?: number | null | undefined;
        duration?: number | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        start_time: z<number, number, "defined">;
        duration: z<number, number, "defined">;
    }>>[], "plain">;
    ref_audios: z<string[], string[], "plain">;
    ref_mods: z<string[], string[], "plain">;
    refmod_mode: z<string, string, "defined">;
    refmod_pool: z<number, number, "defined">;
    refmod_identity: z<number, number, "defined">;
    refmod_save: z<boolean, boolean, "defined">;
    duck_depth_db: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    width: z<number, number, "defined">;
    height: z<number, number, "defined">;
    length: z<number, number, "defined">;
    fps: z<number, number, "defined">;
    steps: z<number, number, "defined">;
    second_pass_enabled: z<boolean, boolean, "defined">;
    sharpen_enabled: z<boolean, boolean, "defined">;
    sharpen_strength: z<number, number, "defined">;
    interpolate_enabled: z<boolean, boolean, "defined">;
    denoise: z<number, number, "defined">;
    sampler_name: z<string, string, "defined">;
    sched_name: z<string, string, "defined">;
    refine_lora: z<string, string, "defined">;
    refine_strength: z<number, number, "plain">;
    refine_steps: z<number, number, "plain">;
    refine_denoise: z<number, number, "defined">;
    upscale_route: z<string, string, "defined">;
    upscale_model: z<string, string, "defined">;
    attention_backend: z<string, string, "defined">;
    interp_model: z<string, string, "defined">;
    interp_multiplier: z<number, number, "defined">;
    sr_switch: z<boolean, boolean, "defined">;
    sr_resolution: z<number, number, "defined">;
    sr_model: z<string, string, "defined">;
    ref_image_size: z<string, string, "defined">;
    shift_video: z<number, number, "defined">;
    shift_audio: z<number, number, "defined">;
    sla_enabled: z<boolean, boolean, "defined">;
    sla_sparsity: z<number, number, "defined">;
    sla_block_size: z<string, string, "defined">;
    sla_min_seq_len: z<number, number, "defined">;
    sla_dense_last_steps: z<number, number, "defined">;
    sla_dense_steps: z<string, string, "defined">;
    sla_dense_backend: z<string, string, "defined">;
    sla_reference_protection: z<string, string, "defined">;
    sla_protect_audio: z<boolean, boolean, "defined">;
    sla_stabilize_motion: z<boolean, boolean, "plain">;
    sla_disable_fp16_accum: z<boolean, boolean, "defined">;
    sharpen_method: z<string, string, "defined">;
    sharpen_radius: z<number, number, "plain">;
    sharpen_threshold: z<number, number, "plain">;
    sharpen_iterations: z<number, number, "plain">;
    k: z<number, number, "plain">;
    noise_seed: z<number, number, "plain">;
    fps_seconds: z<number, number, "plain">;
    output_name: z<string, string, "plain">;
    interp_switch: z<boolean, boolean, "plain">;
    sharpen_switch: z<boolean, boolean, "plain">;
    sla_switch: z<boolean, boolean, "plain">;
    image_name: z<string, string, "plain">;
}>>, "plain">;
//# sourceMappingURL=schema.d.ts.map
