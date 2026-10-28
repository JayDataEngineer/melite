import { DECL as h3Decl } from '@melite/models-h3';
import { JSON_ARRAY_PARAMS, coerceWireBoolean, paramSchema, schema, } from '@melite/models-h3/schema';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { finalizeH3 } from '@melite/models-h3';
import { renderH3Swap } from '@melite/models-h3';
import { renderH3Repair } from '@melite/models-h3';
import { reshootArmed } from '@melite/models-h3';
import { parseH3Facts } from '@melite/models-h3/actions';
import { assertOverlayGated } from '@melite/models-h3';
export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract';
import { deriveWindowFamily, T4_ONLY_KEYS } from '@melite/models-h3/timelineContract';
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
        { name: 'swap_prompt', label: 'Swap prompt', type: 'text', default: '', tooltip: 'The swap action text — agent-composed, user-confirmed (the R2V prompt via H3FillShots).' },
        { name: 'keep_audio', label: 'Keep source audio', type: 'boolean', default: true, tooltip: 'ON: the source clip\'s audio rides the swap unchanged (the reference posture — preserve source audio, assemble from source). OFF: the soundtrack is generated fresh with the swap (generate all audio, assemble generated).' },
        { name: 'roles', label: 'Roles', type: 'text', default: '', tooltip: 'Which person to replace (the plan roles seat; empty = the detected lead).' },
        { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
        { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
        { name: 'clip_seconds', label: 'Clip seconds', type: 'number', default: 6, min: 1, max: 60, step: 1, tooltip: 'The plan clip_seconds (reference 6).' },
        { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 0, max: 362, step: 1, tooltip: 'The plan overlap_frames (reference 39; the R1 single clip carries it through the plan head).' },
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
    section: 'Repair — re-render a region of the source clip (hands, body, face) with a per-frame SAM3 mask at partial denoise. The rest of the frame and the audio are held. Film runs leave this arm empty.',
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
        { name: 'window_length', label: 'Window length (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, tooltip: 'Frames in the repair window — 0 runs to the end of the clip (the whole-clip posture). clip_seconds still caps the render budget.' },
        { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
        { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
        { name: 'clip_seconds', label: 'Clip seconds', type: 'number', default: 6, min: 1, max: 60, step: 1, tooltip: 'The plan clip_seconds (reference 6) — the render budget the window is cut within.' },
        { name: 'overlap_frames', label: 'Overlap frames', type: 'number', default: 39, min: 0, max: 362, step: 1, tooltip: 'The plan overlap_frames (reference 39).' },
        { name: 'resolution', label: 'Plan resolution', type: 'select', default: '736p', options: [
                { value: '480p', label: '480p — quick preview' },
                { value: '576p', label: '576p' },
                { value: '736p', label: '736p — reference default' },
                { value: '768p', label: '768p' },
                { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
            ], tooltip: "The plan resolution tier (reference '736p')." },
    ],
};
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
        // A PRESENT bag must be one entry (max_stack 1); anything else refuses loud here.
        const raw = p.replace;
        if (raw !== undefined && !(Array.isArray(raw) && raw.length === 0)) {
            if (!Array.isArray(raw) || raw.length === 0) {
                throw new Error('h3-timeline replace: the replace bag is present but carries no entry — state exactly one swap entry (max_stack 1) or omit the arm');
            }
        }
        const rep = p.repair;
        if (rep !== undefined && !(Array.isArray(rep) && rep.length === 0)) {
            if (!Array.isArray(rep) || rep.length === 0) {
                throw new Error('h3-timeline repair: the repair bag is present but carries no entry — state exactly one repair entry (max_stack 1) or omit the arm');
            }
        }
        const replaceArmed = Array.isArray(raw) && raw.length > 0;
        const repairArmed = Array.isArray(rep) && rep.length > 0;
        // THE REPLACE↔REPAIR REFUSAL (the one-door-per-doc law's second
        // edge, 2026-11-12): both arms render through the same chain
        // spine and the same sampler tail — two armed bags would race
        // for one emission. Refuse loud, never a quiet first-wins.
        if (replaceArmed && repairArmed) {
            throw new Error('h3-timeline: Replace and Repair are both armed — one door per doc (both ride the same masked-edit spine; two armed bags would race for one emission). Empty the Replace arm for a repair, or the Repair arm for a swap.');
        }
        if (replaceArmed) {
            // THE MUTUAL REFUSAL (operator, live lane 2026-10-28: "IS
            // RESHOOT SUPPOSED TO BE IN THE CARD ITSELF OR JUST IN THE
            // MODS, THEY WILL CONFLICT"): this branch returns before the
            // film action, so an armed reshoot under a swap would be
            // silently dropped. One door per doc — refuse loud, never a
            // quiet half-run.
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Replace and Reshoot are both armed — the swap branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Replace arm for a reshoot, or switch Reshoot off for a swap.');
            }
            renderH3Swap(raw[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        if (repairArmed) {
            // The same reshoot refusal, mirrored (the repair branch also
            // returns before the film action).
            if (reshootArmed(p)) {
                throw new Error('h3-timeline: Repair and Reshoot are both armed — the repair branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the Repair arm for a reshoot, or switch Reshoot off for a repair.');
            }
            renderH3Repair(rep[0], p, parseH3Facts(model.lane_inputs), g, runId);
            return;
        }
        instantiateAction(declaredAction(h3Decl, 'film'), p, model, g, runId);
    },
};
export const identity = {
    label: 'Generate Video',
    description: 'THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.',
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
        tags: ['video', 'generate', 'text-to-video', 'timeline', 'edit'],
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
                // The re-shoot source seat (feature 024): the clip the new
                // camera move is shot FROM — a single video producer, not a
                // stack (one re-shoot per film). Arming rides the schema's
                // reshoot_enabled switch; an unseated clip leaves the film
                // graph byte-identical.
                reshoot_clip: 'video',
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
                when: (p) => !((Array.isArray(p.replace) && p.replace.length > 0) || (Array.isArray(p.repair) && p.repair.length > 0)),
            },
            {
                channel: 'default',
                node: '*',
                nodeClass: 'MiniMaxH3ChainAssemble',
                when: (p) => (Array.isArray(p.replace) && p.replace.length > 0) || (Array.isArray(p.repair) && p.repair.length > 0),
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
        admits: ['ctx_*', 'fps_seconds', 'image_name', 'k', 'noise_seed', 'quant', 'ref_image_size', 'repair', 'replace', 'sla_*', 'variant'],
        // THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the
        // features.modifiers channel): the swap + repair arms. The mask
        // card's sam3/sam2/draw precedent — one kind per arm, entry
        // fields as the popup's tiles, requires as the presence-gated
        // arm packs.
        mods: [REPLACE_MOD, REPAIR_MOD],
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
            if (deriveWindowFamily(params) !== "t4r")
                return { ok: true };
            const explicit = new Set(Object.keys(params).filter((k) => params[k] !== null));
            const bad = T4_ONLY_KEYS.filter((k) => explicit.has(k)).sort();
            if (bad.length === 0)
                return { ok: true };
            return {
                ok: false,
                error: `card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: ${bad.join(", ")}`,
            };
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
                'refs', 'replace', 'repair', 'variant', 'quant', 'refine', 'model', '__steps_pinned', '__shift_pinned', 'ctx_*',
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
