// Tier 3 — the h3-timeline card (the h3_window renderer port).
//
// CARD SURFACE vs RENDERER VOCABULARY (2026-09-07): the schema below
// mirrors ONLY the retired python card's own fields (H3TimelineCard:
// prompt, image, seed, width, height, length, steps, sharpen_enabled,
// sharpen_strength, interpolate_enabled, shift_video, shift_audio —
// 12 keys; card.py deleted purge S-decls 2026-09-08). The window families (t4r /
// t4_open / t4_chain), the motion-context chaining rail, and the SLA /
// SR / interp leaves are the RENDERER vocabulary the compose body
// still reads: those keys ride the compose door's explicit-params
// overlay (service.ts params cascade: schema defaults, then model
// defaults, then raw params — the img-to-mesh precedent), so every
// read below normalizes with its old default and the frozen goldens
// (tests/golden_cordis/video_h3-*.json, causes in the beside .d dirs)
// stay byte-identical.
//
// Node creation order mirrors the python renderer's SERIALIZED id
// order exactly — comfy-script assigns `<Class>.<index>` ids
// depth-first post-order from the output list (saved, then
// ctx_saved), so the per-class creation sequence below is pinned by
// that walk (observed inversions, kept verbatim: t4r creates the fps
// 24.0 PrimitiveFloat BEFORE the seconds 10.0 one, and the reference
// resizer BEFORE the geometry resizer).
//
// Autofill law: the GraphBuilder auto-fills pin defaults for omitted
// inputs exactly like comfy-script does; the python renderer strips
// the t4-family leaks post-hoc (_T4_AUTOFILL_STRIP) — the strip rides
// src/kit.ts finalizeH3 (t4r, like the python's `if not is_t4r`,
// strips nothing; the i2v dead-branch node marks the t4r family in
// the serialized graph).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { finalizeH3 } from '@melite/comfyui-card-kit'

// inputs the t4 family templates OMIT whose pin defaults comfy-script
// would auto-fill at serialization — the strip set lives in src/kit.ts
// (H3_T4_STRIP; the t4r branch carries all of these explicitly, so it
// never strips).

// ── weight / template constants (py-justified — EXTENSION LAW) ─────────────
// Every loader filename below is a declared Provision row in
// packages/engines/comfyui/models/video/h3-timeline/model.py:
// UNET_GOLD ← diffusion_models/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8;
// CLIP_GOLD ← text_encoders/qwen3vl_32b_minimax_h3_int8_convrot;
// VAE_VIDEO_GOLD ← vae/minimax_h3_video_vae_int8_convrot;
// VAE_AUDIO_GOLD ← vae/minimax_h3_audio_vae_fp32;
// LORA_STACK_GOLD ← loras/h3/minimax_h3_fl2v_lightx2v_v0.1_dareties
//_v4_step600_comfy_fro + loras/h3/
// minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.
declare module '@melite/comfyui-cordis/service' {
  interface CardDefinition {
    /** Emitter carrier: when the registered schema is a hand-written
     * normalizer (this card), the underlying Schemastery object whose
     * .dict the params_schema emitter walks. */
    schemaCarrier?: unknown
  }
}

const UNET_GOLD = 'minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors'
const CLIP_GOLD = 'qwen3vl_32b_minimax_h3_int8_convrot.safetensors'
const VAE_VIDEO_GOLD = 'minimax_h3_video_vae_int8_convrot.safetensors'
const VAE_AUDIO_GOLD = 'minimax_h3_audio_vae_fp32.safetensors'
const LORA_STACK_GOLD =
  '[{"on":true,"lora":"h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors","str":0.4,"v":1,"a":1,"t":1},' +
  '{"on":true,"lora":"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors","str":0.6,"v":1,"a":1,"t":1}]'
// His 17k+5 grid, in-graph (ComfyMathExpression): snap latent steps to 2 mod 5
// (the card's own principles row: "Length snaps to the 17k+5 frame grid
// at 24fps" — card.py principles).
const MATH_STEPS_GOLD = 'max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17'
// the never-selected i2v branch's dead-branch prompt (template gold;
// provenance: the frozen golden captures, see
// tests/golden_cordis/video_h3-timeline_t4r.json.d/causes.md).
const I2V_GOLD_PROMPT = 'In a high action fun scene The character from the picture is facing the camera and sprinting towards the camera which tracks their movement, in a hitech futuristic city, dodging passing vehicles and other obstacles.\nHigh action, quick movements, cinematic. It is raining and night time, with glowing led lights.\nCars are crashing into eachother, bombs are dropping, but the character remains untouched by the chaos as they sprint.\nthey jump over a car as it slams into another car, and a bomb nearly hits the character.\nany car crashes or bomb impacts cause massive realistic destruction.\n\n[sound]\na futuristic electro cyber song plays in the background, and the background noise of crashes and explosions.\n'
// ImageSharpenKJ's grouped-widget defaults (the rcas block the python
// builds when no sharpen leaf is injected; the card exposes only the
// strength leaf — card.py sharpen_strength).
const SHARPEN_DEFAULTS = { method: 'rcas', strength: 0.3, radius: 1.0, threshold: 0.05, iterations: 10 }

// the window families this renderer builds (the golden captures'
// three shapes: t4r opener / t4_open window / t4_chain window — see
// the beside .d causes files).
const FAMILIES = ['t4r', 't4_open', 't4_chain'] as const
type Family = (typeof FAMILIES)[number]

// family-conditional admission (the production renderer's explicit-set
// gate on the renderer vocabulary: t4r openers reject the post-ladder
// leaves; non-chain windows reject the chaining rail).
const T4_ONLY_KEYS = [
  'sharpen_switch', 'sharpen_method', 'sharpen_strength', 'sharpen_radius',
  'sharpen_threshold', 'sharpen_iterations', 'interp_switch',
  'interp_multiplier', 'interp_model', 'sr_switch', 'sr_model', 'sr_resolution',
] as const
const CHAIN_ONLY_KEYS = [
  'ctx_load_latent_path', 'ctx_load_clip_index', 'motion_context_length',
  'motion_audio_context_length',
] as const

// ── the params schema — H3TimelineCard mirrored 1:1 ─────────────────────────
// card.py field order and defaults. Bare (defaultless) keys are the
// py-ABSENT / py-required surface (prompt required=True; image
// default=None): the image-gen precedent — optional at parse, refused
// loud at compose where the lane needs them, and every read below
// normalizes with ?? so the goldens stay byte-identical.
// PARITY LEDGER (2026-09-07, resolved zero-regold): the four rows
// below AGREE with py card.py (width 1344, height 768,
// sharpen_enabled false, shift_video 8.0) and the frozen goldens pin
// the same values, so no re-cut. shift_video's declared .default(8.0)
// mirrors py for the parity referee; at runtime schema() normalizes an
// omitted key back to null so the body resolves the family's literal
// (t4 INT 8 / t4r 8.0 — JSON-structural parity the goldens pin).
const nullable = <T extends object>(inner: T): unknown => z.union([inner, z.const(null)])

const paramSchema = z.object({
  prompt: z.string().description("Prompt").extra('extra', { order: null, placeholder: "the courier pushes off and rolls forward through the lantern glow; rain hisses on the stall awnings, a vendor calls out", tooltip: "Verb-first motion + the sounds. For keyframes the image already sets the scene — prompt what CHANGES.", required: true }),
  image: z.string().role('path').description("First frame (keyframe lanes)").extra('extra', { order: null, tooltip: "Absolute path to the PNG the video must start on (h3-keyframe). Optional for h3/h3-timeline." }),
  seed: z.number().description("Seed").step(1).default(42).extra('extra', { order: null, tooltip: "Same seed across re-rolls = same world texture" }),
  width: z.number().description("Width").min(448).max(1344).step(64).default(1344).extra('extra', { order: null, wtype: 'number' }),
  height: z.number().description("Height").min(448).max(768).step(64).default(768).extra('extra', { order: null, wtype: 'number' }),
  length: z.number().description("Frames").min(21).max(362).step(5).default(56).extra('extra', { order: null, tooltip: "17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s", wtype: 'number' }),
  steps: z.number().description("Steps").min(4).max(30).default(12).extra('extra', { order: null, tooltip: "12 for draft; 30 standard; 10 with the turbo LoRA", wtype: 'number' }),
  sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra('extra', { order: null, tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural." }),
  sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(0.05).default(0.3).extra('extra', { order: null, tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.", wtype: 'number' }),
  interpolate_enabled: z.boolean().description("FILM Interpolation").default("false" as unknown as boolean).extra('extra', { order: null, tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time." }),
  // nullable inner: min/max validate only the number branch — null
  // (the family-literal resolution path) passes untouched.
  shift_video: nullable(z.number().description("Video Shift").min(1).max(20).step(0.5).default(8).extra('extra', { order: null, tooltip: "Timestep shift for video attention. Higher = more coherent motion.", wtype: 'number' })),
  shift_audio: z.number().description("Audio Shift").min(1).max(10).step(0.5).default(3).extra('extra', { order: null, tooltip: "Timestep shift for audio attention. Lower = more detailed sound.", wtype: 'number' }),
  // NOTE: the calls[] SHOTS surface is deliberately NOT a carrier
  // knob — the carrier feeds the studio's frozen form-spec (the
  // studio owns its own shots editor, ui/studio/docModel) and the
  // served manifests. The AGENT plane declares calls in the tool
  // face (src/tool.ts); the SHOT LAWS are the card gate's (schema()
  // below — the py model_validator port), so every composer —
  // agent tool, studio, any future caller — meets the same gate.
})

/** Schemastery objects are lenient (unknown/missing keys ride); the
 *  family-admission laws are the renderer's own validators, ported:
 *  unknown variant + family-conditional key admission on EXPLICIT
 *  params only (the python gate reads model_fields_set). The t4r
 *  staged-image law rides compose (it reads the merged value). The
 *  renderer-vocabulary keys (variant, k, ctx_*, sla_*, ...) are NOT
 *  declared knobs — old drafts keep working because the schema admits
 *  them and the compose door overlays explicit params last (the
 *  img-to-mesh filename_prefix precedent). */
export function schema(v: unknown): Record<string, unknown> {
  const raw = (v ?? {}) as Record<string, unknown>
  // interpolate_enabled: the SERVED wire default is the py-parity
  // literal "false" (a string — byte-frozen in the goldens, the
  // form-spec referee, and the catalog); the RUNTIME default is the
  // boolean (the py card's `bool = False`). Pre-fill the key so the
  // Schemastery walk never materializes the string default as a
  // value — a doc omitting the key used to throw at the gate, so
  // every caller had to supply it explicitly. The normalizer owns
  // it now, as it owns variant derivation. The same normalizer owns
  // the SEEDED string: a fresh stage from the bench add-door rides
  // the served wire literal ("false"/"true") as an EXPLICIT key —
  // coerce it to the runtime boolean before the boolean walk
  // refuses it (the lane run's `expected boolean but got false`).
  const walkInput: Record<string, unknown> = { ...raw }
  if (typeof walkInput.interpolate_enabled === 'string') {
    walkInput.interpolate_enabled = walkInput.interpolate_enabled === 'true'
  } else if (!('interpolate_enabled' in walkInput)) {
    walkInput.interpolate_enabled = false
  }
  const out: Record<string, unknown> = paramSchema(walkInput)
  let variant = typeof raw.variant === 'string' ? raw.variant : undefined
  // variant DERIVATION (retired timeline/laws.py, b324c480^ —
  // opener_family/chain_family): the studio calls shape carries no
  // variant; the card derives it. An image-anchored opener rides t4r;
  // a text-only single call is t4_open; multiple calls chain (t4_chain).
  // No calls at all → the retired compose refusal verbatim
  // (compose/card.py:100 "%s: no calls to compose").
  if (variant === undefined) {
    const calls = Array.isArray(raw.calls) ? raw.calls : []
    if (calls.length === 0) {
      throw new Error('h3-timeline: no calls to compose')
    }
    // THE SHOT LAWS (py schema.py _wire_value_laws port — the ranges
    // are the card gate's, never a silent re-default: the py era
    // quietly re-defaulted an out-of-range seam and rendered a
    // reversed span as 56 frames; both banned there, banned here).
    // CARRY_MIN/CARRY_MAX: timeline/laws.py lane physics.
    const CARRY_MIN = 1, CARRY_MAX = 64
    for (let i = 0; i < calls.length; i++) {
      const c = (calls[i] ?? {}) as Record<string, unknown>
      if (c.seam_carry !== undefined && c.seam_carry !== null) {
        const sc = c.seam_carry as number
        if (sc !== 0 && !(Number.isInteger(sc) && CARRY_MIN <= sc && sc <= CARRY_MAX)) {
          throw new Error(`calls[${i}]: seam_carry ${sc} outside [${CARRY_MIN}, ${CARRY_MAX}] — 0 is a hard cut, otherwise carry is bounded lane physics`)
        }
      }
      for (const name of ['start_frame', 'end_frame'] as const) {
        const v = c[name]
        if (v === undefined || v === null || typeof v !== 'number' || !Number.isInteger(v)) {
          throw new Error(`calls[${i}]: ${name} is required (int frames — text alone is not a shot)`)
        }
      }
      if ((c.end_frame as number) <= (c.start_frame as number)) {
        throw new Error(`calls[${i}]: end_frame ${c.end_frame} <= start_frame ${c.start_frame} — a reversed or empty span is not a shot`)
      }
    }
    // (the shot-law loop above guarantees every row is a shaped
    // object with pinned int spans — no gap-arms needed here)
    const hasGuide = calls.some((c) => {
      const cc = c as Record<string, unknown>
      return Boolean(cc.ref_images) || Boolean(cc.ref_image) || Boolean(cc.image_name)
    })
    variant = hasGuide ? 't4r' : calls.length > 1 ? 't4_chain' : 't4_open'
    out.variant = variant
  }
  if (!(FAMILIES as readonly string[]).includes(variant)) {
    throw new Error(`unknown window family '${variant}' (known: ${[...FAMILIES].sort().join(', ')})`)
  }
  const explicit = new Set(Object.keys(raw))
  // shift_video's declared .default(8.0) mirrors py card.py for the
  // parity referee; an omitted key normalizes back to null here so the
  // body resolves the family's literal (t4 INT 8 / t4r 8.0) and the
  // frozen graphs stay byte-identical.
  if (!explicit.has('shift_video')) out.shift_video = null
  const bad = (keys: readonly string[]) => keys.filter((kk) => explicit.has(kk)).sort()
  if (variant === 't4r') {
    const b = bad(T4_ONLY_KEYS)
    if (b.length) throw new Error(`h3_window(t4r): unsanctioned inject keys: ${b.join(', ')}`)
  }
  if (variant !== undefined && variant !== 't4_chain') {
    const b = bad(CHAIN_ONLY_KEYS)
    if (b.length) throw new Error(`h3_window(${variant}): unsanctioned inject keys: ${b.join(', ')}`)
  }
  return out
}

// THE TOOL-FACE EXPORTS: the carrier (paramSchema — the same object
// the registry's schemaCarrier hands the served-manifest projection;
// ONE spelling, two doors) + the identity rung (the ring's label/
// description prose, stated once).
export const carrier = paramSchema

export const BOARDED: string[] = ['h3-timeline', 'h3', 'h3-keyframe']

export const identity = {
  label: 'H3 Timeline',
  description: 'THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.',
  genre: 'video',
  icon: 'video',
  principles: [
    'Describe MOTION and SOUND together — H3 generates both in one pass',
    'Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)',
    'Length snaps to the 17k+5 frame grid at 24fps',
    'For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it',
    "Same seed across a shot's re-rolls keeps the world texture",
    'SLA at sparsity 0.90 gives ~1.75x speedup with no quality loss — use it by default',
  ],
}

// ── the renderer body — node order IS the python's serialized id order ────
// Every renderer-vocabulary read (a key the 12-knob schema does not
// declare) normalizes with its old schema default, so calls that omit
// it render exactly the frozen graphs. Card-knob reads use the schema
// value directly (always defined post-schema) except the two bare
// keys (prompt/image), which normalize absent.
function renderH3Window(p: Record<string, unknown>, g: GraphBuilder): void {
  const family = p.variant as Family
  if (!(FAMILIES as readonly string[]).includes(family)) {
    throw new Error(`unknown window family '${String(p.variant)}' (known: ${[...FAMILIES].sort().join(', ')})`)
  }
  const k = (p.k ?? 1) as number
  const isT4r = family === 't4r'
  const isChain = family === 't4_chain'
  const prompt = (p.prompt ?? '') as string
  // py card knob first (card.py image), renderer alias second.
  const guideImage = (p.image ?? p.image_name ?? '') as string

  // ── the golden model chain (family-conditional defaults computed
  // exactly where the python computes them; None = absent on wire) ──
  const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true)
  const unet = g.node('UNETLoader', { unet_name: UNET_GOLD, weight_dtype: 'default' }).out()
  const sla = g.node('H3SLAAttention', {
    model: unet,
    sparsity_ratio: (p.sla_sparsity ?? 0.9) as number,
    block_size: (p.sla_block_size ?? '32') as string,
    min_seq_len: (p.sla_min_seq_len ?? 8192) as number,
    dense_last_steps: (p.sla_dense_last_steps ?? 1) as number,
    protect_audio: (p.sla_protect_audio ?? true) as boolean,
    enabled: true,
    dense_steps: (p.sla_dense_steps ?? '0') as string,
    dense_backend: (p.sla_dense_backend ?? 'comfy_kitchen') as string,
    disable_fp16_accum: (p.sla_disable_fp16_accum ?? true) as boolean,
    stabilize_motion: stabilize,
    reference_protection: (p.sla_reference_protection ?? 'Heavy Enforcement') as string,
  }).out()
  const chunked = g.node('MiniMaxChunkFeedForward', {
    model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
    chunks: 2, seq_threshold: 4096,
  }).out()
  const loraStack = p.lora_stack ?? LORA_STACK_GOLD
  // t4r templates carry shift_video 8.0; the t4 family carries the INT
  // 8 — JSON-structural parity needs the family's literal. An omitted
  // key arrives null here (schema() normalizes the declared 8.0 back;
  // the declaration mirrors py card.py) and resolves per-family.
  const shiftVideo = p.shift_video ?? (isT4r ? 8.0 : 8)

  const clip = g.node('CLIPLoader', {
    clip_name: CLIP_GOLD, type: 'minimax',
    ...(isT4r ? { device: 'default' } : {}),   // t4 templates OMIT it
  }).out()
  const vaeVideo = g.node('VAELoader', { vae_name: VAE_VIDEO_GOLD }).out()
  const vaeAudio = g.node('VAELoader', { vae_name: VAE_AUDIO_GOLD }).out()

  let cond: OutputHandle
  let latent: OutputHandle
  let sigmaModel: OutputHandle
  let fpsInput: OutputHandle | number
  let trimFrames: OutputHandle | undefined

  if (isT4r) {
    // opener: switch(SLABool) picks SLA-direct vs chunked; lora rides
    // the switch; preview override wired to the in-graph step count.
    // Inject semantics: an injected SCALAR replaces the bool NODE
    // (template link severed, node orphaned) — mirrored by passing the
    // scalar straight when sla_switch is set.
    const fpsNode = g.node('PrimitiveFloat', { value: 24.0 }).out()  // id .0 — CreateVideo.fps walks first
    let slaSel: OutputHandle | boolean | null = (p.sla_switch as boolean | undefined) ?? null
    if (slaSel === null) slaSel = g.node('PrimitiveBoolean', { value: false }).out()
    const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out()
    const loraModel = g.node('LTX_lora_loader', {
      model: picked, mode: 'minimax', stack_data: loraStack, lora_ui: '',
    }).out()
    const seconds = g.node('PrimitiveFloat', { value: (p.fps_seconds ?? 10.0) as number }).out()  // id .1
    const lengthNode = g.node('ComfyMathExpression', {
      expression: MATH_STEPS_GOLD, 'values.a': seconds,
    }).out(1)
    const previewed = g.node('ModelPreviewOverrideKJ', {
      max_resolution: 512, jpeg_quality: 80,
      suppress_default_preview: true, preview_frames: lengthNode,
      preview_fps: 8, tiny_vae: 'none', model: loraModel,
    }).out()
    const adaln = g.node('H3AdaLNLoRAFix', { model: previewed, mode: 'port' }).out()
    sigmaModel = g.node('MiniMaxH3SigmaShift', {
      model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio as number,
    }).out()

    // guide geometry + reference bundle. RESIZER ORDER IS PINNED: the
    // serialized walk reaches the reference resizer (bundle → r2v refs)
    // before the geometry resizer (i2v) — creation mirrors the walk.
    const img = g.node('LoadImage', { image: guideImage }).out()
    const refR = g.node('UnifiedResizeImageMask', {
      image: img, scale_mode: 'Shorter Side',
      aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
      short_side_target: 2048.0, width: 1024.0, height: 1024.0,
      multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
      crop: 'center', divisible_by: 32.0, maintain_aspect: false,
    }).out()
    const geo = g.node('UnifiedResizeImageMask', {
      image: img, scale_mode: 'Total Pixels (MP)',
      aspect_ratio: '3:4 (Portrait Standard)', long_side_target: 1280.0,
      short_side_target: 768.0, width: 768.0, height: 1344.0,
      multiplier: 1.0, megapixels: 0.98, upscale_method: 'lanczos',
      crop: 'center', divisible_by: 32.0, maintain_aspect: false,
    })
    const bundle = g.node('PlagueKindBundleIn', { input_1: refR }).out()
    const bout = g.node('PlagueKindBundleOut', { bundle })
    const r2vInputs: Record<string, OutputHandle | string | number> = {
      prompt, width: p.width as number, height: p.height as number,
      length: lengthNode, ref_image_size: (p.ref_image_size ?? 'match') as string,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    }
    for (let i = 0; i <= 8; i++) r2vInputs[`ref_images.ref_image_${i}`] = bout.out(i)
    for (let i = 0; i < 3; i++) {
      r2vInputs[`ref_videos.ref_video_${i}`] = bout.out(9 + 2 * i)
      r2vInputs[`ref_video_audios.ref_video_audio_${i}`] = bout.out(10 + 2 * i)
      r2vInputs[`ref_audios.ref_audio_${i}`] = bout.out(15 + i)
    }
    const r2v = g.node('MiniMaxH3ReferenceToVideo', r2vInputs)
    // the never-selected opener branch (R2VBool true) — the golden
    // dead-branch text and the geometry slots ride it verbatim
    const i2v = g.node('MiniMaxH3ImageToVideo', {
      prompt: I2V_GOLD_PROMPT, width: geo.out(2), height: geo.out(3),
      length: lengthNode, context_steps: 1, audio_context_steps: 0,
      clip, vae: vaeVideo, first_frame: bout.out(0), last_frame: bout.out(1),
    })
    const r2vBool = g.node('PrimitiveBoolean', { value: true }).out()
    cond = g.node('ComfySwitchNode', { switch: r2vBool, on_true: r2v.out(0), on_false: i2v.out(0) }).out()
    latent = g.node('ComfySwitchNode', { switch: r2vBool, on_true: r2v.out(1), on_false: i2v.out(1) }).out()
    fpsInput = fpsNode
  } else {
    // t4 families: chunked chain rides lora, switch picks SLA-direct
    // vs ModelAttentionBackend. The pin autofills the builder adds
    // (lora_ui, the SeedVR2 tile/offload inputs) are stripped by the
    // finalize pass — the python's _T4_AUTOFILL_STRIP mirror.
    const loraModel = g.node('LTX_lora_loader', {
      model: chunked, mode: 'minimax', stack_data: loraStack,
    }).out()
    const mab = g.node('ModelAttentionBackend', {
      model: loraModel, attention: 'comfy kitchen attention',
    }).out()
    const picked = g.node('ComfySwitchNode', {
      switch: p.sla_switch ?? true, on_true: sla, on_false: mab,
    }).out()
    const adaln = g.node('H3AdaLNLoRAFix', { model: picked, mode: 'port' }).out()
    sigmaModel = g.node('MiniMaxH3SigmaShift', {
      model: adaln, shift_video: shiftVideo, shift_audio: p.shift_audio as number,
    }).out()
    const length = p.length ?? (family === 't4_open' ? 90 : 56)
    const r2v = g.node('MiniMaxH3ReferenceToVideo', {
      prompt, width: p.width as number,
      height: p.height as number, length: length as number,
      ref_image_size: (p.ref_image_size ?? 'match') as string,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    fpsInput = 24
  }

  // ── sampler stack ──────────────────────────────────────────────────
  // py card knob first (card.py seed), renderer alias second.
  const noise = g.node('RandomNoise', { noise_seed: (p.noise_seed ?? p.seed ?? 42) as number }).out()
  const samplerSel = g.node('KSamplerSelect', { sampler_name: (p.sampler_name ?? 'euler') as string }).out()
  let sampler: OutputHandle
  if (isT4r) {
    sampler = samplerSel
  } else {
    const ersde = g.node('SamplerER_SDE', {
      solver_type: 'ODE', max_stage: 3, eta: 0.0, s_noise: 1.0,
    }).out()
    // template carries switch=false as a LITERAL, not a bool node
    sampler = g.node('ComfySwitchNode', { switch: false, on_true: ersde, on_false: samplerSel }).out()
  }
  const sched = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: (p.sched_name ?? 'simple') as string,
    steps: p.steps as number, denoise: (p.denoise ?? 1.0) as number,
  }).out()
  const guider = g.node('BasicGuider', { model: sigmaModel, conditioning: cond }).out()

  if (isChain) {
    // THE CHAIN (h3-motion-context pack): load the previous clip's
    // sampler-output latent, pin its tail as never-denoised
    // conditioning rows into this window, and report how many leading
    // frames to trim off the delivered clip. The SAME-PROMPT seam
    // (k>=2, no literal path) links the load to the PRIOR window's
    // save output — a pre-namespaced foreign node id, wired as a raw
    // JSON link exactly where the python rewrites it post-serialization.
    const path = (p.ctx_load_latent_path ?? '') as string
    const latentPath: string | (string | number)[] = (k >= 2 && !path)
      ? [`window${k - 1}_MiniMaxH3MotionContextSaveLatent.0`, 0]
      : path
    const prevLatent = g.node('MiniMaxH3MotionContextLoadLatent', {
      latent_path: latentPath, clip_index: (p.ctx_load_clip_index ?? 0) as number,
    }).out()
    const mc = g.node('MiniMaxH3MotionContext', {
      conditioning: cond, vae: vaeVideo, latent,
      context_length: (p.motion_context_length ?? '39') as string,
      audio_context_length: (p.motion_audio_context_length ?? 24) as number,
      context_latent: prevLatent,
    })
    cond = mc.out(0)
    trimFrames = mc.out(1)
  }
  const sampled = g.node('SamplerCustomAdvanced', {
    noise, guider, sampler, sigmas: sched, latent_image: latent,
  })
  const latOut = sampled.out(0)

  // ── decode + save ──────────────────────────────────────────────────
  let vdec = g.node('VAEDecode', { samples: latOut, vae: vaeVideo }).out()
  let vadec = g.node('VAEDecodeAudio', { samples: latOut, vae: vaeAudio }).out()
  if (isChain) {
    // cut the pinned overlap off picture AND sound by the same
    // duration (the pack's Trim; fps must match CreateVideo)
    const trim = g.node('MiniMaxH3MotionContextTrim', {
      images: vdec, trim_frames: trimFrames, audio: vadec,
      fps: 24.0, match_tail: true,
    })
    vdec = trim.out(0)
    vadec = trim.out(1)
  }
  if (isT4r) {
    const created = g.node('CreateVideo', {
      images: vdec, audio: vadec, fps: fpsInput, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    g.node('SaveVideo', {
      video: created.out(), filename_prefix: 'video/ComfyUI',
      format: 'auto', codec: 'h264',
      'codec.encoding': 're-encode', 'codec.encoding.crf': 10.0,
    })
  } else {
    // sharpen leaves: only the EXPLICITLY-set ones patch the grouped
    // dict (absent leaves keep ImageSharpenKJ's own defaults). The py
    // card knob (sharpen_strength, card.py) rides the leaf loop like
    // the renderer alias does.
    const method: Record<string, string | number> = { ...SHARPEN_DEFAULTS }
    const sharpenLeaves: ReadonlyArray<readonly [string, string]> = [
      ['sharpen_method', 'method'], ['sharpen_strength', 'strength'],
      ['sharpen_radius', 'radius'], ['sharpen_threshold', 'threshold'],
      ['sharpen_iterations', 'iterations'],
    ]
    for (const [src, dst] of sharpenLeaves) {
      const val = p[src]
      if (val !== null && val !== undefined) method[dst] = val as string | number
    }
    const sharpened = g.node('ImageSharpenKJ', { image: vdec, method }).out()
    // sharpen switch: false agrees with py card.py AND the frozen t4
    // graphs (resolved zero-regold 2026-09-07). Renderer alias second.
    const sharpSw = g.node('ComfySwitchNode', {
      switch: (p.sharpen_enabled ?? p.sharpen_switch ?? false) as boolean, on_true: sharpened, on_false: vdec,
    }).out()
    const film = g.node('FrameInterpolationModelLoader', {
      model_name: (p.interp_model ?? 'film_net_fp16.safetensors') as string,
    }).out()
    const interp = g.node('FrameInterpolate', {
      interp_model: film, images: sharpSw, multiplier: (p.interp_multiplier ?? 2) as number,
    }).out()
    // py card knob first (card.py interpolate_enabled), alias second.
    const interpSw = g.node('ComfySwitchNode', {
      switch: (p.interpolate_enabled ?? p.interp_switch ?? false) as boolean, on_true: interp, on_false: sharpSw,
    }).out()
    const sr = g.node('SeedVR2VideoUpscaler', {
      image: interpSw,
      dit: g.node('SeedVR2LoadDiTModel', {
        model: (p.sr_model ?? 'seedvr2_ema_3b_fp8_e4m3fn.safetensors') as string, device: 'cuda:0',
      }).out(),
      vae: g.node('SeedVR2LoadVAEModel', {
        model: 'ema_vae_fp16.safetensors', device: 'cuda:0',
      }).out(),
      seed: 42, resolution: (p.sr_resolution ?? 1080) as number,
      max_resolution: 0, batch_size: 5, uniform_batch_size: false,
      color_correction: 'lab',
    }).out()
    const srSw = g.node('ComfySwitchNode', {
      switch: (p.sr_switch ?? false) as boolean, on_true: sr, on_false: interpSw,
    }).out()
    const created = g.node('CreateVideo', {
      images: srSw, audio: vadec, fps: 24, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'mp4', codec: 'h264',
    })
  }

  // the chain rail's persistence: the context save lands after the
  // saved video (ONE serialization walk over both output nodes).
  g.node('MiniMaxH3MotionContextSaveLatent', {
    latent: latOut, filename_prefix: (p.ctx_save_prefix ?? 'h3_context/clip') as string,
    clip_index: p.ctx_save_clip_index ?? k,
  })
}

/** The CARD face's plugin apply (the dual-face law, 2026-09-12):
 * the cardPackages SSOT composes THIS subpath in the engine plane —
 * '@melite/video-h3-timeline/card' — where the registry seat lives.
 * The package root is the web profile's row-mount marker. */
export const inject = ['comfyui']

export function apply(ctx: Context): void {
  registerCard(ctx, ctx.comfyui)
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'h3-timeline',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'h3-film',
    // BOARDING (resolved zero-regold 2026-09-07): the card boards
    // all three families, so this triple boards green with the frozen golden
    // video_h3_open-cascade composing model 'h3' through this card.
    boarded: [...BOARDED],
    tags: ['video', 'timeline', 'edit'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'video', order: 6 },
    surface: { size: 'huge', layout: 'studio' },
    flowKinds: {
      inputs: { image: 'image' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    // ADMISSION EXTRAS (the py class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file —
    // trailing-* ride verbatim, the gate matches them as prefixes).
    // + the AXIS KEYS this card's own families stamp (the h3-timeline
    // family declares Variant/Quant/Recipe groups — the axis seeding
    // writes `variant`/`quant`/`recipe` onto every fresh stage; the
    // admission covers the card's own served surface, image-gen's
    // recipe-knob law).
    admits: ['ctx_*', 'fps_seconds', 'image_name', 'k', 'motion_*', 'noise_seed', 'quant', 'recipe', 'ref_image_size', 'sla_*', 'variant'],
    // the six packs the window graph rides (EXTENSION LAW — mirrors
    // the python card's requires tuple verbatim)
    requires: [
      'comfyui-h3-motion-context', 'ComfyUI-PlagueKind-Nodes',
      'ComfyUI-Frame-Interpolation', 'ComfyUI-KJNodes',
      'ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-LTXVideo',
    ],
    schema,
    // the emitter carrier (this card's schema is the hand-written
    // normalizer — params_schema walks the declared object's .dict)
    schemaCarrier: paramSchema,
    compose(p, _model, g) {
      const guideImage = (p.image ?? p.image_name ?? '') as string
      if (p.variant === 't4r' && !guideImage) {
        throw new Error(
          'h3_window(t4r): image-anchored window without a staged guide image — ' +
          'compose always injects LoadImage.0.image on this family')
      }
      renderH3Window(p, g)
    },
    // the t4-family strip pass rides the kit (python: `if not is_t4r`).
    finalize: finalizeH3,
  }))
}
