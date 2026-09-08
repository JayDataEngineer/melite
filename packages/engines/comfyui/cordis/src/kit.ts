// Tier 2.5 — the emit kit (docs/design/one-contract-compose.md §2,
// "absorb comfy-script into the card kit"; operator order 2026-09-07:
// "MOST OF THIS [REDACTED 2026-11-05] JUST RIDES DEFAULTS AND A FEW COMFYUI NODES
// SLAPPED TOGETHER").
//
// The admission contract landed (card-decls carries knobs+admits+
// skeleton; the compose rim enforces) — what remains in each card is
// a loader chain → one or two card-specific nodes → save, with pin
// defaults (AUTOFILL) doing most of the work. This module owns every
// such graph recipe as data + small functions over the existing
// GraphBuilder + atoms blocks:
//
//   loaders by model-facts rows (lane_inputs.unet/vae/text_encoder/
//   clip_type/model_path/...) → encode/sample/decode slabs → save tail,
//   per-card param wiring from the contract.
//
// A card file is then: contract-derived decl (id/skeleton/boarded/
// requires/schema — the decl-parity mirror wall is RETIRED (import
// stroke 2026-09-08: one contract, TS owns the knob vocabulary on
// Schemastery direct); decls are pinned by the compose goldens +
// the cli admission gate instead, so decls NEVER move here) + admission
// guards (the card's loud voice) + one recipe call. h3-timeline and
// img-to-mesh keep their bespoke multi-family bodies in-card and ride
// the kit for arms/strips/shared chains.
//
// BYTE-PARITY LAW: every recipe below is moved verbatim from its card
// (creation order IS node-id order; input key insertion order IS the
// serialized order). tests/golden_cordis/*.json pins every byte —
// touch a recipe and the cordis compose wall goes red.
import { GraphBuilder, OutputHandle, stripAutofill, stripEmptyAutofill } from './graph.ts'
import type { NodeInputs, NodeRef, PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { loadTextPair, decodeSave, stackLoras } from './blocks/render-kit.ts'
import {
  AUDIACORE_TTS_AUTOFILL,
  AUDIACORE_STUDIO_AUTOFILL,
  loadAudiocore,
  saveAudio,
  laneStr,
} from './blocks/audio-kit.ts'
import {
  renderGLBViews,
  positive,
  nonNegative,
  strictTransparent,
  vecShape,
} from './blocks/poser-kit.ts'

// ── archetype I: the image-diffuse family ───────────────────────────
// Loader chain → lora stack → text pair → latent → KSampler →
// decode → save. Pin defaults ride AUTOFILL; each lane's strip table
// is the python renderer's own calibration, moved here verbatim.

/** Pin autofills the image_t2i python lane strips post-walk for
 *  parity (moved verbatim from the image-gen card). */
export const IMAGE_GEN_STRIP: StripTable = {
  CLIPLoader: ['device'],
  KSampler: ['control_after_generate'],
}

export function finalizeImageGen(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_GEN_STRIP)
}

/** The image_t2i block — the shared text-to-image lane (moved
 *  verbatim from the image-gen card). */
export function imageT2I(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): OutputHandle {
  const li = model.lane_inputs
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  if (li.sampling_shift) {
    unet = g.node('ModelSamplingAuraFlow', { model: unet, shift: li.sampling_shift }).out()
  }
  unet = stackLoras(g, unet, (p.loras ?? []) as Array<{ name: string; strength: number }>)
  const { clip, vae } = loadTextPair(g, li)
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt })
  const neg = g.node('CLIPTextEncode', { clip, text: p.negative_prompt ?? '' })
  const latent = g.node(li.latent_node, { batch_size: 1, width: p.width, height: p.height })
  const sampled = g.node('KSampler', {
    seed: p.seed,
    steps: p.steps,
    cfg: p.cfg,
    sampler_name: p.sampler,
    scheduler: p.scheduler,
    denoise: 1.0,
    latent_image: latent.out(),
    model: unet,
    positive: pos.out(),
    negative: neg.out(),
  })
  return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out()
}

/** Pin autofills the image_edit python lane strips post-walk for
 *  parity (moved verbatim from the image-edit card). */
export const IMAGE_EDIT_STRIP: StripTable = {
  CLIPLoader: ['device'],
  LoadImage: [],
  KSampler: ['control_after_generate'],
}

export function finalizeImageEdit(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_EDIT_STRIP)
}

/** The firing gate (the retired python MOD FIRING LAW, ported 1:1 —
 *  moved verbatim from the image-edit card): lane-promise values ride
 *  inert; anything that would change the graph refuses field-named
 *  INSTEAD of silently plain-editing. */
export function refuseImageEditFiring(p: Record<string, unknown>): void {
  const blank = (v: unknown): boolean =>
    v === undefined || v === null ||
    (typeof v === 'string' && !v.trim()) ||
    (v instanceof Array && v.length === 0)
  const fire = (key: string, cond: boolean, why: string): void => {
    if (cond) {
      throw new Error(`'${key}' fires on the image-edit card (${why}) — the TS plane builds the stock plain-edit graph only; refusing instead of silently plain-editing`)
    }
  }
  fire('reference_images', !blank(p.reference_images), 'multi-image lists need slot mapping the stock image1/2/3 node has no rule for')
  fire('double_reference', p.double_reference === true, 'the second encode needs nodes this plane does not build')
  fire('lanpaint_enabled', p.lanpaint_enabled === true, 'the lanpaint sampler is not in this plane')
  fire('lanpaint_num_steps', ((p.lanpaint_num_steps ?? 20) as number) !== 20, 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('lanpaint_step_size', ((p.lanpaint_step_size ?? 1.0) as number) !== 1.0, 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('lanpaint_lambda', ((p.lanpaint_lambda ?? 0.5) as number) !== 0.5, 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('lanpaint_beta', ((p.lanpaint_beta ?? 0.5) as number) !== 0.5, 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('lanpaint_friction', ((p.lanpaint_friction ?? 0.5) as number) !== 0.5, 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('lanpaint_prompt_mode', ((p.lanpaint_prompt_mode ?? 'negative') as string) !== 'negative', 'lanpaint knob off its lane promise with no lanpaint sampler to carry it')
  fire('outpaint_top', ((p.outpaint_top ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_right', ((p.outpaint_right ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_bottom', ((p.outpaint_bottom ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_left', ((p.outpaint_left ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_overlap', ((p.outpaint_overlap ?? 16) as number) !== 16, 'outpaint knob off its lane promise with no outpaint chain to carry it')
  fire('mask', !blank(p.mask), 'the mask flow needs the host-side prep chain + region wiring this plane does not build')
  fire('input_mask', !blank(p.input_mask), 'the attached region switches to the lanpaint sampler this plane does not build')
  fire('mask_mode', ((p.mask_mode ?? 'auto') as string) !== 'auto', 'mask knob off its lane promise with no mask flow to carry it')
  fire('mask_context_pad', ((p.mask_context_pad ?? 64) as number) !== 64, 'mask knob off its lane promise with no mask flow to carry it')
  fire('mask_grow', ((p.mask_grow ?? 8) as number) !== 8, 'mask knob off its lane promise with no mask flow to carry it')
  fire('mask_feather', ((p.mask_feather ?? 8) as number) !== 8, 'mask knob off its lane promise with no mask flow to carry it')
  fire('mask_threshold', ((p.mask_threshold ?? 0) as number) !== 0, 'mask knob off its lane promise with no mask flow to carry it')
  fire('mask_invert', p.mask_invert === true, 'mask knob off its lane promise with no mask flow to carry it')
}

/** The image_edit block — the anchored instruction-edit lane (moved
 *  verbatim from the image-edit card). */
export function imageEdit(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const li = model.lane_inputs
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  unet = stackLoras(g, unet, (p.loras ?? []) as Array<{ name: string; strength: number }>)
  const { clip, vae } = loadTextPair(g, li)
  const image = g.node('LoadImage', { image: p.image1, upload: 'image' }).out(0)
  // optional reference slots (the stock node's native image2/image3):
  // stated slots load ahead of the encodes (creation order IS node-id
  // order); blank slots contribute no input at all (golden-stable).
  const slot2 = ((p.image2 ?? '') as string).trim()
  const slot3 = ((p.image3 ?? '') as string).trim()
  const ref2 = slot2 ? g.node('LoadImage', { image: slot2, upload: 'image' }).out(0) : null
  const ref3 = slot3 ? g.node('LoadImage', { image: slot3, upload: 'image' }).out(0) : null
  const pos = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.prompt,
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  const neg = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.negative_prompt ?? '',
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  // FIXED 1.0 (template-pinned lane graph — not a knob, not the
  // wire, never li.sampling_shift; see the python doc's 2026-09-06
  // audit note on ImageEditDoc).
  const shifted = g.node('ModelSamplingAuraFlow', { model: unet, shift: 1.0 }).out()
  const encoded = g.node('VAEEncode', { pixels: image, vae }).out()
  const sampled = g.node('KSampler', {
    seed: p.seed,
    steps: p.steps,
    cfg: p.cfg,
    // the road's _step_doc coercions (doc.sampler or "euler"):
    // an unstated/empty row rides the lane default, never "".
    sampler_name: p.sampler || 'euler',
    scheduler: p.scheduler || 'simple',
    denoise: 1.0,
    latent_image: encoded,
    model: shifted,
    positive: pos.out(),
    negative: neg.out(),
  })
  decodeSave(g, sampled.out(), vae, `${runId}/edit`)
}

/** The official template's omission set — comfy-script autofills
 *  these from the pin; ComfyUI applies the same defaults live
 *  (moved verbatim from the ideogram4 card). */
export const IDEOGRAM_STRIP: StripTable = {
  CLIPLoader: ['device'],
  RandomNoise: ['control_after_generate'],
}

export function finalizeIdeogram(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IDEOGRAM_STRIP)
}

/** The ideogram_t2i block — dual-guided (conditional +
 *  CFGOverride-trimmed unconditional) sampling (moved verbatim from
 *  the ideogram4 card; admission stays on the card). */
export function ideogramLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const li = model.lane_inputs as Record<string, any>
  const clip = g.node('CLIPLoader', { clip_name: li.text_encoder, type: li.clip_type }).out()
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt }).out()
  const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out()
  const unetCond = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  const unetUncond = g.node('UNETLoader', { unet_name: li.unet_unconditional, weight_dtype: 'default' }).out()
  // the official template's late-schedule guidance trim on the
  // unconditional pass (constants of the family graph)
  const uncondTrimmed = g.node('CFGOverride', {
    model: unetUncond,
    cfg: 3,
    start_percent: 0.7,
    end_percent: 1.0,
  }).out()
  const guider = g.node('DualModelGuider', {
    model: unetCond,
    model_negative: uncondTrimmed,
    positive: pos,
    negative: neg,
    cfg: p.cfg,
  }).out()
  const noise = g.node('RandomNoise', { noise_seed: p.seed }).out()
  const sigmas = g.node('Ideogram4Scheduler', {
    steps: p.steps,
    width: p.width,
    height: p.height,
    mu: p.mu,
    std: p.std,
  }).out()
  const sampler = g.node('KSamplerSelect', { sampler_name: p.sampler }).out()
  const latent = g.node(String(li.latent_node), { batch_size: 1, width: p.width, height: p.height }).out()
  const sampled = g.node('SamplerCustomAdvanced', {
    noise,
    guider,
    sampler,
    sigmas,
    latent_image: latent,
  })
  const vae = g.node('VAELoader', { vae_name: li.vae }).out()
  const decoded = g.node('VAEDecode', { samples: sampled.out(0), vae }).out()
  g.node('SaveImage', { filename_prefix: `${runId}/gen`, images: decoded })
}

/** The music_t1 block — the MiniMax Music 3 lane (moved verbatim
 *  from the music card; admission stays on the card). */
export function musicT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const li = model.lane_inputs
  const unet = g.node('UNETLoader', { unet_name: laneStr(li.unet), weight_dtype: 'default' }).out()
  const clip = g.node('CLIPLoader', { clip_name: laneStr(li.text_encoder), model_options: 'default', type: laneStr(li.clip_type) }).out()
  const vae = g.node('VAELoader', { vae_name: laneStr(li.vae) }).out()
  const cond = g.node('MiniMaxMusic3TextEncode', {
    clip,
    caption: p.prompt,
    lyrics: p.lyrics ?? '',
    seed: p.seed,
    max_duration: p.duration,
    cfg_scale: p.lm_cfg_scale,
    top_k: 50,
  })
  const zeroed = g.node('ConditioningZeroOut', { conditioning: cond.out(0) })
  const latent = g.node('EmptyMiniMaxMusic3LatentAudio', { batch_size: 1, seconds: p.duration })
  const sampled = g.node('KSampler', {
    seed: p.seed,
    steps: p.n_diffusion_steps,
    cfg: p.guidance_scale,
    sampler_name: 'euler',
    scheduler: 'simple',
    denoise: 1.0,
    latent_image: latent.out(),
    model: unet,
    positive: cond.out(0),
    negative: zeroed.out(),
  })
  const audio = g.node('VAEDecodeAudio', { samples: sampled.out(), vae })
  g.node('SaveAudioAdvanced', { audio: audio.out(), filename_prefix: `${runId}/music`, format: 'mp3', 'format.quality': 'V0' })
}

/** A REAL negative always rides the encode (empty text hits the fp8
 *  umt5 meta-tensor path server-side — moved verbatim from the
 *  video-gen card). */
export const VIDEO_NEGATIVE_FALLBACK = 'low quality, blurry, jitter, distorted limbs, watermark'

/** The wan Lightning 4-step LoRA — the WanVaceT1Doc default mirror
 *  (lane facts carry no lora row; the python Doc IS its home —
 *  moved verbatim from the video-gen card). */
export const VACE_LIGHTNING_LORA = 'wan-vace/Wan22_A14B_T2V_HIGH_Lightning_4steps_lora_250928_rank128_fp16.safetensors'

/** The family's required path params (the compose.py _ARMS mirror —
 *  moved verbatim from the video-gen card). */
export const VIDEO_REQUIRED_PATHS: Record<string, readonly string[]> = {
  'wan-vace': ['reference_image'],
  'scail2-animate': ['reference_image', 'pose_video'],
}

/** wan_vace_t1 — merged VACE checkpoint + Lightning LoRA, shift 8
 *  (moved verbatim from the video-gen card). */
export function wanVace(p: Record<string, unknown>, negative: string, model: ModelFacts, g: GraphBuilder, runId: string): void {
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
    seed: p.seed,
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
  // python's _pin_vace_merge (ModelMergeWAN2_1 dotted-input rewrite)
  // is a no-op on this graph — the merged checkpoint made the merge
  // node dead; nothing to port.
}

/** scail2_t1 — character animation over reference + driving video,
 *  shift 5 (moved verbatim from the video-gen card). */
export function scail2(p: Record<string, unknown>, negative: string, model: ModelFacts, g: GraphBuilder, runId: string): void {
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
    seed: p.seed,
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

// ── archetype II: the audiocore family ────────────────────────────
// LoadAudiocoreModel (family/model_path/extras from facts) → one
// synth node → SaveAudio. The pin AUTOFILLs ride verbatim; per-card
// param wiring is the only difference between the three lanes.

/** The tts_t1 block — the shared speak-text lane (moved verbatim
 *  from the tts card; admission stays on the card). */
export function ttsT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: laneStr(model.defaults.mode, 'tts'),
    // the model's default persona fills an unstated doc voice
    voice: (p.voice as string) || laneStr(model.defaults.voice),
    // schema-required keys render ''-absent at compose (image-gen
    // precedent) — bare strings normalize here so an absent row still
    // wires "" (the golden pins "").
    instruct: (p.style_instruction ?? '') as string,
    temperature: p.temperature,
    seed: p.seed,
    voice_file: (p.qvoice ?? '') as string,
    voice_pca_strengths: (p.voice_pca_strengths ?? '') as string,
    // NO top_p/speed (py: not knobs — the AUTOFILL spread above owns
    // 0.9/1.0; the golden pins them from the pin, never from params).
  })
  saveAudio(g, synth.out(), `${runId}/tts`)
}

/** The sfx_t1 block — the sound-effect lane (moved verbatim from the
 *  sfx card; admission stays on the card). */
export function sfxT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: (p.prompt as string).trim(),
    mode: 'tts',
    guidance_scale: p.guidance_scale,
    num_inference_steps: p.n_diffusion_steps,
    duration_seconds: p.duration,
    seed: p.seed,
  })
  saveAudio(g, synth.out(), `${runId}/sfx`)
}

/** The voicelock_t1 block — the persona export lane (moved verbatim
 *  from the voice-lock card; admission stays on the card). */
export function voicelockT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const loaded = loadAudiocore(g, model)
  const studio = g.node('AudiocoreVoiceStudio', {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: 'export_lite',
    name: (p.voice_name as string).trim(),
    instruct: (p.style_instruction as string).trim(),
    temperature: p.temperature,
    top_p: p.top_p,
    speed: p.speed,
    repetition_penalty: p.repetition_penalty,
    seed: p.seed,
  })
  saveAudio(g, studio.out(), `${runId}/voicelock`)
}

// ── archetype III: the poser turnaround family ──────────────────────
// Body → assemble (CompositeCharacter / FitProp / SkinApply) → the
// shared 8-view turnaround tail (blocks/poser-kit renderGLBViews).
// The strip tables stay EMPTY so the pin's autofills ride
// (comfy-script parity via the GraphBuilder pin defaults).

/** (DESCOPE 2026-09-05 — moved verbatim from the anny card.) The
 *  table stays EMPTY, so the pin's hair/outfit "" autofills ride. */
export const ANNY_STRIP: StripTable = {}

export function finalizeAnny(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, ANNY_STRIP)
}

/** The anny_t1 block — composite character → turnaround sheet +
 *  optional SAM ingest (moved verbatim from the anny card; the
 *  body_glb admission stays on the card). */
export function annyLane(p: Record<string, unknown>, g: GraphBuilder): void {
  const body = String(p.body_glb ?? '')
  const bodyPath = g.node('PrimitiveString', { value: body }).out()
  const glbPath = g.node('CompositeCharacter', { body_glb_path: bodyPath }).out()
  renderGLBViews(g, glbPath, {
    resolution: positive('resolution', p.resolution),
    framing: positive('framing', p.framing),
    focal_length: positive('focal_length', p.focal_length),
    samples: positive('samples', p.samples),
    transparent: String(p.transparent).toLowerCase() !== 'false',
  }, 'anny')
  const src = String(p.source_image ?? '')
  if (src) {
    // the ingest side stands alone: LoadImage (the runtime upload
    // walk stages the abs path) → SAM → sprites in the output dir
    const loaded = g.node('LoadImage', { image: src })
    g.node('RaySAMSegmentHairClothing', { image: loaded.out() })
  }
}

export const FIT_STRIP: StripTable = {}

export function finalizeFit(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, FIT_STRIP)
}

/** The Unity prop name: the ORIGINAL filename stem, never the staged
 *  name (moved verbatim from the fit card). */
export function fitModelStem(ref: string): string {
  const base = ref.split('/').pop()!.split('\\').pop()!
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base
  return stem.trim() || 'prop'
}

/** The fit_t1 block — FitRow derives the runtime row, FitProp seats
 *  the prop, 8-view proof sheet (moved verbatim from the fit card;
 *  the body/prop/bone admission stays on the card). */
export function fitLane(p: Record<string, unknown>, g: GraphBuilder, runId: string): void {
  const body = String(p.body_glb ?? '')
  const prop = String(p.prop_glb ?? '')
  const bone = String(p.bone ?? '')
  const position = vecShape('position', p.position)
  const rotation = vecShape('rotation', p.rotation)
  const fitRatio = nonNegative('fit_ratio', p.fit_ratio)
  const seatRatio = nonNegative('seat_ratio', p.seat_ratio)
  const targetWidth = nonNegative('target_width', p.target_width)
  const bodyPath = g.node('PrimitiveString', { value: body }).out()
  const propPath = g.node('PrimitiveString', { value: prop }).out()
  const rowJson = g.node('FitRow', {
    model_name: fitModelStem(prop),
    bone,
    align: p.align,
    position,
    rotation,
    fit_ratio: fitRatio,
    fit_ref_bone: p.fit_ref_bone ?? '',
    fit_ref_bone2: p.fit_ref_bone2 ?? '',
    seat_ratio: seatRatio,
    finger_bone: p.finger_bone ?? '',
    thumb_bone: p.thumb_bone ?? '',
    target_width: targetWidth,
  }).out()
  const glbPath = g.node('FitProp', { body_glb_path: bodyPath, prop_glb_path: propPath, row_json: rowJson }).out()
  renderGLBViews(g, glbPath, {
    resolution: positive('resolution', p.resolution),
    framing: positive('framing', p.framing),
    focal_length: positive('focal_length', p.focal_length),
    samples: positive('samples', p.samples),
    transparent: strictTransparent(p.transparent),
  }, `${runId}/out`)
}

export const SKIN_STRIP: StripTable = {}

export function finalizeSkin(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, SKIN_STRIP)
}

// ---- the card-owned skin spec (the skin_spec.py port, moved
// verbatim from the skin card) ----

const SOMAX_UV = 'somax'
// meld 4.38 shader law: v1.4 bump OFF, de-sheen matte, metallic 0,
// triplanar detail — the sidecar carries them so a consumer can
// never re-enable the UV-path bump by default.
const NORMAL_STRENGTH = 0.0
const SMOOTHNESS = 0.18
const METALLIC = 0.0
const TRIPLANAR_DENSITY = 3.0
// closed size vocabulary: a typo is a refusal, not a silent rescale
const SKIN_SIZES: readonly number[] = [256, 512, 1024, 2048]

export interface KindSkinRow {
  readonly kind: string
  readonly tint: readonly number[]
  readonly texture: string
  readonly category: string
}

/** The 20 meld kinds (meld 4.36 full kind table, v0.98.5), verbatim. */
const KIND_TABLE: readonly KindSkinRow[] = [
  { kind: 'keeper', tint: [0.85, 0.70, 0.55], texture: 'young_caucasian_male', category: 'humanoid' },
  { kind: 'ash_nomad', tint: [0.65, 0.50, 0.40], texture: 'middleage_caucasian_male', category: 'humanoid' },
  { kind: 'villager_elder', tint: [0.75, 0.60, 0.50], texture: 'old_caucasian_male', category: 'humanoid' },
  { kind: 'villager', tint: [0.80, 0.65, 0.50], texture: 'young_caucasian_female', category: 'humanoid' },
  { kind: 'caravan_trader', tint: [0.78, 0.62, 0.48], texture: 'middleage_caucasian_female', category: 'humanoid' },
  { kind: 'amf_warden', tint: [0.72, 0.58, 0.46], texture: 'middleage_caucasian_male', category: 'humanoid' },
  { kind: 'cherusci_scrivener', tint: [0.82, 0.68, 0.54], texture: 'young_caucasian_male', category: 'humanoid' },
  { kind: 'marrow_raider', tint: [0.60, 0.48, 0.38], texture: 'old_caucasian_male', category: 'humanoid' },
  { kind: 'amalgam_horror', tint: [0.45, 0.35, 0.30], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'arena_factor', tint: [0.70, 0.55, 0.45], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'bone_crane', tint: [0.85, 0.82, 0.78], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'dune_hound', tint: [0.80, 0.70, 0.50], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'emberwing', tint: [0.85, 0.45, 0.30], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'gloom_tortoise', tint: [0.50, 0.55, 0.45], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'husk_stalker', tint: [0.55, 0.45, 0.35], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'ironvein_construct', tint: [0.50, 0.50, 0.52], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'meld_creature', tint: [0.60, 0.50, 0.42], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'moss_elk', tint: [0.55, 0.60, 0.45], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'ridge_lizard', tint: [0.65, 0.58, 0.45], texture: 'flat_placeholder', category: 'creature' },
  { kind: 'sand_skimmer', tint: [0.75, 0.68, 0.55], texture: 'flat_placeholder', category: 'creature' },
]

function skinRowFor(kind: string): KindSkinRow {
  const row = KIND_TABLE.find((r) => r.kind === kind)
  if (!row) {
    throw new Error(`kind ${JSON.stringify(kind)} is not a meld kind (see KIND_TABLE: ${KIND_TABLE.map((r) => r.kind).sort().join(', ')})`)
  }
  return row
}

/** python float repr: a float always carries its decimal (0.0, 3.0)
 *  — JSON.stringify would emit 0/3 and break the sidecar's byte
 *  parity with the python road. */
function pyFloat(v: number): string {
  return Number.isInteger(v) ? v.toFixed(1) : String(v)
}

/** The Unity-consumable sidecar in python json.dumps(sort_keys=True)
 *  byte-shape: sorted keys, ", " / ": " separators. */
function sidecarJson(kind: string, size: number, seed: number): string {
  const row = skinRowFor(kind)
  return '{' + [
    `"category": ${JSON.stringify(row.category)}`,
    `"kind": ${JSON.stringify(row.kind)}`,
    `"metallic": ${pyFloat(METALLIC)}`,
    `"normal_strength": ${pyFloat(NORMAL_STRENGTH)}`,
    `"seed": ${seed}`,
    `"size": ${size}`,
    `"smoothness": ${pyFloat(SMOOTHNESS)}`,
    `"texture": ${JSON.stringify(row.texture)}`,
    `"tint": [${row.tint.map((c) => pyFloat(c)).join(', ')}]`,
    `"triplanar_density": ${pyFloat(TRIPLANAR_DENSITY)}`,
    `"uv": ${JSON.stringify(SOMAX_UV)}`,
  ].join(', ') + '}'
}

/** map_size law: coerce the wire value to an int, then the closed
 *  vocabulary — off-vocabulary refuses with the field name (moved
 *  verbatim from the skin card). */
export function skinMapSize(v: unknown): number {
  const n = typeof v === 'string' ? Number(v.trim()) : v
  if (typeof n !== 'number' || !Number.isInteger(n) || !SKIN_SIZES.includes(n)) {
    throw new Error(`map_size = ${typeof v === 'string' ? JSON.stringify(v) : String(v)} not in [256, 512, 1024, 2048]`)
  }
  return n
}

/** The skin_t1 block — SkinPack maps + kind sidecar + SkinApply +
 *  8-view proof sheet (moved verbatim from the skin card; the
 *  body_glb admission stays on the card). */
export function skinLane(p: Record<string, unknown>, g: GraphBuilder, runId: string): void {
  const body = String(p.body_glb ?? '')
  const size = skinMapSize(p.map_size)
  // GATE S (the seed-sentinel contract): -1 is RANDOM — the dice
  // mints HERE (python dice="phase2": the render door mints so
  // sidecar + SkinPack share it); below -1 or a non-int refuses.
  let seed = p.seed
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < -1) {
    throw new Error(`seed = ${String(p.seed)}: -1 (random) or a non-negative int is required`)
  }
  if (seed === -1) seed = Math.floor(Math.random() * 2147483647)
  const prefix = `${runId}/out`
  const bodyPath = g.node('PrimitiveString', { value: body }).out()
  const sidecarText = g.node('PrimitiveString', { value: sidecarJson(String(p.kind ?? ''), size, seed) }).out()
  const pack = g.node('SkinPack', { size, seed })
  g.node('SaveImage', { images: pack.out(0), filename_prefix: `${prefix}_albedo` })
  g.node('SaveImage', { images: pack.out(1), filename_prefix: `${prefix}_normal` })
  g.node('SaveText', { text: sidecarText, format: 'json', filename_prefix: `${prefix}_kind` })
  const glbPath = g.node('SkinApply', { body_glb_path: bodyPath, albedo: pack.out(0), normal: pack.out(1) }).out()
  renderGLBViews(g, glbPath, {
    resolution: positive('resolution', p.resolution),
    framing: positive('framing', p.framing),
    focal_length: positive('focal_length', p.focal_length),
    samples: positive('samples', p.samples),
    transparent: strictTransparent(p.transparent),
  }, prefix)
}

// ── the mask selection lane ─────────────────────────────────────────
// RT-DETR proposes, SAM3 refines; loaders are lazy (reachability —
// see the mask-studio card header, kept there).

type BboxDict = { x: number; y: number; width: number; height: number }

/** The mask_t1 block — the selection lane (detect → refine → save),
 *  moved verbatim from the mask-studio card; the input_image
 *  admission stays on the card. */
export function maskT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const li = model.lane_inputs          // the model as DATA (typed rows)
  const prefix = `${runId}/mask`        // the arm's "%s/mask" % run_id
  const samThreshold = p.sam_threshold as number
  // undeclared legacy renderer keys ride the door's explicit-params
  // overlay (see schema header) — schema-required paint_mask renders
  // ''-absent at compose (image-gen precedent), refine_iterations
  // falls back to its old schema pin 2 when no explicit names it.
  const refineIterations = ((p.refine_iterations ?? 2) as number)
  const dilation = p.sam_dilation as number
  const exportBoxes = p.export_boxes as boolean
  const viaRtdetr = p.primary_via_rtdetr as boolean

  // the lazy loader trio (see the header note — created on first use)
  let imgH: OutputHandle | null = null
  let ckpt: NodeRef | null = null
  let rtdetrModel: OutputHandle | null = null
  const img = (): OutputHandle => (imgH ??= g.node('LoadImage', { image: p.input_image as string }).out(0))
  const ckptNode = (): NodeRef => (ckpt ??= g.node('CheckpointLoaderSimple', { ckpt_name: li.checkpoint as string }))
  const rtdetrLoader = (): OutputHandle =>
    (rtdetrModel ??= g.node('UNETLoader', { unet_name: li.unet as string, weight_dtype: 'default' }).out(0))

  const clipCond = (text: string): OutputHandle =>
    g.node('CLIPTextEncode', { text, clip: ckptNode().out(1) }).out(0)

  // the pin's declared default for SAM3_Detect.bboxes (socketless,
  // forceInput): comfy-script autofills it whenever the caller passes
  // no bboxes, and the python renderer does not strip it — the golden
  // pins it on every bboxes-less SAM3_Detect.
  const DEFAULT_BBOXES: BboxDict = { x: 0, y: 0, width: 512, height: 512 }

  const detect = (conditioning?: OutputHandle, bboxes?: OutputHandle | BboxDict): OutputHandle => {
    const inputs: NodeInputs = {
      model: ckptNode().out(0),
      image: img(),
      threshold: samThreshold,
      refine_iterations: refineIterations,
      individual_masks: false,
    }
    if (conditioning) inputs.conditioning = conditioning
    inputs.bboxes = bboxes ?? DEFAULT_BBOXES
    return g.node('SAM3_Detect', inputs).out(0)     // (masks, bboxes) → masks
  }

  const dilate = (mask: OutputHandle): OutputHandle =>
    dilation ? g.node('GrowMask', { mask, expand: dilation, tapered_corners: true }).out(0) : mask

  const save = (mask: OutputHandle, name: string): void => {
    const m2i = g.node('MaskToImage', { mask: dilate(mask) })
    g.node('SaveImage', { images: m2i.out(0), filename_prefix: `${prefix}/${name}` })
  }

  let primaryMask: OutputHandle | null = null

  // ── the RT-DETR proposal lane (primary body + box manifest) ──
  let rtdetrBoxes: OutputHandle | null = null
  if (exportBoxes || viaRtdetr) {
    const cap = (p.max_instances as number) || 100
    rtdetrBoxes = g.node('RTDETR_detect', {
      model: rtdetrLoader(),
      image: img(),
      threshold: p.detection_threshold as number,
      class_name: 'person',
      max_detections: cap,
    }).out(0)
  }
  const primaryClass = p.primary_class as string | undefined
  const primaryPrompt = p.primary_prompt as string | undefined
  if (viaRtdetr && rtdetrBoxes) {
    primaryMask = detect(undefined, rtdetrBoxes)
    save(primaryMask, 'mask_combined')
  } else if (primaryClass) {
    primaryMask = detect(clipCond(primaryClass))
    save(primaryMask, 'mask_combined')
  } else if (primaryPrompt) {
    primaryMask = detect(clipCond(primaryPrompt))
    save(primaryMask, 'mask_combined')
  } else if (p.primary_is_paint as boolean) {
    // NOTE: python's primary `painted` and the exports' `paint_masked`
    // are DISTINCT locals — a paint primary plus a paint export renders
    // TWO LoadImageMask nodes (byte-identical inputs, two nodes). The
    // probe against the python renderer pins this.
    const painted = g.node('LoadImageMask', { image: ((p.paint_mask ?? '') as string), channel: 'alpha' }).out(0)
    primaryMask = painted
    save(painted, 'mask_combined')
  }

  // ── per-name exports ──
  const exports = (p.exports as Array<[string, string]>) ?? []
  const kinds = (p.export_kind as string[]) ?? []
  const scopeBbox = p.scope_bbox as [number, number, number, number] | undefined
  if (scopeBbox && scopeBbox.length !== 4) {
    throw new Error(`scope_bbox refused on the mask-studio card: needs exactly [x, y, w, h] pixels (got ${scopeBbox.length} values)`)
  }
  let paintMasked: OutputHandle | null = null
  const n = Math.min(exports.length, kinds.length)   // python zip(): the shorter arm wins
  for (let i = 0; i < n; i++) {
    const [name, payload] = exports[i]
    const kind = kinds[i]
    if (kind === 'paint') {
      if (!paintMasked) {
        paintMasked = g.node('LoadImageMask', { image: ((p.paint_mask ?? '') as string), channel: 'alpha' }).out(0)
      }
      save(paintMasked, `mask_${name}`)
      continue
    }
    let conditioning: OutputHandle | undefined
    if (payload) {
      // the text lane rides EVEN under scope (boxes to segment within
      // + the vocabulary) — a scope never silently drops the prompt
      conditioning = clipCond(payload)
    }
    const bboxes = scopeBbox
      ? { x: scopeBbox[0], y: scopeBbox[1], width: scopeBbox[2], height: scopeBbox[3] }
      : undefined
    const sel = detect(conditioning, bboxes)
    save(sel, `mask_${name}`)
  }

  // paint unions into combined (flat-mode export_paint contract)
  if ((p.union_paint_into_combined as boolean) && paintMasked && primaryMask) {
    const combined = g.node('MaskComposite', {
      destination: dilate(primaryMask),   // a SECOND GrowMask on the primary under union
      source: paintMasked,
      x: 0,
      y: 0,
      operation: 'add',
    }).out(0)
    save(combined, 'mask_combined_union')
  }

  // ── the box manifest (drawn) — the instance readback ──
  if (exportBoxes && rtdetrBoxes) {
    const drawn = g.node('DrawBBoxes', { bboxes: rtdetrBoxes, image: img() })
    g.node('SaveImage', { images: drawn.out(0), filename_prefix: `${prefix}/detect_boxes` })
  }
}

// ── the motion lane ────────────────────────────────────────────────
// KimodoLoader → KimodoTextToPose → optional RaySomaxBake. No
// filename_prefix (the NPZ and baked GLB write themselves into the
// output dir — runId rides the door, un-graphed).

// fps is LANE-INTERNAL (MotionT1Doc default 30.0 — moved verbatim
// from the motion card).
const MOTION_BAKE_FPS = 30.0

/** Optional empties are ABSENT, never ""-wired (moved verbatim from
 *  the motion card — the CONDITIONAL strip variant). */
export const MOTION_STRIP: StripTable = {
  KimodoTextToPose: ['prev_motion_npz', 'motion_prompts', 'motion_constraints'],
}

export function finalizeMotion(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, MOTION_STRIP)
}

/** The motion_t1 block — Kimodo checkpoint lane + optional preview
 *  bake (moved verbatim from the motion card; the prompt admission
 *  stays on the card). */
export function motionLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder): void {
  const li = model.lane_inputs
  const loader = g.node('KimodoLoader', { model_name: li.model_path as string }).out()

  // the step-doc STRIPS the text trio before wiring (python
  // compose._step_doc) — a padded string never reaches the node.
  const prompts = ((p.motion_prompts ?? '') as string).trim()
  const constraints = ((p.motion_constraints ?? '') as string).trim()
  const chain: Record<string, unknown> = {}
  if (p.motion_npz) chain.prev_motion_npz = p.motion_npz
  if (prompts) chain.motion_prompts = prompts
  if (constraints) chain.motion_constraints = constraints

  const npz = g.node('KimodoTextToPose', {
    model: loader,
    prompt: (p.prompt as string).trim(),
    seed: p.seed,
    duration_sec: p.duration_sec,
    diffusion_steps: p.diffusion_steps,
    num_samples: p.num_samples,
    num_transition_frames: p.num_transition_frames,
    cfg_type: p.cfg_type,
    cfg_weight_a: p.cfg_weight_a,
    cfg_weight_b: p.cfg_weight_b,
    ...chain,
  }).out()

  if (p.preview_glb) {
    g.node('RaySomaxBake', {
      rigged_glb_path: p.preview_glb,
      motion_npz_path: npz,
      anim_name: 'motion',
      fps: MOTION_BAKE_FPS,
    })
  }
}

// ── the single-node + staging lanes ───────────────────────────────
// quad-remesh (ONE-implementation rule: the AutoRemesher node IS the
// lane), upscale-tools (SeedVR2), input-prep (staged-source restage).

/** The quad-remesh block — single AutoRemesher node (moved verbatim
 *  from the quad-remesh card; the input + smooth_normal admission
 *  stays on the card). */
export function quadRemeshLane(p: Record<string, unknown>, g: GraphBuilder, runId: string): void {
  const input = String(p.input || '')
  // Family constant, never a knob (golden-pinned).
  const prefix = `${runId}/remeshed`
  g.node('AutoRemesher', {
    glb_path: input,
    preset: '',
    target_quads: p.target_quads as number,
    filename_prefix: prefix,
    edge_scaling: p.edge_scaling as number,
    sharp_edge: p.sharp_edge as number,
    adaptivity: p.adaptivity as number,
    anisotropy: p.anisotropy as number,
  })
}

/** The seedvr2_t1 block — the submittable upscale arm (moved verbatim
 *  from the upscale-tools card; the input_image admission stays on
 *  the card). The python lane does NOT strip pin autofills — no
 *  finalize pass. */
export function upscaleLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const li = model.lane_inputs
  const img = g.node('LoadImage', { image: p.input_image }).out()
  const dit = g.node('SeedVR2LoadDiTModel', {
    model: li.unet as string,
    device: 'cuda:0',
  }).out()
  const vae = g.node('SeedVR2LoadVAEModel', {
    model: li.vae as string,
    device: 'cuda:0',
  }).out()
  const up = g.node('SeedVR2VideoUpscaler', {
    image: img,
    dit,
    vae,
    seed: p.seed,
    resolution: p.resolution,
    max_resolution: p.max_resolution,
    batch_size: p.batch_size,
    uniform_batch_size: true,
  }).out()
  g.node('SaveImage', { images: up, filename_prefix: `${runId}/gen` })
}

interface CropRow { x: number; y: number; width: number; height: number }
interface ScaleRow { width: number; height: number; method?: string }

/** The input_prep block — the staged-source transform lane (moved
 *  verbatim from the input-prep card; the source admission stays on
 *  the card). No model ever loads (weightless lane). */
export function inputPrepLane(p: Record<string, unknown>, g: GraphBuilder, runId: string): void {
  const prefix = `${runId}/input_prep`     // the arm's "%s/input_prep" % run_id

  if (p.media_type === 'audio') {
    const loaded = g.node('LoadAudio', { audio: p.source as string })
    g.node('SaveAudio', { audio: loaded.out(), filename_prefix: prefix })
    return
  }

  let img: OutputHandle = g.node('LoadImage', { image: p.source as string }).out(0)
  const crop = p.crop as CropRow | undefined
  if (crop) {
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      if (typeof crop[k] !== 'number') {
        throw new Error(`crop row refused on the input-prep card: '${k}' must be a number (got ${JSON.stringify(crop[k])})`)
      }
    }
    img = g.node('ImageCrop', { image: img, x: crop.x, y: crop.y, width: crop.width, height: crop.height }).out(0)
  }
  const scale = p.scale as ScaleRow | undefined
  if (scale) {
    if (typeof scale.width !== 'number' || typeof scale.height !== 'number') {
      throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be numbers (got ${JSON.stringify(scale)})`)
    }
    const method = typeof scale.method === 'string' ? scale.method : 'lanczos'
    img = g.node('ImageScale', { image: img, upscale_method: method, width: scale.width, height: scale.height, crop: 'disabled' }).out(0)
  }
  g.node('SaveImage', { images: img, filename_prefix: prefix })
}

// ── archetype IV: the tagger family ─────────────────────────────────
// Four arms, one card: each arm's node creation order mirrors its
// python renderer exactly. The lane is weightless — every wire value
// comes from params. The closed caption vocabs live here because the
// card schemas reference them (leaf keys/defaults stay
// card-declared, wall-verified).

/** Pin autofills the python lane strips post-walk for parity (moved
 *  verbatim from the tagger card). */
export const TAGGER_STRIP: StripTable = {
  LoadImage: ['upload'],
  DownloadAndLoadFlorence2Model: ['convert_to_safetensors'],
  Florence2Run: ['do_sample', 'keep_model_loaded', 'max_new_tokens', 'num_beams', 'output_mask_select', 'seed'],
}

export function finalizeTagger(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, TAGGER_STRIP)
}

// ── the closed caption vocabs (py card.py Select options verbatim —
// moved from the tagger card so all four arms share one spelling) ──
export const TAGGER_CAPTION_TASKS = [
  'caption', 'caption_to_phrase_grounding', 'dense_region_caption',
  'detailed_caption', 'docvqa', 'more_detailed_caption', 'ocr',
  'ocr_with_region', 'prompt_gen_analyze', 'prompt_gen_mixed_caption',
  'prompt_gen_mixed_caption_plus', 'prompt_gen_tags',
  'referring_expression_segmentation', 'region_caption', 'region_proposal',
]
export const TAGGER_CAPTION_TYPES = [
  'Art Critic', 'Booru-like tag list', 'Danbooru tag list',
  'Descriptive', 'Descriptive (Casual)', 'MidJourney',
  'Product Listing', 'Rule34 tag list', 'Social Media Post',
  'Stable Diffusion Prompt', 'Straightforward', 'e621 tag list',
]
// the named six + word counts 20-260 by tens (the node's combo set).
export const TAGGER_CAPTION_LENGTHS = [
  'any', 'very short', 'short', 'medium-length', 'long', 'very long',
  ...Array.from({ length: 25 }, (_, i) => String(20 + i * 10)),
]
export const TAGGER_EXTRA_OPTIONS = [
  '',
  'Do NOT include anything sexual; keep it PG.',
  'Do NOT include information about people/characters that cannot be changed (like ethnicity, gender, etc), but do still include changeable attributes (like hair style).',
  'Do NOT mention any text that is in the image.',
  'Do NOT mention the image\'s resolution.',
  'Do NOT use any ambiguous language.',
  'Do NOT use polite euphemisms—lean into blunt, casual phrasing.',
  'Do not mention the mood/feeling/etc of the image.',
  'Explicitly specify the vantage height (eye-level, low-angle worm’s-eye, bird’s-eye, drone, rooftop, etc.).',
  'Identify the image orientation (portrait, landscape, or square) and aspect ratio if obvious.',
  'If applicable, mention the likely use of artificial or natural lighting sources.',
  'If it is a photo you MUST include information about what camera was likely used and details such as aperture, shutter speed, ISO, etc.',
  'If it is a work of art, do not include the artist\'s name or the title of the work.',
  'If there is a person/character in the image you must refer to them as {name}.',
  'If there is a watermark, you must mention it.',
  'Include information about camera angle.',
  'Include information about lighting.',
  'Include information about the ages of any people/characters when applicable.',
  'Include information about whether there are JPEG artifacts or not.',
  'Include information about whether there is a watermark or not.',
  'Include information on the image\'s composition style, such as leading lines, rule of thirds, or symmetry.',
  'Include whether the image is sfw, suggestive, or nsfw.',
  'Mention whether the image depicts an extreme close-up, close-up, medium shot, cowboy shot, medium wide shot, wide shot, or extreme wide shot.',
  'ONLY describe the most important elements of the image.',
  'Specify the depth of field and whether the background is in focus or blurred.',
  'Use vulgar slang and profanity, such as (but not limited to) "[REDACTED 2026-11-05]," "[REDACTED 2026-11-05]," "[REDACTED 2026-11-05]," etc.',
  'You MUST include information about the subjective aesthetic quality of the image from low to very high.',
  'Your response will be used by a text-to-image model, so avoid useless meta phrases like “This image shows…”, "You are looking at...", etc.',
]

/** The SaveText tail (every arm's consensus — moved verbatim from
 *  the tagger card). */
function taggerSaveText(g: GraphBuilder, text: OutputHandle, prefix: string): void {
  g.node('SaveText', { text, filename_prefix: prefix, format: 'txt' })
}

/** wd14_t1 — the WD14 booru interrogator (the canary arm; moved
 *  verbatim from the tagger card). */
function wd14Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const tags = g.node('WD14Tagger|pysssss', {
    image: src.out(),
    model: p.checkpoint,
    threshold: p.threshold,
    character_threshold: p.character_threshold,
    replace_underscore: p.replace_underscore,
    trailing_comma: p.trailing_comma,
    exclude_tags: p.exclude_tags,
  })
  taggerSaveText(g, tags.out(0), prefix)
}

/** joytag_t1 — the JoyTag booru tagger (moved verbatim from the
 *  tagger card). */
function joytagArm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const tags = g.node('CXH_JoyTag', {
    image: src.out(),
    THRESHOLD: p.threshold,
    addTag: p.add_tag,
    removeTag: p.remove_tag,
  })
  taggerSaveText(g, tags.out(0), prefix)
}

/** florence2_t1 — the Florence-2 captioner (moved verbatim from the
 *  tagger card). */
function florence2Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const fl2 = g.node('DownloadAndLoadFlorence2Model', {
    model: p.checkpoint,
    precision: 'fp16',
  })
  const run = g.node('Florence2Run', {
    image: src.out(),
    florence2_model: fl2.out(),
    text_input: '',
    task: p.caption_task,
    fill_mask: true,
  })
  taggerSaveText(g, run.out(2), prefix)
}

/** joycaption_t1 — the JoyCaption VLM (moved verbatim from the
 *  tagger card). */
function joycaptionArm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const predictor = g.node('JJC_DownloadAndLoadJoyCaptionModel', {
    model: p.checkpoint,
    memory_mode: 'Default',
    keep_loaded: false,
  })
  const caption = g.node('JJC_JoyCaption', {
    model: predictor.out(),
    image: src.out(),
    caption_type: p.caption_type,
    caption_length: p.caption_length,
    extra_option1: p.extra_option,
    extra_option2: '',
    extra_option3: '',
    extra_option4: '',
    extra_option5: '',
    person_name: '',
    max_new_tokens: 512,
    temperature: 0.6,
    top_p: 0.9,
    top_k: 0,
  })
  taggerSaveText(g, caption.out(1), prefix)
}

// family → arm (compose.py's _ARMS board dict — the model id IS the
// family; dispatch is data, never a switch statement per lane).
export const TAGGER_ARMS: Record<string, (p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string) => void> = {
  wd14: wd14Arm,
  joytag: joytagArm,
  florence2: florence2Arm,
  joycaption: joycaptionArm,
}

/** The tagger dispatch — arm lookup + run-scoped prefix (the card
 *  keeps the input_image admission + family requires; moved from the
 *  tagger card's compose tail). */
export function taggerLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const img = typeof p.input_image === 'string' ? p.input_image : ''
  const arm = TAGGER_ARMS[model.id]
  if (!arm) {
    throw new Error(`tagger model '${model.id}' has no arm (known families: ${Object.keys(TAGGER_ARMS).sort().join(', ')})`)
  }
  // compose stamps the prefix — <run>/tags (never a user knob).
  arm(p, g, img, `${runId}/tags`)
}

// ── archetype V: the mesh lift family (img-to-mesh, bespoke) ───────
// THREE families behind one card: the dual guided lift head, the
// shared structure→shape→texture→bake chain, and the rig-copy arm.
// Moved verbatim from the img-to-mesh card; the card keeps the schema
// + per-family requires + arm dispatch (the multi-family story stays
// where the families board).

/** Closed vocabularies (the python card voice — moved verbatim from
 *  the img-to-mesh card). */
const MESH_RESOLUTIONS = ['512', '1024', '1536']
const MESH_BG_MODES = ['auto', 'on', 'off']
const MESH_PIXAL_FOVS = ['auto', '35', '49.13', '60', '75', '90']
const MESH_BAKE_SIZES: Array<[string, Array<string>]> = [
  ['atlas_size', ['2048', '4096']],
  ['ao_size', ['512', '1024']],
  ['normal_size', ['1024', '2048']],
]

// The 3D lane rows are NOT unet-shaped — read fields from
// model.lane_inputs, cast as you read (the facts file carries
// whatever the model row declared).
interface MeshLane {
  unet: string
  vae: string
  texture_vae: string
  clip_vision: string
  background_removal: string
}

function meshLaneOf(model: ModelFacts): MeshLane {
  const li = model.lane_inputs
  return {
    unet: li.unet as string,
    vae: li.vae as string,
    texture_vae: li.texture_vae as string,
    clip_vision: li.clip_vision as string,
    background_removal: li.background_removal as string,
  }
}

/** The dual guided unet + the two VAEs — the lift arms' shared head.
 *  Creation order lands the comfy-script numbering: the SHAPE pair
 *  first (CFGOverride.0/RescaleCFG.0), then the STRUCT pair (.1). */
function loadLiftHeads(
  g: GraphBuilder,
  li: MeshLane,
  p: Record<string, unknown>,
): {
  unet: OutputHandle
  rescaleShape: OutputHandle
  shifted: OutputHandle
  shapeVae: OutputHandle
  texVae: OutputHandle
} {
  const unet = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  // shape arm (0.769 / 0.5) — numbered FIRST by the golden
  const overrideShape = g.node('CFGOverride', {
    model: unet, cfg: 1.0,
    start_percent: p.override_shape as number, end_percent: 1.0,
  }).out()
  const rescaleShape = g.node('RescaleCFG', {
    model: overrideShape, multiplier: p.rescale_shape as number,
  }).out()
  // struct arm (0.667 / 0.7) — numbered SECOND by the golden
  const overrideStruct = g.node('CFGOverride', {
    model: unet, cfg: 1.0,
    start_percent: p.override_struct as number, end_percent: 1.0,
  }).out()
  const rescaleStruct = g.node('RescaleCFG', {
    model: overrideStruct, multiplier: p.rescale_struct as number,
  }).out()
  const shifted = g.node('ModelSamplingSD3', {
    model: rescaleStruct, shift: p.sd3_shift as number,
  }).out()
  const shapeVae = g.node('VAELoader', { vae_name: li.vae }).out()
  const texVae = g.node('VAELoader', { vae_name: li.texture_vae }).out()
  return { unet, rescaleShape, shifted, shapeVae, texVae }
}

/** The birefnet cut (bg_removal auto/on): the cutout MASK from
 *  RemoveBackground bridged to IMAGE via MaskToImage (the GPU
 *  canary verdict — RemoveBackground outputs MASK, not IMAGE). */
function cutBackground(
  g: GraphBuilder,
  li: MeshLane,
  img: OutputHandle,
): { src: OutputHandle; mask: OutputHandle } {
  const bgm = g.node('LoadBackgroundRemovalModel', { bg_removal_name: li.background_removal }).out()
  const mask = g.node('RemoveBackground', { bg_removal_model: bgm, image: img }).out()
  const src = g.node('MaskToImage', { mask }).out()
  return { src, mask }
}

/** The shared structure→shape→upsample→texture→bake→glb chain
 *  (python _shared_lift_chain verbatim — the model delta lives
 *  ENTIRELY in the conditioning pair passed in). */
function sharedLiftChain(
  g: GraphBuilder,
  p: Record<string, unknown>,
  heads: ReturnType<typeof loadLiftHeads>,
  pos: OutputHandle,
  neg: OutputHandle,
  prefix: string,
): void {
  const { unet, rescaleShape, shifted, shapeVae, texVae } = heads

  // structure stage (the lift): card steps + cfg knobs
  const empty = g.node('EmptyTrellis2LatentStructure', { batch_size: 1 }).out()
  const struct = g.node('KSampler', {
    seed: p.seed as number, steps: p.steps as number, cfg: p.cfg as number,
    sampler_name: p.struct_sampler as string,
    scheduler: p.struct_scheduler as string, denoise: 1.0,
    model: shifted, positive: pos, negative: neg, latent_image: empty,
  })
  const voxel = g.node('VaeDecodeStructureTrellis2', {
    samples: struct.out(), vae: shapeVae, resolution: '32',
  }).out()

  // shape stage: 20 steps / cfg 7.5 on the 0.5 arm (official)
  const shapeStage = g.node('Trellis2ShapeStage', { positive: pos, negative: neg, voxel })
  const shapeLatent = g.node('KSampler', {
    seed: p.seed as number, steps: p.shape_steps as number,
    cfg: p.shape_cfg as number,
    sampler_name: p.shape_sampler as string,
    scheduler: p.shape_scheduler as string, denoise: 1.0,
    model: rescaleShape,
    positive: shapeStage.out(0), negative: shapeStage.out(1),
    latent_image: shapeStage.out(2),
  })
  // upsample + first texture pass: UNCONDITIONAL, target floored at 1024
  const up = g.node('Trellis2UpsampleStage', {
    positive: shapeStage.out(0), negative: shapeStage.out(1),
    shape_latent: shapeLatent.out(), vae: shapeVae,
    target_resolution: Math.max(p.resolution as number, 1024),
  })
  const upLatent = g.node('KSampler', {
    seed: p.seed as number, steps: p.tex1_steps as number,
    cfg: p.tex1_cfg as number,
    sampler_name: p.tex1_sampler as string,
    scheduler: p.tex1_scheduler as string, denoise: 1.0,
    model: rescaleShape,
    positive: up.out(0), negative: up.out(1), latent_image: up.out(2),
  })

  // mesh lineage: decode → info → UDF remesh → exact-count decimate
  const decodeShape = g.node('VaeDecodeShapeTrellis', { samples: upLatent.out(), vae: shapeVae })
  const mesh = decodeShape.out(0)
  const subdivides = decodeShape.out(1)
  const info = g.node('GetMeshInfo', { mesh }).out(0)
  const remeshed = g.node('RemeshMesh', {
    mesh: info, resolution: p.remesh_resolution as number,
    sign_mode: 'udf',
    'sign_mode.qef': false,
    'sign_mode.drop_inverted_components': false,
    'sign_mode.drop_enclosed_components': false,
    smooth_iters: 20,
    drop_small_components: 0.01, precluster_max_verts: 20000000,
    // pin autofills python leaves in place (core defaults)
    band: 1.0, fix_poles: false, project_back: 0.0,
  }).out()

  // texture stage, two passes: 12/7.5/simple feeds the stage; 12/1.0
  // on the RAW unet samples it (official template KSampler#12)
  const texStage = g.node('Trellis2TextureStage', {
    positive: up.out(0), negative: up.out(1), shape_latent: upLatent.out(),
  })
  const texLatent = g.node('KSampler', {
    seed: p.seed as number, steps: p.tex2_steps as number,
    cfg: p.tex2_cfg as number,
    sampler_name: p.tex2_sampler as string,
    scheduler: p.tex2_scheduler as string, denoise: 1.0,
    model: unet,
    positive: texStage.out(0), negative: texStage.out(1),
    latent_image: texStage.out(2),
  })
  const voxelColors = g.node('VaeDecodeTextureTrellis', {
    samples: texLatent.out(), vae: texVae, shape_subdivides: subdivides,
  }).out()

  // bake tail: decimate → smooth → unwrap → bake color/AO/normal →
  // apply → smooth → glb (the textured mesh is the saved hero)
  const decimated = g.node('DecimateMesh', {
    mesh: remeshed, target_face_count: p.decimate_faces as number,
    placement_mode: 'midpoint',
  }).out()
  const smooth1 = g.node('MeshSmoothNormals', {
    mesh: decimated, crease_angle: p.smooth_angle as number,
  }).out()
  const unwrapped = g.node('UnwrapMesh', {
    mesh: smooth1, segmenter: 'pec', resolution: p.atlas_size as number,
    padding: 1, weld_distance: 0.0002,
  }).out()
  const baked = g.node('BakeTextureFromVoxel', {
    mesh: unwrapped, voxel_colors: voxelColors,
    texture_size: p.atlas_size as number, reference_mesh: mesh,
  })
  const occlusion = g.node('BakeAmbientOcclusion', {
    low_poly: unwrapped, high_poly: remeshed,
    resolution: p.ao_size as number,
    samples: 64, max_distance: 0.71, strength: 1.0, bias: 0.01,
  }).out()
  const normalMap = g.node('BakeNormalMapFromMesh', {
    low_poly: unwrapped, high_poly: remeshed,
    resolution: p.normal_size as number,
    cage_distance: 0.05, ignore_backfaces: true,
  }).out()
  const textured = g.node('ApplyTextureToMesh', {
    mesh: unwrapped,
    base_color: baked.out(0), metallic: baked.out(1),
    roughness: baked.out(2),
    occlusion, normal_map: normalMap,
  }).out()
  const smooth2 = g.node('MeshSmoothNormals', {
    mesh: textured, crease_angle: p.smooth_angle as number,
  }).out()
  const glb = g.node('MeshToFile3D', { mesh: smooth2 }).out()
  g.node('Save3DAdvanced', {
    model_3d: glb, filename_prefix: prefix,
    viewport_state: '', width: 1024, height: 1024,
  })
}

/** trellis_t1 — DINOv3 conditioning (the image IS the prompt;
 *  negative = ConditioningZeroOut). */
export function trellisArm(
  g: GraphBuilder,
  p: Record<string, unknown>,
  model: ModelFacts,
): void {
  const li = meshLaneOf(model)
  const img = g.node('LoadImage', { image: p.input_image as string }).out()
  const heads = loadLiftHeads(g, li, p)
  let condImage: OutputHandle = img
  if (p.bg_removal !== 'off') {
    condImage = cutBackground(g, li, img).src
  }
  const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out()
  const pos = g.node('Trellis2Conditioning', { clip_vision_model: clip, image: condImage }).out(0)
  const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out()
  // Family constant, never a knob (py: compose stamps the prefix
  // internally; golden-pinned).
  sharedLiftChain(g, p, heads, pos, neg, 'trellis2_native')
}

/** pixal_t1 — pixel-aligned conditioning: the padded crop (pad 1.1)
 *  feeds BOTH Pixal3DConditioning and (camera_fov=auto) the MoGe
 *  depth pass, so framing agrees by construction. */
export function pixalArm(
  g: GraphBuilder,
  p: Record<string, unknown>,
  model: ModelFacts,
): void {
  const li = meshLaneOf(model)
  const img = g.node('LoadImage', { image: p.input_image as string }).out()
  const heads = loadLiftHeads(g, li, p)
  let cropSrc: OutputHandle = img
  let cropMask: OutputHandle = img // ImageCropToMask accepts IMAGE for masks
  if (p.bg_removal !== 'off') {
    const cut = cutBackground(g, li, img)
    cropMask = cut.mask
    cropSrc = cut.src
  }
  const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out()
  const cropped = g.node('ImageCropToMask', {
    images: cropSrc, masks: cropMask,
    pad_factor: 1.1, width: 1024, height: 1024,
    // pin autofills python leaves in place (core defaults)
    background: '#000000', grow_mask: 0,
  }).out()
  let cameraAngleX: OutputHandle | number
  if (p.camera_fov === 'auto') {
    // MoGe weight literal — the documented one-model exception
    // (LaneInputs is closed; the row is pixal-only).
    const mogeModel = g.node('LoadMoGeModel', {
      model_name: 'moge_2_vitl_normal_fp16.safetensors',
    }).out()
    const mogeGeom = g.node('MoGeInference', {
      moge_model: mogeModel, image: cropped, resolution_level: 9,
      // pin autofills python leaves in place (core defaults)
      apply_mask: true, batch_size: 4, force_projection: true,
      fov_x_degrees: 0.0,
    }).out()
    cameraAngleX = g.node('MoGeGeometryToFOV', {
      moge_geometry: mogeGeom, axis: 'horizontal', unit: 'degrees',
    }).out(0)
  } else {
    cameraAngleX = Number(p.camera_fov) // operator-vouched literal degree
  }
  const pos = g.node('Pixal3DConditioning', {
    clip_vision_model: clip, image: cropped, camera_angle_x: cameraAngleX,
  }).out(0)
  const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out()
  // Family constant, never a knob (py: compose stamps the prefix
  // internally; golden-pinned).
  sharedLiftChain(g, p, heads, pos, neg, 'pixal3d')
}

/** transfer_rig_t1 — the rig copy: two mount-path constants feed the
 *  GPU KNN weight transfer; SaveRiggedModel persists the written GLB. */
export function transferRigArm(g: GraphBuilder, p: Record<string, unknown>): void {
  const rigged = g.node('PrimitiveString', { value: p.rigged_glb as string }).out()
  const target = g.node('PrimitiveString', { value: p.target_glb as string }).out()
  const outPath = g.node('KimodoTransferWeights', {
    rigged_path: rigged, target_path: target,
  }).out()
  g.node('SaveRiggedModel', { rigged_path: outPath })
}

/** The lift arms' shared admission gates (the python card voice —
 *  closed sets refuse HERE, never in the schema). */
export function admitMeshLift(p: Record<string, unknown>, model: ModelFacts): void {
  const modelId = model.id
  if (!String(p.input_image || '').trim()) {
    throw new Error(
      `required param 'input_image' missing on the ${modelId} card — the 3D lift is image-conditioned (no text prompt rides this lane)`)
  }
  if (!MESH_RESOLUTIONS.includes(String(p.resolution))) {
    throw new Error(
      `resolution ${JSON.stringify(p.resolution)} is not one of 512|1024|1536 — the variant table is closed`)
  }
  const bg = String(p.bg_removal || 'auto')
  if (!MESH_BG_MODES.includes(bg)) {
    throw new Error(
      `bg_removal ${JSON.stringify(bg)} is not one of auto|on|off — birefnet either cuts or it doesn't`)
  }
  if (modelId === 'pixal3d') {
    const fov = String(p.camera_fov || 'auto').trim()
    if (!MESH_PIXAL_FOVS.includes(fov)) {
      throw new Error(
        `camera_fov ${JSON.stringify(fov)} is not one of ${MESH_PIXAL_FOVS.join('|')} — pixal3d either lets MoGe infer ('auto') or the operator vouches a literal degree`)
    }
  }
  for (const [k, opts] of MESH_BAKE_SIZES) {
    if (!opts.includes(String(p[k]))) {
      throw new Error(
        `${k} ${JSON.stringify(p[k])} is not one of ${opts.join('|')} — the bake-size table is closed`)
    }
  }
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

/** The t4-family strip pass (python: `if not is_t4r`). The i2v
 *  dead-branch node exists ONLY on t4r — the serialized graph's
 *  family marker — so the strip stays stateless per compose. */
export function finalizeH3(graph: PromptGraph): PromptGraph {
  if ('MiniMaxH3ImageToVideo.0' in graph) return graph   // t4r strips nothing
  return stripAutofill(graph, H3_T4_STRIP)
}
