import { GraphBuilder, stripAutofill } from './graph.ts'
import type { PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'

/** A REAL negative always rides the encode (empty text hits the fp8
 *  umt5 meta-tensor path server-side — moved verbatim from the
 *  video-gen card). */
export const VIDEO_NEGATIVE_FALLBACK = 'low quality, blurry, jitter, distorted limbs, watermark'

/** The wan Lightning 4-step LoRA — the WanVaceT1Doc default mirror
 *  (lane facts carry no lora row; the Doc IS its home
 *  moved verbatim from the video-gen card). */
export const VACE_LIGHTNING_LORA = 'wan-vace/Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors'

/** The family's required path params (the _ARMS mirror
 *  moved verbatim from the video-gen card). */
export const VIDEO_REQUIRED_PATHS: Record<string, readonly string[]> = {
  'wan-vace': ['reference_image'],
  'scail2-animate': ['reference_image', 'pose_video'],
}

/** wan_vace_t1 — merged VACE checkpoint + Lightning LoRA, shift 8
 *  (moved verbatim from the video-gen card). */
export function wanVace(p: Record<string, unknown>, negative: string, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  const clip = g.node('CLIPLoader', { clip_name: li.text_encoder as string, type: li.clip_type as string, device: 'default' }).out()
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt }).out()
  const neg = g.node('CLIPTextEncode', { clip, text: negative }).out()

  const unet = g.node('UNETLoader', { unet_name: li.unet as string, weight_dtype: 'default' }).out()
  const lora = g.node('LoraLoaderModelOnly', { model: unet, lora_name: VACE_LIGHTNING_LORA, strength_model: 1.0 }).out()
  const sampled = g.node('ModelSamplingSD3', { model: lora, shift: 8.0 }).out()
  const vae = g.node('VAELoader', { vae_name: li.vae as string }).out()

  const refImg = g.node('LoadImage', { image: p.reference_image }).out()

  const vace = g.node('WanVaceToVideo', {
    positive: pos,
    negative: neg,
    vae,
    width: p.width,
    height: p.height,
    length: p.length,
    batch_size: 1,
    strength: 1.0,
    reference_image: refImg,
  })

  const ks = g.node('KSampler', {
    model: sampled,
    positive: vace.out(0),
    negative: vace.out(1),
    latent_image: vace.out(2),
    seed,
    steps: p.steps,
    cfg: p.cfg,
    sampler_name: p.sampler,
    scheduler: p.scheduler,
    denoise: 1.0,
  }).out()

  const dec = g.node('VAEDecode', { samples: ks, vae }).out()
  g.node('VHS_VideoCombine', {
    images: dec,
    frame_rate: p.fps,
    loop_count: 0,
    filename_prefix: `${runId}/gen`,
    format: 'video/h264-mp4',
    pingpong: false,
    save_output: true,
  })
  // _pin_vace_merge (ModelMergeWAN2_1 dotted-input rewrite)
  // is a no-op on this graph — the merged checkpoint made the merge
  // node dead; nothing to port.
}

/** scail2_t1 — character animation over reference + driving video,
 *  shift 5 (moved verbatim from the video-gen card). */
export function scail2(p: Record<string, unknown>, negative: string, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  const clip = g.node('CLIPLoader', { clip_name: li.text_encoder as string, type: li.clip_type as string, device: 'default' }).out()
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt }).out()
  const neg = g.node('CLIPTextEncode', { clip, text: negative }).out()

  const unet = g.node('UNETLoader', { unet_name: li.unet as string, weight_dtype: 'default' }).out()
  const sampled = g.node('ModelSamplingSD3', { model: unet, shift: 5.0 }).out()
  const vae = g.node('VAELoader', { vae_name: li.vae as string }).out()

  const refImg = g.node('LoadImage', { image: p.reference_image }).out()
  // the driving video feeds the pose channel (VHS path loader takes
  // absolute paths; frames become the IMAGE batch WanSCAIL reads)
  const drive = g.node('VHS_LoadVideoPath', {
    video: p.pose_video,
    force_rate: 0,
    force_size: 'Disabled',
    custom_width: 0,
    custom_height: 0,
    frame_load_cap: 0,
    skip_first_frames: 0,
    select_every_nth: 1,
  })

  const scail = g.node('WanSCAILToVideo', {
    positive: pos,
    negative: neg,
    vae,
    width: p.width,
    height: p.height,
    length: p.length,
    batch_size: 1,
    pose_strength: p.pose_strength,
    pose_start: 0.0,
    pose_video: drive.out(0),
    reference_image: refImg,
  })

  const ks = g.node('KSampler', {
    model: sampled,
    positive: scail.out(0),
    negative: scail.out(1),
    latent_image: scail.out(2),
    seed,
    steps: p.steps,
    cfg: p.cfg,
    sampler_name: p.sampler,
    scheduler: p.scheduler,
    denoise: 1.0,
  }).out()

  const dec = g.node('VAEDecode', { samples: ks, vae }).out()
  g.node('VHS_VideoCombine', {
    images: dec,
    frame_rate: p.fps,
    loop_count: 0,
    filename_prefix: `${runId}/gen`,
    format: 'video/h264-mp4',
    pingpong: false,
    save_output: true,
  })
}

// ── the h3 window strip (bespoke card, kit-riding boilerplate) ──────
// The h3-timeline render body stays in-card (three window families,
// motion-context chaining — genuinely bespoke); its finalize
// calibration rides here so the strip set is kit-owned like every
// other lane's.

// inputs the t4 family templates OMIT whose pin defaults comfy-script
// would auto-fill at serialization (moved verbatim from the
// h3-timeline card).
export const H3_T4_STRIP: StripTable = {
  CLIPLoader: ['device'],
  LTX_lora_loader: ['lora_ui'],
  SeedVR2LoadDiTModel: [
    'attention_mode', 'blocks_to_swap', 'cache_model', 'offload_device',
    'swap_io_components'],
  SeedVR2LoadVAEModel: [
    'cache_model', 'decode_tile_overlap', 'decode_tile_size',
    'decode_tiled', 'encode_tile_overlap', 'encode_tile_size',
    'encode_tiled', 'offload_device', 'tile_debug'],
  SeedVR2VideoUpscaler: [
    'enable_debug', 'input_noise_scale', 'latent_noise_scale',
    'offload_device', 'prepend_frames', 'temporal_overlap'],
}

/** The t4-family strip pass (`if not is_t4r`). The i2v
 *  dead-branch node exists ONLY on t4r — the serialized graph's
 *  family marker — so the strip stays stateless per compose. */
export function finalizeH3(graph: PromptGraph): PromptGraph {
  if ('MiniMaxH3ImageToVideo.0' in graph) return graph   // t4r strips nothing
  return stripAutofill(graph, H3_T4_STRIP)
}
