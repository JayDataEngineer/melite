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
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

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
// (No local CardDefinition augmentation: the service's schemaCarrier
// seat — Schema-typed since ledger row 23 — already carries this.)

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
  // length (the grid-law fix, 2026-09-13): the row's old validators
  // (min 21, step 5) contradicted the card's own declared law — the
  // 17k+5 frame grid (identity principle + tooltip: 56/90/124/362).
  // Schemastery step is offset-from-min, so step(5) from 21 admitted
  // {21, 26, ...} and REFUSED the documented values (90, 124, 362 —
  // the compose door's `expected number multiple of 5` on a user-set
  // Frames). min(22).step(17) admits exactly (L-5) % 17 === 0 — the
  // served stepper now walks the true grid 22/39/56/.../362 and the
  // frozen goldens' explicit 90 passes the walk. 56 (the declared
  // default) is on-grid; the omitted-key path normalizes to null in
  // schema() so the body computes the family's frame budget.
  length: z.number().description("Frames").min(22).max(362).step(17).default(56).extra('extra', { order: null, tooltip: "17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s", wtype: 'number' }),
  steps: z.number().description("Steps").min(4).max(30).default(12).extra('extra', { order: null, tooltip: "12 for draft; 30 standard; a boarded distill lora applies its own steps (edit them on the lora entry)", wtype: 'number' }),
  sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra('extra', { order: null, tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural." }),
  sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(0.05).default(0.3).extra('extra', { order: null, visible_when: "sharpen_enabled=true", tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.", wtype: 'number' }),
  // interpolate_enabled: HONEST DEFAULT (hour 20): the py card's
  // `bool = False` — `default(false)`, not the "false"-as-boolean
  // cast-lie. An absent key now fills the boolean NATIVELY (no
  // caller prefill — the old string default is what used to throw).
  // The wire-string tolerance (the bench add-door rides the served
  // literal "false"/"true" as an explicit key) is a DOC-level law —
  // coerceWireBoolean below — because schemastery field transforms
  // classify as type 'json' in the served taxonomy (the
  // knob-freshness wall pins the honest 'boolean').
  interpolate_enabled: z.boolean().description("FILM Interpolation").default(false).extra('extra', { order: null, wtype: 'boolean', tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time." }),
  // ── THE ENGINE TRUTH ROWS (2026-09-17, the Layer A/B law stroke):
  // every key the compose READS rides the declared surface at its
  // exact wire name — the studio's historical spellings
  // (sampling_steps / sampler / scheduler / interpolate_model /
  // interpolate_multiplier / rtx_vsr_enabled) never matched these,
  // were never read, and die with the studio rework.
  denoise: z.number().description("Denoise").min(0).max(1).step(0.05).default(1.0).extra('extra', { order: null, wtype: 'number', tooltip: "How much of the latent the sampler rewrites. 1.0 = full denoise (fresh windows); lower inherits structure." }),
  // CLOSED TYPES (hour 22, the parity wall's second catch): these were
  // z.string() with a DECORATIVE extra options list — the gate accepted
  // any string (no membership refusal), the face showed the hand-stamped
  // six, the engine accepts the pin's 45: three truths for one key. The
  // union of consts is the ONE truth now — the face reads the members,
  // the gate refuses off-set values at the compose door (the kit's own
  // law: sampler/scheduler knobs ride vocabulary()), and the declared
  // default stays reachable (the wall proves fill === walk).
  sampler_name: vocabulary(["euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun"]).description("Sampler").default("euler").extra('extra', { order: null, wtype: 'select', tooltip: "The KSampler solver (turbo adapters pair with euler/euler_cfg_pp)." }),
  sched_name: vocabulary(["simple", "beta", "linear_quadratic", "normal", "sgm_uniform", "karras", "exponential", "kl_optimal", "ddim_uniform"]).description("Scheduler").default("simple").extra('extra', { order: null, wtype: 'select', tooltip: "The sigma schedule shape." }),
  interp_model: vocabulary(["film_net_fp16.safetensors", "rife47.pth"]).description("Interp model").default("film_net_fp16.safetensors").extra('extra', { order: null, visible_when: "interpolate_enabled=true", wtype: 'select', tooltip: "FILM or RIFE frame-interpolation weights." }),
  interp_multiplier: z.number().description("Interp multiplier").min(2).max(4).step(1).default(2).extra('extra', { order: null, visible_when: "interpolate_enabled=true", wtype: 'number', tooltip: "Frame multiple (2 = double the frame rate)." }),
  sr_switch: z.boolean().description("Super-Res (SeedVR2)").default(false).extra('extra', { order: null, tooltip: "Upscale the final film through SeedVR2 before saving." }),
  sr_resolution: z.number().description("Super-Res target").min(720).max(2160).step(360).default(1080).extra('extra', { order: null, visible_when: "sr_switch=true", wtype: 'number', tooltip: "The SeedVR2 output height in px." }),
  // OPEN FILE SURFACE (the parity triage, hour 22): the SeedVR2 weights
  // span OTHER families' provisions (seedvr2_ema provisions the fp16
  // 3B; variants keep landing) — the card cannot close what it does not
  // own. Open string, text face, and the default is the one file the
  // estate actually provisions (the old default pointed at a file that
  // existed NOWHERE in the estate — a ghost; sr_switch never fires it
  // in the goldens, so no re-gold).
  sr_model: z.string().description("Super-Res model").default("seedvr2_ema_3b_fp16.safetensors").extra('extra', { order: null, wtype: 'text', tooltip: "SeedVR2 weights file (models/upscale_models/)." }),
  // the R2V COMBO size mode — the literals OR a concrete WxH dimension
  // ("704x1280" rides in real runs; a number or a typo refuses LOUD at
  // the gate now, not as a ComfyUI 400). The select face serves the
  // two literals; WxH stays reachable by patch, exactly as before.
  ref_image_size: z.union([z.const("match"), z.const("max"), z.string().pattern(/^\d+x\d+$/).description("WxH")]).description("Ref size").default("match").extra('extra', { order: null, wtype: 'select', tooltip: "How the bundle resizes ref images: match the anchor, take the max edge, or an explicit WxH." }),
  // the 1:1 upstream escape hatch: a raw LTX_lora_loader stack JSON
  // string (the mod bag `loras` is the sanctioned surface; this rides
  // for hand-authored parity cases)
  lora_stack: z.string().description("Lora stack (raw)"),
  // nullable inner: min/max validate only the number branch — null
  // (the family-literal resolution path) passes untouched.
  // PARITY LAW (hour 22, the parity wall's first catch): the declared
  // default must be reachable by the gate AND visible to the walk.
  // With the default buried in the union's inner arm only, carrier({})
  // left the key absent — the face showed 8 (the walk reads the inner
  // arm) while the body's hand-rolled family literal (isT4r ? 8.0 : 8)
  // actually owned the call: parity by convention, a dormant silent
  // drop (t5 ships 10 → face says 8, call sends 10). The default rides
  // BOTH sites of this one expression now — the OUTER union (the gate's
  // fill) and the inner arm (the walk's read) — and the parity wall
  // proves the two spellings equal per key, forever. The body literal
  // stays as the explicit-null backstop only.
  shift_video: z.union([z.number().description("Video Shift").min(1).max(20).step(0.5).default(8).extra('extra', { order: null, tooltip: "Timestep shift for video attention. Higher = more coherent motion.", wtype: 'number' }), z.const(null)]).default(8),
  shift_audio: z.number().description("Audio Shift").min(1).max(10).step(0.5).default(3).extra('extra', { order: null, tooltip: "Timestep shift for audio attention. Lower = more detailed sound.", wtype: 'number' }),
  // ── the SLA family (hour 16, item 3): compose-read knobs, now
  // EMITTED — the studio's advanced panel rides the served spec
  // (SpecFieldRow) instead of hand-rolled rows. Defaults are the
  // compose's own ?? fallbacks, byte-for-byte; the h3_ prefix is the
  // studio's LayerA spelling (docModel), never the card's.
  sla_sparsity: z.number().description("SLA sparsity").min(0).max(0.95).step(0.05).default(0.9).extra('extra', { order: null, group: "sla", wtype: 'slider', tooltip: "Block-sparse attention density. 0.90 ≈ 1.75x speedup, no quality loss." }),
  sla_block_size: vocabulary(["32", "64", "128"]).description("SLA block size").default("32").extra('extra', { order: null, group: "sla", wtype: 'select', tooltip: "64 = clean audio; 128 = faster, robotic." }),
  sla_min_seq_len: z.number().description("SLA min seq length").min(512).step(512).default(12288).extra('extra', { order: null, group: "sla", wtype: 'number', tooltip: "Sequences shorter than this skip sparsity." }),
  sla_dense_last_steps: z.number().description("SLA dense last steps").min(0).max(10).step(1).default(1).extra('extra', { order: null, group: "sla", wtype: 'number', tooltip: "Final steps run dense for convergence." }),
  sla_dense_steps: z.string().description("SLA dense steps (explicit)").default("0").extra('extra', { order: null, group: "sla", tooltip: "e.g. 0,1 or 0-2 — explicit dense step indices." }),
  sla_dense_backend: vocabulary(["comfy_kitchen", "pytorch", "auto"]).description("SLA dense backend").default("comfy_kitchen").extra('extra', { order: null, group: "sla", wtype: 'select' }),
  sla_reference_protection: vocabulary(["Off", "Light", "Heavy Enforcement"]).description("SLA ref protection").default("Heavy Enforcement").extra('extra', { order: null, group: "sla", wtype: 'select', tooltip: "Protects reference frames from sparse-attention drift." }),
  sla_protect_audio: z.boolean().description("SLA protect audio").default(true).extra('extra', { order: null, group: "sla" }),
  sla_stabilize_motion: z.boolean().description("SLA stabilize motion").extra('extra', { order: null, group: "sla", tooltip: "Default on except t4r openers (the family-conditional compose fallback stays the truth at run)." }),
  sla_disable_fp16_accum: z.boolean().description("SLA full-precision accum").default(true).extra('extra', { order: null, group: "sla" }),
  // ── the sharpen leaves (compose: only EXPLICITLY-set leaves patch
  // ImageSharpenKJ's grouped dict — bare emission defaults do NOT
  // change a run that never sets them). VISIBILITY rides the
  // declaration's own visible_when grammar (&-ANDed guards, |-SET
  // values) — no hand-rolled predicates anywhere.
  sharpen_method: vocabulary(["rcas", "adaptive_usm", "high_pass", "deconvolution"]).description("Sharpen Method").extra('extra', { order: null, visible_when: "sharpen_enabled=true", wtype: 'select' }),
  sharpen_radius: z.number().description("Sharpen Radius").min(0.5).max(5).step(0.5).extra('extra', { order: null, visible_when: "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass|deconvolution", wtype: 'number', tooltip: "adaptive_usm / high_pass / deconvolution only." }),
  sharpen_threshold: z.number().description("Sharpen Noise Gate").min(0).max(1).step(0.05).extra('extra', { order: null, visible_when: "sharpen_enabled=true&sharpen_method=adaptive_usm", wtype: 'number', tooltip: "adaptive_usm only." }),
  sharpen_iterations: z.number().description("Sharpen Iterations").min(1).max(100).step(1).extra('extra', { order: null, visible_when: "sharpen_enabled=true&sharpen_method=deconvolution", wtype: 'number', tooltip: "deconvolution only." }),
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
// THE WIRE LAW (hour 20 — ONE definition, every door): a fresh stage
// from the bench add-door rides the served wire literal ("false"/"true")
// as an EXPLICIT key; coerce it to the runtime boolean before the
// boolean walk refuses it. Absent keys need nothing — default(false)
// fills natively. (A schemastery field transform would classify the
// served knob as type 'json' — the honest 'boolean' taxonomy wins,
// so the law lives here, shared by schema() and the compose gate.)
const coerceWireBoolean = (raw: Record<string, unknown>): Record<string, unknown> => {
  if (typeof raw.interpolate_enabled === 'string') {
    return { ...raw, interpolate_enabled: raw.interpolate_enabled === 'true' }
  }
  return raw
}

export function schema(v: unknown): Record<string, unknown> {
  const raw = (v ?? {}) as Record<string, unknown>
  // length null SURVIVES this walk on purpose (the walk-shadow fix:
  // multi-call docs keep null — per-window spans compute at compose).
  const out: Record<string, unknown> = paramSchema(coerceWireBoolean(raw))
  let variant = typeof raw.variant === 'string' ? raw.variant : undefined
  // variant DERIVATION (retired timeline/laws.py, b324c480^ —
  // opener_family/chain_family): the studio calls shape carries no
  // variant; the card derives it. An image-anchored opener rides t4r;
  // a text-only single call is t4_open; multiple calls chain (t4_chain).
  // THE FRESH-PRESS STARTER (the operator's 2026-09-17 instant-fail:
  // a freshly added card holds params {} — calls is NOT a form knob,
  // so the bench tile's Run composed no shots and the door refused
  // "no calls to compose" before the studio ever persisted its doc).
  // ABSENT calls compose the card's own fresh-card document: ONE
  // window 0→90 — the t4_open fresh-card draft budget (py parity;
  // display = render, 3.8s). A user authoring a LONGER single window
  // gets it ungated — the operator's order 2026-09-17 ("don't add
  // gates; if a user wants a long window, they should get a long
  // window"); the span-vs-engine receipts live in the ledger as
  // knowledge, never enforcement. An
  // EXPLICIT empty array keeps the retired compose refusal verbatim
  // (compose/card.py:100 "%s: no calls to compose"): a caller naming
  // zero shots is garbage; a caller naming none is a fresh card.
  if (variant === undefined) {
    let calls: unknown[] = []
    if (Array.isArray(raw.calls)) {
      calls = raw.calls
    } else {
      calls = [{ start_frame: 0, end_frame: 90 }]
      out['calls'] = calls
    }
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
    // variant is a WINDOW property: a single-call doc's guide makes the
    // whole (one-window) graph t4r; a MULTI-call doc is a film — its
    // variant is t4_chain and each window derives its own family in
    // the merged renderer (a guide call renders as its own t4r window)
    const hasGuide = calls.some((c) => {
      const cc = c as Record<string, unknown>
      return Boolean(cc.ref_images) || Boolean(cc.ref_image) || Boolean(cc.image_name)
    })
    variant = calls.length > 1 ? 't4_chain' : hasGuide ? 't4r' : 't4_open'
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
  // length: the SAME law (the walk-shadow fix, 2026-09-13) — the
  // declared .default(56) mirrors py card.py for the parity referee,
  // but the body computes the family's frame budget where the python
  // computes it (t4_open 90 / else 56 — "None = absent on wire").
  // Without this normalization the schemastery walk materializes 56 on
  // every doc that omits the key and the t4_open 90 branch is dead —
  // a hand-authored single text window silently rendered 56 frames.
  // THE SPAN RIDER (2026-09-17, the said-7-got-3 catch): a null is
  // NOT what the compose door receives — the door's cascade re-boards
  // the schema default 56 over it, and the fresh press rendered 56
  // (2.33s, live receipt) while the studio readout promised the
  // window's span. A SINGLE-CALL doc now serializes its span as an
  // EXPLICIT length (grid-snapped to the card's declared 17k+5 —
  // normalization, not a gate; spans of any width ride), so the
  // cascade carries it verbatim — the doc's span IS the film.
  // Multi-call chains keep null: their windows render at the family
  // budgets / the studio presets' own f values.
  if (!explicit.has('length')) {
    const rows = Array.isArray(out.calls) ? out.calls as Array<Record<string, unknown>> : []
    if (rows.length === 1) {
      // (the shot laws above guarantee valid int spans — direct
      // reads, no defensive re-validation)
      const sf = rows[0].start_frame as number
      const ef = rows[0].end_frame as number
      // (the shot laws above guarantee valid int spans — every
      // single-call doc rides the snap arm; no defensive else)
      const k = Math.round((ef! - sf! - 22) / 17)
      out.length = Math.min(362, Math.max(22, 22 + 17 * k))
    } else {
      out.length = null
    }
  }
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
/** THE MERGED FILM (the mergegraph port, 2026-09-17): the py
 *  execute-lane transport composed each window separately and merged
 *  the graphs post-serialization (namespacing + rewiring the seam
 *  links); the TS flip lost that half — a multi-call doc composed ONE
 *  window and the seams never rode. This is the port: ONE prompt, N
 *  windows under `window${k}_` scopes (GraphBuilder.scoped), REAL seam
 *  edges between scopes (the executor orders windows off the graph),
 *  per-window stanzas in the py vocabulary (k, ctx_save_clip_index,
 *  the per-call knobs REPLACE, the span rider per window). The seam
 *  itself is the studio's document law (docModel): transition
 *  'extend' (absent = extend, the py-era chain default the frozen
 *  goldens pin) chains the previous LATENT; 'cut' is a fresh window,
 *  and 'cut' + first_frame_prev_sec opens from the previous VIDEO
 *  tail (the node's context_frames arm). prev_sec scales the carry:
 *  picture snapped to the node's legal context lengths (5/22/39/56
 *  frames — only whole latent steps), audio at 24 frames/second. */
function renderH3Film(p: Record<string, unknown>, g: GraphBuilder): void {
  // (the compose dispatch guarantees calls is a non-empty array here)
  const calls = p.calls as Array<Record<string, unknown>>
  const CARRY_LEGAL = [5, 22, 39, 56]
  const snapCarry = (frames: number): string => {
    let best = CARRY_LEGAL[0] as number
    for (const v of CARRY_LEGAL) {
      if (Math.abs(v - frames) < Math.abs(best - frames)) best = v
    }
    return String(best)
  }
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  let prev: WindowHandles | undefined
  // THE FILM RAIL (the operator's call, 2026-09-17: the film is media
  // composition — the ENGINE'S job, never a harness-side ffmpeg): each
  // window's DELIVERED streams butt through MiniMaxH3FilmConcat nodes
  // at the prompt's top level (the film is the doc's, not a window's),
  // and ONE CreateVideo + SaveVideo emits the film the timeline
  // promised. The estate reorders artifacts so the film leads; it
  // never concats.
  let film: { images: OutputHandle, audio: OutputHandle } | undefined
  // LORA STEPS APPLIED (operator correction, 2026-09-18): a distill
  // adapter is married to its step count — one lora for four steps,
  // another for eight — so the resolved bag rows carry `steps` and
  // the windows honor it. LAYERING: a call's own knobs > the lora
  // entry's steps > this steps row (the row is the no-distill
  // default; a stacked pair runs at the HIGHER count — 8 steps on a
  // 4-step distill is fine, 4 on an 8-step is undercooked).
  const loraRows = Array.isArray(p.loras) ? (p.loras as Array<Record<string, unknown>>) : []
  const loraStepsList = loraRows
    .map((r) => r.steps)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const loraStepsApplied = loraStepsList.length > 0 ? Math.max(...loraStepsList) : null
  calls.forEach((call, i) => {
    const k = i + 1
    const guide = str(call.image ?? call.ref_image ?? call.image_name)
    const text = str(call.text).trim() || str(p.prompt)
    const transition = call.transition === 'cut' ? 'cut' : 'extend'
    const secs = num(call.first_frame_prev_sec)
    const knobs = (call.knobs ?? {}) as Record<string, unknown>
    // refs are a LAYER B (per-call) property — the reference bundle
    // rides the stanza; a refs-carrying call is t4r EVEN without a
    // guide still (the bundle IS the r2v input).
    const rb = (call.refs ?? {}) as Record<string, unknown>
    const hasRefs = wireList(rb.images).length + wireList(rb.videos).length + wireList(rb.audios).length > 0
    const chainLike = i > 0 && (transition === 'extend' || secs !== null)
    const sf = num(call.start_frame)
    const ef = num(call.end_frame)

    const stanza: Record<string, unknown> = { ...p, ...knobs, prompt: text, k, ctx_save_clip_index: k }
    stanza.variant = (guide !== '' || hasRefs) ? 't4r' : chainLike ? 't4_chain' : 't4_open'
    // the distill's steps apply unless this call's knobs pinned steps
    if (knobs.steps === undefined && loraStepsApplied !== null) stanza.steps = loraStepsApplied
    if (hasRefs) stanza.refs = call.refs
    if (guide !== '') stanza.image = guide
    else delete stanza.image
    // per-window length: the span rider law, unless the call's knobs pin one
    if (sf !== null && ef !== null && ef > sf && knobs.length === undefined) {
      const kk = Math.round((ef - sf - 22) / 17)
      stanza.length = Math.min(362, Math.max(22, 22 + 17 * kk))
    }
    if (i > 0 && secs !== null) {
      stanza.motion_context_length = snapCarry(secs * 24)
      stanza.motion_audio_context_length = Math.min(240, Math.max(0, Math.round(secs * 24)))
    }
    if (chainLike) stanza.__seam = transition === 'cut' ? 'cut-frames' : 'extend'
    if (prev !== undefined) stanza.__prev = prev

    const h = g.scoped(`window${k}_`, (w): WindowHandles => renderH3Window(stanza, w))
    prev = h
    if (film === undefined) {
      film = { images: h.filmImages, audio: h.filmAudio }
    } else {
      const c = g.node('MiniMaxH3FilmConcat', {
        images_a: film.images, images_b: h.filmImages,
        audio_a: film.audio, audio_b: h.filmAudio,
      })
      film = { images: c.out(0), audio: c.out(1) }
    }
  })
  // (calls.length >= 1 — the shot laws refuse the empty doc, so the
  // forEach always binds film; no defensive undefined arm)
  {
    const f = film as { images: OutputHandle, audio: OutputHandle }
    const created = g.node('CreateVideo', {
      images: f.images, audio: f.audio, fps: 24, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    g.node('SaveVideo', {
      video: created.out(), filename_prefix: 'h3_t4_film',
      format: 'mp4', codec: 'h264',
    })
  }
}

/** The seam's cross-window wires: the RAW decode + sampler handles
 *  of one rendered window (pre-trim, pre-sharpen — the true tail). */
export interface WindowHandles {
  latOut: OutputHandle
  vdec: OutputHandle
  vadec: OutputHandle
  /** the DELIVERED clip — post-trim, post-sharpen: exactly the
   *  streams that window's own SaveVideo plays; the film concat's
   *  currency (the film must not differ from its windows). */
  filmImages: OutputHandle
  filmAudio: OutputHandle
}

// THE REF WIRE FORM (one law, three readers): refs ride as comma
// strings (the stagers' IsString law) OR string arrays (hand-authored
// JSON); entries are trimmed filenames, empties are absent. Never a
// bespoke per-site reading.
const wireList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : typeof v === 'string'
      ? v.split(',').map((x) => x.trim()).filter((x) => x !== '')
      : []

function renderH3Window(p: Record<string, unknown>, g: GraphBuilder): WindowHandles {
  // REFS IMPLY THE R2V LANE (the bundle IS the r2v input): a
  // refs-carrying window is t4r even without a guide still — the
  // same law the film renderer applies per call.
  const rb0 = (p.refs ?? {}) as Record<string, unknown>
  const hasRefs = wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0
  if (hasRefs && p.variant !== 't4r') p = { ...p, variant: 't4r' }
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
    min_seq_len: (p.sla_min_seq_len ?? 12288) as number,
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
  // THE LORAS MOD PLANE (the operator's law: "MOD SYSTEM IS CORE.
  // NEVER HARDCODED"): the studio/agent surface writes the mod bag
  // `loras` — [{id, strength}] rows the service resolves to
  // {name, strength} filenames against the family's flavor catalog.
  // Those rows build the upstream stack verbatim ({on, lora, str,
  // v:1, a:1, t:1} — the golden rows' own shape); the raw
  // `lora_stack` JSON string stays the 1:1 escape hatch; absent
  // both, the frozen gold pair rides.
  const loraStack = Array.isArray(p.loras) && (p.loras as unknown[]).length > 0
    ? JSON.stringify((p.loras as Array<Record<string, unknown>>).map((r) => ({
        // the service resolves every row against the family catalog
        // (unknown ids refuse LOUD upstream) — {name, strength} is
        // the guaranteed wire shape, read directly
        on: true,
        lora: r.name as string,
        str: r.strength as number,
        v: 1, a: 1, t: 1,
      })))
    : (p.lora_stack ?? LORA_STACK_GOLD)
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

    // THE ANCHOR + THE REFERENCE BUNDLE (the operator's distinction,
    // 2026-09-17): `image` is the call's FIRST FRAME anchor (input_1,
    // the frozen golden shape); `refs` is the call's REFERENCE bundle
    // — the upstream "Extra References" subgraph's own vocabulary
    // (LoadImage → the ref resizer; LoadVideo → GetVideoComponents →
    // the image+audio component pair; LoadAudio). Bundle layout (the
    // golden slot map): inputs 1-9 images (anchor first), 10/12/14
    // video image streams, 11/13/15 video audio streams, 16-18
    // audios. RESIZER ORDER IS PINNED: the serialized walk reaches
    // the reference resizer (bundle → r2v refs) before the geometry
    // resizer (i2v) — creation mirrors the walk.
    const refBag = (p.refs ?? {}) as Record<string, unknown>
    // THE 9-SLOT IMAGE BUS (the bundle's own topology — the compose
    // and the UI agree or they lie): inputs 1-9 are IMAGE slots
    // (the anchor first, then EIGHT refs); input_10 begins the
    // video lanes. A 9th ref would land ON input_10 — the first
    // video's image stream — and be silently clobbered; the slice
    // holds the bus.
    const refImages = wireList(refBag.images).slice(0, 8)
    const refVideos = wireList(refBag.videos).slice(0, 3)
    const refAudios = wireList(refBag.audios).slice(0, 3)
    const bundleInputs: Record<string, OutputHandle> = {}
    let anchorRaw: OutputHandle | undefined
    if (guideImage !== '') {
      anchorRaw = g.node('LoadImage', { image: guideImage }).out()
      bundleInputs.input_1 = g.node('UnifiedResizeImageMask', {
        image: anchorRaw, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    }
    refImages.forEach((src, i) => {
      const img = g.node('LoadImage', { image: src }).out()
      if (anchorRaw === undefined && i === 0) anchorRaw = img
      bundleInputs[`input_${i + 2}`] = g.node('UnifiedResizeImageMask', {
        image: img, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    })
    refVideos.forEach((src, i) => {
      const vid = g.node('LoadVideo', { file: src }).out()
      const comp = g.node('GetVideoComponents', { video: vid })
      bundleInputs[`input_${10 + 2 * i}`] = comp.out(0)
      bundleInputs[`input_${11 + 2 * i}`] = comp.out(1)
    })
    refAudios.forEach((src, i) => {
      bundleInputs[`input_${16 + i}`] = g.node('LoadAudio', { audio: src }).out()
    })
    // the geometry resizer (i2v's dead branch): fed by the anchor, or
    // the first ref image, or — anchorless and imageless — pinned to
    // the literals the geo node's own defaults produce (the branch is
    // never selected; r2vBool pins true below).
    const geoSrc = anchorRaw ?? bundleInputs.input_2
    let geoW: OutputHandle | number = 768.0
    let geoH: OutputHandle | number = 1344.0
    if (geoSrc !== undefined) {
      const geo = g.node('UnifiedResizeImageMask', {
        image: geoSrc, scale_mode: 'Total Pixels (MP)',
        aspect_ratio: '3:4 (Portrait Standard)', long_side_target: 1280.0,
        short_side_target: 768.0, width: 768.0, height: 1344.0,
        multiplier: 1.0, megapixels: 0.98, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      })
      geoW = geo.out(2)
      geoH = geo.out(3)
    }
    const bundle = g.node('PlagueKindBundleIn', bundleInputs).out()
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
      prompt: I2V_GOLD_PROMPT, width: geoW, height: geoH,
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
    // THE SPAN IS THE FILM (the operator's 2026-09-17 catch: the
    // readout said 7s — the doc's totalFrames, last end_frame @24 —
    // and the render came back 3, this hardcoded 90 budget). The
    // window's render length derives from the TIMELINE the calls
    // author: last end_frame − first start_frame, SNAPPED TO THE
    // 17k+5 GRID the engine's latent math lawfully renders (22+17k,
    // clamped [22,362] — the same set the length param's own
    // min/step admits; the first 168-span probe died inside
    // SamplerCustomAdvanced off-grid, live receipt 2026-09-17). The
    // py-era 90/56 budgets remain the fallback ONLY for docs that
    // (the length source of truth is UPSTREAM of this renderer: the
    // schema's span rider serializes single-call spans as EXPLICIT
    // length, and the merged film computes per-window lengths — this
    // arm only falls back to the py family budgets)
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
    // THE SEAM (h3-motion-context pack) — two REAL paths, the node's
    // own vocabulary (1:1 with the vendored extension, 2026-09-17):
    //   EXTEND — context_latent wired to the PREVIOUS window's
    //   sampler-output latent: "sliced straight out, skipping the
    //   decode and re-encode that cost a little quality at every
    //   link of a chain" (the node's own tooltip). In the merged
    //   film this is a live in-prompt wire; in a standalone
    //   single-window stanza it is the py cross-prompt convention
    //   (SaveLatent→LoadLatent by path, the frozen golden shape).
    //   CUT+PREV_SEC — context_frames/context_audio wired to the
    //   previous window's RAW decode: the video-tail opener (decoded
    //   picture + sound, the node's context_frames arm).
    // Both pin the carried tail as never-denoised rows and report
    // trim_frames; CUT without prev_sec never mounts this block (a
    // true fresh window, the opener's own shape).
    const prev = p.__prev as WindowHandles | undefined
    const mcInputs: Record<string, unknown> = {
      conditioning: cond, vae: vaeVideo, latent,
      context_length: (p.motion_context_length ?? '39') as string,
      audio_context_length: (p.motion_audio_context_length ?? 24) as number,
    }
    if (prev !== undefined && p.__seam === 'cut-frames') {
      mcInputs.context_frames = prev.vdec
      mcInputs.audio_vae = vaeAudio
      mcInputs.context_audio = prev.vadec
    } else if (prev !== undefined) {
      mcInputs.context_latent = prev.latOut
    } else {
      // the standalone stanza (frozen golden shape): the py
      // cross-prompt convention — Save/Load by filesystem path,
      // the same-prompt seam as a pre-namespaced foreign link.
      const path = (p.ctx_load_latent_path ?? '') as string
      const latentPath: string | (string | number)[] = (k >= 2 && !path)
        ? [`window${k - 1}_MiniMaxH3MotionContextSaveLatent.0`, 0]
        : path
      mcInputs.context_latent = g.node('MiniMaxH3MotionContextLoadLatent', {
        latent_path: latentPath, clip_index: (p.ctx_load_clip_index ?? 0) as number,
      }).out()
    }
    const mc = g.node('MiniMaxH3MotionContext', mcInputs)
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
  // the RAW pair is the seam currency (trim/sharpen happen downstream);
  // `delivered` fills at the save branches (both families save)
  let delivered: { images: OutputHandle, audio: OutputHandle } | null = null
  const rawHandles: WindowHandles = { latOut, vdec, vadec, filmImages: latOut, filmAudio: latOut }
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
    delivered = { images: vdec, audio: vadec }
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
    // ── V9 tail order (regolded 2026-09-15, the operator's cause) ──
    // upstream moved sharpen LAST: interp → VSR → sharpen → CreateVideo
    // (V7/ours sharpened FIRST — before the upscaler could soften the
    // detail away). Sharpen rcas 0.3 after upscale "looks natural"
    // (his V9 notes). The switches stay ours; the ORDER is his.
    const film = g.node('FrameInterpolationModelLoader', {
      model_name: (p.interp_model ?? 'film_net_fp16.safetensors') as string,
    }).out()
    const interp = g.node('FrameInterpolate', {
      interp_model: film, images: vdec, multiplier: (p.interp_multiplier ?? 2) as number,
    }).out()
    // py card knob first (card.py interpolate_enabled), alias second.
    const interpSw = g.node('ComfySwitchNode', {
      switch: (p.interpolate_enabled ?? p.interp_switch ?? false) as boolean, on_true: interp, on_false: vdec,
    }).out()
    const sr = g.node('SeedVR2VideoUpscaler', {
      image: interpSw,
      dit: g.node('SeedVR2LoadDiTModel', {
        model: (p.sr_model ?? 'seedvr2_ema_3b_fp16.safetensors') as string, device: 'cuda:0',
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
    // sharpen LAST (V9): the upscaler softens; rcas after it restores.
    // Renderer alias second (sharpen_* leaves above build the method).
    const sharpened = g.node('ImageSharpenKJ', { image: srSw, method }).out()
    const sharpSw = g.node('ComfySwitchNode', {
      switch: (p.sharpen_enabled ?? p.sharpen_switch ?? false) as boolean, on_true: sharpened, on_false: srSw,
    }).out()
    // fps compensation (V9 parity, 2026-09-15): upstream wires
    // CreateVideo.fps = base × interp multiplier (his Enhancements:
    // PrimitiveFloat 24 → ComfyMathExpression "a * 2" → fps). Without
    // it every interp-on window plays at HALF speed — the frames
    // double, the fps doesn't. Byte-stable at defaults (interp off →
    // the literal 24 the frozen goldens pin).
    const interpOn = (p.interpolate_enabled ?? p.interp_switch ?? false) as boolean
    const interpMult = (p.interp_multiplier ?? 2) as number
    const created = g.node('CreateVideo', {
      images: sharpSw, audio: vadec, fps: interpOn ? 24 * interpMult : 24, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'mp4', codec: 'h264',
    })
    delivered = { images: sharpSw, audio: vadec }
  }

  // the chain rail's persistence: the context save lands after the
  // saved video (ONE serialization walk over both output nodes).
  g.node('MiniMaxH3MotionContextSaveLatent', {
    latent: latOut, filename_prefix: (p.ctx_save_prefix ?? 'h3_context/clip') as string,
    clip_index: p.ctx_save_clip_index ?? k,
  })
  // (every family path delivers — t4r/t4_open save the window film,
  // t4_chain saves the context rail; no null arm: the family
  // dispatch is exhaustive over FAMILIES)
  rawHandles.filmImages = (delivered as { images: OutputHandle, audio: OutputHandle }).images
  rawHandles.filmAudio = (delivered as { images: OutputHandle, audio: OutputHandle }).audio
  return rawHandles
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
    // THE BAR CLAIM (gap 4, stroke 67): the timeline IS this card's
    // output history — the shared history strip would duplicate it.
    preview: { historyStrip: false },
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
      // THE SCHEMA GATE (the music/sfx/tts admission precedent — the
      // schemaCarrier equivalent: this card is WRAPPED, so the served
      // carrier paramSchema owns the declared knob bounds; the full
      // schema() normalizer's family-admission runs at the compose
      // door (service def.schema) on truly-explicit keys and CANNOT
      // re-run here — the door's cascade materializes carrier defaults
      // (sr_switch, interp_multiplier, ...) which the t4r admission
      // would refuse as injects): the carrier walk enforces declared
      // types + bounds (width 448–1344, steps 4–30 — anything else
      // refuses LOUD, never composes), fills defaults (seed 42),
      // admits renderer/mod keys inert (calls, loras, noise_seed ride
      // verbatim). THE WIRE LAWS LIVE IN THE FIELDS (hour 20): the
      // interpolate_enabled transform coerces the py-parity string
      // default + wire literals, the length transform drops the null
      // absent-on-wire sentinel — no gate-side prefill, the trio's
      // one-line pattern. The composer's reads below are reads of the
      // GATED doc.
      // The wire law is SHARED (coerceWireBoolean — the same
      // definition schema() uses, hour 20); the null-length drop is
      // gate-context only and runs BEFORE the walk (the walk keeps
      // null for multi-call docs — here the run-level default 56
      // fills instead).
      const gateInput = coerceWireBoolean(p as Record<string, unknown>)
      if (gateInput.length === null) delete gateInput.length
      p = paramSchema(gateInput) as unknown as Record<string, unknown>
      // THE SINGLE-CALL LIFT runs FIRST (the guard below reads the
      // lifted anchor): a one-call doc's row IS the window — its
      // prompt, image (the anchor), refs (the reference bundle) and
      // knobs ride the call, never a parallel run-level vocabulary.
      {
        const liftRows = Array.isArray(p.calls) ? p.calls as Array<Record<string, unknown>> : null
        if (liftRows !== null && liftRows.length === 1 && !Array.isArray((liftRows[0] as { calls?: unknown }).calls)) {
          const single = liftRows[0]
          const knobs = (single.knobs ?? {}) as Record<string, unknown>
          p = { ...p, ...knobs }
          const img = (single.image ?? single.ref_image ?? single.image_name) as string | undefined
          if (typeof img === 'string' && img !== '') p.image = img
          if (single.refs !== undefined) p.refs = single.refs
          if (typeof single.text === 'string' && single.text.trim() !== '') p.prompt = single.text.trim()
        }
      }
      const guideImage = (p.image ?? p.image_name ?? '') as string
      if (p.variant === 't4r' && !guideImage) {
        // (refs-implied t4r windows carry no anchor — the bundle IS
        // the r2v input; the guard admits them via the refs law)
        const rbRef = (p.refs ?? {}) as Record<string, unknown>
        const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length > 0
        if (!refsCarry) {
          throw new Error(
            'h3_window(t4r): image-anchored window without a staged guide image — ' +
            'compose always injects LoadImage.0.image on this family')
        }
      }
      // THE FILM DISPATCH: a multi-call chain doc with no per-window
      // stanza markers (k absent — the py stanza vocabulary) composes
      // the MERGED film; everything else is the frozen single-window
      // shape (the goldens replay byte-identical).
      const docCalls = Array.isArray(p.calls) ? p.calls : null
      const film = docCalls !== null && (docCalls as unknown[]).length > 1
        && p.k === undefined && (p.variant === undefined || p.variant === 't4_chain')
      if (film) {
        renderH3Film(p, g)
      } else {
        // LORA STEPS APPLIED (2026-09-18): the single-window shape
        // honors the distill bag's steps the same way (no knob layer
        // here — the entry's steps IS the user's word).
        if (Array.isArray(p.loras)) {
          const rows = p.loras as Array<Record<string, unknown>>
          const applied = rows.map((r) => r.steps).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          if (applied.length > 0) p.steps = Math.max(...applied)
        }
        renderH3Window(p, g)
      }
    },
    // the t4-family strip pass rides the kit (python: `if not is_t4r`).
    finalize: finalizeH3,
  }))
}
