// Tier 3 — the h3-timeline card (the h3_window renderer port).
//
// CARD SURFACE vs RENDERER VOCABULARY (2026-09-07): the schema below
// mirrors ONLY the retired python card's own fields (H3TimelineCard:
// prompt, image, seed, width, height, length, steps, sharpen_enabled,
// sharpen_strength, interpolate_enabled, shift_video, shift_audio
// 12 keys; the S-decl purge deleted 2026-09-08). The window families (t4r /
// t4_open / t4_chain), the motion-context chaining rail, and the SLA /
// SR / interp leaves are the RENDERER vocabulary the compose body
// still reads: those keys ride the compose door's explicit-params
// overlay (prepareCardParams — the ONE resolver: schema defaults, then the
// selected variant's stamps, then the caller's params), so every
// read below normalizes with its old default and the served shape
// stays byte-identical.
//
// Node creation order follows the SERIALIZED id
// order exactly — comfy-script assigns `<Class>.<index>` ids
// depth-first post-order from the output list (saved, then
// ctx_saved), so the per-class creation sequence below is pinned by
// that walk (observed inversions, kept verbatim: t4r creates the fps
// 24.0 PrimitiveFloat BEFORE the seconds 10.0 one, and the reference
// resizer BEFORE the geometry resizer).
//
// Autofill law: the GraphBuilder auto-fills pin defaults for omitted
// inputs exactly like comfy-script does; the compose strips
// the t4-family leaks post-hoc (_T4_AUTOFILL_STRIP) — the strip rides
// @melite/comfyui-card-kit's finalizeH3 (t4r, like the python's `if not is_t4r`,
// strips nothing; the i2v dead-branch node marks the t4r family in
// the serialized graph).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { DECL as h3Decl } from '@melite/models-h3'
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '@melite/comfyui-card-kit/vocab'
import { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { finalizeH3, coerceWireArrays } from '@melite/comfyui-card-kit'
import { computeFilmMix, parseFilmMixClips, stanzaSecs } from './filmMix.ts'
import type { FilmMixClip, FilmMixSpan } from './filmMix.ts'
import {
  GRID_BASE_FRAMES,
  GRID_MAX_FRAMES,
  GRID_REMAINDER,
  GRID_STEP_FRAMES,
  IMAGE_BUS_SLOTS,
  REF_CAPS,
  assertGridLength,
  assertSpanGrid,
  CALL_KEYS,
  imageReferenceCap,
  mergeDeclaredRefs,
  normalizeDeclaredRefs,
  spanStanzaFrames,
  transitionOverlap,
} from './timelineContract.ts'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import { bag } from '@melite/contracts/extraKeys'

export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from './timelineContract.ts'

// inputs the t4 family templates OMIT whose pin defaults comfy-script
// would auto-fill at serialization — the strip set lives in the card kit (finalizeH3)
// (H3_T4_STRIP; the t4r branch carries all of these explicitly, so it
// never strips).

// ── weight / template constants (justified — EXTENSION LAW) ─────────────
// Every loader filename below is a declared Provision row in
// packages/models/h3-timeline/src/index.ts:
// (the four loader files now live in the h3 DECL's lane_inputs —
//  diffusion_models/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8,
//  text_encoders/qwen3vl_32b_minimax_h3_int8_convrot,
//  vae/minimax_h3_video_vae_int8_convrot,
// h3LaneFile(lane, 'vae_audio', DECL_VAE_AUDIO) ← vae/minimax_h3_audio_vae_fp32;
// LORA_STACK_GOLD ← loras/h3/
// minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties,
// solo at 0.6 — plaguekind's turbo setup 1:1 (the 768p v4 turbo rides
// solo, the fro row drops; the V7-era two-stack is retired, never a
// fallback). Married to 8 steps via the resolved bag row.
// THE FILM CARD'S RECOMMENDED SAMPLERS — named, not retyped. Every
// member must exist in the kit's engine vocabulary (the wall asserts
// the subset), so the card curates a choice without becoming a
// second copy of the engine's list.
const H3_RECOMMENDED_SAMPLERS = [
  "euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun",
  // THE TIER-1/2 WINNERS (arena + Comfy-Org's own t2v/i2v/r2v
  // templates; every name verified against the live engine's
  // object_info 2026-09-20 — ROADMAP item 1, ledger #30 §3(1)):
  // res_multistep is what the official templates run; er_sde +
  // the beta scheduler (already on sched_name) is Parasyte's
  // README rec (beta57); seeds_2/seeds_3 are the "dual clock"
  // family the arena's top i2v runs rode with larryvrh v4.
  "res_multistep", "res_multistep_cfg_pp", "er_sde", "seeds_2", "seeds_3",
] as const

// (No local CardDefinition augmentation: the service's schemaCarrier
// seat — Schema-typed since ledger row 23 — already carries this.)

// THE LANE'S FILES COME FROM THE DECL (2026-10-10, the card-plane
// audit's H3): these four names used to be constants HERE while the
// h3 DECL declared no lane_inputs — the only lane in the tree whose
// loaders the card owned. A renamed artifact or a new quant left the
// card on stale weights with every wall green. `h3LaneFile` reads the
// resolved lane row, exactly like every other lane; the names below
// are the DECL's values, named here only as the loud fallback for a
// lane row that carries none (never a silent second truth).
const DECL_UNET = 'minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors'
const DECL_CLIP = 'qwen3vl_32b_minimax_h3_int8_convrot.safetensors'
const DECL_VAE_VIDEO = 'minimax_h3_video_vae_int8_convrot.safetensors'
const DECL_VAE_AUDIO = 'minimax_h3_audio_vae_fp32.safetensors'
/** The lane's own file, from the DECL, with the loud fallback. */
const h3LaneFile = (lane: Record<string, unknown> | undefined, key: string, fallback: string): string => {
  const v = lane?.[key]
  return typeof v === 'string' && v !== '' ? v : fallback
}
const LORA_STACK_GOLD =
  '[{"on":true,"lora":"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors","str":0.6,"v":1,"a":1,"t":1}]'
// His 17k+5 grid, in-graph (ComfyMathExpression): snap latent steps to 2 mod 5
// (the card's own principles row: "Length snaps to the 17k+5 frame grid
// at 24fps" — the principles).
const MATH_STEPS_GOLD = `max(${GRID_REMAINDER}, round(a * 24)) + (${GRID_REMAINDER} - (max(${GRID_REMAINDER}, round(a * 24)) % ${GRID_STEP_FRAMES})) % ${GRID_STEP_FRAMES}`
// THE ORPHANED I2V MARKER NODE (roadmap 2026-09-26 — BRIEF14
// finding #4): MiniMaxH3ImageToVideo exists in the serialized graph
// ONLY as the t4r family marker (finalizeH3 keys on it to skip the
// t4 autofill strip). It is FULLY ORPHANED — no switch consumes it,
// so no switch can ever select it. The old dead branch carried a
// 700-char sprinting-city gold prompt through every request sidecar:
// an off-topic injection-shaped blob and a live hazard the day a
// switch flipped. Orphan + stub prompt = the marker law kept, the
// hazard structurally dead.
const I2V_MARKER_PROMPT = 'i2v marker branch — orphaned, never executed (r2v is the only lane)'
// ImageSharpenKJ's grouped-widget defaults (the rcas block the python
// builds when no sharpen leaf is injected; the card exposes only the
// strength leaf — sharpen_strength).
const SHARPEN_DEFAULTS = { method: 'rcas', strength: 0.3, radius: 1.0, threshold: 0.05, iterations: 10 }

// the window families this renderer builds (three shapes:
// t4r opener / t4_open window / t4_chain window).
const FAMILIES = ['t4r', 't4_open', 't4_chain'] as const
type Family = (typeof FAMILIES)[number]
export const JSON_ARRAY_PARAMS = ['calls', 'audio_clips'] as const

// family-conditional admission (the production renderer's explicit-set
// gate on the renderer vocabulary: t4r openers reject the post-ladder
// leaves). The old CHAIN_ONLY gate died with the MotionContext seam —
// the drift-control continuation owns the chaining rail now and
// carries no renderer vocabulary of its own (the seam is automatic).
const T4_ONLY_KEYS = [
  'sharpen_switch', 'sharpen_method', 'sharpen_strength', 'sharpen_radius',
  'sharpen_threshold', 'sharpen_iterations', 'interp_switch',
  'interp_multiplier', 'interp_model', 'sr_switch', 'sr_model', 'sr_resolution',
] as const

// ── the params schema — H3TimelineCard mirrored 1:1 ─────────────────────────
// the declared field order and defaults. Bare (defaultless) keys are the
// ABSENT / required surface (prompt required=True; image
// default=None): the image-gen precedent — optional at parse, refused
// loud at compose where the lane needs them, and every read below
// normalizes with ?? so the served shape stays byte-identical.
// DECLARED CONSTANTS (2026-09-07): the four rows
// below are the declared constants (width 1344, height 768,
// sharpen_enabled false, shift_video 8.0) and the served shape
// carries the same values. shift_video's declared .default(8.0)
// (historical shape); at runtime schema() normalizes an
// omitted key back to null so the body resolves the family's literal
// (t4 INT 8 / t4r 8.0 — the served structural values).
const paramSchema = z.object({
  prompt: z.string().description("Prompt").extra('extra', bag({ order: null, wtype: 'textarea', placeholder: "the courier pushes off and rolls forward through the lantern glow; rain hisses on the stall awnings, a vendor calls out", tooltip: "The window's text (single-call shape). A film's calls carry their own text — a textless call refuses at compose; this field never substitutes for one." })),
  image: z.string().role('path').description("First frame (keyframe lanes)").extra('extra', bag({ order: null, wtype: 'image', tooltip: "Absolute path to the PNG the video must start on (h3-keyframe). Optional for h3/h3-timeline." })),
  // THE INPUT SURFACE (the H3 architecture truth — two DIFFERENT
  // mechanics, the FL2VA latent anchors vs the Ref2VA conditioning
  // bus): first_frame/last_frame are PIXEL anchors (bundle inputs
  // 1-2, VAE-written into the latent ends — the i2v branch reads
  // them verbatim); references ride the REMAINING image bus (inputs
  // 3-9 → <Picture 3..9>) plus the video/audio lanes (<Video 1-3>,
  // <Audio 1-3>) as AdaLN/cross-attention conditioning. Typed
  // arrays, door-enforced: a non-string entry or an over-cap stack
  // refuses LOUD at the gate (the probe-proven law —
  // `expected array length <= 8`), never rides silent. The legacy
  // `refs` stanza bag keeps its compose-side wireList readers; the
  // declared fields are the primary surface.
  last_frame: z.string().role('path').description("Last frame (end anchor)").extra('extra', bag({ order: null, wtype: 'image', tooltip: "FL2VA end anchor — bundle input 2. Locks the final frame's pixels; H3 generates the motion between the two anchors." })),
  ref_images: z.array(z.string().role('path')).description("Reference images").max(REF_CAPS.images).extra('extra', bag({ order: null, wtype: 'image_list', max_stack: REF_CAPS.images, tooltip: "Loose references (identity, style, costume) → <Picture 3..9> via the bundle. 8 fills the bus; with a last frame set the cap is 7 (anchor + end + 7 = the 9-slot bus)." })),
  ref_videos: z.array(z.string().role('path')).description("Reference videos").max(REF_CAPS.videos).extra('extra', bag({ order: null, wtype: 'image_list', media: 'video', max_stack: REF_CAPS.videos, tooltip: "Motion guides → <Video 1-3>: camera moves, timing, choreography." })),
  ref_audios: z.array(z.string().role('path')).description("Reference audios").max(REF_CAPS.audios).extra('extra', bag({ order: null, wtype: 'image_list', media: 'audio', max_stack: REF_CAPS.audios, tooltip: "Sound references → <Audio 1-3>: timbre, cadence, musical tone." })),
  // (THE BED IS GONE — operator 2026-09-22: "We have Audio Bed
  // input. We don't use that, that is a bug that is there." Film
  // music rides the D-M-E lanes' MUSIC clips, pinned per window;
  // reference timbre rides ref_audios. No film-wide bed, no cuts,
  // no MeliteAudioSlice in the graph.)
  // DUCK DEPTH (roadmap §14, was a pinned −14 literal): how far the
  // generated voice yields under a conditioned clip at its film
  // span. −14dB is the natural mix-desk default; deeper for dense
  // dialogue, shallower when the generated voice should hold.
  duck_depth_db: z.number().description("Duck depth (dB)").min(-48).max(0).step(1).default(-14).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1, tooltip: "How far the generated voice ducks under a dialogue clip (−14 is the mix-desk default)." })),
  seed: z.number().description("Seed").step(1).default(42).extra('extra', bag({ order: null, columns: 2, width: 1, tooltip: "Same seed across re-rolls = same world texture" })),
  width: z.number().description("Width").min(448).max(1344).step(64).default(1344).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1 })),
  height: z.number().description("Height").min(448).max(768).step(64).default(768).extra('extra', bag({ order: null, wtype: 'number', columns: 2, width: 1 })),
  // length (the grid-law fix, 2026-09-13): the row's old validators
  // (min 21, step 5) contradicted the card's own declared law — the
  // 17k+5 frame grid (identity principle + tooltip: 56/90/124/362).
  // Schemastery step is offset-from-min, so step(5) from 21 admitted
  // {21, 26, ...} and REFUSED the documented values (90, 124, 362 —
  // the compose door's `expected number multiple of 5` on a user-set
  // Frames). min(22).step(17) admits exactly (L-5) % 17 === 0 — the
  // served stepper now walks the true grid 22/39/56/.../362 and the
  // explicit 90 passes the walk. 56 (the declared
  // default) is on-grid; the omitted-key path normalizes to null in
  // schema() so the body computes the family's frame budget.
  length: z.number().description("Frames").min(GRID_BASE_FRAMES).max(GRID_MAX_FRAMES).step(GRID_STEP_FRAMES).default(56).extra('extra', bag({ order: null, columns: 2, width: 1, tooltip: "17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s", wtype: 'number' })),
  steps: z.number().description("Steps").min(4).max(30).default(12).extra('extra', samplingExtra('steps', { tooltip: "12 for draft; 30 standard; a boarded distill lora applies its own steps (edit them on the lora entry)" })),
  // THE SECOND-PASS MASTER (2026-09-22, operator: "Second Pass also
  // needs an on/off switch, it is very unclear if it is on or off"):
  // one boolean heads the tab. Off (default) = the whole post chain
  // is inert: the leaves hide AND the compose gates hard (sharpen,
  // interp, VSR, refine all read the master FIRST — a legacy doc
  // with leaves set but no master renders the plain pass).
  second_pass_enabled: z.boolean().description("Second pass").default(false).extra('extra', bag({ order: null, group: 'second_pass', wtype: 'boolean', tooltip: "Master switch for the entire post chain — FSR sharpening, FILM interpolation, SeedVR2 super-res, and the refine lora. Off (default) = the film lands straight from the sampler. On = the pass controls below arm." })),
  sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural." })),
  sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(0.05).default(0.3).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true", tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.", wtype: 'number' })),
  // interpolate_enabled: HONEST DEFAULT (hour 20): the card's
  // `bool = False` — `default(false)`, not the "false"-as-boolean
  // cast-lie. An absent key now fills the boolean NATIVELY (no
  // caller prefill — the old string default is what used to throw).
  // The wire-string tolerance (the bench add-door rides the served
  // literal "false"/"true" as an explicit key) is a DOC-level law —
  // coerceWireBoolean below — because schemastery field transforms
  // classify as type 'json' in the served taxonomy (the
  // knob-freshness wall pins the honest 'boolean').
  interpolate_enabled: z.boolean().description("FILM Interpolation").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'boolean', tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time." })),
  // ── THE ENGINE TRUTH ROWS (2026-09-17, the Layer A/B law stroke):
  // every key the compose READS rides the declared surface at its
  // exact wire name — the studio's historical spellings
  // (sampling_steps / sampler / scheduler / interpolate_model /
  // interpolate_multiplier / rtx_vsr_enabled) never matched these,
  // were never read, and die with the studio rework.
  // ANTI-DRY (operator catch, 2026-09-19: "why do normal forms have
  // sampler and scheduler next to each other but here they're on
  // different rows?"): the sampling layout truth (group/columns/
  // width/zone) is the KIT's — steps/sampler/scheduler ride
  // samplingExtra() like every normal card; h3-only knobs (denoise,
  // the shifts) declare the SAME layout facts inline (card-owned
  // kinds, one place each). The 2-column grid seats sampler +
  // scheduler side by side on EVERY face that honors the grammar.
  denoise: z.number().description("Denoise").min(0).max(1).step(0.05).default(1.0).extra('extra', bag({ order: 4, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "How much of the latent the sampler rewrites. 1.0 = full denoise (fresh windows); lower inherits structure." })),
  // CLOSED TYPES (hour 22 incident): these were
  // z.string() with a DECORATIVE extra options list — the gate accepted
  // any string (no membership refusal), the face showed the hand-stamped
  // six, the engine accepts the pin's 45: three truths for one key. The
  // union of consts is the ONE truth now — the face reads the members,
  // the gate refuses off-set values at the compose door (the kit's own
  // law: sampler/scheduler knobs ride vocabulary()), and the declared
  // default stays reachable (fill === walk by construction).
  // THE TIER WINNERS, TAKEN FROM THE KIT'S OWN 45 (the census's H2):
  // this list used to be eleven names retyped here, so a regen of the
  // engine vocabulary (regen-vocab.ts owns that file) left the film
  // card's menu stale — and a name the engine had dropped would still
  // be offered and then 400. The subset is NAMED here (a card's
  // recommendation is real curation) but every member is READ from
  // the SSOT, and a wall asserts the subset survives a regen.
  sampler_name: vocabulary([
    // the membership test widens the tuple's read view (a readonly
    // literal tuple's includes() demands the literal union — the
    // filter's n is string; the WALL, not the tuple's type, keeps
    // every member honest against the SSOT)
    ...SAMPLER_OPTIONS.filter((n) => (H3_RECOMMENDED_SAMPLERS as readonly string[]).includes(n)),
  ]).description("Sampler").default("euler").extra('extra', samplingExtra('sampler', { tooltip: "The KSampler solver. euler family pairs with turbo adapters; res_multistep is the official-template solver; er_sde+beta is the Parasyte rec; seeds_2/3 are the dual-clock family." })),
  // the same law for the scheduler: the kit's engine vocabulary,
  // read (the census's H2 — a retyped list is a second SSOT)
  sched_name: vocabulary([...SCHEDULER_OPTIONS]).description("Scheduler").default("simple").extra('extra', samplingExtra('scheduler', { tooltip: "The sigma schedule shape." })),
  // ── THE T3 REFINE RIDER (roadmap item 2; ledger #30 §3(2)) —
  // the crowd's third tier: a short CLOSING pass over each
  // window's output latent, the refiner lora on its OWN loader
  // (the primary stack never changes). Empty refine_lora = no
  // rider, the graph renders exactly as before. The instrument:
  // the catalog's refiner rows (h3_taomate_3step — 0.7 @ 3 steps,
  // the arena's refiner operating point). ONE OWNER PER KNOB:
  // refine_lora picks the instrument; strength/steps default from
  // THE ROW (no silent overrides); the pass rides the doc's own
  // sampler/scheduler.
  refine_lora: z.string().description("Refine lora").default("").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'select', optionsFrom: 'loras', tooltip: "Catalog id of a refiner lora (e.g. h3_taomate_3step). Empty = no refine pass. Strength/steps default from the row. LORAS ARE ONLY MODS — the pick serves from the loras flavor rows, never a hand-spelled id (the compose door refuses unknown ids loud)." })),
  refine_strength: z.number().description("Refine strength").min(0).max(2).step(0.05).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'number', tooltip: "Override the refiner row's strength. Rides only when refine_lora is set." })),
  refine_steps: z.number().description("Refine steps").min(1).max(10).step(1).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", wtype: 'number', tooltip: "Override the refiner row's step count (taomate: 3). Rides only when refine_lora is set." })),
  // ── THE ATTENTION BACKEND (roadmap item 3; the h3_attention
  // "sage/sol" folklore was FICTION — no such knob, and the engine
  // enumerates only 'pytorch attention' on ModelAttentionBackend;
  // sage/sol are NOT served). This knob owns the ONE input the
  // non-SLA arm actually pins: 'comfy kitchen attention' is the
  // estate-proven literal (plaguekind's template value, silicon
  // receipts on the t4 arm); 'pytorch attention' is the engine's
  // own enumeration. Values the engine refuses are NOT offered.
  attention_backend: vocabulary(["comfy kitchen attention", "pytorch attention"]).description("Attention backend").default("comfy kitchen attention").extra('extra', bag({ order: null, group: 'sampling', wtype: 'select', tooltip: "The non-SLA arm's ModelAttentionBackend — used when the SLA sparse attention switch (Sla group) is OFF. ck-kitchen is the estate-proven default; pytorch is the engine's enumerated literal." })),
  interp_model: vocabulary(["film_net_fp16.safetensors", "rife47.pth"]).description("Interp model").default("film_net_fp16.safetensors").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&interpolate_enabled=true", wtype: 'select', tooltip: "FILM or RIFE frame-interpolation weights." })),
  interp_multiplier: z.number().description("Interp multiplier").min(2).max(4).step(1).default(2).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&interpolate_enabled=true", wtype: 'number', tooltip: "Frame multiple (2 = double the frame rate)." })),
  sr_switch: z.boolean().description("Super-Res (SeedVR2)").default(false).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true", tooltip: "Upscale the final film through SeedVR2 before saving." })),
  sr_resolution: z.number().description("Super-Res target").min(720).max(2160).step(360).default(1080).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sr_switch=true", wtype: 'number', tooltip: "The SeedVR2 output height in px." })),
  // CLOSED FILE SURFACE (the operator's dropdown law — a free-text
  // weights row is a guess box): the two SeedVR2 DiT files the estate
  // actually runs (both proven in shipped _flow.json receipts: the fp16
  // 3B default + the fp8_e4m3fn 3B the lane walked). The union owns the
  // dropdown AND the membership refusal (an off-set value fails at the
  // schema door, never as a ComfyUI 400). Gated behind sr_switch like
  // every other post leaf.
  sr_model: vocabulary(["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"]).description("Super-Res model").default("seedvr2_ema_3b_fp16.safetensors").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sr_switch=true", wtype: 'select', tooltip: "SeedVR2 weights (models/upscale_models/): fp16 3B default, fp8_e4m3fn 3B leaner." })),
  // the R2V COMBO size mode — the literals OR a concrete WxH dimension
  // ("704x1280" rides in real runs; a number or a typo refuses LOUD at
  // the gate now, not as a ComfyUI 400). The select face serves the
  // two literals; WxH stays reachable by patch, exactly as before.
  ref_image_size: z.union([z.const("match"), z.const("max"), z.string().pattern(/^\d+x\d+$/).description("WxH")]).description("Ref size").default("match").extra('extra', bag({ order: null, group: 'sampling', wtype: 'select', tooltip: "How the bundle resizes ref images: match the anchor, take the max edge, or an explicit WxH." })),
  // NO SILENT RESOLUTION LAW (2026-09-20, the operator's order):
  // one truth, one owner. shift_video is a NUMBER, default 8, served
  // and walked identically. The old z.const(null) arm — the
  // "family-literal resolution path" that walked empty docs to null
  // so the renderer's ?? floor could silently pick the family's own
  // literal — is deleted. An explicit null in a draft now REFUSES
  // LOUD at the walk. The hour-22 double-default (same 8 spelled on
  // the union and the inner arm) never made the walk fill 8; it
  // bought the face a number while the call kept the body literal.
  shift_video: z.number().description("Video Shift").min(1).max(20).step(0.5).default(8).extra('extra', bag({ order: 5, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "Timestep shift for video attention. Higher = more coherent motion." })),
  shift_audio: z.number().description("Audio Shift").min(1).max(10).step(0.5).default(3).extra('extra', bag({ order: 6, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: "Timestep shift for audio attention. Lower = more detailed sound.", })),
  // ── the SLA family (hour 16, item 3): compose-read knobs, now
  // EMITTED — the studio's advanced panel rides the served spec
  // (SpecFieldRow) instead of hand-rolled rows. Defaults are the
  // compose's own ?? fallbacks, byte-for-byte; the h3_ prefix is the
  // studio's LayerA spelling (docModel), never the card's.
  // THE MASTER SWITCH (operator order 2026-09-21: "is there a switch
  // to turn SLA on/off or is it always on" — it was always on): the
  // one boolean heads the sla group; every tuning leaf below rides
  // visible_when behind it. Default true = today's behavior for
  // every existing doc (absent = on at compose).
  sla_enabled: z.boolean().description("SLA sparse attention").default(true).extra('extra', bag({ order: null, group: "sla", tooltip: "Block-sparse attention on the DiT (the primary speed arm, ~1.75x). Off falls back to the Attention backend row." })),
  sla_sparsity: z.number().description("SLA sparsity").min(0).max(0.95).step(0.05).default(0.9).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'slider', tooltip: "Block-sparse attention density. 0.90 ≈ 1.75x speedup, no quality loss." })),
  sla_block_size: vocabulary(["32", "64", "128"]).description("SLA block size").default("32").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select', tooltip: "64 = clean audio; 128 = faster, robotic." })),
  sla_min_seq_len: z.number().description("SLA min seq length").min(512).step(512).default(12288).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'number', tooltip: "Sequences shorter than this skip sparsity." })),
  sla_dense_last_steps: z.number().description("SLA dense last steps").min(0).max(10).step(1).default(1).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'number', tooltip: "Final steps run dense for convergence." })),
  sla_dense_steps: z.string().description("SLA dense steps (explicit)").default("0").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "e.g. 0,1 or 0-2 — explicit dense step indices." })),
  sla_dense_backend: vocabulary(["comfy_kitchen", "pytorch", "auto"]).description("SLA dense backend").default("comfy_kitchen").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select' })),
  sla_reference_protection: vocabulary(["Off", "Light", "Heavy Enforcement"]).description("SLA ref protection").default("Heavy Enforcement").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", wtype: 'select', tooltip: "Protects reference frames from sparse-attention drift." })),
  sla_protect_audio: z.boolean().description("SLA protect audio").default(true).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Keep the audio stream out of the sparse path." })),
  sla_stabilize_motion: z.boolean().description("SLA stabilize motion").extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Default on except t4r openers (the family-conditional compose fallback stays the truth at run)." })),
  sla_disable_fp16_accum: z.boolean().description("SLA full-precision accum").default(true).extra('extra', bag({ order: null, group: "sla", visible_when: "sla_enabled=true", tooltip: "Full-precision accumulation inside the sparse kernel." })),
  // ── the sharpen leaves (compose: only EXPLICITLY-set leaves patch
  // ImageSharpenKJ's grouped dict — bare emission defaults do NOT
  // change a run that never sets them). VISIBILITY rides the
  // declaration's own visible_when grammar (&-ANDed guards, |-SET
  // values) — no hand-rolled predicates anywhere.
  sharpen_method: vocabulary(["rcas", "adaptive_usm", "high_pass", "deconvolution"]).description("Sharpen Method").extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true", wtype: 'select' })),
  sharpen_radius: z.number().description("Sharpen Radius").min(0.5).max(5).step(0.5).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass|deconvolution", wtype: 'number', tooltip: "adaptive_usm / high_pass / deconvolution only." })),
  sharpen_threshold: z.number().description("Sharpen Noise Gate").min(0).max(1).step(0.05).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm", wtype: 'number', tooltip: "adaptive_usm only." })),
  sharpen_iterations: z.number().description("Sharpen Iterations").min(1).max(100).step(1).extra('extra', bag({ order: null, group: 'second_pass', visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=deconvolution", wtype: 'number', tooltip: "deconvolution only." })),
  // NOTE: the calls[] SHOTS surface is deliberately NOT a carrier
  // knob — the carrier feeds the studio's frozen form-spec (the
  // studio owns its own shots editor, ui/studio/docModel) and the
  // served manifests. The AGENT plane declares calls in the tool
  // face (src/tool.ts); the SHOT LAWS are the card gate's (schema()
  // below — the model_validator port), so every composer
  // agent tool, studio, any future caller — meets the same gate.
  // THE VOCABULARY DECLARATION (2026-09-19, the operator's order: the
  // schema enforces EVERY key the renderer reads — no blind casts, no
  // silent rides): the stanza/film vocabulary below was historically
  // undeclared (it rode `admits` and every walk passed it verbatim
  // while renderH3Window blind-cast it). Types mirror the renderer's
  // reads exactly; NO defaults — the renderer's ?? fallback chains
  // stay authoritative, the walk only REFUSES garbage. HIDDEN FROM
  // THE FACE (2026-09-21, the operator's catch — "WHAT IS WINDOW
  // INDEX, WHY IS IT BLANK"): validation-only keys never render; a
  // default-less blank row on the form is a lie.
  k: z.number().description("Window index (film vocabulary)").step(1).extra('extra', bag({ hidden: true })),
  noise_seed: z.number().description("Per-window noise seed").step(1).extra('extra', bag({ hidden: true })),
  fps_seconds: z.number().description("Clip seconds (fps rail)").min(1).max(60).default(10).extra('extra', bag({ order: null, wtype: 'number', tooltip: "The clip's duration in seconds (the fps rail's duration primitive)." })),
  // THE LEGACY ALIASES (renderer-era spellings of the mod switches)
  // — gate-admitted for old drafts, never user surface: the MODS
  // own the switches (the operator's law), one face each.
  interp_switch: z.boolean().description("Interpolate switch (legacy alias)").extra('extra', bag({ hidden: true })),
  sharpen_switch: z.boolean().description("Sharpen switch (legacy alias)").extra('extra', bag({ hidden: true })),
  sla_switch: z.boolean().description("SLA switch (legacy alias)").extra('extra', bag({ hidden: true })),
  image_name: z.string().role('path').description("Guide image (renderer alias)").extra('extra', bag({ hidden: true, wtype: 'image', tooltip: "The renderer's guide-image spelling — gate-admitted for old docs; the rail's First frame is the user face." })),
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
    // ENFORCEMENT (the wall's catch, 2026-09-19): the coercion admits
    // the TWO wire literals only — any other string refused LOUD
    // (silent garbage-to-false was a walk bypass, never the wire law).
    const v = raw.interpolate_enabled
    if (v !== 'true' && v !== 'false') {
      throw new Error(`interpolate_enabled must be a boolean or the wire literal "true"/"false" — got ${JSON.stringify(v).slice(0, 40)}`)
    }
    return { ...raw, interpolate_enabled: v === 'true' }
  }
  return raw
}

export function schema(v: unknown): Record<string, unknown> {
  const raw = (v ?? {}) as Record<string, unknown>
  if (raw.calls !== undefined && !Array.isArray(raw.calls)) {
    throw new Error('h3-timeline: calls must be an array of shot rows')
  }
  if (raw.audio_clips !== undefined && !Array.isArray(raw.audio_clips)) {
    throw new Error('h3-timeline: audio_clips must be an array of clip rows')
  }
  // length null SURVIVES this walk on purpose (the walk-shadow fix:
  // multi-call docs keep null — per-window spans compute at compose).
  // THE ARRAY WIRE GUARD (P2, 2026-09-24): the schema's own dict
  // names the array keys — a wire "" (the empty-array corruption)
  // fills to [], an {item:[…]} wrapper unwraps — same law as the
  // boolean wire tolerance above (receipts: commission 034's
  // run-9953f652410d-d365af74, `$.ref_images expected array but
  // got [object Object]` ×4 and `calls: ""`).
  const out: Record<string, unknown> = paramSchema(
    coerceWireArrays(paramSchema, coerceWireBoolean(raw)),
  )
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
  // window 0→90 — the t4_open fresh-card draft budget (
  // display = render, 3.8s). A user authoring a LONGER single window
  // gets it ungated — the operator's order 2026-09-17 ("don't add
  // gates; if a user wants a long window, they should get a long
  // window"); the span-vs-engine receipts live in the ledger as
  // knowledge, never enforcement. An
  // EXPLICIT empty array keeps the retired compose refusal verbatim
  // ("%s: no calls to compose"): a caller naming
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
    // THE ROW-LEVEL NUMERIC RESTORE (attempt-035/009's stop-law
    // receipt, 2026-09-24): `calls` and `audio_clips` are
    // DELIBERATELY undeclared on paramSchema (the agent plane owns
    // them) — the dict-driven wire fill has no license on undeclared
    // keys, so a stringified `start_frame: "0"` rode into the shot
    // laws and refused `start_frame is required (int frames — text
    // alone is not a shot)` EVEN THOUGH the caller sent the number.
    // The card OWNS the int law here — it restores the strict-grammar
    // int-string itself (same fill law as the kit's, scoped to the
    // row fields the shot laws read).
    const INT_STRING = /^[+-]?\d+$/
    const wireInt = (x: unknown): unknown =>
      (typeof x === 'string' && INT_STRING.test(x.trim()) ? Number(x.trim()) : x)
    for (let wi = 0; wi < calls.length; wi++) {
      const wc = (calls[wi] ?? {}) as Record<string, unknown>
      for (const wn of ['start_frame', 'end_frame'] as const) {
        const wv = wireInt(wc[wn])
        if (wv !== wc[wn]) {
          wc[wn] = wv
          calls[wi] = wc
        }
      }
    }
    // THE SHOT LAWS (schema.py _wire_value_laws port — the ranges
    // are the card gate's, never a silent re-default: the retired era
    // quietly re-defaulted an out-of-range seam and rendered a
    // reversed span as 56 frames; both banned there, banned here).
    // (the seam_carry law died with the MotionContext seam — the
    // drift-control continuation owns the chaining now, overlap is
    // automatic, never user-authored lane physics)
    for (let i = 0; i < calls.length; i++) {
      const c = (calls[i] ?? {}) as Record<string, unknown>
      const unknown = Object.keys(c).filter((key) => !CALL_KEYS.has(key)).sort()
      if (unknown.length > 0) {
        throw new Error(`calls[${i}]: unknown per-call key(s): ${unknown.join(', ')}`)
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
      if (i > 0) {
        // the previous row was already validated as an int-span object
        // (a hole at i-1 refused at its own iteration), so no fallback
        const previous = calls[i - 1] as Record<string, unknown>
        if (c.start_frame !== previous.end_frame) {
          throw new Error(`calls[${i}]: start_frame ${String(c.start_frame)} must equal previous end_frame ${String(previous.end_frame)} — calls tile the film timeline; gaps and overlaps are refused`)
        }
      }
      const transition = typeof c.transition === 'string' ? c.transition : undefined
      // THE GRID GATE (§26, the walk arm): a call's knobs.length pin
      // bypasses every snap arm downstream — validate at the walk so
      // `validate` refuses what the engine would kill at GPU cost.
      const cknobs = (c.knobs ?? {}) as Record<string, unknown>
      if (cknobs.length !== undefined && cknobs.length !== null) {
        assertGridLength(cknobs.length, `calls[${i}].knobs.length`)
      }
      // THE UNIFORM SPAN GATE: one grid law for every window shape —
      // carried windows (i>0, non-cut) generate span+22, first/cut
      // windows generate their span, and an off-grid authored span is
      // refused at admission instead of silently snapped.
      assertSpanGrid({
        start: c.start_frame as number,
        end: c.end_frame as number,
      }, `calls[${i}]`, i > 0 ? transitionOverlap(transition) : 0)
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
      // THE DECLARED INPUT SURFACE (the input rail's law): card-level
      // refs / an end anchor / the audio bed imply the r2v lane by the
      // same law as a per-call guide — the window re-checks, but the
      // derivation owns it first
      || wireList(raw.ref_images).length + wireList(raw.ref_videos).length + wireList(raw.ref_audios).length > 0
      || (typeof raw.last_frame === 'string' && raw.last_frame.trim() !== '')
    variant = calls.length > 1 ? 't4_chain' : hasGuide ? 't4r' : 't4_open'
    out.variant = variant
  }
  if (!(FAMILIES as readonly string[]).includes(variant)) {
    throw new Error(`unknown window family '${variant}' (known: ${[...FAMILIES].sort().join(', ')})`)
  }
  const explicit = new Set(Object.keys(raw))
  // NO SILENT RESOLUTION LAW (2026-09-20): shift_video's declared
  // default(8) is THE owner. The old nulling — "an omitted key
  // normalizes back to null so the body resolves the family's
  // literal (t4 INT 8 / t4r 8.0) and the frozen graphs stay
  // byte-identical" — was the two-owner disease in its purest form:
  // the declaration promised 8, the walk delivered null, the body
  // invented 8 back. JS serializes 8.0 and 8 identically, so the
  // nulling bought nothing but the lie. The no-cheat door refuses
  // this card shape on sight now.
  // length: the SAME law (the walk-shadow fix, 2026-09-13) — the
  // declared .default(56) is the declared default,
  // but the body computes the family's frame budget where the python
  // computes it (t4_open 90 / else 56 — "None = absent on wire").
  // Without this normalization the schemastery walk materializes 56 on
  // every doc that omits the key and the t4_open 90 branch is dead —
  // a hand-authored single text window silently rendered 56 frames.
  // NO SILENT RESOLUTION LAW, length arm (2026-09-20): a declared
  // default may never walk null. Single-call docs keep the span
  // rider (the window's grid-snapped span, EXPLICIT — the doc's span
  // IS the film). Multi-call docs let the walked default stand INERT
  // — the doc-level length is a WINDOW knob and multi-call films
  // have no doc-level window; the per-window stanza lengths own the
  // film (each call's span), and the studio's timeline readouts
  // compute off the calls, never this key. (An earlier arm of this
  // rework filled the FILM TOTAL here — wrong law: the 17k+5 grid
  // belongs to windows, a total is arbitrary span arithmetic, and
  // the walk's grid validation rightly refused off-grid totals.)
  if (!explicit.has('length')) {
    const rows = Array.isArray(out.calls) ? out.calls as Array<Record<string, unknown>> : []
    if (rows.length === 1) {
      // (the shot laws above guarantee valid int spans — direct
      // reads, no defensive re-validation)
      const sf = rows[0].start_frame as number
      const ef = rows[0].end_frame as number
      // (the shot laws above guarantee valid int spans — every
      // single-call doc rides the snap arm; no defensive else)
      out.length = (ef as number) - (sf as number)
    }
    // rows.length !== 1: the walked default stands (56 fresh-card,
    // inert for multi-call chains — spans own the film)
  }
  const bad = (keys: readonly string[]) => keys.filter((kk) => explicit.has(kk)).sort()
  if (variant === 't4r') {
    const b = bad(T4_ONLY_KEYS)
    if (b.length) throw new Error(`h3_window(t4r): unsanctioned inject keys: ${b.join(', ')}`)
  }
  return out
}

// THE TOOL-FACE EXPORTS: the carrier (paramSchema — the same object
// the registry's schemaCarrier hands the served-manifest projection;
// ONE spelling, two doors) + the identity rung (the ring's label/
// description prose, stated once).
export const carrier = paramSchema

// ONE MODEL (the operator's law, 2026-09-20 "we use ONE model" +
// 2026-09-21 "HOW IS MINIMAX H3 AND H3 TIMELINE TWO DIFFERENT
// MODELS?" — LANDED, roadmap §8): the card boards ONE family. The
// old h3 + h3-keyframe family packages are dead — their addresses
// survive as VARIANT ROUTES on the h3 family (timeline →
// h3-timeline — the pre-correction family address; fl2va →
// h3-fl2va, ref2va → h3-ref2va, timeline-ref2va →
// h3-timeline-ref, keyframe → h3-keyframe), so old drafts resolve
// migration-free and the facts rows re-derive through the merged
// family. THE SURVIVOR-ID CORRECTION (operator, 2026-09-22): the
// family is the CHECKPOINT id `h3` — never a lane name (anima
// isn't anima-generate); the card id `h3-timeline` (the usecase
// surface) keeps its own name.
// THE FAMILY ID COMES FROM ITS DECL (the closure gate's RULE 5) —
// and with it the LANE'S FILES, which this card used to own as
// constants of its own.
export const BOARDED: string[] = [h3Decl.id]

// THE VARIANT ROUTES (the TTS fold's VARIANT_ADDRESSES pattern):
// agents pick no matrix variant — the tool's closed model enum
// additionally offers the folded lanes' compose addresses so the
// single-shot + keyframe lanes stay agent-reachable (the drafts
// door resolves route mids through the facts rows).
export const VARIANT_ADDRESSES: string[] = ['h3-timeline', 'h3-fl2va', 'h3-ref2va', 'h3-timeline-ref', 'h3-keyframe']

export const identity = {
  label: 'Generate Video',
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
/** THE MERGED FILM (the merged-graph builder, 2026-09-17): the
 *  execute-lane transport composed each window separately and merged
 *  the graphs post-serialization (namespacing + rewiring the seam
 *  links); the TS flip lost that half — a multi-call doc composed ONE
 *  window and the seams never rode. This is the port: ONE prompt, N
 *  windows under `window${k}_` scopes (GraphBuilder.scoped), REAL seam
 *  edges between scopes (the executor orders windows off the graph),
 *  per-window stanzas in the vocabulary (k, ctx_save_clip_index,
 *  the per-call knobs REPLACE, the span rider per window). The seam
 *  itself is the studio's document law (docModel): transition
 *  'extend' (absent = extend) chains the previous LATENT; 'cut' is a fresh window,
 *  and 'cut' + first_frame_prev_sec opens from the previous VIDEO
 *  tail (the node's context_frames arm). prev_sec scales the carry:
 *  picture snapped to the node's legal context lengths (5/22/39/56
 *  frames — only whole latent steps), audio at 24 frames/second. */
/** ENFORCEMENT-ONLY WALK (2026-09-19, the operator's order: the
 *  schema gates EVERY hop — nothing goes around Schemaster). The
 *  overlays (the single-call lift, the film per-window stanza)
 *  merge user-authored knobs AFTER the compose gate walked the
 *  entry doc; this walk keeps the carrier's REFUSALS (declared
 *  types + bounds on every knob the overlay introduces) and
 *  DISCARDS its default-fills — the stanza's absent-key law (null
 *  length for per-window spans, the family budgets) owns the
 *  semantics. */
const assertOverlayGated = (doc: Record<string, unknown>, where: string): void => {
  try {
    paramSchema(doc)
  } catch (e) {
    throw new Error(`${where}: ${String(e)}`)
  }
}

function renderH3Film(
  p: Record<string, unknown>,
  g: GraphBuilder,
  laneInputs: Record<string, unknown> = {},
): void {
  // (the compose dispatch guarantees calls is a non-empty array here)
  const calls = p.calls as Array<Record<string, unknown>>
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  let prev: WindowHandles | undefined
  // every window's SaveVideo passthrough, in film order — the film
  // tail's ordering wire needs ALL of them (2026-09-23: the
  // last-save-only boundary left cut windows' saves unordered)
  const windowSaves: OutputHandle[] = []
  // THE FILM RAIL (the operator's call, 2026-09-17: the film is media
  // composition — the ENGINE'S job, never a harness-side ffmpeg).
  // THE SEAM (2026-09-20, the operator's order: forget the
  // MotionContext seam exists): ONE mechanic, automatic — the
  // TimelineDirector drift-control continuation. Every window k≥2
  // carries the previous window's sampled latent through
  // MiniMaxH3FiniteLatentContinuation (schedule-matched prefix noise
  // + Soft AV audio release); a 'cut' call is their overlap-0 arm
  // (independent windows, no guidance). No seam vocabulary, no
  // modes — the film accumulates through their finalize chain
  // (video: the previous window owns the overlap; audio: the
  // incoming soft-released head owns the join). §20, THREE ACTS
  // (2026-09-22): (1) the ORIGINAL in-graph tail consumed every
  // window's tensors until the final CreateVideo — the OOM signature
  // that killed positioned-clips films 3× (a 43h engine); (2) the
  // one-day disk-side valve (estate ffmpeg) died of the operator's
  // provenance law — every artifact traces to a composition of
  // cards, never a harness side-effect; (3) the FILE FORM now below:
  // each window saves its own clip, an unload boundary orders +
  // flushes, and a file-decoding tail assembles the film IN-GRAPH —
  // no tensor ever spans the boundary. The mix math lives in
  // filmMix.ts — one owner, stamps and overlay both.
  // THE CONDITIONING stamps below stay in-graph per-window (what
  // each window HEARS at generation — lip sync lives here). The
  // overlay half (positions, duck spans, the music bus) rides the
  // post-generation MeliteFilmAudioMix for clips-carrying films
  // (the valve's second arm) and the clips-free file tail otherwise
  // — both driven by the same filmMix.ts manifest.
  // THE CLIPS, PARSED ONCE (2026-09-21, the dialogue half): the
  // per-window CONDITIONING stamps (the model hears the dialogue:
  // lip sync) read THIS list — parseFilmMixClips (filmMix.ts) is
  // the one law for what a clip IS, shared with the post-generation
  // mix node (its clips_json rows carry the parsed seats verbatim).
  // THE THREE AUDIO LANES (2026-09-22, the operator's D-M-E law): a
  // clip rides one CLASS — dialogue | sfx | music — one H3 audio
  // input each. Every class runs the SAME machinery (stamp → pin →
  // prompt field → overlay); only the prompt field and the duck
  // relationships differ. Default: a text-carrying row is dialogue
  // (the words law), a textless row is music (the historical
  // Music-row behavior, byte-identical for existing docs).
  const clips: FilmMixClip[] = parseFilmMixClips(
    Array.isArray(p.audio_clips) ? (p.audio_clips as Array<Record<string, unknown>>) : [],
  )
  // THE FILM DOC'S SPANS — the clock's own rows, one per call, doc
  // frames with the seam word (filmMix.ts owns the law). The stanza
  // snap rides these (spanStanzaFrames): the render loop below and
  // the film manifest at the tail read the SAME snap from the SAME
  // rows — the two-clocks law, one owner.
  const spans: FilmMixSpan[] = calls.map((c): FilmMixSpan => ({
    // the shot-law loop above pins every row's int spans (loud
    // refusals upstream) — no defensive fallback arms to keep alive
    start: c.start_frame as number,
    end: c.end_frame as number,
    // the seam word rides RAW — filmMix's spanOverlap owns the one
    // meaningful comparison ('cut' = overlap 0; every other spelling
    // including absent IS extend); no card-side re-encoding
    transition: str(c.transition),
  }))
  // (the clip text law lives where the text is consumed: THE
  // TRANSCRIPT — dialogue words ride the <d> prompt tag, sfx text
  // the soundscape field, music text non_diegetic_music. In every
  // class the text tells the model WHAT the audio is.)
  // LORA STEPS APPLIED (operator correction, 2026-09-18): a distill
  // adapter is married to its step count — one lora for four steps,
  // another for eight — so the resolved bag rows carry `steps` and
  // the windows honor it. LAYERING: a call's own knobs > the lora
  // entry's steps > this steps row (the row is the no-distill
  // default; a user-stacked pair runs at the HIGHER count — 8 steps
  // on a 4-step distill is fine, 4 on an 8-step is undercooked).
  const loraRows = Array.isArray(p.loras) ? (p.loras as Array<Record<string, unknown>>) : []
  const loraStepsList = loraRows
    .map((r) => r.steps)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const loraStepsApplied = loraStepsList.length > 0 ? Math.max(...loraStepsList) : null
  calls.forEach((call, i) => {
    const k = i + 1
    const guide = str(call.image ?? call.ref_image ?? call.image_name)
    // A CALL OWNS ITS TEXT (the operator's no-fallbacks law, enforced
    // 2026-09-21: the film-level prompt silently rode textless calls —
    // a source substitution, the exact crime class the law bans). The
    // directing skill's own contract says it: "A call needs text (or
    // beats — prompt segments WITHIN the call)". The film-level prompt
    // is the single-window shape's text face (lifted there by the
    // single-call mapping) — NEVER a per-call substitute.
    let text = typeof call.text === 'string' ? call.text.trim() : ''
    if (text === '') {
      throw new Error(
        `calls[${i}]: a call needs its own text — the film-level prompt is not a fallback (write the shot's text on the call)`,
      )
    }
    // THE SEAM LAW (2026-09-20): ONE mechanic, automatic. A 'cut'
    // call is the director's overlap-0 arm (independent windows — no
    // continuation, no guidance, nothing carried); every other seam
    // rides the drift-control continuation at their proven default
    // (22 frames ≈ 0.92s). first_frame_prev_sec retired with the
    // MotionContext seam — cross-run continuity is the FL2VA anchor
    // (set the first-frame square to the previous film's last frame).
    const overlap = transitionOverlap(typeof call.transition === 'string' ? call.transition : undefined)
    const knobs = (call.knobs ?? {}) as Record<string, unknown>
    // refs are a LAYER B (per-call) property — the reference bundle
    // rides the stanza; a refs-carrying call is t4r EVEN without a
    // guide still (the bundle IS the r2v input). The DECLARED input
    // surface (ref_images/ref_videos/ref_audios — Layer A, the
    // card's own params) implies t4r by the same law.
    const rb = (call.refs ?? {}) as Record<string, unknown>
    const declaredRefCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length
    const hasRefs = declaredRefCount + wireList(rb.images).length + wireList(rb.videos).length + wireList(rb.audios).length > 0
    const chainLike = i > 0 && overlap > 0
    const sf = num(call.start_frame)
    const ef = num(call.end_frame)

    // THE AUDIO CONDITIONING STAMPS (2026-09-21, generalized
    // 2026-09-22 to the D-M-E lanes): every window whose generation
    // span a clip rides HEARS that clip — one lane per CLASS, the
    // FIRST clip in row order winning its class's lane when several
    // of one class overlap one window (the authored primary). A clip
    // with no dur (or a sub-0.1s overlap) cannot size a slice and
    // stays overlay-only. Computed BEFORE the stanza: a stamped
    // window is a REFERENCE window (t4r) — the audio lanes only
    // exist on that arm (the bed's own law: it too counts as a ref).
    // THE STAMP (corrected 2026-09-22 while composing the
    // proof film — the first cut sliced the source AT the timeline
    // offset, so a clip starting mid-window conditioned the WRONG
    // PART of the audio, immediately: window 1 of a seam-spanning
    // dialogue heard the line's TAIL). The true law: the window's
    // generation render starts at doc frame sf − carry (the carry
    // head included — the model hears the whole generation span);
    // the clip sounds at generation offset (clip.start − genStart)
    // from its own source offset (genStart − clip.start). The
    // stamp therefore carries BOTH: the SOURCE segment to slice
    // [slice_start, +slice_dur) and the head silence (delay) that
    // places it — the builder chains Slice → the pin at
    // frame_idx = delay×24, fitted to the window's own generation
    // length. ONE delay number feeds BOTH the pin and the prompt
    // tag's clock — they cannot disagree.
    type Stamp = { src: string, slice_start_seconds: number, slice_duration_seconds: number, delay_seconds: number, text: string }
    const stamps: { dialogue?: Stamp, sfx?: Stamp, music?: Stamp } = {}
    if (sf !== null && ef !== null && Number.isFinite(sf) && Number.isFinite(ef) && ef > sf) {
      const carry = i > 0 ? overlap : 0
      const genStart = sf - carry
      for (let ci = 0; ci < clips.length; ci++) {
        const clip = clips[ci]!
        if (clip.dur <= 0) continue
        if (stamps[clip.cls] !== undefined) continue // one lane per class per window
        const lo = Math.max(clip.start, genStart)
        const hi = Math.min(clip.start + clip.dur, ef)
        if (hi - lo < 2.4) continue // below the slice node's 0.1s floor
        const ms = (frames: number): number => Math.round((frames / 24) * 1000) / 1000
        stamps[clip.cls] = {
          src: clip.src,
          slice_start_seconds: ms(Math.max(0, genStart - clip.start)),
          slice_duration_seconds: ms(hi - lo),
          delay_seconds: ms(Math.max(0, clip.start - genStart)),
          text: clip.text,
        }
        // (§20: the conditioned set moved to filmMix.ts — the
        // post-generation mix node derives it from the same stamp
        // law. The stamps themselves stay: THIS window hears them.)
      }
    }

    // THE PROMPT FIELDS (the guide's law, one per lane): dialogue
    // rides <d> tags — the exact words at the stamp's LOCAL time
    // (MM:SS.mmm, the window's own clock), never translated or
    // rewritten; this is the half the audio-only conditioning
    // lacked: the audio pins the voice, the tag moves the mouth.
    // SFX rides the soundscape field at its onset time (the model
    // HEARS the blast and times the visual to it); music rides
    // non_diegetic_music. Same delay number, same clock.
    const stampClock = (t: number): string => {
      const mm = String(Math.floor(t / 60)).padStart(2, '0')
      const ss = String(Math.floor(t % 60)).padStart(2, '0')
      const mmm = String(Math.round((t % 1) * 1000)).padStart(3, '0')
      return `${mm}:${ss}.${mmm}`
    }
    if (stamps.dialogue !== undefined && stamps.dialogue.text !== '') {
      const t = stampClock(stamps.dialogue.delay_seconds)
      // SPEAKER-NEUTRAL (attempt-019 maker finding): the stamp once
      // hard-coded "She says" — a plainly male harbourmaster got a
      // female pronoun in his own mouth. The speaker is whoever the
      // window shows; the stamp never genders them.
      text = text.replace(/\s+$/, '') +
        `\n\noverall_soundscape:\nAt ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${stamps.dialogue.text}</d>`
    }
    if (stamps.sfx !== undefined && stamps.sfx.text !== '') {
      // THE ONE-CLOCK LAW (2026-09-24): an authored sfx text that already
      // opens with its own "At MM:SS.mmm," clock must not carry two clocks —
      // the stamp's clock is canonical, the authored one is trimmed.
      const sfxText = stamps.sfx.text
        .replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, '')
      text = text.replace(/\s+$/, '') +
        `\n\noverall_soundscape:\nAt ${stampClock(stamps.sfx.delay_seconds)}, ${sfxText}`
    }
    if (stamps.music !== undefined && stamps.music.text !== '') {
      text = text.replace(/\s+$/, '') +
        `\n\nnon_diegetic_music:\n${stamps.music.text}`
    }
    // THE NO-SPEECH INDICATOR (2026-09-24, the operator's gibberish
    // law, paid for on the BRIEF9 films): unless the model is told
    // 'no speech' OR given speech-carrying audio, it INVENTS random
    // gibberish dialogue. A window with no dialogue stamp and no
    // live ref audios is exactly that window — an sfx/music bed does
    // NOT count (the first BRIEF9 window carried the bed on the sfx
    // lane and still gibberished; only the dialogue-conditioned
    // window came out clean). The card stamps the indicator itself:
    // model memory is not a seat. Ref audios count as audio input
    // only when the door guard leaves them live (an unstamped
    // window); an authored indication of any spelling ('no speech',
    // 'no dialogue', 'no voice') is honored, never doubled.
    const voicePinnedHere = stamps.dialogue !== undefined || stamps.sfx !== undefined
    const hearsRefAudio = !voicePinnedHere
      && (wireList(p.ref_audios).length > 0 || wireList(rb.audios).length > 0)
    if (stamps.dialogue === undefined && !hearsRefAudio && !/\bno[\s_-]*(speech|dialogue|voice)/i.test(text)) {
      text = text.replace(/\s+$/, '') +
        '\n\noverall_soundscape:\nNo speech or dialogue in this shot — ambient and effects only; nobody speaks on screen and there is no voice-over.'
    }
    const stanza: Record<string, unknown> = { ...p, ...knobs, prompt: text, k }
    const anyStamp = stamps.dialogue !== undefined || stamps.sfx !== undefined || stamps.music !== undefined
    stanza.variant = (guide !== '' || hasRefs || anyStamp) ? 't4r' : chainLike ? 't4_chain' : 't4_open'
    // the distill's steps apply unless this call's knobs pinned steps
    if (knobs.steps === undefined && loraStepsApplied !== null) stanza.steps = loraStepsApplied
    // THE DOOR GUARD, voice arm: a dialogue/sfx-pinned window mutes
    // the user ref audios (film-level and per-call) — the pins own
    // that window's audio conditioning; the ref doors reopen on
    // unstamped windows.
    const voicePinned = stamps.dialogue !== undefined || stamps.sfx !== undefined
    if (voicePinned) delete stanza.ref_audios
    if (hasRefs) stanza.refs = voicePinned && Array.isArray((call.refs as Record<string, unknown> | undefined)?.audios)
      ? { ...(call.refs as Record<string, unknown>), audios: undefined }
      : call.refs
    if (guide !== '') stanza.image = guide
    else delete stanza.image
    if (sf !== null && ef !== null && ef > sf) {
      // THE UNIFORM SPAN GATE, second door: a stale or hand-built
      // document re-rides the same law the walk admitted under, so
      // the compose carrier refuses an off-grid span before any node
      // is built (zero GPU) instead of trusting the render snap.
      assertSpanGrid(spans[i]!, `h3-timeline window ${k}`, chainLike ? overlap : 0)
    }
    // per-window length: the span rider law, unless the call's knobs pin one
    if (sf !== null && ef !== null && ef > sf && knobs.length === undefined) {
      // THE CARRY IS GENERATION (fixed 2026-09-23): the stanza
      // covers carry + span — the finalize trims the carried head
      // off the SAVED clip, so the span's tail must exist inside
      // the generation. chainLike is the render's own carry law
      // (i>0 and a non-cut seam) — the same number filmMix's
      // stanzaSecs states (the two-clocks law, still one owner).
      stanza.length = spanStanzaFrames(spans[i]!, chainLike ? overlap : 0)
      // THE TWO CLOCKS LAW (fixed 2026-09-22 — the 20-second proof
      // film): the window's VIDEO length derives from fps_seconds
      // (the builder's ComfyMathExpression reads it; the length
      // param alone only feeds the film clock's accounting). A doc
      // whose spans disagree with the stale fps_seconds renders
      // uniform 10s windows while the clock books doc spans — the
      // film clock and the render MUST state the same window.
      // (The snap itself is filmMix's spanStanzaFrames — the ONE
      // law the render loop and the film manifest share; the old
      // inline 22+17k twin died here.)
      if (knobs.fps_seconds === undefined) {
        stanza.fps_seconds = Math.round(((stanza.length as number) / 24) * 1000) / 1000
      }
    }
    // THE GRID GATE (§26): a knob-pinned length bypassed the snap
    // above — validate, never trust. Refuses at compose (zero GPU)
    // with the span, the nearest legal length, and the proven
    // geometry in the message.
    assertGridLength(
      stanza.length,
      `h3-timeline window ${k} (span ${sf}→${ef})`,
    )
    if (i > 0) {
      stanza.__iteration = k - 1
      stanza.__overlap = overlap
    }
    if (prev !== undefined) stanza.__prev = prev
    // THE DOOR GUARD (2026-09-22, the operator's overlap law; the
    // bed arm retired with the bed the same day): a pinned window
    // owns its audio conditioning — the normal inputs stand down for
    // THAT window so nothing double-feeds the same generation. The
    // dialogue/sfx arm strips the user's ref_audios on stamped
    // windows (the pins own those lanes); the music arm has nothing
    // left to guard since the bed left. Per-window, never film-wide.
    assertOverlayGated(stanza, `h3-timeline window ${k} knobs`)
    // WINDOWS REMAIN TENSORS-FREE (§20, 2026-09-22): no accumulation
    // nodes, nothing holds a prior window's tensors — each window
    // frees after its own SaveVideo. The film tail below assembles
    // from the SAVED FILES (decode after every save), never from
    // window tensors.
    // the conditioning stamps ride the stanza (what THIS window
    // hears at generation — the Slice → pin chain reads them).
    if (stamps.dialogue !== undefined) stanza.dialogue_slice = stamps.dialogue
    if (stamps.sfx !== undefined) stanza.sfx_slice = stamps.sfx
    if (stamps.music !== undefined) stanza.music_slice = stamps.music
    const h = g.scoped(`window${k}_`, (w): WindowHandles => renderH3Window(stanza, w, laneInputs))
    prev = h
    /* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets is refused loud at the film tail */
    if (h.savePassthrough !== undefined) windowSaves.push(h.savePassthrough)
  })
  // ── THE FILM TAIL, FILE FORM (§20's amendment, 2026-09-22 — the
  // operator's provenance law: every artifact traces to a
  // composition of cards, never a harness side-effect) ──────────────
  //
  // The ORIGINAL tail consumed every window's tensors as graph data
  // (the scheduler kept the whole film's backlog alive while later
  // windows sampled — the 43h-OOM signature). The disk-side valve
  // that replaced it died the same day (out-of-band ffmpeg). THIS
  // tail inverts the memory law while staying in-graph, in TWO arms:
  //
  //   CLIPS-FREE films (the 27-film precedent — never OOM'd):
  //   1. every window SAVES its own clip (h3_t4_w<k>) — its tensors
  //      die at that SaveVideo (nothing downstream consumes them);
  //   2. ONE MeliteUnload boundary PER window save, token-chained
  //      through the optional 'after' input (2026-09-23: the old
  //      single boundary on the last save assumed "windows chain, so
  //      the last save is downstream of them all" — FALSE for cut
  //      films, which chain nothing; window 2's save was an unordered
  //      island and the loader could beat it) — every boundary flushes
  //      the allocator WITHOUT dropping model weights (the next run
  //      pays no reload), and the chain's final token provably waits
  //      for EVERY save;
  //   3. MeliteConcatVideos decodes the saved FILES back in
  //      (IMAGE+AUDIO+fps) — CPU-side, strictly after every save;
  //   4. CreateVideo → SaveVideo h3_t4_film. The film is a graph
  //      output; the estate's engineFilmName presents it first.
  //
  //   AUDIO-CARRYING films (the valve's SECOND ARM, 2026-09-24 — the
  //   VRAM-leak fix, operator law: WE USE COMFYUI, NEVER FFMPEG for
  //   the mix; GAP 1 CLOSED same night — the arm delivers the film
  //   mp4): the retired in-graph film stitch (film-time Delay/Mix/
  //   Duck over live window tensors) held every window resident
  //   until the final save — the accumulation that OOM'd a
  //   two-window BRIEF9 film at 20.57 GiB. These films take the valve
  //   path (windows save per-window and free behind the same chained
  //   boundaries — steps 1–2 above) PLUS one post-generation
  //   MeliteFilmAudioMix (Layer C, torch, the estate's own node):
  //   window audio files + the manifest's clips/duck law in,
  //   SaveAudio h3_t4_film_audio stem out — AND the same file-tail
  //   video join (MeliteConcatVideos → CreateVideo → SaveVideo
  //   h3_t4_film) with the MIXED audio wired in. No film-time
  //   Delay/Mix/Duck/LoadAudio — the graph holds windows only
  //   during generation.
  //
  // (Single-window docs never reach this tail — the compose
  // dispatch keeps the frozen single-window shape byte-identical;
  // the film is a MULTI-call property, and the single-call mapping
  // refuses clips loudly downstream of the dispatch.)
  /* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets refuses here, loudly */
  if (windowSaves.length === 0) {
    throw new Error('[h3-timeline] a family arm saved no clip to pass the film boundary — the film tail cannot order its loads')
  }
  const manifest = computeFilmMix({
    spans,
    clips,
    windowSecs: stanzaSecs(spans),
    // the knob's declared default (−14) walks through the schema
    // door; computeFilmMix owns the fallback for the absent key
    duckDb: p.duck_depth_db as number | undefined,
  })
  // ONE BOUNDARY PER WINDOW SAVE, token-chained (2026-09-23, the
  // cut-film ordering fix — receipts run-1057a53c4252 (stale-file
  // stitch: 960×576 leftovers globbed as windows) and
  // run-18ea8c810104 (loud no-match refusal on h3_t4_w2): cut
  // windows chain NOTHING and even chained windows' SAVE nodes are
  // not downstream of one another, so the old single boundary on
  // the LAST save rode a scheduler tie-break — window 2's save was
  // an unordered island the loader could beat). Every window's
  // SaveVideo passthrough feeds its OWN boundary; each boundary's
  // optional 'after' wires the prior boundary's token, so the final
  // token (the concat's 'after') transitively depends on EVERY
  // save — and each window's passthrough tensor still dies at its
  // own boundary (the §20 law; the flush is idempotent, weights
  // stay resident).
  let boundaryAfter: OutputHandle | undefined
  for (const save of windowSaves) {
    boundaryAfter = g.node('MeliteUnload', {
      video: save, unload_models: false,
      ...(boundaryAfter !== undefined ? { after: boundaryAfter } : {}),
    }).out(0)
  }
  const after = boundaryAfter!
  if (clips.length > 0) {
    // THE VALVE'S SECOND ARM (2026-09-24 — the film mix leaves the
    // graph's generation half; GAP 1 CLOSED 2026-09-24 — the arm
    // delivers the film mp4 too): ONE MeliteFilmAudioMix composes
    // the film's audio post-generation from the saved window files
    // + the manifest's clips/duck law (the SAME Delay/Mix/Duck
    // methods the retired tail called, in the SAME order — now
    // torch-side inside the estate's own node, never ffmpeg).
    // SaveAudio emits the stem; the VIDEO join is the clips-free
    // arm's own machinery (MeliteConcatVideos decodes the saved
    // files CPU-side strictly after every save — windows' tensors
    // died at their SaveVideos, so no accumulation returns) with
    // the MIXED audio wired into CreateVideo — the film mp4 carries
    // the mix, not the raw concat audio. Early return: the
    // clips-free arm below stays byte-frozen.
    const mix = g.node('MeliteFilmAudioMix', {
      videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
      after,
      // the manifest rendered verbatim: every placement's source,
      // film seat, duration, and class — doc order kept (the node's
      // two loops read the same order the retired tail did)
      clips_json: JSON.stringify(manifest.placements.map((pl) => {
        const clip = clips[pl.clip]!
        return { src: clip.src, start_sec: pl.filmSec, dur_sec: pl.durSec, class: pl.cls }
      })),
      duck_spans: manifest.duckSpanString,
      music_duck_spans: manifest.musicDuckSpanString,
      duck_db: manifest.duckDb,
      film_seconds: manifest.filmSec,
    })
    // THE LOUDNESS METER (§39's owed Layer C node, 2026-09-25): a
    // passthrough tap between the mix and its consumers — the film's
    // integrated loudness (BS.1770-4, K-weighted + gated) rides the
    // history UI dict as loudness_lufs, so every surface REPORTS the
    // number instead of re-deriving it from the encoded file. The
    // AUDIO dict rides out unchanged (meter taps, never transforms);
    // calibrated against ffmpeg's ebur128 to within 0.1 LU on tones,
    // noise, gating, and mono.
    const meter = g.node('MeliteLoudness', { audio: mix.out(0) })
    g.node('SaveAudio', {
      audio: meter.out(0), filename_prefix: 'h3_t4_film_audio',
    })
    // THE FILM MP4 (GAP 1): the same file-tail video join the
    // clips-free arm rides — container mux only (CreateVideo +
    // SaveVideo h264/mp4 on the decoded window files), never the
    // mix. The mix rides it: audio carries the node's output.
    const join = g.node('MeliteConcatVideos', {
      videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
      after,
    })
    const filmCreated = g.node('CreateVideo', {
      images: join.out(0), audio: meter.out(0), fps: join.out(2), bit_depth: 8,
    })
    g.node('SaveVideo', {
      video: filmCreated.out(), filename_prefix: 'h3_t4_film',
      format: 'mp4', codec: 'h264',
    })
    return
  }
  const concat = g.node('MeliteConcatVideos', {
    videos: calls.map((_c, i): string => `h3_t4_w${i + 1}`).join(','),
    after,
  })
  const filmCreated = g.node('CreateVideo', {
    images: concat.out(0), audio: concat.out(1), fps: concat.out(2), bit_depth: 8,
  })
  g.node('SaveVideo', {
    video: filmCreated.out(), filename_prefix: 'h3_t4_film',
    format: 'mp4', codec: 'h264',
  })
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
  /** the window's SaveVideo VIDEO passthrough — the film tail's
   *  ordering wire: the MeliteUnload boundary consumes it, so the
   *  file loaders provably wait for the saves (and the passthrough
   *  tensor dies at the boundary — the §20 law). Assigned by BOTH
   *  family arms (every family path saves); the film tail refuses
   *  loud if a future arm forgets. */
  savePassthrough?: OutputHandle
}

const wireList = normalizeDeclaredRefs

function renderH3Window(
  p: Record<string, unknown>,
  g: GraphBuilder,
  lane: Record<string, unknown> = {},
): WindowHandles {
  // REFS IMPLY THE R2V LANE (the bundle IS the r2v input): a
  // refs-carrying window is t4r even without a guide still — the
  // same law the film renderer applies per call. The DECLARED input
  // surface (ref_images/ref_videos/ref_audios — the typed fields)
  // implies t4r by the same law.
  const rb0 = (p.refs ?? {}) as Record<string, unknown>
  const declaredCount = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length
  const hasRefs = declaredCount + wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0
  if (hasRefs && p.variant !== 't4r') p = { ...p, variant: 't4r' }
  const family = p.variant as Family
  if (!(FAMILIES as readonly string[]).includes(family)) {
    throw new Error(`unknown window family '${String(p.variant)}' (known: ${[...FAMILIES].sort().join(', ')})`)
  }
  const k = (p.k ?? 1) as number
  // THE GRID GATE (§26, defense in depth): no window renders
  // off-grid — the film loop's pin check voices the call span, this
  // one catches the single-call path and any direct caller.
  assertGridLength(p.length, `h3-timeline window ${k}`)
  const isT4r = family === 't4r'
  const isChain = family === 't4_chain'
  // (M5, the fallback audit — judged LAWFUL and now documented: this
  // is the fresh-card admission, not a fallback crime. The window
  // shape's text face is p.prompt (declared required=True, "optional
  // at parse"); the FRESH-PRESS law (operator 2026-09-17, pinned in
  // card.spec.ts "a fresh press composes") admits an absent/blank
  // prompt as empty conditioning — the fresh-card one-shot document
  // renders. The film path refuses textless calls instead (the
  // no-fallbacks law at the calls walk); the single-call LIFT may
  // lawfully write p.prompt from call text because in the one-window
  // shape p.prompt IS the text owner — never a substitute.)
  const prompt = (p.prompt ?? '') as string
  // card knob first (image), renderer alias second.
  const guideImage = (p.image ?? p.image_name ?? '') as string

  // ── the model chain (family-conditional defaults;
  // absent = absent on wire) ──
  const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true)
  const unet = g.node('UNETLoader', { unet_name: h3LaneFile(lane, 'unet', DECL_UNET), weight_dtype: 'default' }).out()
  const sla = g.node('H3SLAAttention', {
    model: unet,
    sparsity_ratio: p.sla_sparsity as number,
    block_size: p.sla_block_size as string,
    min_seq_len: p.sla_min_seq_len as number,
    dense_last_steps: p.sla_dense_last_steps as number,
    protect_audio: p.sla_protect_audio as boolean,
    enabled: true,
    dense_steps: p.sla_dense_steps as string,
    dense_backend: p.sla_dense_backend as string,
    disable_fp16_accum: p.sla_disable_fp16_accum as boolean,
    stabilize_motion: stabilize,
    reference_protection: p.sla_reference_protection as string,
  }).out()
  const chunked = g.node('MiniMaxChunkFeedForward', {
    model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
    chunks: 2, seq_threshold: 4096,
  }).out()
  // THE LORAS MOD PLANE (the operator's law: "MOD SYSTEM IS CORE.
  // NEVER HARDCODED"; 2026-09-21: "LORAS ARE ONLY MODS" — the raw
  // `lora_stack` string field is DEAD): the studio/agent surface
  // writes the mod bag `loras` — [{id, strength}] rows the service
  // resolves to {name, strength} filenames against the family's
  // flavor catalog. Those rows build the upstream stack verbatim
  // ({on, lora, str, v:1, a:1, t:1}); an empty bag rides the frozen
  // gold solo (turbo 0.6 — plaguekind 1:1, the mod plane's own
  // default). ONE surface, one owner.
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
    : LORA_STACK_GOLD
  // t4r templates carry shift_video 8.0; the t4 family carries the INT
  // NO SILENT RESOLUTION LAW: the walked shift_video IS the value
  // (declared default 8; the family literals retired with the
  // nulling that fed them — 8.0 and 8 serialize identically anyway)
  const shiftVideo = p.shift_video as number

  const clip = g.node('CLIPLoader', {
    clip_name: h3LaneFile(lane, 'clip', DECL_CLIP), type: 'minimax',
    ...(isT4r ? { device: 'default' } : {}),   // t4 templates OMIT it
  }).out()
  const vaeVideo = g.node('VAELoader', { vae_name: h3LaneFile(lane, 'vae_video', DECL_VAE_VIDEO) }).out()
  const vaeAudio = g.node('VAELoader', { vae_name: h3LaneFile(lane, 'vae_audio', DECL_VAE_AUDIO) }).out()

  let cond: OutputHandle
  let latent: OutputHandle
  let sigmaModel: OutputHandle
  let fpsInput: OutputHandle | number

  if (isT4r) {
    // opener: switch(SLABool) picks SLA-direct vs chunked; lora rides
    // the switch; preview override wired to the in-graph step count.
    // Inject semantics: an injected SCALAR replaces the bool NODE
    // (template link severed, node orphaned) — mirrored by passing the
    // scalar straight when sla_switch is set. sla_enabled=false
    // forces the chunked (SLA-off) path; otherwise the legacy
    // sla_switch spelling rides untouched.
    const fpsNode = g.node('PrimitiveFloat', { value: 24.0 }).out()  // id .0 — CreateVideo.fps walks first
    let slaSel: OutputHandle | boolean | null = (p.sla_enabled as boolean | undefined) === false
      ? true
      : ((p.sla_switch as boolean | undefined) ?? null)
    if (slaSel === null) slaSel = g.node('PrimitiveBoolean', { value: false }).out()
    const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out()
    const loraModel = g.node('LTX_lora_loader', {
      model: picked, mode: 'minimax', stack_data: loraStack, lora_ui: '',
    }).out()
    const seconds = g.node('PrimitiveFloat', { value: p.fps_seconds as number }).out()  // id .1
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
    // the frozen served shape); `refs` is the call's REFERENCE bundle
    // — the upstream "Extra References" subgraph's own vocabulary
    // (LoadImage → the ref resizer; LoadVideo → GetVideoComponents →
    // the image+audio component pair; LoadAudio). Bundle layout (the
    // slot map): inputs 1-9 images (anchor first), 10/12/14
    // video image streams, 11/13/15 video audio streams, 16-18
    // audios. RESIZER ORDER IS PINNED: the serialized walk reaches
    // the reference resizer (bundle → r2v refs) before the geometry
    // resizer (i2v) — creation mirrors the walk.
    const refBag = (p.refs ?? {}) as Record<string, unknown>
    // THE DECLARED-SURFACE MERGE (the input rail's law): the typed
    // fields (ref_images/ref_videos/ref_audios — Layer A, stamped
    // onto every stanza) are PRIMARY; the legacy stanza bag's
    // entries append, deduped. One wire form, one reader.
    const declaredImages = wireList(p.ref_images)
    const declaredVideos = wireList(p.ref_videos)
    const declaredAudios = wireList(p.ref_audios)
    // THE 9-SLOT IMAGE BUS (the bundle's own topology — the compose
    // and the UI agree or they lie): inputs 1-9 are IMAGE slots —
    // the anchor at 1, the FL2VA pair's END anchor at 2 when
    // last_frame is set, references at 3..9 (7 with an end anchor,
    // 8 riding input_2..9 without one); input_10 begins the video
    // lanes. A 9th ref would land ON input_10 — the first video's
    // image stream — and be silently clobbered; the law refuses
    // LOUD instead.
    const lastFrame = (p.last_frame ?? '') as string
    const refImagesAll = mergeDeclaredRefs(declaredImages, wireList(refBag.images))
    const imageCap = imageReferenceCap(lastFrame !== '')
    if (lastFrame !== '' && refImagesAll.length > imageCap) {
      throw new Error(`[h3-timeline] the image bus is full: a last frame (input 2) + ${String(refImagesAll.length)} references exceeds the ${IMAGE_BUS_SLOTS}-slot bus — keep references ≤ ${imageCap} with an end anchor (≤ ${REF_CAPS.images} without)`)
    }
    const refImages = refImagesAll.slice(0, imageCap)
    const refVideos = mergeDeclaredRefs(declaredVideos, wireList(refBag.videos)).slice(0, REF_CAPS.videos)
    const refAudios = mergeDeclaredRefs(declaredAudios, wireList(refBag.audios)).slice(0, REF_CAPS.audios)
    // a tensor carrier: a node's output handle, or the spell arm's
    // raw '$name' wire value (the lanes-image grammar, local)
    type TensorRef = OutputHandle | string
    const bundleInputs: Record<string, TensorRef> = {}
    // THE SPELL ARM (the naming law's merge half, 2026-10-09 — "fix
    // it all"): a '$name' value names a WIRED STAGE INPUT, never a
    // file on disk — the merge (rewriteSpells) lands the upstream
    // producer's tensor link wherever the spell rides, and ROW-4
    // refuses producer links in Load* file slots. So a spelled
    // anchor/last-frame/reference rides its TENSOR slot verbatim
    // and NEVER builds a loader; files/URLs/estate paths keep the
    // Load* disk handoff (the per-stage path owns those). Before
    // this arm the ports validated green at the lattice and died
    // at the merge — the validate-said-nothing disease.
    const isSpell = (s: string): boolean => s.startsWith('$')
    const imageRef = (src: string): TensorRef =>
      isSpell(src) ? src : g.node('LoadImage', { image: src }).out()
    let anchorRaw: TensorRef | undefined
    if (guideImage !== '') {
      anchorRaw = imageRef(guideImage)
      bundleInputs.input_1 = g.node('UnifiedResizeImageMask', {
        image: anchorRaw, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    }
    // THE FL2VA END ANCHOR: input_2 is the pair's second seat — the
    // i2v branch reads out(0)/out(1) as first/last frame verbatim.
    // Without an end anchor, refs ride from input_2 (legacy shelf).
    const resizeRef = (src: string): OutputHandle => g.node('UnifiedResizeImageMask', {
      image: imageRef(src), scale_mode: 'Shorter Side',
      aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
      short_side_target: 2048.0, width: 1024.0, height: 1024.0,
      multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
      crop: 'center', divisible_by: 32.0, maintain_aspect: false,
    }).out()
    if (lastFrame !== '') bundleInputs.input_2 = resizeRef(lastFrame)
    const firstFreeSlot = lastFrame !== '' ? 3 : 2
    refImages.forEach((src, i) => {
      const img = imageRef(src)
      if (anchorRaw === undefined && i === 0) anchorRaw = img
      bundleInputs[`input_${firstFreeSlot + i}`] = g.node('UnifiedResizeImageMask', {
        image: img, scale_mode: 'Shorter Side',
        aspect_ratio: 'Auto (Input Image)', long_side_target: 1024.0,
        short_side_target: 2048.0, width: 1024.0, height: 1024.0,
        multiplier: 1.0, megapixels: 1.0, upscale_method: 'lanczos',
        crop: 'center', divisible_by: 32.0, maintain_aspect: false,
      }).out()
    })
    refVideos.forEach((src, i) => {
      // the spelled motion guide rides GetVideoComponents' tensor
      // input directly (the producer's pre-save video tensor); a
      // path keeps the LoadVideo disk handoff.
      const vid: TensorRef = isSpell(src) ? src : g.node('LoadVideo', { file: src }).out()
      const comp = g.node('GetVideoComponents', { video: vid })
      bundleInputs[`input_${10 + 2 * i}`] = comp.out(0)
      bundleInputs[`input_${11 + 2 * i}`] = comp.out(1)
    })
    refAudios.forEach((src, i) => {
      // the spelled sound reference rides the bundle's audio seat
      // directly (the producer's audio tensor); a path keeps
      // LoadAudio.
      bundleInputs[`input_${16 + i}`] = isSpell(src)
        ? src
        : g.node('LoadAudio', { audio: src }).out()
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
    // declared knobs hoisted: the compose walk fills their defaults
    // (probe 2026-09-19) — the ?? literals are the pre-walk fence
    const refSize = p.ref_image_size as string

    const r2vInputs: Record<string, OutputHandle | string | number> = {
      prompt, width: p.width as number, height: p.height as number,
      length: lengthNode, ref_image_size: refSize,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    }
    for (let i = 0; i <= 8; i++) r2vInputs[`ref_images.ref_image_${i}`] = bout.out(i)
    for (let i = 0; i < 3; i++) {
      r2vInputs[`ref_videos.ref_video_${i}`] = bout.out(9 + 2 * i)
      r2vInputs[`ref_video_audios.ref_video_audio_${i}`] = bout.out(10 + 2 * i)
      r2vInputs[`ref_audios.ref_audio_${i}`] = bout.out(15 + i)
    }
    // (THE BED IS GONE, 2026-09-22: the user's three ref_audios ride
    // their natural lanes above — no slice, no shift, no fourth
    // anything.)
    let dialogueAudio: OutputHandle | undefined
    let dialogueFrameIdx = 0
    let sfxAudio: OutputHandle | undefined
    let sfxFrameIdx = 0
    let musicAudio: OutputHandle | undefined
    let musicFrameIdx = 0
    // THE DIALOGUE LANE (2026-09-21, the second half): a clip the
    // film loop stamped on THIS window conditions it — the model
    // HEARS the dialogue (the lip-sync mechanism; the generated
    // voice tracks it, the overlay stays the audible authority and
    // the mix DUCKS the generated voice under the real clip at film
    // time). THE BUS LAW, TOLD LOUD: 3 audio lanes total. Bed +
    // THE PINNED DIALOGUE GUIDE (rewired 2026-09-22 after the
    // operator caught the dead lane): the bare ref_audios lane is a
    // soft prior this checkpoint ignores — measured zero correlation
    // on two rendered films. The PINNING lane is MiniMaxH3AddGuide
    // with an audio-only keyframe: the clip's true source segment is
    // anchored INTO the model's own timeline at its generation-frame
    // index (the audio latent rides pinned rows; the video around it
    // generates to match — the inpainting-grade prior). Dialogue no
    // longer consumes a ref lane: bed + user audios keep the full
    // 3-lane budget, and the guide is the dialogue's one owner.
    {
      // THE D-M-E LANES (2026-09-22): one stamp per class — the
      // same slice law, the same pin law, three prompt fields. The
      // dialogue stamp keeps the measured shape (walls ride it);
      // sfx/music stamps are the same machinery on their lanes.
      type StampShape = { src: string, slice_start_seconds: number, slice_duration_seconds: number, delay_seconds: number, text?: string }
      const read = (key: string): StampShape | null => (p[key] ?? null) as StampShape | null
      const stamp = read('dialogue_slice')
      if (stamp !== null) {
        dialogueAudio = g.node('MeliteAudioSlice', {
          audio: stamp.src,
          start_seconds: stamp.slice_start_seconds,
          duration_seconds: stamp.slice_duration_seconds,
        }).out(0)
        dialogueFrameIdx = Math.round(stamp.delay_seconds * 24)
      }
      const sfxStamp = read('sfx_slice')
      if (sfxStamp !== null) {
        sfxAudio = g.node('MeliteAudioSlice', {
          audio: sfxStamp.src,
          start_seconds: sfxStamp.slice_start_seconds,
          duration_seconds: sfxStamp.slice_duration_seconds,
        }).out(0)
        sfxFrameIdx = Math.round(sfxStamp.delay_seconds * 24)
      }
      const musicStamp = read('music_slice')
      if (musicStamp !== null) {
        musicAudio = g.node('MeliteAudioSlice', {
          audio: musicStamp.src,
          start_seconds: musicStamp.slice_start_seconds,
          duration_seconds: musicStamp.slice_duration_seconds,
        }).out(0)
        musicFrameIdx = Math.round(musicStamp.delay_seconds * 24)
      }
    }
    const r2v = g.node('MiniMaxH3ReferenceToVideo', r2vInputs)
    // THE ORPHANED I2V MARKER (2026-09-26): registered so the
    // serialized graph carries the t4r family key (finalizeH3's
    // marker), wired to the geometry/anchor slots it always read —
    // but consumed by NOTHING. The old shape routed r2v through a
    // hardcoded-true ComfySwitchNode whose on_false arm was this
    // node: never selected, yet a flipped switch would have run the
    // gold prompt. Direct wiring + an orphan = one lane, one truth.
    g.node('MiniMaxH3ImageToVideo', {
      prompt: I2V_MARKER_PROMPT, width: geoW, height: geoH,
      length: lengthNode, context_steps: 1, audio_context_steps: 0,
      clip, vae: vaeVideo, first_frame: bout.out(0), last_frame: bout.out(1),
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    fpsInput = fpsNode
    // THE AUDIO-ONLY KEYFRAMES (2026-09-22, D-M-E): each lane pins
    // its slice into the window's own AV latent at its generation-
    // frame index — the model generates the video (and its own
    // sound) around the pinned audio instead of merely glancing at
    // a soft reference. Guides CHAIN (positive flows through): the
    // dialogue pin lands first (the measured law), then sfx (the
    // model times the blast to the heard transient), then music.
    if (dialogueAudio !== undefined) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: dialogueFrameIdx,
        audio_vae: vaeAudio, audio: dialogueAudio,
      }).out(0)
    }
    if (sfxAudio !== undefined) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: sfxFrameIdx,
        audio_vae: vaeAudio, audio: sfxAudio,
      }).out(0)
    }
    if (musicAudio !== undefined) {
      cond = g.node('MiniMaxH3AddGuide', {
        positive: cond, latent,
        frame_idx: musicFrameIdx,
        audio_vae: vaeAudio, audio: musicAudio,
      }).out(0)
    }
  } else {
    // t4 families: chunked chain rides lora, switch picks SLA-direct
    // vs ModelAttentionBackend. The pin autofills the builder adds
    // (lora_ui, the SeedVR2 tile/offload inputs) are stripped by the
    // finalize pass — the python's _T4_AUTOFILL_STRIP mirror.
    const loraModel = g.node('LTX_lora_loader', {
      model: chunked, mode: 'minimax', stack_data: loraStack,
    }).out()
    const mab = g.node('ModelAttentionBackend', {
      model: loraModel,
      // schema-defaulted knob (the vocabulary door guarantees the
      // field — 'comfy kitchen attention' when the caller stays
      // silent; no compose-side fallback arm to keep alive)
      attention: p.attention_backend as string,
    }).out()
    const picked = g.node('ComfySwitchNode', {
      // THE SLA MASTER SWITCH (2026-09-21): sla_enabled=false takes
      // the dense arm; absent = on (every existing doc). The legacy
      // `?? sla_switch ?? true` arms died 2026-09-22 by the
      // no-silent-resolution law: sla_enabled is DECLARED with
      // .default(true), so the walk always delivers a boolean and
      // the fallback arms were unreachable lies.
      switch: p.sla_enabled as boolean, on_true: sla, on_false: mab,
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
    // retired 90/56 budgets remain the fallback ONLY for docs that
    // (the length source of truth is UPSTREAM of this renderer: the
    // schema's span rider serializes single-call spans as EXPLICIT
    // length, and the merged film computes per-window lengths — this
    // arm only falls back to the family budgets)
  // NO SILENT RESOLUTION LAW: the walked/stanza length IS the value
  // (single-call: the span rider's explicit span; multi-call: the
  // film total; fresh: the walked default; the 90/56 family budgets
  // retired with the nulling that fed them)
  const length = p.length as number
    const r2v = g.node('MiniMaxH3ReferenceToVideo', {
      prompt, width: p.width as number,
      height: p.height as number, length: length as number,
      ref_image_size: p.ref_image_size as string,
      clip, vae: vaeVideo, audio_vae: vaeAudio,
    })
    cond = r2v.out(0)
    latent = r2v.out(1)
    fpsInput = 24
  }

  // ── sampler stack ──────────────────────────────────────────────────
  // card knob first (seed), renderer alias second.
  const noise = g.node('RandomNoise', { noise_seed: (p.noise_seed ?? p.seed) as number }).out()
  const samplerSel = g.node('KSamplerSelect', { sampler_name: p.sampler_name as string }).out()
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
  const schedName = p.sched_name as string
  const denoiseVal = p.denoise as number
  const sched = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: schedName,
    steps: p.steps as number, denoise: denoiseVal,
  }).out()
  let guider = g.node('BasicGuider', { model: sigmaModel, conditioning: cond }).out()
  let targetLatent = latent

  // THE SEAM (2026-09-20, the operator's order: the MotionContext
  // seam is FORGOTTEN — the TimelineDirector drift-control
  // continuation is the one way, automatic): window k≥2 with a
  // carried seam rides MiniMaxH3FiniteLatentContinuation — the
  // previous window's RAW sampled latent becomes this window's
  // drift-controlled opening (schedule-matched prefix noise: the
  // carried tail's noise level walks down the sampler's own sigma
  // schedule, so the model never fights the anchor — the anti-drift
  // core for unbounded chains), the audio latent rides the Soft AV
  // half-cosine release (no seam pops), and the MODEL comes back
  // PATCHED — the guider rebinds to it and the sampler's target is
  // the MASKED latent. A 'cut' call (overlap 0) and every opener
  // never mount this block: a true fresh window.
  // THE FAMILY-AGNOSTIC SEAM (fixed 2026-09-22): the gate was
  // t4_chain-only, and the dialogue stamp routes stamped windows to
  // t4r — a stamped film silently lost the continuation AND the
  // carried-head trim (two independent windows hard-concatenated:
  // the broken seam the operator caught on the proof film). The
  // continuation is latent-level (wraps the sampler's model and
  // conditioning — family-agnostic); the trim is decode-level.
  // Every film window k>=2 chains, t4r included. THE WALL: a
  // stamped window with no Continuation node is a broken seam —
  // card-gap pins it ("the stamped seam wall").
  if (isChain || isT4r) {
    const prev = p.__prev as WindowHandles | undefined
    /* v8 ignore next 1 -- the film loop stamps __iteration on every window k≥2 before the render (the seam block mounts only when it did) */
    const iteration = (p.__iteration as number) ?? 0
    /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the seam block mounts only when it did) */
    const overlap = (p.__overlap as number) ?? 0
    if (prev !== undefined && overlap > 0) {
      const cont = g.node('MiniMaxH3FiniteLatentContinuation', {
        positive: cond, target_latent: targetLatent,
        iteration, overlap_frames: overlap,
        continue_audio_latent: true,
        model: sigmaModel, sigmas: sched,
        previous_latent: prev.latOut,
      })
      cond = cont.out(0)
      targetLatent = cont.out(1)
      guider = g.node('BasicGuider', { model: cont.out(3), conditioning: cont.out(0) }).out()
    }
  }
  const sampled = g.node('SamplerCustomAdvanced', {
    noise, guider, sampler, sigmas: sched, latent_image: targetLatent,
  })
  let latOut = sampled.out(0)

  // ── THE T3 REFINE RIDER (roadmap item 2 — the crowd's third
  // tier, formalized): a short CLOSING pass over the window's
  // output latent — the refiner lora on its OWN loader (the
  // primary stack above NEVER changes), full-denoise short
  // schedule from the same noise seed, riding the doc's own
  // sampler/scheduler (the rider owns NO solver of its own — one
  // owner per knob). Mounted ONLY when the service resolved a
  // refine row; absent = the graph renders exactly as before.
  // The TaoMate refiner thread's mechanics: pass A full, pass B
  // closes. The rider sits UPSTREAM of decode AND of the film's
  // seam handles — the chained texture is the refined one.
  // THE MASTER GATE (2026-09-22): second_pass_enabled === true is
  // the only door to the whole post chain — sharpen, interp, VSR,
  // refine each AND it with their own switch (legacy docs with
  // leaves set but no master render the plain pass, byte-stable).
  const secondPassOn = p.second_pass_enabled === true
  const refine = secondPassOn ? (p.refine as { name: string, strength: number, steps: number } | undefined) : undefined
  if (refine !== undefined) {
    const refineModel = g.node('LTX_lora_loader', {
      model: sigmaModel, mode: 'minimax',
      stack_data: JSON.stringify([{ on: true, lora: refine.name, str: refine.strength, v: 1, a: 1, t: 1 }]),
      lora_ui: '',
    }).out()
    const refineSched = g.node('BasicScheduler', {
      model: refineModel, scheduler: schedName,
      steps: refine.steps, denoise: 1.0,
    }).out()
    const refineGuider = g.node('BasicGuider', { model: refineModel, conditioning: cond }).out()
    const refined = g.node('SamplerCustomAdvanced', {
      noise, guider: refineGuider, sampler: samplerSel, sigmas: refineSched, latent_image: latOut,
    })
    latOut = refined.out(0)
  }

  // ── decode + save ──────────────────────────────────────────────────
  let vdec = g.node('VAEDecode', { samples: latOut, vae: vaeVideo }).out()
  let vadec = g.node('VAEDecodeAudio', { samples: latOut, vae: vaeAudio }).out()
  // the RAW audio head is the soft seam's currency — the film's join
  // takes the incoming window's UNTRIMMED opening (it owns the seam);
  // captured BEFORE the clip finalize trims the overlap off
  let vadecRaw: OutputHandle | undefined
  // `delivered` fills at the save branches (both families save)
  let delivered: { images: OutputHandle, audio: OutputHandle } | null = null
  const rawHandles: WindowHandles = { latOut, vdec, vadec, filmImages: latOut, filmAudio: latOut }
  if (isChain || isT4r) {
    const prev = p.__prev as WindowHandles | undefined
    /* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the block mounts only when it did) */
    const overlap = (p.__overlap as number) ?? 0
    if (prev !== undefined && overlap > 0) {
      vadecRaw = vadec
      // the window's OWN clip: the carried overlap leaves picture AND
      // sound by the same duration (their finalize, hard audio trim —
      // a clip never replays the seam it grew from)
      const fin = g.node('MiniMaxH3FiniteSegmentFinalize', {
        sampled_latent: latOut, images: vdec, audio: vadec,
        iteration: 1, overlap_frames: overlap, trim_audio_head: true,
      })
      vdec = fin.out(1)
      vadec = fin.out(2)
    }
  }
  if (isT4r) {
    const created = g.node('CreateVideo', {
      images: vdec, audio: vadec, fps: fpsInput, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    // ONE WINDOW-NAMING LAW (2026-09-22, the file-tail amendment):
    // every window saves under h3_t4_w<k> — the t4r arm's legacy
    // 'video/ComfyUI' prefix died (multi-window anchored films were
    // unaddressable: every window collided on one prefix, and the
    // file tail's loader could not name them).
    const saved = g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'auto', codec: 'h264',
      'codec.encoding': 're-encode', 'codec.encoding.crf': 10.0,
    })
    rawHandles.savePassthrough = saved.out(0)
    delivered = { images: vdec, audio: vadec }
  } else {
    // sharpen leaves: only the EXPLICITLY-set ones patch the grouped
    // dict (absent leaves keep ImageSharpenKJ's own defaults). The old
    // card knob (sharpen_strength) rides the leaf loop like
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
    // ── V9 tail order (re-cut 2026-09-15, the operator's cause) ──
    // upstream moved sharpen LAST: interp → VSR → sharpen → CreateVideo
    // (V7/ours sharpened FIRST — before the upscaler could soften the
    // detail away). Sharpen rcas 0.3 after upscale "looks natural"
    // (his V9 notes). The switches stay ours; the ORDER is his.
    const film = g.node('FrameInterpolationModelLoader', {
      model_name: p.interp_model as string,
    }).out()
    const interpMultVal = p.interp_multiplier as number
    const interp = g.node('FrameInterpolate', {
      interp_model: film, images: vdec, multiplier: interpMultVal,
    }).out()
    // ONE OWNER (2026-09-20): interpolate_enabled owns the switch
    // (declared default false). The legacy interp_switch alias is
    // retired — post-declaration the walk materializes the primary,
    // so the alias arm was unreachable dead law.
    const interpSwOn = secondPassOn && (p.interpolate_enabled as boolean)
    const interpSw = g.node('ComfySwitchNode', {
      switch: interpSwOn, on_true: interp, on_false: vdec,
    }).out()
    const srRes = p.sr_resolution as number
    const sr = g.node('SeedVR2VideoUpscaler', {
      image: interpSw,
      dit: g.node('SeedVR2LoadDiTModel', {
        model: p.sr_model as string, device: 'cuda:0',
      }).out(),
      vae: g.node('SeedVR2LoadVAEModel', {
        model: 'ema_vae_fp16.safetensors', device: 'cuda:0',
      }).out(),
      seed: 42, resolution: srRes,
      max_resolution: 0, batch_size: 5, uniform_batch_size: false,
      color_correction: 'lab',
    }).out()
    const srSwOn = secondPassOn && (p.sr_switch as boolean)
    const srSw = g.node('ComfySwitchNode', {
      switch: srSwOn, on_true: sr, on_false: interpSw,
    }).out()
    // sharpen LAST (V9): the upscaler softens; rcas after it restores.
    // Renderer alias second (sharpen_* leaves above build the method).
    const sharpened = g.node('ImageSharpenKJ', { image: srSw, method }).out()
    const sharpSw = g.node('ComfySwitchNode', {
      switch: secondPassOn && (p.sharpen_enabled as boolean), on_true: sharpened, on_false: srSw,
    }).out()
    // fps compensation (V9, 2026-09-15): upstream wires
    // CreateVideo.fps = base × interp multiplier (his Enhancements:
    // PrimitiveFloat 24 → ComfyMathExpression "a * 2" → fps). Without
    // it every interp-on window plays at HALF speed — the frames
    // double, the fps doesn't. Byte-stable at defaults (interp off →
    // the served literal 24).
    const interpOn = secondPassOn && (p.interpolate_enabled as boolean)
    const interpMult = p.interp_multiplier as number
    const created = g.node('CreateVideo', {
      images: sharpSw, audio: vadec, fps: interpOn ? 24 * interpMult : 24, bit_depth: 8,
      // color_space: pin autofill "sRGB"
    })
    const saved = g.node('SaveVideo', {
      video: created.out(), filename_prefix: `h3_t4_w${k}`,
      format: 'mp4', codec: 'h264',
    })
    rawHandles.savePassthrough = saved.out(0)
    delivered = { images: sharpSw, audio: vadec }
  }

  // (every family path delivers — both arms save the window's clip;
  // no null arm: the family dispatch is exhaustive over FAMILIES.
  // The old MotionContextSaveLatent persistence died with the seam —
  // cross-run continuity is the FL2VA anchor: set the first-frame
  // square to the previous film's last frame, latent-true.)
  rawHandles.filmImages = (delivered as { images: OutputHandle, audio: OutputHandle }).images
  // THE FILM'S AUDIO SEAM CURRENCY: a carried window hands the film
  // its UNTRIMMED opening (the soft-released head owns the join);
  // every other window hands its delivered audio
  rawHandles.filmAudio = vadecRaw !== undefined
    ? vadecRaw
    : (delivered as { images: OutputHandle, audio: OutputHandle }).audio
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
    // BOARDING (resolved 2026-09-07): the card boards
    // all three families.
    // video_h3_open-cascade composing model 'h3' through this card.
    boarded: [...BOARDED],
    // THE video door (2026-09-21, operator order — video-gen
    // retired): a blind "make a video" must find THIS card first.
    tags: ['video', 'generate', 'text-to-video', 'timeline', 'edit'],
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
      // THE RAIL (the operator's law, 2026-09-20): first frame +
      // last frame + the reference buses — one shared rail; the
      // kinds are the SLOT kinds (the rail seats image/file slots,
      // never names). THE NAMING LAW rider (2026-10-09, "fix it
      // all"): the reference stacks are REAL input seats on the
      // flow — ref_images accumulates image producers
      // (image_list), ref_videos video producers (video_list),
      // ref_audios audio producers (audio_list: a music/sfx/tts
      // stage can voice the film). Before this the ports sat
      // outside the input category entirely — the picker could
      // not offer them and the lattice refused the wire. The
      // renderer's guide-image spelling (image_name) is the
      // retired alias: lattice-derivable for old graphs, offered
      // by no face.
      inputs: {
        image: 'image',
        last_frame: 'image',
        ref_images: 'image_list',
        ref_videos: 'video_list',
        ref_audios: 'audio_list',
      },
      legacyAliases: { image_name: 'image' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'SaveVideo' }],
    // ADMISSION EXTRAS (the class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file —
    // trailing-* ride verbatim, the gate matches them as prefixes).
    // + the AXIS KEYS this card's own families stamp (the h3-timeline
    // family declares Variant/Quant/Recipe groups — the axis seeding
    // writes `variant`/`quant`/`recipe` onto every fresh stage; the
    // admission covers the card's own served surface, image-gen's
    // recipe-knob law).
    admits: ['ctx_*', 'fps_seconds', 'image_name', 'k', 'motion_*', 'noise_seed', 'quant', 'recipe', 'ref_image_size', 'sla_*', 'variant'],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    // the packs the window graph rides (EXTENSION LAW) + the film
    // tail's file boundary (melite-utility-nodes: MeliteUnload +
    // MeliteConcatVideos) + the film audio (melite-audio-nodes: the
    // clips arm's post-generation MeliteFilmAudioMix; the retired
    // in-graph Delay/Mix/Duck chain needed no declaration beyond the
    // same pack).
    requires: [
      'comfyui-h3-motion-context', 'ComfyUI-PlagueKind-Nodes',
      'ComfyUI-Frame-Interpolation', 'ComfyUI-KJNodes',
      'ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-LTXVideo',
      'melite-utility-nodes', 'melite-audio-nodes',
    ],
    schema,
    // the emitter carrier (this card's schema is the hand-written
    // normalizer — params_schema walks the declared object's .dict)
    schemaCarrier: paramSchema,
    compose(p, model, g) {
      // THE LANE'S FILES, FROM THE DECL (the card-plane audit's H3):
      // the loader names live in the h3 DECL's lane_inputs; the card
      // no longer owns a second copy that no wall could see drift.
      const laneInputs = ((model as { lane_inputs?: unknown } | undefined)?.lane_inputs ?? {}) as Record<string, unknown>
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
      // interpolate_enabled transform coerces the legacy string
      // default + wire literals, the length transform drops the null
      // absent-on-wire sentinel — no gate-side prefill, the trio's
      // one-line pattern. The composer's reads below are reads of the
      // GATED doc.
      // The wire law is SHARED (coerceWireBoolean — the same
      // definition schema() uses, hour 20). NO SILENT REPAIR
      // (2026-09-20): an explicit null length used to be deleted
      // here so the walk would silently fill the default — the same
      // quiet-fix the door now refuses ('nulled-param'). The card's
      // own gate voices the same refusal: send a number or omit the
      // key, never null.
      const gateInput = coerceWireBoolean(p as Record<string, unknown>)
      if (gateInput.length === null) {
        throw new Error('length is null — send a real frame count or omit the key; the 17k+5 grid default fills natively (never null)')
      }
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
      assertOverlayGated(p, 'h3-timeline single-call lift')
      const guideImage = (p.image ?? p.image_name ?? '') as string
      if (p.variant === 't4r' && !guideImage) {
        // (refs-implied t4r windows carry no anchor — the bundle IS
        // the r2v input; the guard admits them via the refs law — the
        // legacy stanza bag AND the declared input surface (the rail's
        // fields) count; the bed rides the audio lane guideless too)
        const rbRef = (p.refs ?? {}) as Record<string, unknown>
        const refsCarry = wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length
          + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0
          || (typeof p.last_frame === 'string' && p.last_frame.trim() !== '')
        if (!refsCarry) {
          throw new Error(
            'h3_window(t4r): image-anchored window without a staged guide image — ' +
            'compose always injects LoadImage.0.image on this family')
        }
      }
      // THE FILM DISPATCH: a multi-call chain doc with no per-window
      // stanza markers (k absent — the stanza vocabulary) composes
      // the MERGED film; everything else is the frozen single-window
      // shape (served byte-identical).
      const docCalls = Array.isArray(p.calls) ? p.calls : null
      const film = docCalls !== null && (docCalls as unknown[]).length > 1
        && p.k === undefined && (p.variant === undefined || p.variant === 't4_chain')
      if (film) {
        renderH3Film(p, g, laneInputs)
      } else {
        // THE CLIPS-STITCH LAW (2026-09-21): the Music row's mix is a
        // FILM-path consumer (it rides the accumulated film audio).
        // On the frozen single-window shape it would be a silent
        // skip — the crime class this estate refuses. Loud, with the
        // fix in the message (the studio's own doc always carries
        // calls; a second short call unlocks the film path).
        const clips = (p.audio_clips ?? []) as unknown[]
        if (clips.some((c) => c !== null && typeof c === 'object'
          && typeof (c as Record<string, unknown>).src === 'string' && ((c as Record<string, unknown>).src as string).trim() !== '')) {
          throw new Error(
            'h3-timeline: audio clips ride the FILM path — this single-window doc has clips but no film to mix over ' +
            '(add a second call to author a film, or clear the Music row)',
          )
        }
        // LORA STEPS APPLIED (2026-09-18): the single-window shape
        // honors the distill bag's steps the same way (no knob layer
        // here — the entry's steps IS the user's word).
        if (Array.isArray(p.loras)) {
          const rows = p.loras as Array<Record<string, unknown>>
          const applied = rows.map((r) => r.steps).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          if (applied.length > 0) p.steps = Math.max(...applied)
        }
        renderH3Window(p, g, laneInputs)
      }
    },
    // the t4-family strip pass rides the kit (python: `if not is_t4r`).
    finalize: finalizeH3,
  }))
}
