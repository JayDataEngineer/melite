import { primeFamilySeats, seatOf, requireSeat } from "./family-seats.js";
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { EDIT_FIELDS } from "./editDecl.js";
import { checkPressParams, refusePress, promptAdmissionWarns } from "./promptGate.js";
// THE CARRIER'S CALLABLE FACE rides the family seat now (family-seats.ts):
// the compose strict resolve walks `callableSchema(seat.paramSchema)` — same
// carrier the schemaCarrier registration hands the door. The full
// `schema()` normalizer CANNOT run there (its t4r admission judges
// stated-and-valued keys as explicit injects, and the merged carrier
// doc's walked defaults would read as injects).
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
// THE LITERAL (the plugin law, 2026-11-16): the boarded id is the
// card's own declaration now — the family seat is keyed by it
// (family-seats.ts seatOf), and the family-coverage wall judges the
// id against the dev tree's family DECLs (drift reds there, not
// here).
export const BOARDED = ['h3'];
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
// THE FAMILY-OWNED KIND (the plugin law, 2026-11-16): the loras kind
// is FAMILY DATA — its catalog rows and ghost default live in
// @melite/models-h3 — so the kind builds FROM THE SEAT and costs its
// own seat: a pruned family package serves the card-local kinds
// (edit/reshoot) only, and the served face shows no LoRA seat at
// all (never a defaulting catalog, never a broken chip).
const lorasMod = (seat) => ({
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
    default_entry: seat.defaultLoraEntry(),
    section: 'LoRAs — the family adapters this film stacks on its model seat (the acceleration/distill row and the CrossView camera row). Every entry states the catalog id and the strength; unstated steps and sigma shift marry from the catalog row. Film runs leave this arm empty (the card default row still applies).',
    fields: [
        { name: 'id', label: 'LoRA', type: 'select', default: 'h3_silver_dareties', options: seat.loraRows.map((row) => ({ value: row.id, label: row.label })), tooltip: 'The adapter, by its catalog id — the family file the provisioner downloads; the render loads this id verbatim.' },
        { name: 'strength', label: 'Strength', type: 'number', default: 0.8, min: 0, max: 2, step: 0.05, tooltip: 'Adapter weight. Each row has a designed point (the default merge row 0.8, the distill rows 0.6–1, the refiner 0.35); the render only reads the number you state.' },
        { name: 'steps', label: 'Steps', type: 'number', max: 50, step: 1, tooltip: 'The step count to marry — OMIT the key and the catalog row\'s own count rides (the row domain owns the floor and the default; the door refuses any stated count outside the row\'s declared domain). State a number only inside the row\'s domain, when the schedule must bend.' },
    ],
});
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
        { name: 'region_prompt', label: 'Aim at a subject', type: 'string', default: '', tooltip: 'A free-text SAM3 detection prompt naming the subject the camera move anchors to (e.g. "her face", "the clock"). When stated, the card tracks the subject across the clip (the edit door\'s own region machinery — per-frame by construction, detect_interval 1, so the aim follows a moving subject with no frame to pick) and the warp pivots on it: the orbit circles the subject, a push-in lands it framed. A close-up is a press, not a pan guess. Empty (default) keeps the explicit pivot dials\' behavior.' },
        { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01, tooltip: 'The SAM3 text-detection score threshold for the aim track (rides only when "Aim at a subject" is stated — the edit door\'s own seat, same default 0.5). Lower finds more, noisier masks; higher only the confident ones. Tune down when the subject is thin or partially occluded, up when the track latches onto the background.' },
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
 *  Continuation (continuation + extend_seconds), the
 *  no-reference second pass (refine + scale), and the deferred
 *  upscale of a prior run (chain_run) ARE cells on this door —
 *  dials of the bag, served by their own preset chips; the one
 *  door this family refuses to fold is Reshoot (a different
 *  chain, never a mask/denoise variation). */
export const EDIT_MOD = {
    kind: 'edit',
    label: 'Video edit',
    param_key: 'edit',
    schema_key: 'edit',
    category: 'ordered',
    cardinality: 'list',
    max_stack: 1,
    // THE V2V WINDOWS FACE (queue 11 reopened, operator 2026-11-08:
    // "NO WINDOWS IN THE FORM!" — the video2video form carries the
    // windows + the split-by-timestamp seat with the context-carry
    // option; the timeline strip's swapped calls section is the OTHER
    // view of the same windows).
    leaf_face: 'v2v-windows',
    requires: [
        'ComfyUI-VideoHelperSuite',
        'ComfyUI-MiniMaxH3-Context-Loop',
        'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
        'ComfyUI-KJNodes',
        'comfyui-h3-oneclick-swap',
    ],
    // THE SECTION CAPTION (the contract's own law, formSpec.ts: `section`
    // is the kind's declared ONE-LINE name for what the field stack IS —
    // it renders verbatim as the mod leaf's caption row). The 897-char
    // teaching paragraph that stood here until 2026-11-09 (the operator's
    // modal burn: "WEIRD LONG DESCRIPTIONS") was agent documentation, not
    // UI copy — its content lives where it belongs: the field rows'
    // tooltips (EDIT_FIELDS, editDecl.ts) and the agent docs
    // (src/agents/AGENT.md, the edit-bag/Reshoot routing law).
    section: 'Video edit — mask, anchor, denoise, refine in one bag.',
    // THE DECLARATION DATA lives in the client-safe leaf (editDecl.ts,
    // 2026-11-09): the studio rail projects the SAME field rows the
    // card serves, and a client value-import of THIS module refuses
    // the client-bundle purity gate (the compose plane rides here).
    fields: EDIT_FIELDS,
    // THE PRESET CHIPS (stage 3): the retired bag NAMES live on as
    // starting cells over this ONE schema — each chip is a named
    // THE MODIFIER SECTIONS (operator 2026-11-09, §0.8 THE FLOW
    // MODEL — "check the box, behind the scenes the special nodes
    // are used"): each row is a CHECKABLE stage on the source video.
    // The patch is a matrix cell (mask source × identity anchors ×
    // denoise pole) the registration door judges against the fields
    // above (a section may not invent vocabulary or patch an
    // undeclared seat). A check seeds its dials onto the single
    // entry (uncheck strips seed-only values, hand-moved dials
    // stay); checked sections COMPOSE into the one bag — repair +
    // upscale in the same run is two checkboxes, never a combined
    // route. The refine/upscale sections are matrix cells since the
    // fourth dial landed (the refine switch + scale serve them on
    // this door) and the continuation section is slice 2's dial
    // (continuation + extend_seconds); the one modifier that stays
    // its own door is Reshoot (a different chain, MoGe depth +
    // CrossView — not a mask/denoise variation).
    sections: [
        { id: 'repair-region', label: 'Repair', tooltip: 'The repair section: identity anchored to the source itself, partial denoise holding everything outside the mask — and its sound. TWO FACES: one entry is the single-window face — no window stated runs the WHOLE film (the carry split segments the film on its own timeline and joins the windows into one film), a stated window repairs just that window. The tiled face is the legacy repair BAG with N entries: each entry states its window\u2019s span in seconds (window_seconds; the carrier judges the engine grid and derives every start, so windows abut from the head) and the carrier joins them into ONE film at <runId>/repair. The mask is RECEIVED: one staged PNG per entry (the track run\u2019s pixel-max union is the recommended bridge; the chain resizes it to its own geometry in-graph) — the repair refuses without one.', patch: { mask_source: 'static-png', reference: 'self', denoise: 0.32, keep_audio: true } },
        { id: 'identity-swap', label: 'Swap', tooltip: 'The swap section (one, per §0.7 — clothing vs identity is prompt words, never two pills): the region tracked frame by frame, identity carried by a replacement still + a mannequin video (the motion carrier — any video clip may be bound; the source clip itself is a valid mannequin when the motion is already in the shot, no track run required); denoise seeds 1 (full re-render of the masked side). A still+mannequin swap of a DIFFERENT person needs near-full noise (measured: 0.5 = none, 1.0 = full); 0.55 keeps the source\'s motion by keeping its identity — the garment read, never the recast.', patch: { mask_source: 'region', reference: 'still+mannequin', denoise: 1 } },
        { id: 'whole-frame-restyle', label: 'Whole-frame restyle', tooltip: 'Nothing held: the whole frame re-renders at partial denoise anchored to the source itself — stay under 0.8 (the identity-boil floor refuses beyond it on this anchor).', patch: { mask_source: 'whole-frame', reference: 'self', denoise: 0.6 } },
        { id: 'refine-2x', label: 'Upscale 2x', tooltip: "ONE dial: the posture composes itself — whole-frame, self-anchored, denoise 0.32, 56 f windows under the measured 141 f 2x ceiling, the learned upscale riding the edit's own latents in the same run. ANY staged video rides the source seat — an outside clip is not a special case, no run id, no pattern. State a seat only to override (a prompt steers the re-render; a stated window rides its own judgement).", patch: { refine: true, scale: 2 } },
        { id: 'extend-continuation', label: 'Extend', tooltip: "The continuation posture: blank mask, self-anchored, full denoise — fresh seconds appended to the source's last frame (the forced seam) and joined with the prior into one film; state extend_seconds.", patch: { continuation: true, mask_source: 'whole-frame', reference: 'self', denoise: 1 } },
        { id: 'upscale-2x', label: 'Upscale prior run 2x', tooltip: "Re-render a finished run at double size: pick it in 'Prior chain run' — its saved scenes resume one by one and upscale (denoise 0.24, steps 20; a blank prompt reuses the run's own scene prompts). An unknown run name refuses loud at the execute door.", patch: { chain_run: 'prior-chain-run-name', denoise: 0.24, steps: 20 } },
    ],
};
/** THE CARD-LOCAL KINDS (the plugin law, 2026-11-16): the kinds this
 *  card owns outright — their data lives HERE, never in the family
 *  package, so they serve even when the family package is absent
 *  (the roster reader never dies for a family). */
const CARD_LOCAL_MOD_KINDS = [
    RESHOOT_MOD, EDIT_MOD,
];
/** THE SERVED ROSTER, seat-derived (one roster, two readers: the
 *  served mods row and the declared-band judge's walk): the
 *  card-local kinds always, the family-owned loras kind when the
 *  @melite/models-h3 seat boarded (absent family = no LoRA seat on
 *  the served face — the seat is the family's own cost). Callers run
 *  post-priming (registration, the band judge at compose). */
const declaredModKinds = () => {
    const seat = seatOf('h3');
    return seat === undefined ? CARD_LOCAL_MOD_KINDS : [...CARD_LOCAL_MOD_KINDS, lorasMod(seat)];
};
/** THE LEGACY EDIT ALIASES (slice 4 of the FRICTION_3 collapse —
 * THE DELETION): the five peer bags left the DECLARED roster (the
 * served face is edit + reshoot + loras; the operator 2026-11-06:
 * "REPAIR AND REPLACE ARE THE [redacted - the emphatic spelling lives
 * in the receipt] SAME OPERATION! REPAIR JUST USES THE ORIGINAL"). The
 * names live on as the edit door's preset
 * cells; a legacy doc (a saved bench, an old session, a pressed
 * chip from before the collapse) resolves into the ONE bag at the
 * compose door — compose-through, never a frozen peer: the
 * translation states the dial cell the name always named, every
 * translatable seat rides verbatim, and a seat no dial serves
 * REFUSES LOUD (never the silent drop). */
export const LEGACY_EDIT_KEYS = ['replace', 'repair', 'extend', 'refine', 'upscale'];
/** F18's cross-regime bag roster, DERIVED (the back-end evasion
 *  audit B-1, 2026-11-07): every declared kind whose fields carry a
 *  resolution seat, plus the legacy aliases that translate into one.
 *  The pass-side admission scans THIS list — never a hand copy of
 *  retired names (the pre-collapse list judged replace/repair/
 *  extend while the served edit spelling rode unjudged). */
// Every CARD_LOCAL_MOD_KINDS row carries fields at this HEAD; the
// interface keeps fields optional (a fields-less kind must still
// admit no resolution seat, never crash the roster derivation).
// THE ROSTER STAYS A MODULE VALUE (the harness lane-seat reads the
// property synchronously) derived over the card-local kinds: the
// family-owned loras kind carries no resolution field (its served
// columns are id/strength/steps), so its seat costs nothing here.
const resolutionParamKeys = [];
for (const kind of CARD_LOCAL_MOD_KINDS) {
    /* v8 ignore next 1 */
    const fields = kind.fields ?? [];
    if (fields.some((f) => f['name'] === 'resolution'))
        resolutionParamKeys.push(kind.param_key);
}
export const CROSS_REGIME_BAG_KEYS = [
    ...resolutionParamKeys,
    ...LEGACY_EDIT_KEYS,
];
const isArmedBag = (v) => Array.isArray(v) && v.length > 0;
/** Which edit posture a walked doc rides — the ONE law the flow
 * output bindings and the compose door both read (one truth home):
 * 'film' nothing armed; 'inchain' the masked-edit matrix cells
 * (mask postures, the refine dial, the chain_run loop — every
 * posture whose terminal is the chain assemble); 'join' the
 * continuation posture (the joined-film SaveVideo, the file-boundary
 * grammar); 'reshoot' the different chain that stays its own door. */
export function editPosture(p) {
    if (isArmedBag(p.reshoot))
        return 'reshoot';
    // (B-7, the back-end evasion audit 2026-11-07) resolve-then-posture:
    // the legacy names ride the SAME translation the compose door runs
    // (resolveLegacyEditAliases → the ONE edit entry), then the one
    // entry's own posture decides — never a second hand-copy of the
    // alias table. A translation flip here without the resolver's own
    // flip is structurally impossible: the resolver IS the derivation
    // (card.spec's legacy edge arms bind it — flip the extend
    // translation and the join arm reds).
    const resolved = resolveLegacyEditAliases(p);
    const edit = resolved.edit;
    if (isArmedBag(edit)) {
        // (D-gap, the compose-door robustness arm) a stated entry that
        // is not a stanza object (null, a bare value, a nested array)
        // is a malformed doc, not a TypeError: the refusal names the
        // door and the got-shape, loud, before any entry read.
        const first = edit[0];
        if (typeof first !== 'object' || first === null || Array.isArray(first)) {
            throw new Error(`h3-timeline edit: the bag's single entry is not a knob stanza (got ${Array.isArray(first) ? 'an array' : first === null ? 'null' : `a bare ${typeof first}`}) — an entry is the mask × anchors × denoise stanza object; state it or omit the arm`);
        }
        return editEntryPosture(first);
    }
    return 'film';
}
const editEntryPosture = (e) => e !== undefined && e.continuation === true ? 'join' : 'inchain';
/** THE ALIAS RESOLVER: runs at the compose door BEFORE the bag
 * guards — a doc carrying legacy keys resolves into the edit bag
 * (the translation table below), the legacy keys leave the doc,
 * and the dispatch below sees ONE bag. Two legacy keys, or a
 * legacy key beside an armed edit bag, refuse loud (one door per
 * doc — the pair-refusal matrix's ONE surviving law, now stated
 * as parameter validation over the one bag). Seats with no dial
 * refuse loud naming the edit spelling. */
export function resolveLegacyEditAliases(p) {
    // A legacy bag is an ARRAY or a refusal: the peer law the bags
    // always carried (an ABSENT or EMPTY bag is the unused arm and the
    // film stays byte-stable; a non-array is present-but-entryless and
    // refuses loud). The empty arm is DROPPED, not refused — a doc
    // written with `replace: []` predates the collapse and must keep
    // composing its film.
    const out0 = { ...p };
    for (const k of LEGACY_EDIT_KEYS) {
        const v = p[k];
        if (v === undefined)
            continue;
        if (!Array.isArray(v)) {
            throw new Error(`h3-timeline ${k}: the ${k} bag is present but carries no entry — state exactly one ${k} entry (the name is a preset cell of the edit bag) or omit the arm`);
        }
        if (v.length === 0)
            delete out0[k];
    }
    p = out0;
    const armed = LEGACY_EDIT_KEYS.filter((k) => isArmedBag(p[k]));
    if (armed.length === 0)
        return p;
    if (armed.length > 1) {
        throw new Error(`h3-timeline: ${armed.join(' and ')} are both armed — one door per doc (the names are preset cells of the ONE edit bag: it states the whole mask × anchors × denoise matrix; state the cell there). Empty every arm but the one posture you want`);
    }
    if (isArmedBag(p.edit)) {
        throw new Error(`h3-timeline: Video edit and ${armed[0]} are both armed — one door per doc (${armed[0]} is a preset cell of the edit bag, not a second door). Empty one arm`);
    }
    const key = armed[0];
    const bag = p[key];
    // THE TILED REPAIR BAG (the windows arc, 2026-11-22): the repair
    // face is the ONE legacy name whose multi-entry bag still composes —
    // N ≥ 2 hand-tiled windows ride the family's repair-bag carrier
    // (each entry its own masked-edit window, the windows joined into
    // ONE repair film). The bag stays ARMED under its own key and the
    // compose dispatch hands it to the seat below; every other legacy
    // name keeps the one-entry law (their cells have no tiling).
    if (key === 'repair' && bag.length >= 2)
        return p;
    if (bag.length > 1) {
        throw new Error(key === 'refine'
            ? `h3-timeline: refine carries ${bag.length} entries — the bag is ONE window per doc (the tiling and the join are the loop's: the context carry serves the seams (F3-14 cured, 2026-11-15), and the window is the ~2.33 s design cell). State one window per doc`
            : `h3-timeline: ${key} carries ${bag.length} entries — one entry per arm (the name resolves into ONE edit entry; every entry after the first would be silently dropped)`);
    }
    const e = bag[0];
    // (D-gap, same arm as the walk's) the legacy bag's one entry is
    // the preset cell's stanza — null or a bare value is malformed,
    // refused loud with the got-shape (a TypeError here used to kill
    // the compose door itself).
    if (typeof e !== 'object' || e === null || Array.isArray(e)) {
        throw new Error(`h3-timeline ${key}: the bag's single entry is not a knob stanza (got ${Array.isArray(e) ? 'an array' : e === null ? 'null' : `a bare ${typeof e}`}) — an entry is the preset cell's stanza object; state it or omit the arm`);
    }
    const entry = translateLegacyEntry(key, e);
    const out = { ...p };
    for (const k of LEGACY_EDIT_KEYS)
        delete out[k];
    out.edit = [entry];
    return out;
}
const seatStr = (e, k) => typeof e[k] === 'string' ? e[k] : '';
/** The per-name translation: the dial cell the name always named
 * (FRICTION_3's collapse map), every translatable seat verbatim. */
function translateLegacyEntry(key, e) {
    // (B-3, the back-end evasion audit 2026-11-07) the refusal was a
    // four-seat enumeration; the law is DERIVED now: every seat the
    // translation consumes is recorded, and the closing sweep refuses
    // any STATED legacy key the translation never consumed — an
    // unstated seat is never silently dropped, whatever its name.
    const consumed = new Set();
    const pass = (...keys) => {
        const o = {};
        for (const k of keys) {
            consumed.add(k);
            if (e[k] !== undefined)
                o[k] = e[k];
        }
        return o;
    };
    /** A seat the translation READS without passing verbatim (a
     *  rename's source, a translated unit) — consumed, never swept. */
    const take = (...keys) => { for (const k of keys)
        consumed.add(k); };
    const refuseSeat = (seat, why) => {
        consumed.add(seat);
        if (e[seat] !== undefined && e[seat] !== '' && !(typeof e[seat] === 'number' && e[seat] === 0)) {
            throw new Error(`h3-timeline: the ${key} arm's '${seat}' seat rides no edit dial — ${why}. Restate the doc on the edit bag (its preset cell '${key}' is the same posture)`);
        }
    };
    const out = translateLegacyCell(key, e, { pass, take, refuseSeat, seatStr });
    for (const k of Object.keys(e)) {
        // THE ESTATE NAMESPACE (D-5, 2026-11-16): double-underscore keys
        // on a bag row are the estate's own compose-copy stamps (the
        // probed-length __source_frames), never author seats — the sweep
        // refuses silent AUTHOR drops, and the estate's stamp is not an
        // author statement (cardsRegistry stamps it onto the copy the
        // compose judges; the saved doc never carries it).
        if (k.startsWith('__'))
            continue;
        if (!consumed.has(k)) {
            throw new Error(`h3-timeline: the ${key} arm's '${k}' seat rides no edit dial — the translation consumed every seat the old kind served. Restate the doc on the edit bag (its preset cell '${key}' is the same posture)`);
        }
    }
    return out;
}
function translateLegacyCell(key, e, h) {
    const { pass, take, refuseSeat, seatStr } = h;
    switch (key) {
        case 'replace':
            refuseSeat('roles', 'the edit door carries no cast-roles rail; name the cast inside edit_prompt');
            return {
                ...pass('source_clip', 'still', 'mannequin', 'mask', 'keep_audio', 'seed', 'steps', 'clip_seconds', 'overlap_frames', 'resolution'),
                edit_prompt: (take('swap_prompt'), seatStr(e, 'swap_prompt')),
                mask_source: 'static-png',
                reference: 'still+mannequin',
                denoise: 1,
            };
        case 'repair':
            // P0-2 (defect board row 2, the operator's contract: "repair
            // receives a mask and errors without one"): the repair arm
            // RECEIVES one staged PNG — prose (region_prompt) no longer
            // manufactures a repair's mask, and the SAM3 tuning seats
            // (mask_grow/mask_blur/detection_threshold) ride no static
            // dial: the recommended bridge (the track run's pixel-max
            // union) arrives already grown. The refusal names the field.
            if (seatStr(e, 'mask').trim() === '') {
                throw new Error(`h3-timeline: the repair arm's 'mask' seat names no media — a repair RECEIVES a mask (ONE staged PNG; the track run's pixel-max union is the recommended bridge) and refuses without one; prose (region_prompt) no longer manufactures a repair's mask (the operator's contract, defect board row 2)`);
            }
            return {
                ...pass('source_clip', 'mask', 'denoise', 'window_start', 'window_length', 'seed', 'steps', 'clip_seconds', 'overlap_frames', 'resolution'),
                edit_prompt: (take('repair_prompt'), seatStr(e, 'repair_prompt')),
                mask_source: 'static-png',
                reference: 'self',
                // the arm's own declared default (the deleted kind filled it at
                // the walk): absence is never authorship, and the edit door's
                // 1-default is the re-render pole this cell never was
                denoise: typeof e.denoise === 'number' ? e.denoise : 0.32,
            };
        case 'extend':
            return {
                ...pass('source_clip', 'extend_seconds', 'seed', 'steps', 'overlap_frames', 'resolution', 
                // THE WINDOW ROSTER (D-03 R4b): the per-window prompt seat
                // rides the legacy cell verbatim — its judge (line count,
                // blank lines) lives at the extend door, one law one seat.
                'window_prompts'),
                edit_prompt: (take('extend_prompt'), seatStr(e, 'extend_prompt')),
                continuation: true,
                mask_source: 'whole-frame',
                reference: 'self',
                denoise: 1,
            };
        case 'refine':
            refuseSeat('mode', 'the edit door refine dial is the same-run handoff (scale 1-4), never the bag mode spelling');
            refuseSeat('windows', 'one window per edit entry (the bag N-entry tiling is not a dial cell)');
            refuseSeat('start_seconds', 'state the window in frames on the edit door (window_start)');
            return {
                ...pass('source_clip', 'denoise', 'steps', 'seed', 'overlap_frames', 'scale'),
                edit_prompt: (take('refine_prompt'), seatStr(e, 'refine_prompt')),
                mask_source: 'whole-frame',
                reference: 'self',
                // The arm's WINDOW is seconds on the old seat and frames on
                // the edit bag (window_length); the edit bag's clip_seconds
                // is the engine PLAN budget (band 2.5–15), never this
                // window. Absence rides the arm's declared design default —
                // a family-declared limit, so it rides the SEAT: an absent
                // family refuses loud (never a silently defaulted limit).
                window_length: Math.round((take('clip_seconds'), typeof e.clip_seconds === 'number' ? e.clip_seconds : requireSeat('h3-timeline', "legacy refine arm's declared window default").refineDefaultClipSeconds) * 24),
                // the arm's own declared denoise default (see the repair cell)
                denoise: typeof e.denoise === 'number' ? e.denoise : 0.32,
                refine: true,
            };
        case 'upscale': {
            const run = seatStr(e, 'chain_run').trim();
            if (run === '') {
                throw new Error("h3-timeline: the upscale arm states no chain_run — the deferred second pass resumes a PRIOR run's checkpointed scenes; with no run there is nothing to second-pass. State the run name (the edit bag's chain_run seat is the same posture)");
            }
            return {
                ...pass('chain_run', 'denoise', 'steps', 'segment_crf'),
                edit_prompt: (take('prompt'), seatStr(e, 'prompt')),
                // the arm's own declared default (the pass-2 recipe window)
                denoise: typeof e.denoise === 'number' ? e.denoise : 0.24,
            };
        }
        // unreachable by construction: the caller arms the key off
        // LEGACY_EDIT_KEYS' own filter (resolveLegacyEditAliases), so a
        // key outside the five names never dispatches. Kept as the
        // switch's exhaustiveness guard over the string-typed seat.
        /* v8 ignore next 5 */
        default:
            throw new Error(`h3-timeline: '${key}' is not a legacy edit key — the alias table serves exactly ${LEGACY_EDIT_KEYS.join(', ')}`);
    }
}
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
    // THE SERVED ROSTER (seat-derived): the family-owned loras kind's
    // bands judge with the card-local ones when the seat boarded.
    const kinds = declaredModKinds();
    /** One bag against one kind's declared numeric rows (the walk is
     *  shared: each served kind judges its own bag; the tiled repair
     *  bag — the legacy cell kept armed under its own key — judges
     *  against the edit kind's rows, the cell it resolves to). */
    const judgeBag = (kind, bag, label) => {
        for (const [i, e] of bag.entries()) {
            if (e === null || typeof e !== 'object' || Array.isArray(e))
                continue;
            const entry = e;
            /* v8 ignore next 1 -- every served-roster kind carries fields at this
               HEAD; the interface keeps fields optional (a fields-less kind walks zero
               fields, never crashes the judge) */
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
                /* v8 ignore next 1 -- the re-render pole: no declared numeric field at
                   this HEAD carries a sub-1 max (denoise/scale/strength all admit 1 or
                   above), so the step-aside never fires; kept because a future sub-1
                   band must still defer to the family door's re-render voice */
                if (v >= 1 && max < 1)
                    continue; // the re-render pole — the family door's own voice
                // THE REFINE-2X FLOOR RELAX (defect board D-4, 2026-11-16: at
                // scale 2 the longest legal window is 56 f = 2.33 s and the
                // plan node's own floor is 2.5 — NO 2x plan satisfies both,
                // every possible value illegal under one rule or the other):
                // the band is a property of the SEAT, the memory limit of the
                // PASS — under refine + scale >= 2 the floor relaxes to the
                // declared refine_2x_min rung (2.33, the 56 f grid floor the
                // engine itself serves), stated on the same field row as a
                // number; outside that posture the plan node's 2.5 binds.
                // The relax is a floor MOVE, not a bypass: above-range values
                // still refuse, and the engine-facing 141 f ceiling has its
                // own voice downstream (the D-5 probed window).
                let floor = min;
                if (kind.kind === 'edit' && String(f.name) === 'clip_seconds'
                    && entry['refine'] === true && typeof entry['scale'] === 'number' && entry['scale'] >= 2
                    && typeof f['refine_2x_min'] === 'number') {
                    floor = Math.min(min, f['refine_2x_min']);
                }
                if (v < floor || v > max) {
                    throw new Error(kind.kind === 'edit' && String(f.name) === 'clip_seconds' && floor !== min
                        ? `h3-timeline ${label} entry ${i}: 'clip_seconds': ${v} is outside this seat's refine-2x band ${floor}–${max} (the 56 f rung relaxes the plan node's 2.5 floor under refine + scale ≥ 2) — the declaration binds, not the tooltip`
                        : `h3-timeline ${label} entry ${i}: '${String(f.name)}': ${v} is outside this seat's declared band ${min}–${max} — the declaration binds, not the tooltip`);
                }
            }
        }
    };
    for (const kind of kinds) {
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
        judgeBag(kind, bag, kind.kind);
    }
    // THE TILED REPAIR BAG (the windows arc): the resolver keeps an
    // N ≥ 2 repair bag armed under its own key, so the served-roster
    // walk above never sees it — the cell judges here against the
    // edit kind's own declared rows (the repair cell IS the edit bag's
    // masked-partial cell; one band law, one voice). The family
    // carrier judges what the declaration does not carry (the window
    // geometry: grid, budget, derived starts).
    const repairBag = p['repair'];
    if (Array.isArray(repairBag)) {
        const editKind = kinds.find((k) => k.kind === 'edit');
        if (editKind)
            judgeBag(editKind, repairBag, 'repair');
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
    // THE LITERAL KEY (the plugin law, 2026-11-16): the binding is
    // keyed by the boarded id the card declares; the segment's every
    // family face (the film DECL, the edit matrix renderer, the
    // reshoot arm, the facts parser) rides the family seat — the head
    // read refuses loud naming the package when @melite/models-h3 is
    // absent (this address composes nothing without its family).
    h3: (p, model, g, runId) => {
        const seat = requireSeat('h3-timeline', 'compose dispatch');
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
            // (D-gap, the compose-door robustness arm) the ONE entry must
            // be a stanza object — null/a bare value/a nested array is a
            // malformed doc refused loud with the got-shape (the burn:
            // edit:[null] killed the door reading .mask_source off null).
            // An EMPTY bag stays lawful (the clean-film arm owns it).
            if (bag.length === 1) {
                const only = bag[0];
                if (typeof only !== 'object' || only === null || Array.isArray(only)) {
                    throw new Error(`h3-timeline ${key}: the bag's single entry is not a knob stanza (got ${Array.isArray(only) ? 'an array' : only === null ? 'null' : `a bare ${typeof only}`}) — an entry is the ${noun} stanza object; state it or omit the arm`);
                }
            }
            // An EMPTY bag stays lawful (the clean-film arm owns it).
        };
        // THE LEGACY ALIAS RESOLUTION (slice 4 — THE DELETION): a doc
        // carrying a legacy key (a saved bench, an old session, a chip
        // pressed before the collapse) resolves into the edit bag HERE,
        // before any guard or judge — the translation states the dial
        // cell the name always named, the untranslatable seats refuse
        // loud, and everything below sees ONE bag. THE PAIR-REFUSAL
        // MATRIX DIED WITH THE PEERS: two armed names refuse inside the
        // resolver as parameter validation over the one bag (one door,
        // one entry, one posture) — fifteen pairwise edges collapsed
        // into the one law that always underwrote them.
        p = resolveLegacyEditAliases(p);
        const editBagRef = p.edit;
        oneEntryBag('edit', editBagRef, 'edit');
        oneEntryBag('reshoot', p.reshoot, 'reshoot');
        // THE DECLARED-BAND JUDGE (F3-07, R-P3-18): every armed entry's
        // stated numeric fields bind their declared min/max at this door
        // — the translated entries judge against the edit kind's own
        // bands (the legacy kinds left the roster with their bags; the
        // judge walks the DECLARED list, never a frozen literal).
        judgeDeclaredBands(p);
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
            // THE RESHOOT EDGE (the one pair that survives — a different
            // CHAIN, not a dial cell): the edit branch returns before the
            // film action, so an armed reshoot under it would be silently
            // dropped. One door per doc.
            if (seat.reshootArmed(p)) {
                throw new Error('h3-timeline: Video edit and Reshoot are both armed — the edit branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the edit arm for a reshoot, or empty the Reshoot arm for a video edit.');
            }
            const entry = editBagRef[0];
            // THE PATTERN DISSOLUTION (§-1, the operator's burn
            // 2026-11-17: "tired of needing to break patterns for the
            // refine flow"): under the refine switch the mask DERIVES to
            // whole-frame — unstated, or the DECL's region default with
            // no region_prompt text (presence is never authorship) — the
            // cell the seven-key chip used to hand-author. A STATED mask
            // (a masked refine) rides as authored.
            const statedMaskSource = typeof entry.mask_source === 'string' ? entry.mask_source : '';
            const regionPromptText = typeof entry.region_prompt === 'string' ? entry.region_prompt : '';
            const maskSource = entry.refine === true && (statedMaskSource === '' || (statedMaskSource === 'region' && regionPromptText.trim() === ''))
                ? 'whole-frame'
                : (statedMaskSource || 'region');
            const mask = maskSource === 'static-png'
                ? { source: 'static-png', image: typeof entry.mask === 'string' ? entry.mask : '' }
                : maskSource === 'whole-frame'
                    ? { source: 'whole-frame' }
                    : maskSource === 'video'
                        ? {
                            source: 'video',
                            video: typeof entry.mask_video === 'string' ? entry.mask_video : '',
                            grow: typeof entry.mask_grow === 'number' ? entry.mask_grow : 16,
                            blur: typeof entry.mask_blur === 'number' ? entry.mask_blur : 0,
                        }
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
            seat.renderEdit(entry, mask, reference, p, seat.parseFacts(model.lane_inputs), g, runId);
            return;
        }
        // THE TILED REPAIR BAG (the windows arc, 2026-11-22): the
        // resolver keeps an N ≥ 2 repair bag armed under its own key —
        // the family's repair-bag carrier composes it here: each entry
        // its own masked-edit window on the one spine, the windows saved
        // `<runId>/repair_w<k>` and joined into ONE `<runId>/repair` film
        // by the film tail's join primitives (the film-with-splice
        // emission the honesty row owed). A ONE-entry bag never reaches
        // here — the alias translation above keeps that emission
        // byte-identical. The refusals (ceiling, mixed source, seconds
        // dialect, grid, budget) live in the carrier — one owner, the
        // lib bypass face judges the same grammar; the film-order law
        // is the carrier's own derivation (window 0 at the head, every
        // next window at the last's end — always abutting).
        const repairBagRef = p.repair;
        if (Array.isArray(repairBagRef) && repairBagRef.length >= 2) {
            // THE RESHOOT EDGE (the one pair that survives): the tiled
            // bag returns before the film action, so an armed reshoot
            // under it would be silently dropped. One door per doc.
            if (seat.reshootArmed(p)) {
                throw new Error('h3-timeline: the tiled repair bag and Reshoot are both armed — the repair branch never enters the film action, so an armed reshoot would be silently dropped. Pick one door: empty the repair arm for a reshoot, or empty the Reshoot arm for the tiled repair.');
            }
            seat.renderRepairBag(repairBagRef, p, seat.parseFacts(model.lane_inputs), g, runId);
            return;
        }
        // THE PROMPT GATE (the VID GEN handoff, operator 2026-11-12):
        // the film contract's calls judge against the prompt
        // dictionary (src/agents/h3-prompt-dictionary.json — the same
        // rules the prompt-writing skill documents in prose; one
        // source, two consumers) at EVERY compose, press included:
        // caption-grade text REFUSES with the rule id and the
        // dictionary's message verbatim (the message is the
        // teaching), craft misses WARN, and a named waiver
        // (params.prompt_waivers) passes with a receipt line stamped
        // on the run record — never silent. The edit arms return
        // above and skip this gate: they re-film an existing
        // contract's windows, never author fresh call text.
        refusePress(checkPressParams(p));
        instantiateAction(declaredAction(seat.decl, 'film'), p, model, g, runId);
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
// THE PLUGIN LAW (card-without-family audit, 2026-11-16): the card
// face primes its family seat ONCE before registering — cordis
// awaits an async apply, so the priming rides every def-driving
// load (loadCardDefs's ctx.plugin) for free. The family absent from
// the install degrades to its own seat: registration proceeds, the
// family doors refuse loud by name.
export async function apply(ctx) {
    await primeFamilySeats();
    registerCard(ctx, ctx.comfyui);
}
export function registerCard(ctx, comfy) {
    // Idempotent re-prime (the direct-callers' door — priming is
    // memoized); the registration reads below (mods roster, carrier,
    // JSON-array params) resolve the seat AFTER it, so a primed call
    // serves the family faces and an unprimed direct call degrades to
    // the card-local ones.
    void primeFamilySeats();
    const seat = seatOf('h3');
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
        // replace / upscale / refine / extension are the SAME arms in the
        // operator's own words (2026-11-23: "this should've been easily known
        // that we had extend, replace, repair, upscale") — they route here too.
        tags: ['video', 'generate', 'text-to-video', 'timeline', 'edit', 'repair', 'replace', 'reshoot', 'extend', 'extension', 'refine', 'upscale'],
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
        // FILM-LANE SCOPED (friction-2-infra D-01 R2): the rails ride the
        // film lane's windows; the extend arm derives its own anchors
        // from the prior clip, reads ref_images as the identity sheet
        // only, and refuses the motion/voice rails at its compose door —
        // the hint must not teach the film's rails onto that arm.
        craft: {
            promptHint: 'one continuous action line per shot — the card frames each shot at render (no "shot 1:" prefixes, no first-frame/last-frame language; pin frames on the timeline\'s keyframes lane). Two reference rails, both live, combinable on the FILM lane: the anchor (image / the keyframes lane) pins the opening AND conditions identity while the loose rails (ref_images and ref_videos) stack after it — both rails ride one window. The extend arm is the exception: its anchors are derived from the prior clip (identity = the last frame, motion = the whole clip), it reads ref_images as the identity sheet alone, and it refuses stated ref_videos/ref_audios — leave those unstated there.',
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
            // WHENEVER"): `image` and `last_frame` are IMAGE SLOTS on the
            // wiring face — both carry a still that becomes a frame
            // insertion (frame 0, and the window's last generated row), so
            // the slot kind is 'image'. That is a WIRING fact, never the
            // conditioning lane: the stills never ride the reference bus
            // (2026-11-26). The
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
                // THE FILM EDGE: the pure film's terminal is its own save —
                // every edit posture (direct or through a legacy alias)
                // yields to the posture edges below.
                when: (p) => editPosture(p) === 'film',
            },
            {
                // THE IN-CHAIN EDGE: every masked-edit matrix cell — mask
                // postures, the refine dial, the chain_run loop — terminates
                // in the chain assemble (the estate's film law). Covers the
                // legacy replace/repair/refine/upscale docs verbatim (their
                // aliases resolve to these cells) and the edit arm itself
                // (stage 2a's gap: the edit door never had its own binding —
                // the default SaveVideo edge could never resolve its graph).
                channel: 'default',
                node: '*',
                nodeClass: 'MiniMaxH3ChainAssemble',
                when: (p) => editPosture(p) === 'inchain',
            },
            {
                // THE JOIN EDGE: the continuation posture's terminal is the
                // joined-film SaveVideo (the file-boundary grammar — the raw
                // boundary the latent carry cannot cross joins by file).
                // The '*' scan picks the LAST SaveVideo in creation order —
                // the joined film is created after its part-saves.
                channel: 'default',
                node: '*',
                nodeClass: 'SaveVideo',
                when: (p) => editPosture(p) === 'join',
            },
            {
                // THE RESHOOT EDGE: the different chain stays its own door,
                // and its terminal is the film tail's own SaveVideo (the
                // augmentation, never a chain assemble).
                channel: 'default',
                node: '*',
                nodeClass: 'SaveVideo',
                when: (p) => editPosture(p) === 'reshoot',
            },
        ],
        // ADMISSION EXTRAS (the class-attr half verbatim: the
        // retired row's admits minus the boarded families' studio
        // writes, which the projection unions from the facts file —
        // trailing-* ride verbatim, the gate matches them as prefixes).
        // THE AXIS KEYS LEFT THIS LIST (2026-11-28, the run-plane wall's
        // finding, cards-h3-quant-run-plane): `variant`/`quant` are the R1
        // contract keys — liftCardParams consumes both before every
        // admission judge (the write door's undeclared-key gate and the
        // compose door's) reads the view, and the client mirror consumes
        // them as axis keys the same way; the quant coordinate's gate at
        // the write door is selectCardVariant's resolveCellRow. Admitting
        // them here was dead surface advertising a key no judge ever
        // sees — the `recipe` class above. The axis seeding still writes
        // both onto every fresh stage; that is the contract's business.
        // `recipe` LEFT THIS LIST (2026-10-16, audit 0be61df8 F5): the
        // prose here used to claim the axis seeding writes it, but the
        // RECIPE-AXIS YIELD forbids the key (spec.ts axisGroups filters
        // 'Recipe'), no card declares a `recipe` field, no client path
        // writes one, and this card's compose has no reader of p.recipe —
        // the admission was dead surface advertising a key nothing can
        // produce. A doc carrying it now refuses LOUD at the door
        // ('unknown-param') instead of riding as an inert rider; seedUser
        // already deletes it on drill-open (the dead-layer law).
        // `last_frame` JOINED THIS LIST (2026-11-09, the two-door parity
        // cure, audit client-mirror §4): the FL2VA end-anchor wiring slot
        // (wired as an INPUTS image slot at the flowKinds row below) rides
        // the schema carrier, so the WRITE DOOR admits any doc carrying
        // it — while no h3 lane serves it (the flow writes the slot; the
        // lane never reads a rider), so the compose MIRROR bannered it
        // 'fires nothing on this lane' on every doc the door sanctioned:
        // the two doors disagreed by name. cards-mirror-door-parity reds
        // on exactly that drift; the admission declares the truth — wire
        // vocabulary the door sanctions, never lane vocabulary.
        // `prompt_waivers` JOINED THIS LIST (2026-11-15, the same
        // two-door parity cure as last_frame below): the prompt gate
        // (the VID GEN handoff, 2026-11-12) READS the key at run
        // resolve (gatedResolve's list) and the GPU e2e smoke rows ride
        // it — but the DECL's admits row never declared it, so the
        // compose door refused 'unknown param(s): prompt_waivers' on
        // every press the gate itself was designed to waive. Wire
        // vocabulary the door sanctions, never lane vocabulary.
        // `draft` + `speech_language` JOINED THIS LIST (2026-11-20, the
        // same two-door parity cure, the timeline brief M-T6/M-T2): the
        // doc-plane authoring inputs compose READS (the draft pin's 480p
        // tier, the dialogue stamp's language tag) ride the schema
        // carrier hidden:true (the calls precedent — the TOOL face
        // serves them, no card lane ever will), so the write door admits
        // any doc carrying them while the compose mirror bannered them
        // 'fires nothing on this lane'. cards-mirror-door-parity reds on
        // exactly that drift; the admission declares the truth.
        admits: ['ctx_*', 'draft', 'edit', 'extend', 'fps_seconds', 'image_name', 'k', 'last_frame', 'noise_seed', 'prompt_waivers', 'ref_image_size', 'refine', 'repair', 'replace', 'reshoot', 'sla_*', 'speech_language', 'upscale'],
        // THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the
        // features.modifiers channel): the swap + repair + extend arms.
        // The mask card's sam3/sam2/draw precedent — one kind per arm,
        // entry fields as the popup's tiles, requires as the
        // presence-gated arm packs.
        // THE SERVED ROSTER (seat-derived): card-local kinds always, the
        // family-owned loras kind when the seat boarded (an absent
        // family package costs its own seat — no LoRA seat is served).
        mods: declaredModKinds(),
        // THE FAMILY JSON LIST (the tool-plane unwrap roster — the
        // calls/audio_clips/keyframes trio is family vocabulary): rides
        // the seat; absent family serves none (the tool face refuses
        // loud before any doc with those keys could reach a run).
        ...(seat ? { jsonArrayParams: seat.jsonArrayParams } : {}),
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
        // THE FAMILY FACES (the plugin law, 2026-11-16): the schema
        // normalizer, the emitter carrier, and the finalize pass are
        // family vocabulary — every one rides the seat. The wrapper keeps
        // registration LAZY (no seat read at def construction): a
        // missing family omits the schemaCarrier (the envelope laws
        // fail-open without a carrier) and the doors that need a face
        // refuse loud by name at call time.
        schema: (v) => requireSeat('h3-timeline', 'schema normalizer').schema(v),
        // the emitter carrier (this card's schema is the hand-written
        // normalizer — params_schema walks the declared object's .dict)
        ...(seat ? { schemaCarrier: seat.paramSchema } : {}),
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
        // THE GATE'S RECEIPT HALF (the VID GEN handoff, 2026-11-12): the
        // prompt gate's non-refusing findings — warn severities and every
        // NAMED waiver — as admission-warn lines the start door stamps on
        // the run record (served on run_status): a waived rule or a craft
        // miss is never silent. A function like schema/compose (never
        // serialized). THE FILM NOTICES (timeline-agent brief,
        // 2026-11-20) ride the same receipt: the promoted silent tail,
        // each call's authored-vs-rendered snap, and the speech map —
        // the pure recomputation of the same laws the compose runs, so
        // the run record cannot disagree with the film that renders.
        // ADVISORY + SEATED (the plugin law): the notices ride the
        // family seat lazily — the callback fires at stamp time (after
        // a compose that already needed the seat), and an absent family
        // degrades to the prompt warns alone, never a refusal.
        admissionWarns: (p) => [
            ...promptAdmissionWarns(p),
            ...(seatOf('h3')?.filmAdmissionNotices(p) ?? []),
        ],
        compose(p, model, g, runId) {
            // THE FAMILY GATE (the plugin law, 2026-11-16): the compose
            // door's every judge face — the wire law, the carrier walk,
            // the overlay assert, the dispatch's renderers — rides the
            // family seat; absent @melite/models-h3 refuses HERE, by name,
            // before any doc read.
            const seat = requireSeat('h3-timeline', 'compose gate');
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
            // definition schema() uses). NO SILENT REPAIR: an explicit
            // null length is refused here AND at the door ('nulled-param')
            // — the default fills only when the key is OMITTED. The card's
            // own gate voices the same refusal: send a number or omit the
            // key, never null.
            const gateInput = seat.coerceWireBoolean(p);
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
            // `prompt_waivers` rides for the prompt gate (the VID GEN
            // handoff, 2026-11-12): the named rule ids a press waives —
            // recorded on the run record, never silent.
            p = gatedResolve('h3-timeline', callableSchema(seat.paramSchema), [
                'calls', 'audio_clips', 'keyframes', 'fps', 'audio_stem', 'document', 'loras',
                'refs', 'replace', 'repair', 'extend', 'edit', 'reshoot', 'variant', 'quant', 'refine', 'upscale', 'model', '__steps_pinned', '__shift_pinned', 'ctx_*',
                'prompt_waivers',
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
            seat.assertOverlayGated(p, 'h3-timeline single-call lift');
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound(p, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the h3-timeline card — every boarded family (h3) composes its own declared segment; this address owns none (a family package absent from the install refuses here, by name)`);
            }
        },
        // the t4-family strip pass rides the kit (python: `if not is_t4r`)
        // through the family seat (the wrapper keeps the def lazy —
        // absent family refuses loud by name at the pass's only caller,
        // the composed run).
        finalize: (graph) => requireSeat('h3-timeline', 'finalize pass').finalize(graph),
    }));
}
//# sourceMappingURL=card.js.map
