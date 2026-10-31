// Tier 3 — the h3-timeline card.
//
// CARD SURFACE vs RENDERER VOCABULARY: the schema below declares
// the card's own fields; the window families (t4r / t4_open /
// t4_chain), the motion-context chaining rail and the SLA / SR /
// interp leaves are the RENDERER vocabulary the compose body reads,
// and those keys ride the compose door's explicit-params overlay
// (prepareCardParams — the ONE resolver: schema defaults, then the
// selected variant's stamps, then the caller's params), so every
// read normalizes with its own default.
//
// Node creation order matches the SERIALIZED id order — the id-order
// test pins the walk. Two sequences that read inverted are the
// reference's own (t4r creates the fps 24.0 PrimitiveFloat before
// the seconds 10.0 one; the reference resizer comes before the
// geometry resizer) — kept verbatim, never corrected.
//
// Autofill law: the GraphBuilder auto-fills pin defaults for omitted
// inputs exactly like the reference renderers do; the compose strips
// the t4-family leaks post-hoc (_T4_AUTOFILL_STRIP) — the strip rides
// the h3 family's own finalizeH3 (t4r strips nothing; the i2v
// dead-branch node marks the t4r family in the serialized graph).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import type { DeclaredModifierKind } from '@melite/comfyui-card-kit/params-emit'
import { DECL as h3Decl, h3DefaultLoraEntry, REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS } from '@melite/models-h3'
import { H3_LORA_ROWS } from '@melite/models-h3/mods/loras'
import type { Family } from '@melite/models-h3/schema'
import {
  FAMILIES,
  JSON_ARRAY_PARAMS,
  coerceWireBoolean,
  paramSchema,
  schema,
} from '@melite/models-h3/schema'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { finalizeH3 } from '@melite/models-h3'
import { renderH3Swap } from '@melite/models-h3'
import { renderH3Repair } from '@melite/models-h3'
import { renderH3Extend } from '@melite/models-h3'
import { renderH3Refine } from '@melite/models-h3'
import { renderH3ChainUpscale } from '@melite/models-h3'
import { reshootArmed } from '@melite/models-h3'
import { parseH3Facts } from '@melite/models-h3/actions'
import { assertOverlayGated } from '@melite/models-h3'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'

export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract'
import { deriveWindowFamily, T4_ONLY_KEYS } from '@melite/models-h3/timelineContract'
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema'

// THE CARRIER'S CALLABLE FACE — ONE cast serving the compose strict
// resolve's judge: schemastery schemas are callable (Schema.resolve)
// but carry a typed data parameter, while the card seam takes
// unknown. The full `schema()` normalizer CANNOT run here (its t4r
// admission judges stated-and-valued keys as explicit injects, and
// the merged carrier doc's walked defaults would read as injects),
// so the strict resolve walks the carrier `paramSchema` — same
// carrier the schemaCarrier registration hands the door.
const schemaFn = callableSchema(paramSchema)

// inputs the t4 family templates OMIT whose pin defaults the engine
// would auto-fill at serialization — the strip set lives with the lane, in the
// h3 family (models/h3/src/finalize.ts, re-homed family-side 2026-09-30)
// (H3_T4_STRIP; the t4r branch carries all of these explicitly, so it
// never strips).

// (No local CardDefinition augmentation: the service's schemaCarrier
// seat — Schema-typed since ledger row 23 — already carries this.)

/** The card's boarding roster: ONE family. The folded-lane variant
 *  routes (h3-fl2va, h3-ref2va, h3-keyframe, h3-timeline-ref)
 *  RETIRED with the operator's 2026-11-02 recipe rework ("1 model,
 *  1 variant, 1 quant, and 3 recipes") — the single-shot and
 *  keyframe lanes now compose through the timeline lane's own
 *  windows; old drafts naming a retired address refuse LOUD at the
 *  run door (the accepted end state). The family is the CHECKPOINT
 *  id `h3` — never a lane name; the card id `h3-timeline` (the
 *  usecase surface) keeps its own name. The id comes from the
 *  family's own DECL, and with it the lane's files. */
export const BOARDED: string[] = [h3Decl.id]

// THE VARIANT ROUTES (the TTS fold's VARIANT_ADDRESSES pattern):
// agents pick no matrix variant — the tool's closed model enum
// offers each Variant-group lane's own compose address (the krea-2
// raw-lane precedent: two lanes, one card). The folded
// single-shot/keyframe routes retired 2026-11-02 with the recipe
// rework; h3-singularity joined 2026-10-17 as the checkpoint axis.
export const VARIANT_ADDRESSES: string[] = ['h3-timeline', 'h3-singularity']

/** THE REPLACE KIND (the swap-parity build, 2026-10-28): the
 *  card-declared modifier kind carrying the upstream swap seats —
 *  ONE entry per doc (max_stack 1, ordered — a swap is one render,
 *  never a stack). The media seats arrive as staged artifact names
 *  (the controlnet clip/mask channel precedent: a pipeline-wired
 *  name, never bytes); the plan scalars mirror the reference
 *  H3OneClickSwapPlan operating point (clip_seconds 6, overlap 39,
 *  steps 6, seed 0, resolution 736p — the reference's own values,
 *  restated here so the skill binds against this declaration, never
 *  memory). THE PACKS ride the kind's own `requires` (the mask SAM2
 *  law: declared, then auto provisioned) — presence-gated at the
 *  compose door's arm gate, so an unused arm never blocks a film
 *  run, while the card-level `requires` above stays the always-on
 *  gate for the film's own packs. Served VERBATIM on the modifiers
 *  channel; the emission seat is the family's renderH3Swap (the
 *  card branches there on a non-empty bag — the film action is
 *  never entered with swap seats present). */
/** THE LoRA KIND (F29, 2026-10-30): the family's acceleration /
 *  camera adapters ARE a served mod — the bag reaches every graph
 *  (proved live: a strength patch moved the distill seat 0.6 → 1),
 *  but the card declared no kind for it, so the studio rendered NO
 *  seat and the operator could not see or change the LoRAs at all.
 *  The kind serves the family's own catalog rows (id + strength);
 *  the render-side marriage (steps / shift_video / default
 *  strength) still owns the values an entry leaves unstated. A
 *  multi-row arm is the stacked lane (distill + camera), which is
 *  what the official re-shoot chain rides. */
const LORAS_MOD: DeclaredModifierKind = {
  kind: 'loras',
  label: 'LoRAs',
  param_key: 'loras',
  schema_key: 'loras',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 4,
  // THE GHOST DEFAULT (F34's chip half, 2026-11-13): the family's own
  // absent-bag resolution, served as a resolved row — the compose door
  // rides exactly this row when the bag is absent, so the face shows
  // ONE chip for it. An explicit empty bag ([]) is the operator's
  // "off" and renders nothing.
  default_entry: h3DefaultLoraEntry(),
  section: 'LoRAs — the family adapters this film stacks on its model seat (the acceleration/distill row and the CrossView camera row). Every entry states the catalog id and the strength; unstated steps and sigma shift marry from the catalog row. Film runs leave this arm empty (the card default row still applies).',
  fields: [
    { name: 'id', label: 'LoRA', type: 'select', default: 'h3_lightx2v_turbo', options: H3_LORA_ROWS.map((row) => ({ value: row.id, label: row.label })), tooltip: 'The adapter, by its catalog id — the family file the provisioner downloads; the render loads this id verbatim.' },
    { name: 'strength', label: 'Strength', type: 'number', default: 0.6, min: 0, max: 2, step: 0.05, tooltip: 'Adapter weight. Each row has a designed point (the distill rows run 0.6–1, the refiner 0.35); the render only reads the number you state.' },
    { name: 'steps', label: 'Steps', type: 'number', default: 0, min: 0, max: 50, step: 1, tooltip: 'The step count to marry (0 = the catalog row\'s designed count — a distill adapter is married to its steps, never free).' },
  ],
}

const REPLACE_MOD: DeclaredModifierKind = {
  kind: 'replace',
  label: 'Replace',
  param_key: 'replace',
  schema_key: 'replace',
  // THE MENU ATTRIBUTION (the mod-liveness ARM 3 law, 2026-10-28):
  // the kind stamps its own name as its catalog — the card IS the
  // catalog (no pack envelope derives it). Served verbatim.
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  requires: [
    'comfyui-h3-oneclick-swap',
    'ComfyUI-MiniMaxH3-Context-Loop',
    'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
  ],
  section: 'Swap — replace the person in the source clip (upstream openjutsu recipe: still + mannequin + mask masked-edit). Film runs leave this arm empty.',
  fields: [
    // The seat TYPES are the picker law (operator, live lane
    // 2026-10-28: "media seats as FREEFORM TEXT when NOT ALL SHOULD
    // BE"): image seats claim the image square; video seats are
    // `file` + media 'video' (the video library + the video OS
    // accept); resolution is a select over the plan's own tiers.
    { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The source video whose person is replaced. Binds ONE staged leaf: the VHS slice loader + the core LoadVideo both read it by staged name, and the timeline reads it back off the native VIDEO wire (friction-report #4 — its video_path string rides along staged but unread).' },
    { name: 'still', label: 'Replacement still', type: 'image', default: '', tooltip: 'The replacement still (the R2V ref_images LoadImage + the plan picture_1).' },
    { name: 'mannequin', label: 'Mannequin video', type: 'file', media: 'video', default: '', tooltip: 'The mannequin video from the track-card run (the R2V ref_videos H3GreyMannequins output).' },
    { name: 'mask', label: 'Person mask', type: 'image', default: '', tooltip: 'ONE staged PNG (no per-frame mask sequence is wired): bind a single representative from the track-card run — the pixel-max UNION of its grown per-frame masks is recommended. Per-frame motion rides the mannequin video (reference GrowMaskWithBlur expand 40). A folder path never rides this seat — bind one file.' },
    { name: 'swap_prompt', label: 'Swap prompt', type: 'text', default: '', tooltip: 'The swap action text — agent-composed, user-confirmed. It feeds the reference-to-video prompt seat DIRECTLY: the swap composes no in-graph prompter (no LLM/describer node ever rewrites your words).' },
    { name: 'keep_audio', label: 'Keep source audio', type: 'boolean', default: true, tooltip: 'ON: the source clip\'s audio rides the swap unchanged (the reference posture — preserve source audio, assemble from source). OFF: the soundtrack is generated fresh with the swap (generate all audio, assemble generated).' },
    { name: 'roles', label: 'Roles', type: 'text', default: '', tooltip: 'Which person to replace (the plan roles seat; empty = the detected lead).' },
    { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
    { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
    { name: 'clip_seconds', label: 'Clip seconds', type: 'number', default: 6, min: 2.5, max: 15, step: 0.1, tooltip: 'The plan clip_seconds (reference 6) — the plan node\'s own widget band [2.5, 15] is the law; anything else 400s at submit.' },
    { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 22, max: 56, step: 17, tooltip: 'The plan overlap_frames (reference 39; the R1 single clip carries it through the plan head) — the engine combo is exactly [22, 39, 56] (step 17 from 22).' },
    { name: 'resolution', label: 'Plan resolution', type: 'select', default: '736p', options: [
      { value: '480p', label: '480p — quick preview' },
      { value: '576p', label: '576p' },
      { value: '736p', label: '736p — reference default' },
      { value: '768p', label: '768p' },
      { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
    ], tooltip: "The plan resolution tier (reference '736p')." },
  ],
}

/** THE REPAIR KIND (Tier A, operator order 2026-11-12: "Okay do it
 *  all" — hands, maybe the body): a masked SECOND pass over a region
 *  of the source clip. ONE entry per doc (max_stack 1). The region
 *  is a FREE-TEXT SAM3 detection prompt — "hands", "a person", "a
 *  face" are param VALUES (the region-agnostic law: no
 *  card-per-region, ever). The mask is composed INLINE from engine
 *  core nodes (SAM3_VideoTrack + SAM3_TrackToMask over the window
 *  frames — per-frame, better than the swap's staged single-PNG
 *  union), so no mask seat and no track-card handoff exists on this
 *  arm. The pass re-renders ONLY the masked region at partial
 *  denoise (default 0.32; >= 1 refuses loud at the compose door —
 *  the refine window law, actions.ts's refine arm the precedent):
 *  the source clip rides its own reference seat as the identity
 *  anchor. Zero new pixel positions — small-in-frame hands cannot
 *  gain detail here (that is crop-scale Tier B, blocked on the
 *  unvendored producer). Audio is the source's own, always. The
 *  packs ride the kind's `requires` (presence-gated: an unused arm
 *  never blocks a film run). Emission seat: the family's
 *  renderH3Repair — the same chain spine + lora plane the swap
 *  rides, ending in MiniMaxH3ChainAssemble. */
const REPAIR_MOD: DeclaredModifierKind = {
  kind: 'repair',
  label: 'Repair',
  param_key: 'repair',
  schema_key: 'repair',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  requires: [
    'ComfyUI-VideoHelperSuite',
    'ComfyUI-MiniMaxH3-Context-Loop',
    'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
    'ComfyUI-KJNodes',
    'comfyui-h3-oneclick-swap',
  ],
  section: 'Repair — re-render a region of the source clip (hands, body, face) with a per-frame SAM3 mask at partial denoise. The rest of the frame and the audio are held. Film runs leave this arm empty. ONE WINDOW PER DOC: a longer film is one press per window at the 68 f step, each repaired window replacing its own slot — this arm emits a window, never a re-assembled film.',
  fields: [
    // The seat TYPES (the picker law, the replace arm's own): video
    // seats are `file` + media 'video'; the two prompt seats are
    // text (agent-composed, user-confirmed).
    { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip whose region is repaired. Binds ONE staged leaf: the VHS window loader + the core LoadVideo both read it by staged name, and the timeline reads it back off the native VIDEO wire.' },
    { name: 'repair_prompt', label: 'Repair prompt', type: 'text', default: '', tooltip: 'The repair action text — what the masked region should become (agent-composed, user-confirmed; rides the reference-video prompt seat).' },
    { name: 'region_prompt', label: 'Region prompt', type: 'text', default: '', tooltip: 'The free-text SAM3 detection target naming the region — "hands", "a person", "a face". The mask tracks every matching object frame by frame and grows by mask_grow px.' },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the masked pass (the refine window is 0.30–0.35; lower = subtler). 1 or more is refused — a repair is a refine, never a re-render.' },
    { name: 'mask_grow', label: 'Mask grow px', type: 'number', default: 16, min: 0, max: 96, step: 1, tooltip: 'Pixels the tracked mask grows before the edit (seam ring protection; 0 repairs exactly the detected region — the grow-0 seam test).' },
    { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01, tooltip: 'The SAM3 text-detection score threshold (lower finds more objects, noisier masks).' },
    { name: 'window_start', label: 'Window start (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, tooltip: 'Frames (at the film clock, 24 fps) to skip before the repair window — 0 starts at the clip head.' },
    { name: 'window_length', label: 'Window length (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, tooltip: 'Frames in the repair window — 0 runs to the end of the clip (the whole-clip posture). A stated length must land on the engine grid 22+17k (56, 73, 90, 107, 124, 141…; off-grid refuses naming the nearest legal value) because the plan snap and the tracked mask must cut the same frames. clip_seconds still caps the render budget.' },
    { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
    { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
    { name: 'clip_seconds', label: 'Clip seconds', type: 'number', default: 6, min: 2.5, max: 15, step: 0.1, tooltip: 'The plan clip_seconds (reference 6) — the render budget the window is cut within; the plan node\'s own widget band [2.5, 15] is the law.' },
    { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 22, max: 56, step: 17, tooltip: 'The plan overlap_frames (reference 39) — the engine combo is exactly [22, 39, 56].' },
    { name: 'resolution', label: 'Plan resolution', type: 'select', default: '736p', options: [
      { value: '480p', label: '480p — quick preview' },
      { value: '576p', label: '576p' },
      { value: '736p', label: '736p — reference default' },
      { value: '768p', label: '768p' },
      { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
    ], tooltip: "The plan resolution tier (reference '736p')." },
  ],
}

/** THE EXTEND KIND (the extend-video flow's arm, report
 *  dev_docs/audits/features/extend-video-flow-2026-11-12.md): MORE
 *  SECONDS appended to a prior clip — a fresh continuation anchored
 *  on the prior clip's last frame (taken in-graph, negative batch
 *  index), rendered at FULL denoise under an all-white mask (new
 *  content, nothing held — the repair's opposite pole), joined to
 *  the prior by the film tail's own file law (both parts save at
 *  SaveVideo prefixes; MeliteConcatVideos decodes them back
 *  strictly after every save). ONE entry per doc (max_stack 1).
 *  Emission seat: the family's renderH3Extend — the same chain
 *  spine + lora plane the swap and repair ride, ending in the
 *  joined-film SaveVideo. */
const EXTEND_MOD: DeclaredModifierKind = {
  kind: 'extend',
  label: 'Extend',
  param_key: 'extend',
  schema_key: 'extend',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  requires: [
    'ComfyUI-VideoHelperSuite',
    'ComfyUI-MiniMaxH3-Context-Loop',
    'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
    'comfyui-h3-oneclick-swap',
    'melite-utility-nodes',
  ],
  section: 'Extend — append fresh seconds to a prior clip (a continuation anchored on its last frame, full denoise, joined into one film). The extension generates new motion and sound; the prior is never re-edited. Film runs leave this arm empty.',
  fields: [
    // The seat TYPES (the picker law, the replace arm's own): video
    // seats are `file` + media 'video'; the prompt seat is text
    // (agent-composed, user-confirmed).
    { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip whose seconds are extended. Binds ONE staged leaf: the VHS loader + the core LoadVideo both read it by staged name, and the timeline reads it back off the native VIDEO wire.' },
    { name: 'extend_prompt', label: 'Extend prompt', type: 'text', default: '', tooltip: 'The continuation text — MOTION and SOUND for the appended seconds, picking up exactly where the clip ends (agent-composed, user-confirmed; rides the reference-video prompt seat).' },
    { name: 'extend_seconds', label: 'Extend seconds', type: 'number', default: 2.33, min: 0.92, max: 432.29, step: 0.01, tooltip: 'Seconds appended — must add up exactly: a single window lands on the engine grid at 24fps (22+17k frames, refuse loud otherwise; landable: 2.33s = 56f, 3.75s = 90f, 5.17s = 124f, 15.08s = 362f — the largest single window); above 362f the door joins N uniform 22+17k windows under the 39f context overlap, exact delivery or a refusal naming the neighbors (ceiling 32 windows = 432.29s).' },
    { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
    { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
    { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 22, max: 56, step: 17, tooltip: 'The plan overlap_frames (reference 39; in-run-only — the join itself is the film tail file law). The multi-window composition law carries exactly 39: a multi-window extend under another value refuses loud (every law-home pins 39).' },
    { name: 'resolution', label: 'Plan resolution', type: 'select', default: '736p', options: [
      { value: '480p', label: '480p — quick preview' },
      { value: '576p', label: '576p' },
      { value: '736p', label: '736p — reference default' },
      { value: '768p', label: '768p' },
      { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
    ], tooltip: "The plan resolution tier (reference '736p')." },
  ],
}

/** THE REFINE KIND (the fifth mod bag): a standalone SECOND pass
 *  over a staged source clip — the H3 latent-upscale refine chain's
 *  minimal emission (models/h3 renderH3Refine). The report-named
 *  second-pass stack (MinimaxH3LatentUpscaler3D, the RefineHandoff
 *  with its sampler/sigmas seats, the ChainUpscale loop family,
 *  SeedVR2 3B, the LTX 2.3 upscalers) exists engine-side with no
 *  card surface; this arm is the first door: the handoff node (2x
 *  learned upscale + the low-sigma refinement pass, one node) over
 *  the clip's own frames + soundtrack. ONE entry per doc
 *  (max_stack 1). ONE variant path: scale 2.0, lock_audio, bf16 —
 *  the entry carries only the refine seats (source_clip,
 *  refine_prompt, denoise, steps, seed, clip_seconds); the model
 *  plane stays family-owned. The deferred ChainUpscale LOOP (prior-
 *  run lineage, recursive expand, no estate requeue driver) is the
 *  named follow-up, never this arm. Emission ends in the refine
 *  SaveVideo (the extend terminal's own file law — no
 *  ChainAssemble: a refine has no loop lineage to assemble). */
const REFINE_MOD: DeclaredModifierKind = {
  kind: 'refine',
  label: 'Refine',
  param_key: 'refine',
  schema_key: 'refine',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  requires: [
    'ComfyUI-VideoHelperSuite',
    'ComfyUI-KJNodes',
    'ComfyUI-MiniMaxH3Mod',
    'Comfyui_Minimax_h3_latent_Upscaler-Plus',
    'melite-utility-nodes',
  ],
  // THE MEASURED NUMBERS ARE DERIVED (refine-window audit D1): the
  // window the ceiling allows is REFINE_DEFAULT_CLIP_SECONDS at the
  // film clock, and the OOM point is REFINE_2X_OOM_FRAMES — both
  // imported from the model package that owns the refusal, so a
  // ceiling move can never leave the served card lying about it.
  section: `Refine — a standalone second pass over ONE WINDOW of a source clip: 2x learned latent upscale + the low-sigma H3 refinement pass in one node (the film handoff's own spelling), decoded and saved as one film. The window is what the 2x memory ceiling allows (${String(REFINE_DEFAULT_CLIP_SECONDS * 24)} f measured green, ${String(REFINE_2X_OOM_FRAMES)} f OOM) — a longer film is refined window by window, each run moving Start seconds forward. The soundtrack is the window's own, always. Film runs leave this arm empty.`,
  fields: [
    // The seat TYPES (the picker law, the siblings' own): the video
    // seat is `file` + media 'video'; the prompt seat is text
    // (agent-composed, user-confirmed); the dials are numbers.
    { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip whose frames the second pass refines. Binds ONE staged leaf: the VHS loader reads it by staged name at the film clock, and the encode seats read its frames + soundtrack.' },
    { name: 'refine_prompt', label: 'Refine prompt', type: 'text', default: '', tooltip: 'The refine text — what the upscaled frames should hold (agent-composed, user-confirmed; rides the CLIPTextEncode positive seat — the node refuses without model + positive). THE PROMPT IS THE ONLY STYLE LEVER: nothing from the source prompt, seed or schedule carries, so restate the source\'s own look (the medium and the identity anchors) beside the quality asks — a generic quality-only prompt silently restyles the shot. This door RESTYLES decoded pixels and carries no lineage — a saved clip has no latent left, so a true context-carrying second pass is the chain 2-pass door, never this one.' },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the refinement pass (the refine window is 0.30–0.35; lower = subtler). 1 or more is refused — a refine is never a re-render (the handoff\'s sigmas law: 0 <= sigmas[0] < 1).' },
    { name: 'steps', label: 'Refine steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The refinement schedule steps (the low-sigma second pass; the sampler steps stay the doc marriage).' },
    { name: 'seed', label: 'Refine seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The refinement noise seed (0 runs the reference posture).' },
    // (the numbers are DERIVED from the model package's exported
    // constants — refine-window audit D1: the served card must never
    // carry a hand-typed copy of a measured ceiling)
    { name: 'clip_seconds', label: 'Window seconds', type: 'number', default: REFINE_DEFAULT_CLIP_SECONDS, min: 0.5, max: 60, step: 0.25, tooltip: `How much of the clip this pass refines, from the window start: ${String(REFINE_DEFAULT_CLIP_SECONDS)} s = ${String(REFINE_DEFAULT_CLIP_SECONDS * 24)} f at 24 fps, the widest window measured green at 2x (2688×1536). The pass reads only this window, so a long film is covered by advancing Start seconds — and any upsizing window past ${(REFINE_2X_OOM_FRAMES / 24).toFixed(2)} s (${String(REFINE_2X_OOM_FRAMES)} f) is refused: that is where the measured OOM sits (the ceiling is the window's; only a same-size 1x pass reads wider). A window must also START inside the clip: a Start past the last frame yields no frames, and a window longer than what remains is quietly shortened.` },
    { name: 'start_seconds', label: 'Start seconds', type: 'number', default: 0, min: 0, max: 3600, step: 0.25, tooltip: 'Where this window starts in the source clip (0 = the first frame). Each run refines one window; step it by your window seconds (minus a second or two of overlap) to walk a longer film, re-running the same entry with only this seat moved. The last window starts at (clip length − window length): a start past the final frame lands no frames and the engine refuses.' },
    // THE CAPACITY SEATS (the F24 burn, 2026-10-30): the 2x handoff
    // OOMs past the measured 141 f, and the node itself serves an
    // exact-size mode — a ≤1x pass fits. Both seats ride the node's
    // own declared domain (mode enum, scale [1, 4]); the default is
    // the shipped 2x so every existing doc composes byte-identically.
    { name: 'mode', label: 'Upscale mode', type: 'select', default: 'scale by multiplier', options: [
      { value: 'scale by multiplier', label: 'Scale by multiplier (the shipped 2x)' },
      { value: 'target dimensions', label: 'Target dimensions (1280x704)' },
      { value: 'megapixels', label: 'Megapixels (the node\'s own budget)' },
    ], tooltip: 'How the handoff sizes the pass: a multiplier (default 2x), exact target width/height (1280x704), or a megapixel budget. The node\'s own options, verbatim.' },
    { name: 'scale', label: 'Upscale scale', type: 'number', default: 2, min: 1, max: 4, step: 0.05, tooltip: 'The multiplier mode\'s scale. 1.0 is the capacity cure — a same-size refine (no latent upscale) fits clips the 2x pass OOMs; the refinement pass still runs.' },
  ],
}

/** THE RESHOOT KIND (the fourth mod bag — the §8 unification,
 * 2026-11-12): re-render the same scene from a NEW camera. The
 * commission the flat knob group could never state: one bag entry
 * (max_stack 1) carrying the source clip + the camera dials, the
 * same admission plane as its three siblings (replace/repair/
 * extend), the same one-door law. Emission stays the film-window
 * AUGMENTATION it always was (the depth-warp chain patches every
 * window's model pre-scheduler — applyH3Reshoot is a model-patch
 * seat, not a masked-edit body; forcing the chain spine would be
 * the wrong body class); the film's own SaveVideo is its terminal.
 * The soundtrack difference rides (the reshoot clip's audio never
 * carries — the generation's own sound). */
const RESHOOT_MOD: DeclaredModifierKind = {
  kind: 'reshoot',
  label: 'Reshoot',
  param_key: 'reshoot',
  schema_key: 'reshoot',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  // THE OFFICIAL REWORK (2026-11-13): the pack provision is the
  // CrossViewWarp pack ONLY — the chain's other nodes are engine
  // core (LoadVideo, LoadMoGeModel/MoGeInference, the MiniMaxH3
  // trio, LoraLoaderModelOnly). The retired VDA depth chain
  // (ComfyUI-Video-Depth-Anything, never provisioned), the Fun
  // ControlNet apply seat (ComfyUI-MiniMaxH3Mod) and the KJNodes
  // ColorToMask died with the rework.
  requires: [
    'ComfyUI-CrossViewWarp',
  ],
  section: 'Reshoot — re-render the same scene from a new camera on the official comfy-reshoot chain (Comfy-Org\'s reference app): MoGe metric depth reprojects the scene under the moved camera, the warp guides H3 through its native reference+guide seats, and the CrossView LoRA (trigger `crossview`) makes the model follow the view. The reshoot clip\'s own soundtrack never carries. Film runs leave this arm empty.',
  fields: [
    // The seat TYPES (the picker law, the siblings' own): the video
    // seat is `file` + media 'video'; the dials are numbers.
    { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip whose scene the new camera views. Binds ONE staged leaf (the engine\'s core video loader reads it by staged name, hands the WHOLE video to the clip-prepare node — the official chain\'s own loader posture). Its frames rebuild the scene; its soundtrack does not carry over.' },
    { name: 'orbit', label: 'Orbit', type: 'number', default: -30, min: -180, max: 180, step: 1, tooltip: 'Orbit the camera left/right around the subject, in degrees. Negative orbits left, positive right. The official comfy-reshoot app opens at -30°; ±45° is the tested range and past 90° the hidden side is invented. A near-zero pose (|orbit| and |tilt| both under 5°) is refused before the engine runs: the CrossView pack documents that warp as the one its LoRA misbehaves on.' },
    { name: 'tilt', label: 'Tilt', type: 'number', default: 20, min: -90, max: 90, step: 1, tooltip: 'Raise or lower the camera, in degrees. Positive looks down from above the subject, negative looks up from below. The official comfy-reshoot app opens at +20°. Looking up is the weak direction — keep above about -20°.' },
    { name: 'dolly', label: 'Dolly', type: 'number', default: 1, min: 0.1, max: 3, step: 0.05, tooltip: 'Camera distance where 1.0 keeps the source distance. Below 1 dollies in; above 1 pulls back — pulling back reveals area the source never framed, so more of the shot is invented.' },
    { name: 'zoom', label: 'Zoom (lens FOV)', type: 'number', default: 50, min: 20, max: 120, step: 1, tooltip: 'The lens field of view in degrees (50 is a normal lens): smaller = zoomed in and tighter, larger = wider. Change it when the clip is clearly wide-angle or telephoto.' },
    { name: 'pan', label: 'Pan (framing shift)', type: 'number', default: 0, min: -1, max: 1, step: 0.02, tooltip: 'Framing shift as a fraction of frame height. Positive moves the picture down (framing up) and rescues a clipped head — the camera does not move, so the parallax is unchanged.' },
    { name: 'strength', label: 'CrossView LoRA strength', type: 'number', default: 0.8, min: 0.8, max: 1, step: 0.05, tooltip: 'The CrossView LoRA\'s strength on the model — the official tested band is 0.8–1.0 and the field admits NOTHING below it (0.8 is the reference app\'s own setting; push toward 1.0 when the shot ignores the camera move). Under 0.8 the warp is followed less and the model\'s own prior rebuilds the frame — the F33 style drift (qa8 GAPS-18: a 0.7 press turned a 3D-game look anime); the floor IS the band\'s floor.' },
    { name: 'depth_ratio', label: 'Scene depth', type: 'number', default: 6, min: 1.5, max: 1000, step: 0.5, tooltip: 'How deep the scene is (far/near ratio). 2.5–4 for close-up faces, 4–8 for mid shots, 8–16 for deep or wide scenes.' },
    { name: 'smooth_depth', label: 'Smooth depth', type: 'boolean', default: false, tooltip: 'Smooth the depth edges before warping. Turn on when the re-shot frames show speckle holes — trades a little sharpness for cleaner hole edges.' },
    { name: 'invert_depth', label: 'Invert depth', type: 'boolean', default: false, tooltip: 'Flip the depth polarity (near ↔ far). Leave off; turn on only if the re-shot renders inside-out — background moving like foreground, or the subject caving in.' },
  ],
}

/** THE UPSCALE KIND (the sixth mod bag — the F19 deferred loop,
 * 2026-11-12): a whole-film 2x second pass over a PRIOR chain run.
 *  The commission the refine arm could never state: the loop roots at
 *  the run's checkpointed lineage (CheckpointManager-verified, scene
 *  by scene through the upstream Upscale family), not a staged clip.
 *  The bag names the run; the per-scene revisions resolve at the
 *  execute door against the engine's own chain store (the vendored
 *  listing route — a miss refuses loud naming the live runs). ONE
 *  entry per doc (max_stack 1), the same admission plane and
 *  one-door law as its five siblings. Emission ends in
 *  ChainAssemble at <runId>/upscale (the estate's film law). */
const UPSCALE_MOD: DeclaredModifierKind = {
  kind: 'upscale',
  label: 'Upscale',
  param_key: 'upscale',
  schema_key: 'upscale',
  category: 'ordered',
  cardinality: 'list',
  max_stack: 1,
  requires: [
    'ComfyUI-MiniMaxH3-Context-Loop',
    'Comfyui_Minimax_h3_latent_Upscaler-Plus',
    'melite-utility-nodes',
  ],
  section: 'Upscale — a whole-film deferred 2x pass over a prior chain run (swap/repair/extend/refine runs leave their checkpointed scenes in the engine\'s chain store): each scene resumes its lineage, upscales through the learned 3D latent upscaler, and re-renders at low denoise; the pass assembles at <runId>/upscale. Name the run; a blank prompt reuses its own scene prompts. Film runs leave this arm empty.',
  fields: [
    // The seat TYPES (the picker law, the siblings' own): the run
    // name is freeform text (an engine-side store directory, not a
    // staged file); the prompt seat is text; the dials are numbers.
    { name: 'chain_run', label: 'Chain run', type: 'text', default: '', tooltip: 'The prior chain run to resume (the engine-side h3_chains run name — a swap/repair/extend run\'s own name, as the film\'s run rows spell it). Each scene\'s newest checkpoint revision is resolved at the execute door; an unknown name refuses loud naming the live runs.' },
    { name: 'prompt', label: 'Pass-2 prompt', type: 'text', default: '', tooltip: 'What the upscaled frames should hold (agent-composed, user-confirmed). Blank reuses the source run\'s own per-scene prompts — the documented posture for a pure resolution pass.' },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.24, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the pass-2 re-render (the recipe\'s own window is 0.24; lower = subtler). 1 or more is refused — an upscale is never a re-render (that is a reshoot, and the reshoot door exists).' },
    { name: 'steps', label: 'Pass-2 steps', type: 'number', default: 20, min: 1, max: 30, step: 1, tooltip: 'The pass-2 schedule steps (the recipe runs 20; the sampler stays res_multistep, the loop family\'s own spelling).' },
    { name: 'segment_crf', label: 'Segment CRF', type: 'number', default: 18, min: 0, max: 51, step: 1, tooltip: 'The H.264 quality of the persisted HQ scene segments (the adapter\'s own seat; 18 is its default).' },
  ],
}

/** THE FAMILY ACTION BINDING (the atom vocabulary's video stroke):
 *  the h3 family's declared film action composes the whole lane-true
 *  segment from the gated, lifted doc this card's plane produced —
 *  resolved off the DECL at boarding (the interlock: an unbound
 *  family refuses loud, never a legacy fallback). THE REPLACE BRANCH
 *  (the swap-parity build): a non-empty replace bag never enters the
 *  film action — it dispatches to the family's swap seat, which
 *  renders the masked-edit chain (models/h3 renderH3Swap, ending in MiniMaxH3ChainAssemble). A bag
 *  under an ARMED RESHOOT refuses loud at this door (one door per
 *  doc — the swap branch returns before the film action, so a
 *  reshoot under it would be silently dropped). The film path below
 *  is byte-identical with the arm empty (the suite pins it — a swap
 *  seat must never reshape a film graph). */
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [h3Decl.id]: (p, model, g, runId) => {
    // An ABSENT or EMPTY bag is the unused arm — the film below, byte-stable.
    // A PRESENT bag must be exactly one entry (max_stack 1) — an
    // absent bag is the unused arm, an EMPTY bag is the explicit
    // "off" override and stays legal. Anything else refuses loud
    // here, ahead of the engine: a non-array, a null, and — the
    // silent-drop class the one-door law kills — TWO entries, where
    // the bag reader would quietly take the first.
    const oneEntryBag = (key: string, bag: unknown, noun: string): void => {
      if (bag === undefined) return
      if (!Array.isArray(bag)) {
        throw new Error(`h3-timeline ${key}: the ${key} bag is present but carries no entry — state exactly one ${noun} entry (max_stack 1) or omit the arm`)
      }
      if (bag.length > 1) {
        throw new Error(`h3-timeline ${key}: the ${key} bag carries ${bag.length} entries — max_stack is 1, so every entry after the first would be silently dropped. Keep exactly one ${noun} entry.`)
      }
    }
    const raw = p.replace as Array<Record<string, unknown>> | undefined
    const rep = p.repair as Array<Record<string, unknown>> | undefined
    const ext = p.extend as Array<Record<string, unknown>> | undefined
    // THE REFINE BAG (the fifth arm) rides the same guard.
    const ref = p.refine as Array<Record<string, unknown>> | undefined
    // THE RESHOOT BAG (the fourth arm, §8) rides the same guard.
    const rsh = p.reshoot as Array<Record<string, unknown>> | undefined
    // THE UPSCALE BAG (the sixth arm, F19) rides the same guard.
    const ups = p.upscale as Array<Record<string, unknown>> | undefined
    oneEntryBag('replace', raw, 'swap')
    oneEntryBag('repair', rep, 'repair')
    oneEntryBag('extend', ext, 'extend')
    oneEntryBag('refine', ref, 'refine')
    oneEntryBag('reshoot', rsh, 'reshoot')
    oneEntryBag('upscale', ups, 'upscale')
    const replaceArmed = Array.isArray(raw) && raw.length > 0
    const repairArmed = Array.isArray(rep) && rep.length > 0
    const extendArmed = Array.isArray(ext) && ext.length > 0
    // THE REFINE CHECK (the fifth arm) rides the same aliased
    // boolean as its siblings — the alias narrows `ref` for the
    // branch below (the imported refineArmed(p) predicate states
    // the same truth for outside callers; inside compose the
    // sibling pattern is what the compiler narrows).
    // THE REPLACE↔REPAIR REFUSAL (the one-door-per-doc law's second
    // edge, 2026-11-12): both arms render through the same chain
    // spine and the same sampler tail — two armed bags would race
    // for one emission. Refuse loud, never a quiet first-wins.
    if (replaceArmed && repairArmed) {
      throw new Error('h3-timeline: Replace and Repair are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Replace arm for a repair, or the Repair arm for a swap.')
    }
    // THE EXTEND PAIRWISE REFUSALS (the one-door law's third edge —
    // each pair its own firing arm, the split-brain lesson): extend
    // rides the same chain spine, so it races replace and repair
    // the same way, and its branch also returns before the film
    // action, so an armed reshoot under it would be silently
    // dropped.
    if (replaceArmed && extendArmed) {
      throw new Error('h3-timeline: Replace and Extend are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Replace arm for an extension, or the Extend arm for a swap.')
    }
    if (repairArmed && extendArmed) {
      throw new Error('h3-timeline: Repair and Extend are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Repair arm for an extension, or the Extend arm for a repair.')
    }
    const refineBagArmed = Array.isArray(ref) && ref.length > 0
    // THE REFINE PAIRWISE REFUSALS (the one-door law's fourth edge —
    // each pair its own firing arm, the split-brain lesson): the
    // refine branch returns before the film action, so it races the
    // three edit arms the same way, and an armed reshoot under it
    // would be silently dropped.
    if (replaceArmed && refineBagArmed) {
      throw new Error('h3-timeline: Replace and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Replace arm for a refine, or the Refine arm for a swap.')
    }
    if (repairArmed && refineBagArmed) {
      throw new Error('h3-timeline: Repair and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Repair arm for a refine, or the Refine arm for a repair.')
    }
    if (extendArmed && refineBagArmed) {
      throw new Error('h3-timeline: Extend and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Extend arm for a refine, or the Refine arm for an extension.')
    }
    const upscaleBagArmed = Array.isArray(ups) && ups.length > 0
    // THE UPSCALE PAIRWISE REFUSALS (the one-door law's fifth edge —
    // each pair its own firing arm, the split-brain lesson): the
    // upscale branch also returns before the film action, so it races
    // the three edit arms and refine the same way, and an armed
    // reshoot under it would be silently dropped.
    if (replaceArmed && upscaleBagArmed) {
      throw new Error('h3-timeline: Replace and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Replace arm for an upscale, or the Upscale arm for a swap.')
    }
    if (repairArmed && upscaleBagArmed) {
      throw new Error('h3-timeline: Repair and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Repair arm for an upscale, or the Upscale arm for a repair.')
    }
    if (extendArmed && upscaleBagArmed) {
      throw new Error('h3-timeline: Extend and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Extend arm for an upscale, or the Upscale arm for an extension.')
    }
    if (refineBagArmed && upscaleBagArmed) {
      throw new Error('h3-timeline: Refine and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Refine arm for an upscale, or the Upscale arm for a refine (an upscale needs a prior chain run; a refine needs a staged clip).')
    }
    if (replaceArmed) {
      // THE MUTUAL REFUSAL (operator, live lane 2026-10-28: "IS
      // RESHOOT SUPPOSED TO BE IN THE CARD ITSELF OR JUST IN THE
      // MODS, THEY WILL CONFLICT"): this branch returns before the
      // film action, so an armed reshoot under a swap would be
      // silently dropped. One door per doc — refuse loud, never a
      // quiet half-run.
      if (reshootArmed(p)) {
        throw new Error('h3-timeline: Replace and Reshoot are both armed — the swap branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Replace arm for a reshoot, or empty the Reshoot arm for a swap.')
      }
      renderH3Swap(raw[0] as Record<string, unknown>, p, parseH3Facts(model.lane_inputs), g, runId)
      return
    }
    if (repairArmed) {
      // The same reshoot refusal, mirrored (the repair branch also
      // returns before the film action).
      if (reshootArmed(p)) {
        throw new Error('h3-timeline: Repair and Reshoot are both armed — the repair branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Repair arm for a reshoot, or empty the Reshoot arm for a repair.')
      }
      renderH3Repair(rep[0] as Record<string, unknown>, p, parseH3Facts(model.lane_inputs), g, runId)
      return
    }
    if (extendArmed) {
      // The same reshoot refusal, third edge (the extend branch also
      // returns before the film action).
      if (reshootArmed(p)) {
        throw new Error('h3-timeline: Extend and Reshoot are both armed — the extend branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Extend arm for a reshoot, or empty the Reshoot arm for an extension.')
      }
      renderH3Extend(ext[0] as Record<string, unknown>, p, parseH3Facts(model.lane_inputs), g, runId)
      return
    }
    if (refineBagArmed) {
      // The same reshoot refusal, fourth edge (the refine branch also
      // returns before the film action).
      if (reshootArmed(p)) {
        throw new Error('h3-timeline: Refine and Reshoot are both armed — the refine branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Refine arm for a reshoot, or empty the Reshoot arm for a refine.')
      }
      renderH3Refine(ref[0] as Record<string, unknown>, p, parseH3Facts(model.lane_inputs), g, runId)
      return
    }
    if (upscaleBagArmed) {
      // The same reshoot refusal, fifth edge (the upscale branch also
      // returns before the film action).
      if (reshootArmed(p)) {
        throw new Error('h3-timeline: Upscale and Reshoot are both armed — the upscale branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Upscale arm for a reshoot, or empty the Reshoot arm for an upscale.')
      }
      renderH3ChainUpscale(ups[0] as Record<string, unknown>, p, parseH3Facts(model.lane_inputs), g, runId)
      return
    }
    instantiateAction(declaredAction(h3Decl, 'film'), p, model, g, runId)
  },
}

export const identity = {
  label: 'Generate Video',
  description: 'THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. Repair masked regions (hands, face, body), reshoot the scene from a new camera, extend the film with fresh seconds, and fix masked edits. The calls document IS the timeline.',
  genre: 'video',
  icon: 'video',
  principles: [
    'Describe MOTION and SOUND together — H3 generates both in one pass',
    'Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)',
    'Length snaps to the 17k+5 frame grid (frames become seconds at the schema fps default — the one clock)',
    'For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it',
    "Same seed across a shot's re-rolls keeps the world texture",
    'SLA sparse attention ships at sparsity 0.85 — the value the turbo LoRA was distilled against; stating 0.90 trades a little quality for ~15% more speed',
  ],
}

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  registerCard(ctx, ctx.comfyui)
}

export function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void {
  ctx.effect(() => comfy.registerCard({
    id: 'h3-timeline',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'h3-film',
    // BOARDING (resolved 2026-09-07): the card boards
    // all three families.
    // video_h3_open-cascade composing model 'h3' through this card.
    // THE OFFERED SET = atoms + variant routes (the tts card's own
    // law, 2026-09-23 — the bench door and the tool enum offer the
    // SAME set; the 2026-11-09 live write refusal "model
    // 'h3-timeline' is not offered by card 'h3-timeline' (boards:
    // h3)" was this card boarding only the atom while its tool enum
    // offered the lane addresses too). The default stays BOARDED[0].
    boarded: [...BOARDED, ...VARIANT_ADDRESSES],
    // THE video door (2026-09-21, operator order — video-gen
    // retired): a blind "make a video" must find THIS card first.
    // THE RETRIEVAL WORDS (friction F1): repair/reshoot/extend name
    // the card's masked-edit arms — the discover seat's exact-tag
    // facet routes those queries here, never derived (make-card law).
    tags: ['video', 'generate', 'text-to-video', 'timeline', 'edit', 'repair', 'reshoot', 'extend'],
    // THE CARD-OWNED CRAFT LAW (the rework's slice 6, H5's split): the
    // CONTENT line the load digest serves. The FORMATTING law of this
    // card is already card-owned and mechanical — prompts.yaml's
    // pre_start/pre_chain framing and the identity pin are applied by
    // the emitter at render time, never authored by the agent — so no
    // normalize hook rides here: the agent writes the action, the card
    // frames the shot.
    // THE HYBRID-RAILS LINE (audit 013 cure 3, the digest tier): the
    // one authored combinability sentence — two image rails, both
    // live, naming every seat the rails law needs. Served in the
    // load digest through the existing craft seat (zero derivation).
    craft: {
      promptHint: 'one continuous action line per shot — the card frames each shot at render (no "shot 1:" prefixes, no first-frame/last-frame language; pin frames on the timeline\'s keyframes lane). Two image rails, both live, combinable: the anchor (image / the keyframes lane) pins the opening AND conditions identity while reference rails (ref_images and kin) stack after it — both rails ride one window.',
    },
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
      // THE RAIL (the operator's law, 2026-09-20; re-read 2026-11-12:
      // "THERE IS NO FIRST FRAME NOR LAST FRAME, JUST ARBITRARY FRAMES
      // WHENEVER"): the image pin + the reference buses — one shared
      // rail. `last_frame` stays a WIRING slot as the FL2VA end-anchor
      // translation; the frame setup is the timeline's keyframes lane. The
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
        // (The re-shoot source seat retired 2026-11-12 with the
        // fourth-mod-bag unification: the RESHOOT_MOD bag's
        // source_clip field owns the seat — the same picker law the
        // replace/repair/extend clips ride; no standalone rail slot.)
      },
      legacyAliases: { image_name: 'image' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    flowOutputBindings: [
    {
      channel: 'default',
      node: '*',
      nodeClass: 'SaveVideo',
      // the REFINE arm's own emission is a SaveVideo too (the
      // extend-terminal posture) — but the LAST-of-class scan needs
      // the refine save to be the armed refine's, never a film
      // save, so the default edge yields when refine is armed and
      // the refine edge below names it.
      when: (p) => !((Array.isArray(p.replace) && p.replace.length > 0) || (Array.isArray(p.repair) && p.repair.length > 0) || (Array.isArray(p.extend) && p.extend.length > 0) || (Array.isArray(p.refine) && p.refine.length > 0) || (Array.isArray(p.upscale) && p.upscale.length > 0)),
    },
    {
      channel: 'default',
      node: '*',
      nodeClass: 'MiniMaxH3ChainAssemble',
      when: (p) => (Array.isArray(p.replace) && p.replace.length > 0) || (Array.isArray(p.repair) && p.repair.length > 0),
    },
    {
      // THE EXTEND ARM: the extension's terminal is the joined-film
      // SaveVideo (the film tail's own file law — no ChainAssemble:
      // its `_final.mp4` name is not a prefix the concat can glob).
      // The '*' scan picks the LAST SaveVideo in creation order —
      // the joined film is created after its two part-saves.
      channel: 'default',
      node: '*',
      nodeClass: 'SaveVideo',
      when: (p) => Array.isArray(p.extend) && p.extend.length > 0,
    },
    {
      // THE REFINE ARM: the refinement's terminal is its own
      // single SaveVideo (`<runId>/refine` — the extend terminal's
      // file law, no ChainAssemble: a refine has no loop lineage to
      // assemble). The only SaveVideo in the graph, so the '*'
      // scan resolves it.
      channel: 'default',
      node: '*',
      nodeClass: 'SaveVideo',
      when: (p) => Array.isArray(p.refine) && p.refine.length > 0,
    },
    {
      // THE UPSCALE ARM (F19): the deferred 2x loop's terminal is
      // its ChainAssemble (`<runId>/upscale`, copy_to_output) — the
      // only assemble in the graph, so the '*' scan resolves it.
      channel: 'default',
      node: '*',
      nodeClass: 'MiniMaxH3ChainAssemble',
      when: (p) => Array.isArray(p.upscale) && p.upscale.length > 0,
    },
  ],
    // ADMISSION EXTRAS (the class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file —
    // trailing-* ride verbatim, the gate matches them as prefixes).
    // + the AXIS KEYS this card's own families stamp (the h3-timeline
    // family declares Variant/Quant groups — the axis seeding writes
    // `variant`/`quant` onto every fresh stage; the admission covers
    // the card's own served surface, image-gen's recipe-knob law).
    // `recipe` LEFT THIS LIST (2026-10-16, audit 0be61df8 F5): the
    // prose here used to claim the axis seeding writes it, but the
    // RECIPE-AXIS YIELD forbids the key (spec.ts axisGroups filters
    // 'Recipe'), no card declares a `recipe` field, no client path
    // writes one, and this card's compose has no reader of p.recipe —
    // the admission was dead surface advertising a key nothing can
    // produce. A doc carrying it now refuses LOUD at the door
    // ('unknown-param') instead of riding as an inert rider; seedUser
    // already deletes it on drill-open (the dead-layer law).
    admits: ['ctx_*', 'extend', 'fps_seconds', 'image_name', 'k', 'noise_seed', 'quant', 'ref_image_size', 'refine', 'repair', 'replace', 'reshoot', 'sla_*', 'upscale', 'variant'],
    // THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the
    // features.modifiers channel): the swap + repair + extend arms.
    // The mask card's sam3/sam2/draw precedent — one kind per arm,
    // entry fields as the popup's tiles, requires as the
    // presence-gated arm packs.
    mods: [REPLACE_MOD, REPAIR_MOD, EXTEND_MOD, REFINE_MOD, RESHOOT_MOD, UPSCALE_MOD, LORAS_MOD],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    // the packs the window graph rides (EXTENSION LAW) + the film
    // tail's file boundary (melite-utility-nodes: MeliteUnload +
    // MeliteConcatVideos) + the film audio (melite-audio-nodes: the
    // clips arm's post-generation MeliteFilmAudioMix; the retired
    // in-graph Delay/Mix/Duck chain needed no declaration beyond the
    // same pack). (2026-10-15: ComfyUI-Frame-Interpolation and
    // ComfyUI-LTXVideo are GONE — every class this card's graphs
    // address from them is mis-attributed: FrameInterpolate,
    // FrameInterpolationModelLoader and CreateVideo are ENGINE CORE
    // (core_node_types), LTX_lora_loader is PlagueKind's, already
    // required above. Neither pack owns a class any graph uses.)
    requires: [
      'comfyui-h3-motion-context', 'Comfyui-PlagueKind-Nodes',
      'ComfyUI-KJNodes',
      'ComfyUI-MiniMaxH3Mod',
      'Comfyui_Minimax_h3_latent_Upscaler-Plus',
      'ComfyUI-SeedVR2_VideoUpscaler',
      'melite-utility-nodes', 'melite-audio-nodes',
    ],
    schema,
    // the emitter carrier (this card's schema is the hand-written
    // normalizer — params_schema walks the declared object's .dict)
    schemaCarrier: paramSchema,
    // THE FAMILY ADMISSION (B5 — the write doors' arm of the walk):
    // the EXACT clause the compose schema's walk enforces at the run
    // door (schema.ts's t4r gate), stated on the card so the bench
    // write doors can speak it one hop earlier — a Final-Cut stamp
    // on a keyframe doc refuses at the patch door in the run door's
    // own voice instead of green-lighting to the run press. ONE
    // SPELLING: deriveWindowFamily + T4_ONLY_KEYS ride the same
    // contract module the walk, the studio rail, the B1 emit law and
    // the pick gate (pickVerdict.ts) judge with — no copy, no drift.
    // Explicit keys mirror the walk verbatim (stated-and-valued —
    // THE ONE NULL LAW: schema.ts:531 reads null as UNSTATED, and so
    // does this face; the bench doors' merge-patch deletes nulls
    // upstream, so the view this face judges is null-free in
    // practice, and a null that arrives anyway is unstated too). A JUDGE, NOT A GUARD (the
    // operator's no-blocker ruling): the verdict speaks at the write
    // door; the stored state keeps its own law.
    admitFamily(params) {
      if (deriveWindowFamily(params) !== "t4r") return { ok: true }
      const explicit = new Set(Object.keys(params).filter((k) => params[k] !== null))
      const bad = T4_ONLY_KEYS.filter((k) => explicit.has(k)).sort()
      if (bad.length === 0) return { ok: true }
      return {
        ok: false,
        error: `card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: ${bad.join(", ")}`,
      }
    },
    // THE DERIVED-FAMILY LANE AXIS (the one-seat migration,
    // 2026-11-12): the family's lanes and dead keys declare on the
    // MODEL DECL (this package's index.ts serves the contract
    // module's FAMILY_LAW by reference — one object, one truth),
    // never on the card definition. The registry's ONE reseat seat
    // (cardsRegistry.reseatStageFamily) resolves the declaration
    // through this card's boarded families and drops the flip's
    // carried strand through the shared spelling
    // (@melite/contracts familyLane.ts — reseatDeadKeys), the same
    // module the client compose mirror derives through. The
    // per-card reseatFamily face (the ERROR g/h cure's spelling,
    // 2026-11-08) is dead.
    compose(p, model, g, runId) {
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
      // T6'S STRICT RESOLVE: the carrier walk refuses a key that is
      // neither a declared knob nor a rider. The rider list is the
      // composer's own non-knob reads: the studio shot vocab
      // (calls, audio_clips, keyframes, refs, document), the lora
      // bag, the per-window fences, the derive keys (variant,
      // quant, refine — refine is injected by the door
      // AFTER this walk), the schema's __steps_pinned stamp (007
      // L3 — the walk's own explicit-steps fact, read by the film
      // build's single-window marriage), its __shift_pinned heir
      // (the married-shift consult, SOTA limb 2) and the context
      // prefix class (ctx_* — the compat law's own list at
      // schema.ts names it; motion_* is gone: no reader, no
      // producer, no draft carries it).
      // `recipe` LEFT THIS LIST TOO (2026-10-16, audit 0be61df8 F5):
      // no reader, no producer, no admit — a doc carrying it refuses
      // loud here, which is the dead-layer law working.
      p = gatedResolve('h3-timeline', schemaFn, [
        'calls', 'audio_clips', 'keyframes', 'fps', 'audio_stem', 'document', 'loras',
        'refs', 'replace', 'repair', 'extend', 'reshoot', 'variant', 'quant', 'refine', 'upscale', 'model', '__steps_pinned', '__shift_pinned', 'ctx_*',
      ], gateInput)
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
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(p, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the h3-timeline card — every boarded family (h3) composes its own declared segment; this address owns none`)
      }
    },
    // the t4-family strip pass rides the kit (python: `if not is_t4r`).
    finalize: finalizeH3,
  }))
}
