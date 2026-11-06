import { DECL as h3Decl, h3DefaultLoraEntry, MAX_COMPOSED_WINDOWS, REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS, REFINE_DEFAULT_OVERLAP_FRAMES, REFINE_WORKAROUND_WIDE_FRAMES } from '@melite/models-h3';
import { H3_LORA_ROWS } from '@melite/models-h3/mods/loras';
import { JSON_ARRAY_PARAMS, coerceWireBoolean, paramSchema, schema, } from '@melite/models-h3/schema';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { finalizeH3 } from '@melite/models-h3';
import { renderH3Swap } from '@melite/models-h3';
import { renderH3Repair } from '@melite/models-h3';
import { renderH3Extend } from '@melite/models-h3';
import { renderH3RefineBag } from '@melite/models-h3';
import { renderH3Edit } from '@melite/models-h3';
import { renderH3ChainUpscale } from '@melite/models-h3';
import { reshootArmed } from '@melite/models-h3';
import { parseH3Facts } from '@melite/models-h3/actions';
import { assertOverlayGated } from '@melite/models-h3';
export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract';
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema';
// THE CARRIER'S CALLABLE FACE — ONE cast serving the compose strict
// resolve's judge: schemastery schemas are callable (Schema.resolve)
// but carry a typed data parameter, while the card seam takes
// unknown. The full `schema()` normalizer CANNOT run here (its t4r
// admission judges stated-and-valued keys as explicit injects, and
// the merged carrier doc's walked defaults would read as injects),
// so the strict resolve walks the carrier `paramSchema` — same
// carrier the schemaCarrier registration hands the door.
const schemaFn = callableSchema(paramSchema);
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
export const BOARDED = [h3Decl.id];
// THE VARIANT ROUTES (the TTS fold's VARIANT_ADDRESSES pattern):
// agents pick no matrix variant — the tool's closed model enum
// offers each Variant-group lane's own compose address (the krea-2
// raw-lane precedent: two lanes, one card). The folded
// single-shot/keyframe routes retired 2026-11-02 with the recipe
// rework; h3-singularity joined 2026-10-17 as the checkpoint axis.
export const VARIANT_ADDRESSES = ['h3-timeline', 'h3-singularity'];
/** THE REPLACE KIND (the swap-parity build, 2026-10-28): the
 *  card-declared modifier kind carrying the upstream swap seats —
 *  ONE entry per doc (max_stack 1, ordered — a swap is ONE PRESS,
 *  never a stack of entries). THE PRESS TILES (operator 2026-11-14:
 *  "EVERY MOD MUST BE ABLE TO BE BROKEN UP"): the plan node slices
 *  the WHOLE source into per-generation clips — clip_seconds is the
 *  engine's own "Longest clip per H3 generation" (the census word,
 *  never the total), overlap_frames the carry each clip repeats —
 *  so one press over a long source is N engine-sided windows with
 *  latent carry, joined by the chain's own assemble. The media seats arrive as staged artifact names
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
const LORAS_MOD = {
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
        { name: 'id', label: 'LoRA', type: 'select', default: 'h3_silver_dareties', options: H3_LORA_ROWS.map((row) => ({ value: row.id, label: row.label })), tooltip: 'The adapter, by its catalog id — the family file the provisioner downloads; the render loads this id verbatim.' },
        { name: 'strength', label: 'Strength', type: 'number', default: 0.8, min: 0, max: 2, step: 0.05, tooltip: 'Adapter weight. Each row has a designed point (the default merge row 0.8, the distill rows 0.6–1, the refiner 0.35); the render only reads the number you state.' },
        { name: 'steps', label: 'Steps', type: 'number', max: 50, step: 1, tooltip: 'The step count to marry — OMIT the key and the catalog row\'s own count rides (the row domain owns the floor and the default; the door refuses any stated count outside the row\'s declared domain). State a number only inside the row\'s domain, when the schedule must bend.' },
    ],
};
const REPLACE_MOD = {
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
    section: 'Swap — replace the person in the source clip (upstream openjutsu recipe: still + mannequin + mask masked-edit). ONE PRESS TILES A LONG SOURCE: the plan slices the whole clip into per-generation windows (Clip seconds is each window\'s budget, never the total; Overlap frames is the seam carry between them) and the chain joins the windows itself — never one long generation. Film runs leave this arm empty.',
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
        { name: 'clip_seconds', label: 'Clip seconds', type: 'number', default: 6, min: 2.5, max: 15, step: 0.1, tooltip: 'The engine\'s own "Longest clip per H3 generation" (the census word, reference 6) — EACH generation window\'s budget, never the total: a source longer than this tiles into N windows the chain itself joins. The plan node\'s widget band [2.5, 15] is the law; anything else 400s at submit.' },
        { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 22, max: 56, step: 17, tooltip: 'The engine\'s own "Frames each clip repeats from the previous clip" (reference 39) — the seam carry between the generation windows of a tiled long source. The engine combo is exactly [22, 39, 56] (step 17 from 22).' },
        { name: 'resolution', label: 'Plan resolution', type: 'select', default: '736p', options: [
                { value: '480p', label: '480p — quick preview' },
                { value: '576p', label: '576p' },
                { value: '736p', label: '736p — reference default' },
                { value: '768p', label: '768p' },
                { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
            ], tooltip: "The plan resolution tier (reference '736p')." },
    ],
};
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
const REPAIR_MOD = {
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
        { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the masked pass (the refine window is 0.30–0.35; lower = subtler). The declared band 0.05–0.5 binds on every run: outside it refuses loud. 1 or more is the reshoot pole — a repair is a refine, never a re-render.' },
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
};
/** THE EXTEND KIND (the card's own arm — the retired extend-video
 *  wrapper flow staged it, report
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
const EXTEND_MOD = {
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
        { name: 'extend_seconds', label: 'Extend seconds', type: 'number', default: 2.33, min: 0.91, max: 432.29, step: 0.01, tooltip: 'Seconds appended — must add up exactly: a single window lands on the engine grid at 24fps (22+17k frames, refuse loud otherwise; landable: 0.92s = 22f (the grid floor), 2.33s = 56f, 3.75s = 90f, 5.17s = 124f, 15.08s = 362f — the largest single window); above 362f the door joins N uniform 22+17k windows under the 39f context overlap, exact delivery or a refusal naming the neighbors (ceiling 32 windows = 432.29s).' },
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
};
/** THE REFINE KIND (the fifth mod bag): a standalone SECOND pass
 *  over staged source clips — the H3 latent-upscale refine chain's
 *  minimal emission (models/h3 renderH3RefineBag). The report-named
 *  second-pass stack (MinimaxH3LatentUpscaler3D, the RefineHandoff
 *  with its sampler/sigmas seats, the ChainUpscale loop family,
 *  SeedVR2 3B, the LTX 2.3 upscalers) exists engine-side with no
 *  card surface; this arm is the first door: the handoff node (2x
 *  learned upscale + the low-sigma refinement pass, one node) over
 *  the clip's own frames + soundtrack. THE MULTI-ENTRY LAW (GAPS-19,
 *  2026-11-01): the bag stacks to the film's composed-window ceiling
 *  and the entries ARE the windows — the windows tile through the
 *  family carrier (one refine window per entry, joined IN-GRAPH at
 *  <runId>/refine; the continuity laws — one film per bag, no gaps,
 *  no full overlap — are the family renderer's, so every door judges
 *  them identically). THE CARRY IS SERVED (F3-14 cured):
 *  a carried join (overlap ≥ 1 f) mounts the film's own continuation
 *  through the same in-graph carry — the cure sits at the refine
 *  handoff, which clone-strips the foreign Drift-Control patch
 *  before its guider so the packed mask always matches its audio
 *  stream. ABUTTING entries (a zero-carry join, the plain concat)
 *  stay lawful; the carried shape is the design default. The declared
 *  alternative stays lawful and byte-cheap: ONE entry composes the
 *  single-window emission exactly, so the walk posture (press, judge,
 *  press) is a per-window judgment, never a workaround. ONE variant
 *  path: scale 2.0, lock_audio, bf16 — the entry carries only the
 *  refine seats (source_clip, refine_prompt, denoise, steps, seed,
 *  clip_seconds, start_seconds); the model plane stays family-owned.
 *  The deferred ChainUpscale LOOP (prior-run lineage, recursive
 *  expand, no estate requeue driver) is the named follow-up, never
 *  this arm. Emission ends in the refine SaveVideo (the extend
 *  terminal's own file law — no ChainAssemble: a refine has no loop
 *  lineage to assemble). */
const REFINE_MOD = {
    kind: 'refine',
    label: 'Refine',
    param_key: 'refine',
    schema_key: 'refine',
    category: 'ordered',
    cardinality: 'list',
    // THE MULTI-ENTRY STACK LAW (GAPS-19, 2026-11-01): the bag's
    // ceiling is the film's composed-window ceiling (the extend
    // solver's own constant) — the entries ARE the windows, so the
    // same window count that caps one extend press caps one refine
    // press. Derived, never a hand-typed number.
    max_stack: MAX_COMPOSED_WINDOWS,
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
    // THE WALK IS THE DECLARED ALTERNATIVE (GAPS-19): the bag tiles
    // the film in one press; the walk sentence names the per-window
    // judgment, not a workaround — the one-entry bag composes the
    // single-window emission byte-identically (the sequential-press
    // law).
    section: `Refine — a standalone second pass over staged source clips: 2x learned latent upscale + the low-sigma H3 refinement pass in one node (the film handoff's own spelling), decoded and saved as one film. The bag takes MULTIPLE window entries — each entry IS one window (its own Source clip, Refine prompt, and window seats), the entries cover ONE staged leaf in order, and the run assembles the windows into one <runId>/refine film. THE CARRY IS SERVED (F3-14 cured at the handoff): a carried join — consecutive windows overlapping by 1 f or more — mounts the film's own continuation, the token-exact seam, exactly like the plain gen's tiling (the cure: the refine's second pass strips the foreign Drift-Control patch before its guider). The abutting bag stays lawful too: start each window at the previous window's end (a zero-carry join, the plain concat, hard cuts at every seam). One entry with Windows above 1 tiles the same way — the default 22 overlap rides the carry. THE DESIGN WINDOW is the ~2 s window (${String(Math.round(REFINE_DEFAULT_CLIP_SECONDS * 24))} f, the 2 s class's rung of the 22+17k token grid) — the carry-joined window, the one the context carry makes seamless, so the design never needs a wider window (the carry is served, ROADMAP F3-14 cured). There is no wide-window frame and no ceiling to press: a window past ${String(REFINE_2X_OOM_FRAMES)} f (the measured OOM) is just TOO LONG — cut to the design rung and let the carry tile (${String(REFINE_WORKAROUND_WIDE_FRAMES)} f is the hard-cut era's measured-green datapoint, history only). The bag carries at most ${String(MAX_COMPOSED_WINDOWS)} window entries. The declared alternative stays lawful: refine one window per press — judge each window before pressing the next (Start seconds stepped forward). The soundtrack is the window's own, always. Film runs leave this arm empty.`,
    fields: [
        // The seat TYPES (the picker law, the siblings' own): the video
        // seat is `file` + media 'video'; the prompt seat is text
        // (agent-composed, user-confirmed); the dials are numbers.
        { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip whose frames the second pass refines. Binds ONE staged leaf: the VHS loader reads it by staged name at the film clock, and the encode seats read its frames + soundtrack.' },
        { name: 'refine_prompt', label: 'Refine prompt', type: 'text', default: '', tooltip: 'The refine text — what the upscaled frames should hold (agent-composed, user-confirmed; rides the CLIPTextEncode positive seat — the node refuses without model + positive). THE PROMPT IS THE ONLY STYLE LEVER: nothing from the source prompt, seed or schedule carries, so restate the source\'s own look (the medium and the identity anchors) beside the quality asks — a generic quality-only prompt silently restyles the shot. This door RESTYLES decoded pixels and carries no lineage — a saved clip has no latent left, so a true context-carrying second pass is the chain 2-pass door, never this one.' },
        { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the refinement pass (the refine window is 0.30–0.35; lower = subtler). The declared band 0.05–0.5 binds on every run: outside it refuses loud. 1 or more is the re-render pole — a refine is never a re-render (the handoff\'s sigmas law: 0 <= sigmas[0] < 1).' },
        { name: 'steps', label: 'Refine steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The refinement schedule steps (the low-sigma second pass; the sampler steps stay the doc marriage).' },
        { name: 'seed', label: 'Refine seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The refinement noise seed (0 runs the reference posture).' },
        // (the numbers are DERIVED from the model package's exported
        // constants — refine-window audit D1: the served card must never
        // carry a hand-typed copy of a measured ceiling)
        { name: 'clip_seconds', label: 'Window seconds', type: 'number', default: REFINE_DEFAULT_CLIP_SECONDS, min: 0.5, max: 60, step: 0.25, tooltip: `How much of the clip this pass refines, from the window start: ${String(REFINE_DEFAULT_CLIP_SECONDS)} s = ${String(Math.round(REFINE_DEFAULT_CLIP_SECONDS * 24))} f at 24 fps, the DESIGN window (the 2 s class's rung of the 22+17k token grid — the carry-joined window the context carry makes seamless, so the design never needs a wider window; the carry is served, ROADMAP F3-14 cured). The pass reads only this window, so a long film is covered by advancing Start seconds — and any upsizing window past ${(REFINE_2X_OOM_FRAMES / 24).toFixed(2)} s (${String(REFINE_2X_OOM_FRAMES)} f) is refused as TOO LONG: that is where the measured OOM sits, and with the carry served the cure is always the same — cut to the design rung and let the carry tile (only a same-size 1x pass reads wider). ${String(REFINE_WORKAROUND_WIDE_FRAMES)} f measured green is the hard-cut era's datapoint, history only — never advice. A window must also START inside the clip: a Start past the last frame yields no frames, and a window longer than what remains is quietly shortened.` },
        { name: 'start_seconds', label: 'Start seconds', type: 'number', default: 0, min: 0, max: 3600, step: 0.25, tooltip: `Where this window starts in the source clip (0 = the first frame). Each entry refines one window. Two lawful tilings: CARRIED — start the next window inside the previous one (window seconds ${String(REFINE_DEFAULT_CLIP_SECONDS)} s \u2192 Start 0 / ${String(REFINE_DEFAULT_CLIP_SECONDS - REFINE_DEFAULT_OVERLAP_FRAMES / 24)} s) so the join mounts the film\u2019s own token-exact continuation (F3-14 cured at the handoff); or ABUTTING — start each window at the previous window\u2019s end (Start 0 / ${String(REFINE_DEFAULT_CLIP_SECONDS)} s), the plain concat, hard cuts. A gap, an out-of-order window, or an off-grid carry also refuses, naming the exact frame. The declared alternative: one entry per press, this seat stepped forward each time. The last window starts inside the clip: a start past the final frame lands no frames and the door refuses in words.` },
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
        // THE AUTO-TILE (F67, 2026-11-15 — the operator: "the AI can make
        // windows, but the human operator can't"): one entry tiles ITSELF
        // — the card works out every window's start from the window size
        // (Window seconds), this count, and the overlap below, so a human
        // states a SIZE and a COUNT instead of hand-tiling N entries with
        // frame-exact starts the 0.25-step dials cannot reach. 1 keeps the
        // single-window walk posture (judge each window before pressing
        // the next); hand-tiled entries stay for mixed-seat bags.
        { name: 'windows', label: 'Windows', type: 'number', default: 1, min: 1, max: MAX_COMPOSED_WINDOWS, step: 1, tooltip: 'How many windows this ONE entry tiles (the auto-tile: window k starts at Start seconds + k × (window − overlap), so one press covers Windows × (window − overlap) + overlap frames). 1 is the single-window walk. The default Overlap 22 rides the film’s own carried seam; Overlap 0 gives the abutting hard cut. Both run. A windows seat above 1 on ANY entry of a multi-entry bag refuses — the bag already IS the tiling.' },
        // (the default is DERIVED from the family contract's own seam —
        // refine-window audit D1: the served card never carries a
        // hand-typed copy of a measured constant)
        { name: 'overlap_frames', label: 'Overlap (frames)', type: 'number', default: REFINE_DEFAULT_OVERLAP_FRAMES, min: 0, step: 1, tooltip: 'How many frames each window re-covers from the previous one (the join\u2019s carry, in whole frames — the card works out every window\u2019s start from window size minus this). 0 is the abutting hard cut (the plain concat, no carried continuation); 22 is the film\u2019s own seam, token-exact — it mounts the film\u2019s continuation, and that carry is SERVED (F3-14 cured: the refine\u2019s handoff strips the foreign Drift-Control patch before its second pass, so the packed mask always matches its audio stream). Any other overlap still refuses — off-grid carries name the exact frame. Rides only with Windows above 1 (a lone window has no join); must be shorter than the window.' },
    ],
};
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
const RESHOOT_MOD = {
    kind: 'reshoot',
    label: 'Reshoot',
    param_key: 'reshoot',
    schema_key: 'reshoot',
    category: 'ordered',
    cardinality: 'list',
    max_stack: 1,
    // THE ORBIT ORB (2026-11-15 — the operator: "it already existed
    // as the output, build it for the input"): the leaf seats the
    // EMBEDDED camera-pose orb above the field stack (upstream
    // crossview_orbit.js's static-pose gizmo, ported 1:1 — sphere +
    // trained-band zones + the blue camera handle). The orb and the
    // orbit/tilt/dolly dials write the SAME draft seats (ONE TRUTH);
    // absent host degrades to the three number dials.
    leaf_face: 'orbit-canvas',
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
};
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
const UPSCALE_MOD = {
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
        // name is a LIVE PICKER over the estate's chain-store runs (the
        // leaf serves the labeled rows; 'Advanced — paste a run id' is
        // the explicit free-text fallback); the prompt seat is text; the
        // dials are numbers.
        { name: 'chain_run', label: 'Chain run', type: 'chain-run', default: '', tooltip: 'The run whose checkpointed scenes this pass resumes — pick from the live list; Advanced accepts an id the list does not hold.' },
        { name: 'prompt', label: 'Pass-2 prompt', type: 'text', default: '', tooltip: 'What the upscaled frames should hold (agent-composed, user-confirmed). Blank reuses the source run\'s own per-scene prompts — the documented posture for a pure resolution pass.' },
        { name: 'denoise', label: 'Denoise', type: 'number', default: 0.24, min: 0.05, max: 0.5, step: 0.01, tooltip: 'The partial-denoise strength of the pass-2 re-render (the recipe\'s own window is 0.24; lower = subtler). The declared band 0.05–0.5 binds on every run: outside it refuses loud. 1 or more is the reshoot pole — an upscale is never a re-render (that is a reshoot, and the reshoot door exists).' },
        { name: 'steps', label: 'Pass-2 steps', type: 'number', default: 20, min: 1, max: 30, step: 1, tooltip: 'The pass-2 schedule steps (the recipe runs 20; the sampler stays res_multistep, the loop family\'s own spelling).' },
        { name: 'segment_crf', label: 'Segment CRF', type: 'number', default: 18, min: 0, max: 51, step: 1, tooltip: 'The H.264 quality of the persisted HQ scene segments (the adapter\'s own seat; 18 is its default).' },
    ],
};
/** THE EDIT KIND (the timeline rework's stage 2b, 2026-11-15;
 *  operator order: "do the rework of the timeline mods according
 *  to your judgment"): ONE video-edit bag whose dials state the
 *  cell of the mask × reference × denoise matrix directly — the
 *  seven peer bags were seven FIXED cells of that matrix, and
 *  this door serves the whole grid. The legacy doors stay frozen
 *  byte-pinned (their suites, their docs); every cell through
 *  THIS door rides the family's matrix seat (models/h3
 *  renderH3Edit) on the one chain spine + the one constructor.
 *  THE DIALS: Mask source (per-frame SAM3 region — N7's cure,
 *  first-class with grow/blur/detection tuning seats, N8's — /
 *  whole frame / one staged PNG, resized to the chain's geometry
 *  in-graph, F3-16 defect 1's cure), Reference (the source's own
 *  self / a still + mannequin pair), and Denoise (0.05–1). The
 *  safety law is the door's own: the identity boil (whole-frame ×
 *  self × >= 0.8, F3-17) and the partial audio drop refuse loud.
 *  Continuation and no-reference are NOT matrix cells — extend's
 *  and refine's own doors serve them (the refusal names them). */
const EDIT_MOD = {
    kind: 'edit',
    label: 'Video edit',
    param_key: 'edit',
    schema_key: 'edit',
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
    section: 'Video edit — ONE bag, the whole edit matrix: state the MASK (a per-frame SAM3 region with tuning seats, the whole frame, or one staged PNG resized to the chain), the IDENTITY ANCHORS (the source itself, or a still + mannequin pair), and the DENOISE pole (partial holds the unmasked region and its sound; 1 re-renders the masked side whole). A continuation is the Extend door; a no-reference second pass is the Refine door; a new camera is the Reshoot door — each refuses here naming its door. Film runs leave this arm empty.',
    fields: [
        // The seat TYPES (the picker law, the siblings' own): video
        // seats are `file` + media 'video'; image seats claim the
        // image square; the two prompt seats are text
        // (agent-composed, user-confirmed).
        { name: 'source_clip', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip the edit rides. Binds ONE staged leaf: the VHS window loader + the core LoadVideo both read it by staged name, and the timeline reads it back off the native VIDEO wire.' },
        { name: 'edit_prompt', label: 'Edit prompt', type: 'text', default: '', tooltip: 'The edit action text — what the masked region or frame should become (agent-composed, user-confirmed; rides the reference-video prompt seat — no in-graph describer ever rewrites your words).' },
        { name: 'mask_source', label: 'Mask source', type: 'select', default: 'region', options: [
                { value: 'region', label: 'Region — per-frame SAM3 track' },
                { value: 'whole-frame', label: 'Whole frame — nothing held' },
                { value: 'static-png', label: 'Static PNG — one staged mask' },
            ], tooltip: 'WHERE the edit lands: a per-frame SAM3 track of a free-text region (the per-frame door — a moving subject stays masked frame by frame), the whole frame (an all-white mask, nothing held), or ONE staged PNG (the track run\'s pixel-max union is the recommended bridge — the chain resizes it to its own geometry, so the file\'s own shape never matters).' },
        { name: 'region_prompt', label: 'Region prompt', type: 'text', default: '', tooltip: 'The free-text SAM3 detection target naming the region — "hands", "a person", "a face" are param VALUES, never card kinds. The mask tracks every matching object frame by frame. RIDES ONLY the region mask source (refuses empty there).' },
        { name: 'mask', label: 'Mask PNG', type: 'image', default: '', tooltip: 'ONE staged PNG under the static-png mask source — the track run\'s pixel-max UNION is recommended (per-frame motion is the region source\'s own door). The chain decodes it off the red channel and RESIZES it to the plan geometry in-graph: the file\'s own resolution never has to match the clip.' },
        { name: 'mask_grow', label: 'Mask grow px', type: 'number', default: 16, min: 0, max: 96, step: 1, tooltip: 'Pixels the mask grows before the edit (seam ring protection; 0 edits exactly the detected region — the grow-0 seam test). Thin structures (handles, caps) lost to a coarse track grow here first — the tuning seat the coarse-mask burn asked for.' },
        { name: 'mask_blur', label: 'Mask blur px', type: 'number', default: 0, min: 0, max: 48, step: 1, tooltip: 'Edge softness of the grown mask (blur radius): 0 is a hard edge, a few px feathers the boundary into the hold — the second tuning seat the coarse-mask burn asked for.' },
        { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01, tooltip: 'The SAM3 text-detection score threshold (lower finds more objects, noisier masks; higher only the confident ones).' },
        { name: 'reference', label: 'Identity anchors', type: 'select', default: 'self', options: [
                { value: 'self', label: 'Source clip itself — repair posture' },
                { value: 'still+mannequin', label: 'Still + mannequin — swap posture' },
            ], tooltip: 'WHO the edit keeps: the source clip on its own reference seat (the identity anchor is the person already in the frame — zero new pixels), or a replacement still + the track run\'s mannequin video (the still anchors appearance, the mannequin carries motion; the still must show the person WEARING the target — a garment alone hallucinates the uncovered body, the outfit-swap burn).' },
        { name: 'still', label: 'Replacement still', type: 'image', default: '', tooltip: 'The replacement still under the still+mannequin anchors (the R2V ref_images seat + the plan\'s geometry anchor — the person wearing the target look).' },
        { name: 'mannequin', label: 'Mannequin video', type: 'file', media: 'video', default: '', tooltip: 'The mannequin video from the track-card run under the still+mannequin anchors (the R2V ref_videos seat — motion the still cannot carry).' },
        { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 1, step: 0.01, tooltip: 'The edit pole: partial (0.05–0.5 is the repair window) holds the unmasked region AND its sound; 1 re-renders the masked side whole (the keep_audio dial rides only here). Whole-frame × self at >= 0.8 is the identity boil and refuses — anchor the identity or use the reshoot door.' },
        { name: 'keep_audio', label: 'Keep source audio', type: 'boolean', default: true, tooltip: 'ON: the source soundtrack rides the edit unchanged. OFF (full denoise only): the soundtrack is generated fresh with the edit — a partial pass never drops it (the hold is the point).' },
        { name: 'window_start', label: 'Window start (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, tooltip: 'Frames (at the film clock, 24 fps) to skip before the edit window — 0 starts at the clip head.' },
        { name: 'window_length', label: 'Window length (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, tooltip: 'Frames in the edit window — 0 runs to the end of the clip. A stated length must land on the engine grid 22+17k (56, 73, 90, 107, 124, 141…; off-grid refuses naming the nearest legal value) because the plan snap and the tracked mask must cut the same frames.' },
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
};
/** THE CARD-DECLARED KINDS (one roster, two readers: the served
 *  mods row below and the declared-band judge's walk). */
const DECLARED_MOD_KINDS = [
    REPLACE_MOD, REPAIR_MOD, EXTEND_MOD, REFINE_MOD, RESHOOT_MOD, UPSCALE_MOD, EDIT_MOD, LORAS_MOD,
];
/** THE DECLARED-BAND JUDGE (F3-07, R-P3-18): a number seat's DECLARED
 *  band binds at the compose door. Every armed bag entry's stated
 *  numeric field is judged against its declared min/max — the
 *  DeclaredModifierKind field rows are the truth home, read at
 *  compose time (never a copied literal), so a band edit binds
 *  without a judge edit. The estate admission judges bag KEYS only
 *  (cardsCompose.ts) and the mods-schema gate checks the row's SHAPE
 *  only (min <= max), so this walk is the only judge an entry's
 *  VALUES ever meet.
 *
 *  The >= 1 pole on a sub-1 band is NOT the band's: full denoise is
 *  a different CLASS — a re-render — and the family door refuses it
 *  in its own voice (repair/upscale/refine sigmas law); the band
 *  judge steps aside there and keeps its voice for tunes inside the
 *  reachable range.
 *
 * @param p the walked doc params (the mod bags ride their kinds'
 * param_key) */
export function judgeDeclaredBands(p) {
    for (const kind of DECLARED_MOD_KINDS) {
        // THE RESHOOT CARVE-OUT (h3-reshoot-chain ARM 3): the reshoot
        // bag's dials already meet a judge — the emission's own camera
        // door (bandedAll), which refuses naming every offender, its
        // recorded value, and the never-a-widget-400 tail, against the
        // same bounds its DeclaredModifierKind rows state (ARM 2 pins
        // the 1:1). This walk firing first would only preempt that
        // richer voice with a thinner one — the same law, said worse.
        if (kind.kind === 'reshoot')
            continue;
        const bag = p[kind.param_key];
        if (!Array.isArray(bag))
            continue;
        for (const [i, e] of bag.entries()) {
            if (e === null || typeof e !== 'object' || Array.isArray(e))
                continue;
            const entry = e;
            for (const f of kind.fields ?? []) {
                if (f.type !== 'number')
                    continue;
                const min = f.min;
                const max = f.max;
                if (typeof min !== 'number' || typeof max !== 'number')
                    continue;
                const v = entry[String(f.name)];
                if (typeof v !== 'number' || !Number.isFinite(v))
                    continue;
                if (v >= 1 && max < 1)
                    continue; // the re-render pole — the family door's own voice
                if (v < min || v > max) {
                    throw new Error(`h3-timeline ${kind.kind} entry ${i}: '${String(f.name)}': ${v} is outside this seat's declared band ${min}–${max} — the declaration binds, not the tooltip`);
                }
            }
        }
    }
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
export const ACTION_BINDINGS = {
    [h3Decl.id]: (p, model, g, runId) => {
        // An ABSENT or EMPTY bag is the unused arm — the film below, byte-stable.
        // A PRESENT bag must be exactly one entry (max_stack 1) — an
        // absent bag is the unused arm, an EMPTY bag is the explicit
        // "off" override and stays legal. Anything else refuses loud
        // here, ahead of the engine: a non-array, a null, and — the
        // silent-drop class the one-door law kills — TWO entries, where
        // the bag reader would quietly take the first.
        const oneEntryBag = (key, bag, noun) => {
            if (bag === undefined)
                return;
            if (!Array.isArray(bag)) {
                throw new Error(`h3-timeline ${key}: the ${key} bag is present but carries no entry — state exactly one ${noun} entry (max_stack 1) or omit the arm`);
            }
            if (bag.length > 1) {
                throw new Error(`h3-timeline ${key}: the ${key} bag carries ${bag.length} entries — max_stack is 1, so every entry after the first would be silently dropped. Keep exactly one ${noun} entry.`);
            }
        };
        // THE REFINE STACK GUARD (GAPS-19): the refine kind is the ONE
        // multi-entry bag — its ceiling is the film's composed-window
        // ceiling (served on the kind as max_stack). The guard keeps the
        // array law (a non-array bag is present-but-entryless) and the
        // ceiling; the CONTINUITY laws — one film per bag, no gaps, no
        // full overlap — live in the family carrier (renderH3RefineBag),
        // so the card door and any future door judge them identically.
        const refineStackBag = (key, bag) => {
            if (bag === undefined)
                return;
            if (!Array.isArray(bag)) {
                throw new Error(`h3-timeline ${key}: the ${key} bag is present but carries no entry — state ${key} window entries as an array or omit the arm`);
            }
            if (bag.length > MAX_COMPOSED_WINDOWS) {
                throw new Error(`h3-timeline ${key}: the ${key} bag carries ${bag.length} entries — max_stack is the film's composed-window ceiling (${MAX_COMPOSED_WINDOWS} windows)`);
            }
        };
        const raw = p.replace;
        const rep = p.repair;
        const ext = p.extend;
        // THE REFINE BAG (the fifth arm) rides the stack guard.
        const ref = p.refine;
        // THE RESHOOT BAG (the fourth arm, §8) rides the same guard.
        const rsh = p.reshoot;
        // THE UPSCALE BAG (the sixth arm, F19) rides the same guard.
        const ups = p.upscale;
        oneEntryBag('replace', raw, 'swap');
        oneEntryBag('repair', rep, 'repair');
        oneEntryBag('extend', ext, 'extend');
        refineStackBag('refine', ref);
        oneEntryBag('reshoot', rsh, 'reshoot');
        oneEntryBag('upscale', ups, 'upscale');
        // THE DECLARED-BAND JUDGE (F3-07, R-P3-18): every armed entry's
        // stated numeric fields bind their declared min/max at this door
        // — the value-judge the estate admission and the mods-schema gate
        // never run. Rides BEFORE any dispatch (film, swap, repair,
        // extend, refine, upscale all pass through here).
        judgeDeclaredBands(p);
        const replaceArmed = Array.isArray(raw) && raw.length > 0;
        const repairArmed = Array.isArray(rep) && rep.length > 0;
        const extendArmed = Array.isArray(ext) && ext.length > 0;
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
            throw new Error('h3-timeline: Replace and Repair are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Replace arm for a repair, or the Repair arm for a swap.');
        }
        // THE EXTEND PAIRWISE REFUSALS (the one-door law's third edge —
        // each pair its own firing arm, the split-brain lesson): extend
        // rides the same chain spine, so it races replace and repair
        // the same way, and its branch also returns before the film
        // action, so an armed reshoot under it would be silently
        // dropped.
        if (replaceArmed && extendArmed) {
            throw new Error('h3-timeline: Replace and Extend are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Replace arm for an extension, or the Extend arm for a swap.');
        }
        if (repairArmed && extendArmed) {
            throw new Error('h3-timeline: Repair and Extend are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Repair arm for an extension, or the Extend arm for a repair.');
        }
        const refineBagArmed = Array.isArray(ref) && ref.length > 0;
        // THE REFINE PAIRWISE REFUSALS (the one-door law's fourth edge —
        // each pair its own firing arm, the split-brain lesson): the
        // refine branch returns before the film action, so it races the
        // three edit arms the same way, and an armed reshoot under it
        // would be silently dropped.
        if (replaceArmed && refineBagArmed) {
            throw new Error('h3-timeline: Replace and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Replace arm for a refine, or the Refine arm for a swap.');
        }
        if (repairArmed && refineBagArmed) {
            throw new Error('h3-timeline: Repair and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Repair arm for a refine, or the Refine arm for a repair.');
        }
        if (extendArmed && refineBagArmed) {
            throw new Error('h3-timeline: Extend and Refine are both armed — one door per doc (the refine branch never enters the film action; two armed bags would race for one emission). Empty the Extend arm for a refine, or the Refine arm for an extension.');
        }
        const upscaleBagArmed = Array.isArray(ups) && ups.length > 0;
        // THE UPSCALE PAIRWISE REFUSALS (the one-door law's fifth edge —
        // each pair its own firing arm, the split-brain lesson): the
        // upscale branch also returns before the film action, so it races
        // the three edit arms and refine the same way, and an armed
        // reshoot under it would be silently dropped.
        if (replaceArmed && upscaleBagArmed) {
            throw new Error('h3-timeline: Replace and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Replace arm for an upscale, or the Upscale arm for a swap.');
        }
        if (repairArmed && upscaleBagArmed) {
            throw new Error('h3-timeline: Repair and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Repair arm for an upscale, or the Upscale arm for a repair.');
        }
        if (extendArmed && upscaleBagArmed) {
            throw new Error('h3-timeline: Extend and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Extend arm for an upscale, or the Upscale arm for an extension.');
        }
        if (refineBagArmed && upscaleBagArmed) {
            throw new Error('h3-timeline: Refine and Upscale are both armed — one door per doc (the upscale branch never enters the film action; two armed bags would race for one emission). Empty the Refine arm for an upscale, or the Upscale arm for a refine (an upscale needs a prior chain run; a refine needs a staged clip).');
        }
        const editBag = p.edit;
        const editArmed = Array.isArray(editBag) && editBag.length > 0;
        if (editArmed) {
            const editDoors = [
                ['Replace', replaceArmed, 'the replace arm'],
                ['Repair', repairArmed, 'the repair arm'],
                ['Extend', extendArmed, 'the extend arm'],
                ['Refine', refineBagArmed, 'the refine arm'],
                ['Upscale', upscaleBagArmed, 'the upscale arm'],
            ];
            for (const [name, armed, arm] of editDoors) {
                if (armed) {
                    throw new Error(`h3-timeline: Video edit and ${name} are both armed — one door per doc (both would race for one emission; the edit bag states the whole matrix, so state the cell there). Empty ${arm} for a video edit, or the edit arm for a ${name.toLowerCase()}.`);
                }
            }
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Video edit and Reshoot are both armed — the edit branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the edit arm for a reshoot, or empty the Reshoot arm for a video edit.');
            }
        }
        // THE EDIT DOOR'S ONE-DOOR EDGES (stage 2b): one bag, the whole
        // matrix — and its refusals sit BEFORE every dispatch branch
        // (the split-brain lesson's sharpest edge: a refusal after a
        // sibling's dispatch is dead code, and the silent drop the
        // one-door law kills). The edit branch returns before the film
        // action exactly as its siblings do, so it races every armed
        // door plus the reshoot — each pair its own firing arm, each
        // naming the door to empty.
        if (replaceArmed) {
            // THE MUTUAL REFUSAL (operator, live lane 2026-10-28: "IS
            // RESHOOT SUPPOSED TO BE IN THE CARD ITSELF OR JUST IN THE
            // MODS, THEY WILL CONFLICT"): this branch returns before the
            // film action, so an armed reshoot under a swap would be
            // silently dropped. One door per doc — refuse loud, never a
            // quiet half-run.
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Replace and Reshoot are both armed — the swap branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Replace arm for a reshoot, or empty the Reshoot arm for a swap.');
            }
            renderH3Swap(raw[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        if (repairArmed) {
            // The same reshoot refusal, mirrored (the repair branch also
            // returns before the film action).
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Repair and Reshoot are both armed — the repair branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Repair arm for a reshoot, or empty the Reshoot arm for a repair.');
            }
            renderH3Repair(rep[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        if (extendArmed) {
            // The same reshoot refusal, third edge (the extend branch also
            // returns before the film action).
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Extend and Reshoot are both armed — the extend branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Extend arm for a reshoot, or empty the Reshoot arm for an extension.');
            }
            renderH3Extend(ext[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        if (refineBagArmed) {
            // The same reshoot refusal, fourth edge (the refine branch also
            // returns before the film action).
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Refine and Reshoot are both armed — the refine branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Refine arm for a reshoot, or empty the Reshoot arm for a refine.');
            }
            // THE BAG DISPATCH (GAPS-19): the WHOLE bag rides the family
            // carrier — N entries tile one film, N=1 composes the
            // single-window emission byte-identically. Never bag[0] here:
            // first-wins is the silent-drop class this door exists to kill.
            renderH3RefineBag(ref, p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        if (upscaleBagArmed) {
            // The same reshoot refusal, fifth edge (the upscale branch also
            // returns before the film action).
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Upscale and Reshoot are both armed — the upscale branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Upscale arm for a reshoot, or empty the Reshoot arm for an upscale.');
            }
            renderH3ChainUpscale(ups[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        const editBagRef = p.edit;
        const editDispatchArmed = Array.isArray(editBagRef) && editBagRef.length > 0;
        // THE EDIT DISPATCH (stage 2b): the dial resolution — the
        // entry's seats become the matrix seat's own dial values (the
        // mask source: region carries its tuning seats, the static PNG
        // its file, the whole frame needs nothing; the identity
        // anchors: self, or the still + mannequin pair). renderH3Edit
        // owns every band law from here (the declared-band judge
        // walked the entry's numbers already; the matrix seat refuses
        // the empty dials and the safety cells).
        if (editDispatchArmed) {
            const entry = editBagRef[0];
            const maskSource = typeof entry.mask_source === 'string' ? entry.mask_source : 'region';
            const mask = maskSource === 'static-png'
                ? { source: 'static-png', image: typeof entry.mask === 'string' ? entry.mask : '' }
                : maskSource === 'whole-frame'
                    ? { source: 'whole-frame' }
                    : {
                        source: 'region',
                        prompt: typeof entry.region_prompt === 'string' ? entry.region_prompt : '',
                        grow: typeof entry.mask_grow === 'number' ? entry.mask_grow : 16,
                        blur: typeof entry.mask_blur === 'number' ? entry.mask_blur : 0,
                        detectionThreshold: typeof entry.detection_threshold === 'number' ? entry.detection_threshold : 0.5,
                    };
            const referenceMode = typeof entry.reference === 'string' ? entry.reference : 'self';
            const reference = referenceMode === 'still+mannequin'
                ? {
                    mode: 'still+mannequin',
                    still: typeof entry.still === 'string' ? entry.still : '',
                    mannequin: typeof entry.mannequin === 'string' ? entry.mannequin : '',
                }
                : { mode: 'self' };
            renderH3Edit(entry, mask, reference, p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        instantiateAction(declaredAction(h3Decl, 'film'), p, model, g, runId);
    },
};
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
};
export const inject = ['comfyui'];
export function apply(ctx) {
    registerCard(ctx, ctx.comfyui);
}
export function registerCard(ctx, comfy) {
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
            promptHint: 'one continuous action line per shot — the card frames each shot at render (no "shot 1:" prefixes, no first-frame/last-frame language; pin frames on the timeline\'s keyframes lane). Two reference rails, both live, combinable: the anchor (image / the keyframes lane) pins the opening AND conditions identity while the loose rails (ref_images and ref_videos) stack after it — both rails ride one window.',
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
            // THE SEAT MAP (the one-bench burn, 2026-11-14): the guide
            // spelling feeds the rail's First-frame seat — the same
            // precedence the schema derivation reads (image before
            // image_name), declared so the read-side fold serves the
            // canonical seat and the timeline renders the frame the
            // agent attached, never a blank square.
            aliasSeats: { image_name: 'image' },
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
        admits: ['ctx_*', 'edit', 'extend', 'fps_seconds', 'image_name', 'k', 'noise_seed', 'quant', 'ref_image_size', 'refine', 'repair', 'replace', 'reshoot', 'sla_*', 'upscale', 'variant'],
        // THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the
        // features.modifiers channel): the swap + repair + extend arms.
        // The mask card's sam3/sam2/draw precedent — one kind per arm,
        // entry fields as the popup's tiles, requires as the
        // presence-gated arm packs.
        mods: DECLARED_MOD_KINDS,
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
        // THE FAMILY ADMISSION FACE IS GONE (2026-11-15, the lane-law
        // retirement — the operator's gate-11 burn: the compose gate
        // refused a lawful Final-Cut doc with four unactionable lines).
        // The t4r render arm now mounts the post chain (actions.ts), so
        // no finish key is lane-dead and there is nothing for this card
        // to refuse one hop early. The generic registry seat
        // (cardsRegistry.admitStageFamily) stays optional for any future
        // card that declares a real family clause; h3 declares none.
        // Do not resurrect a lane dead-letter here — cure the renderer
        // and let the walk's own shape gates (route-master, film-only,
        // guide seats) judge the doc.
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
            const gateInput = coerceWireBoolean(p);
            if (gateInput.length === null) {
                throw new Error('length is null — send a real frame count or omit the key; the 17k+5 grid default fills natively (never null)');
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
                'refs', 'replace', 'repair', 'extend', 'edit', 'reshoot', 'variant', 'quant', 'refine', 'upscale', 'model', '__steps_pinned', '__shift_pinned', 'ctx_*',
            ], gateInput);
            // THE SINGLE-CALL LIFT runs FIRST (the guard below reads the
            // lifted anchor): a one-call doc's row IS the window — its
            // prompt, image (the anchor), refs (the reference bundle) and
            // knobs ride the call, never a parallel run-level vocabulary.
            {
                const liftRows = Array.isArray(p.calls) ? p.calls : null;
                if (liftRows !== null && liftRows.length === 1 && !Array.isArray(liftRows[0].calls)) {
                    const single = liftRows[0];
                    const knobs = (single.knobs ?? {});
                    p = { ...p, ...knobs };
                    const img = (single.image ?? single.ref_image ?? single.image_name);
                    if (typeof img === 'string' && img !== '')
                        p.image = img;
                    if (single.refs !== undefined)
                        p.refs = single.refs;
                    if (typeof single.text === 'string' && single.text.trim() !== '')
                        p.prompt = single.text.trim();
                }
            }
            assertOverlayGated(p, 'h3-timeline single-call lift');
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound(p, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the h3-timeline card — every boarded family (h3) composes its own declared segment; this address owns none`);
            }
        },
        // the t4-family strip pass rides the kit (python: `if not is_t4r`).
        finalize: finalizeH3,
    }));
}
//# sourceMappingURL=card.js.map
