import z from '@deepseek-ai/schemastery';
import { declaredAction, finalizeMask, IMPACT_DETECTOR_IDS, IMPACT_PACKS, impactArmNames, instantiateAction, } from '@melite/comfyui-card-kit';
import { DECL as maskDecl, PROVISIONS as MASK_PROVISIONS } from '@melite/models-mask';
import { bag } from '@melite/contracts/extraKeys';
import { gatedResolve } from '@melite/comfyui-cordis';
// THE WEIGHTS LAW (the studio's law, shared — the same weights, the
// same lane): the three weight NAMES live in the mask family beside
// the lane that loads them (models/mask MASK_WEIGHTS), this card's
// provisions declare the downloads, and card.spec.ts pins the two
// halves agree. The three Impact detector vocabularies, provisions,
// graph paths, and routing live in the card kit's one detector
// catalog.
// THE IMPACT VOCABULARY (the operator's 2026-10-09 order: "I DON'T
// WANT 100+ YOLO CLASSES, I ONLY WANT THE ONES SHOWN IN THE IMPACT
// PACK EXAMPLES"): person, face, hand — the pack's own three
// specialized detectors, each on its own model (segm for person,
// bbox for face/hand). The old 80-class COCO dropdown died here:
// yolo11m is unpinned (its generality is NOT this card). The labels
// field is a CLOSED multi-chips select over the three (the wire a
// comma-joined string, this order); compose refuses any other word
// LOUD (a typo would otherwise detect nothing, silently). ONE
// detector family per entry (person rides segm, face/hand ride
// bbox) — a mixed set refuses LOUD in the lane; split it across
// two sam2 entries.
const IMPACT_CLASSES = IMPACT_DETECTOR_IDS;
/** The figure-chip row (1-10): the UI affordance for picking
 *  instances — the wire/API accept any 1-based number (crowd
 *  scenes past 10 ride the JSON door), the chips cover the
 *  working range. The per-instance crops (run/instance) are the
 *  visual index these numbers pick from. */
const FIGURE_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** Reads one entry's labels AGAINST the vocabulary: a comma-joined
 *  set of Impact classes (this declaration's own order, deduped) —
 *  empty or any unknown word refuses LOUD, naming the offender. */
const labelsOf = (e, key) => {
    const raw = e['labels'];
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw new Error(`${key} needs 'labels' (pick detector classes — the chips) — got ${JSON.stringify(raw).slice(0, 40)}`);
    }
    const words = raw.split(',').map((w) => w.trim()).filter((w) => w !== '');
    const unknown = words.filter((w) => !IMPACT_CLASSES.includes(w));
    if (unknown.length > 0) {
        throw new Error(`${key}: 'labels' carries non-detector words ${JSON.stringify(unknown)} — the card knows only person, face, hand (the Impact Pack examples' detectors)`);
    }
    return [...IMPACT_CLASSES].filter((c) => words.includes(c)).join(',');
};
/** THE ARM WEIGHTS (the silent-truncation law, 2026-10-09): which
 *  provision rows THIS merged params set touches. A sam3 bag names
 *  the SAM3 checkpoint; each sam2 entry names sam2 + its labels'
 *  detectors (person→segm, face/hand→bbox — the lane's own
 *  routing, restated as names). TOLERANT parse (lowercase split,
 *  unknown words ignored): compose's vocab wall owns garbage —
 *  the gate never fires before it. Empty bags name nothing. */
const armWeights = (merged) => {
    const out = new Set();
    const sam3 = merged['sam3'];
    if (Array.isArray(sam3) && sam3.length > 0) {
        out.add('sam3.1_multiplex_fp16.safetensors');
        for (const value of sam3) {
            if (typeof value !== 'object' || value === null || Array.isArray(value))
                continue;
            const entry = value;
            // === true: the readback is OPT-IN (default false since
            // 2026-10-12 — a default press saves only the declared masks;
            // via_rtdetr still folds the weight: its boxes feed the
            // primary's own arm)
            if (entry['via_rtdetr'] === true || entry['export_boxes'] === true) {
                out.add('rt_detr_v4-x-hgnet_fp32.safetensors');
            }
        }
    }
    const sam2 = merged['sam2'];
    if (Array.isArray(sam2) && sam2.length > 0) {
        out.add('sam2.1_hiera_large.pt');
        for (const e of sam2) {
            const labels = typeof e['labels'] === 'string'
                ? String(e['labels']).toLowerCase().split(',').map((w) => w.trim())
                : [];
            for (const name of impactArmNames(labels))
                out.add(name);
        }
    }
    return [...out];
};
/** Reads the primary sam2 entry's figure picks: a comma-joined
 *  list of 1-based instance numbers ("1,2" = figure one AND figure
 *  two — the per-instance image crops show the numbering). Empty =
 *  no figure masks. Anything else refuses LOUD. Figures ride the
 *  PRIMARY entry only (the detection they pick from is the
 *  primary's) — a later entry carrying figures is a mistake. */
const figuresOf = (e, key, primary) => {
    const raw = e['figures'];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === ''))
        return undefined;
    if (!primary) {
        throw new Error(`${key}: 'figures' rides the primary sam2 entry — the detection the figures pick from is the first source's; move the picks there`);
    }
    if (typeof raw !== 'string') {
        throw new Error(`${key}: 'figures' must be a comma-joined list of 1-based instance numbers ("1,2") — got ${JSON.stringify(raw).slice(0, 40)}`);
    }
    const nums = raw.split(',').map((w) => w.trim()).filter((w) => w !== '');
    if (nums.length === 0)
        return undefined;
    const bad = nums.filter((w) => !/^[1-9][0-9]*$/.test(w));
    if (bad.length > 0) {
        throw new Error(`${key}: 'figures' carries non-instance words ${JSON.stringify(bad)} — 1-based instance numbers only ("1,2")`);
    }
    return [...new Set(nums.map(Number))];
};
// THE SIMPLE FORM (the stroke-95 law: the card IS the two bars —
// the input rail + the mods section; the flat schema carries the
// INPUT ONLY). Every source knob — thresholds, instances, refine,
// dilation, the manifest — is mod-owned bag state.
const schema = z.object({
    input_image: z.string().role('path').description('Input').extra('extra', bag({ order: 1, group: 'input', width: 2, tooltip: 'The image every mask selects FROM.', wtype: 'image' })),
});
/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema;
// The optional search REGION's four entry fields (the EMBEDDED region
// writes them; -1 = unset, the selection runs unscoped — the four
// are FACE-OWNED: the leaf hides them under the canvas and shows
// them only when the host degrades to plain inputs).
const BBOX_FIELDS = [
    ['bbox_x', 'Box x', 'Left edge, image pixels.'],
    ['bbox_y', 'Box y', 'Top edge, image pixels.'],
    ['bbox_w', 'Box width', 'Rectangle width, image pixels.'],
    ['bbox_h', 'Box height', 'Rectangle height, image pixels.'],
].map(([name, label, tooltip]) => ({
    name,
    label,
    type: 'number',
    default: -1,
    min: -1,
    step: 1,
    faceOwned: true,
    tooltip: `${tooltip} (drawn on the image in the popup.)`,
}));
/** Reads an entry's bbox (null when unset; a PRESENT non-number
 * refuses LOUD — never silently skipped, even when the siblings
 * are absent). */
const bboxOf = (e, key) => {
    const quad = [e['bbox_x'], e['bbox_y'], e['bbox_w'], e['bbox_h']];
    if (quad.some((v) => v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) {
        throw new Error(`${key} entry's bbox must be four numbers (bbox_x/y/w/h) — got ${JSON.stringify(quad).slice(0, 60)}`);
    }
    if (quad.some((v) => v === undefined || v === null))
        return null;
    if (quad.some((v) => v < 0))
        return null;
    return quad;
};
// THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the one
// features.modifiers channel) with their CATEGORIES (stroke 78).
// The stroke-95 law: NO kindFields — every knob is an ENTRY field
// (the popup owns it; the section renders tiles only).
const MODS = [
    {
        kind: 'sam3',
        label: 'SAM3',
        param_key: 'sam3',
        category: 'standalone',
        cardinality: 'list',
        max_stack: 8,
        // THE EMBEDDED BBOX CANVAS (stroke 95): the selection preview
        // at the top of the leaf popup — the drawn rectangle fills the
        // entry's four faceOwned region fields.
        leaf_face: 'bbox-canvas',
        // THE SECTION CAPTION (2026-10-08, the operator's demand —
        // "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): names the filter the
        // field stack IS. sam3's boxes come from its own detector lane
        // (the prompt words / RT-DETR) — the caption says so; the
        // Region canvas below scopes the search, it is not the filter.
        section: 'Bbox filter — the freetext prompt picks the targets (automated); the Region canvas below only scopes the search',
        fields: [
            { name: 'name', label: 'Export name', type: 'string', default: 'sam3', tooltip: "The saved mask's name (mask_<name>)." },
            { name: 'prompt', label: 'Prompt', type: 'string', default: '', required_when: 'via_rtdetr!=true', tooltip: 'The SAM3 CLIP text selection — what to segment (empty + RT-DETR = the person-box lane).' },
            { name: 'via_rtdetr', label: 'Via RT-DETR boxes', type: 'boolean', default: false, tooltip: 'Propose person boxes with RT-DETR, refine with SAM3 (the box-manifest lane — the FIRST entry anchors it).' },
            { name: 'refine_iterations', label: 'Refine iterations', type: 'number', default: 2, min: 0, max: 8, step: 1, tooltip: 'This selection\'s SAM3 refine rounds.' },
            // THE SAM3 THRESHOLD DEFAULT (the red-box hunt's fourth bug):
            // 0.93 was SAM2's mask confidence — on SAM3's TEXT selection
            // it scores nothing (an empty mask, proven live: 0.93 → 0.0%
            // lit, the node's own 0.5 → a real 6.5% clothes region). The
            // node's own default rides; the knob stays (lower = looser).
            { name: 'sam_threshold', label: 'Mask threshold', type: 'number', default: 0.5, min: 0.05, max: 1, step: 0.01, tooltip: 'This selection\'s SAM3 mask confidence (0.5 = the node\'s own default; raise to tighten, lower to loosen).' },
            { name: 'sam_dilation', label: 'Dilation', type: 'number', default: 0, min: 0, max: 64, step: 1, tooltip: 'Grow this mask N pixels.' },
            // RT-DETR knobs — the entry's own arm (via RT-DETR boxes);
            // the manifest reads the first entry that rides the lane.
            { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.35, min: 0.05, max: 0.95, step: 0.05, tooltip: 'RT-DETR box confidence (this entry\'s Via-RT-DETR arm + the manifest). Lower catches more instances, noisier boxes.' },
            { name: 'max_instances', label: 'Max instances', type: 'number', default: 0, min: 0, max: 100, step: 1, tooltip: 'Cap detected instances (0 = no cap). Read the manifest first, then narrow.' },
            { name: 'export_boxes', label: 'Export box manifest', type: 'boolean', default: false, tooltip: 'Opt-in readback: draw this entry\'s RT-DETR boxes on a manifest image beside the masks. OFF by default — a run saves ONLY what the card declares (the masks); the box lane still fires for Via RT-DETR primaries either way.' },
            ...BBOX_FIELDS,
        ],
    },
    {
        kind: 'sam2',
        label: 'SAM2',
        param_key: 'sam2',
        category: 'standalone',
        cardinality: 'list',
        max_stack: 3,
        // THE UNIFIED CARD (the operator's final word, 2026-10-08:
        // "SAM2 AND SAM3 SHOULD BE THE SAME CARD. THE ONLY DIFFERENCE
        // BEING THAT SAM2 TAKES A DROPDOWN FOR WHAT WE ARE SEGMENTING,
        // THE SAM3 TAKES FREETEXT. THERE NEEDS TO BE AN IMAGE PREVIEW
        // IN BOTH"): same shape as sam3 — the embedded IMAGE PREVIEW
        // (the Region canvas: the preview first, an optional search
        // scope second), the same threshold/dilation stack, the twin
        // section caption. ONE difference: the selector is the
        // detector class DROPDOWN (person/face/hand — the Impact Pack
        // examples' own detectors) where sam3's is FREETEXT.
        // The boxes stay the detector's own ("BBOX IS NOT MANUAL, IT IS
        // AUTOMATED") — the canvas previews and scopes, it never
        // proposes a box.
        leaf_face: 'bbox-canvas',
        // THE DECLARED DEPENDENCIES (the operator's 2026-09-19 order —
        // "declared, then auto provisioned"): the SAM2 arm rides the
        // impact-pack chain (the detector proposes, SAM2 refines), so
        // the kind declares BOTH packs — the compose door refuses
        // without them (an unused sam2 bag never fires the gate), and
        // RunRescue offers the install through the manage seat.
        requires: [...IMPACT_PACKS],
        // THE SECTION CAPTION — the twin of sam3's, only the selector
        // word differs (dropdown vs freetext): the class DROPDOWN picks
        // the targets; the Region canvas below only scopes the search.
        section: 'Bbox filter — the class dropdown picks the targets (automated); the Region canvas below only scopes the search',
        fields: [
            { name: 'name', label: 'Export name', type: 'string', default: 'sam2', tooltip: "The saved mask's name (mask_<name>)." },
            { name: 'labels', label: 'Detection class', type: 'select', multi: true, options: IMPACT_CLASSES.map((c) => ({ value: c, label: c })), default: 'person', tooltip: 'The automated box filter: the Impact detector proposes a box for EVERY instance of these classes (no drawing), SAM2 refines each one. person rides the segm detector, face/hand ride their own bbox detectors — one family per entry.' },
            // THE FIGURE CHIPS (the operator's 2026-10-09 verdict — the
            // same atoms.tsx law as the class chips: a detector-owned
            // vocabulary is NEVER a freeform text box): instance numbers
            // are picked, not typed. The wire stays the comma-joined
            // string the lane parses ("1,2"); the API stays permissive
            // past 10 for crowd scenes (the chips are the UI affordance,
            // not the vocab ceiling).
            { name: 'figures', label: 'Figures', type: 'select', multi: true, options: FIGURE_CHOICES.map((n) => ({ value: String(n), label: String(n) })), default: '', tooltip: 'Pick the instance numbers (chips, no typing): each pick saves its own SAM-refined mask (mask_figure_2 = the second detected instance). Run once, read the numbered per-instance crops (run/instance), then pick. Primary entry only; none picked = no figure masks.' },
            { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.5, min: 0.05, max: 0.95, step: 0.05, tooltip: 'This entry\'s detector box confidence. Lower catches more instances, noisier boxes.' },
            // THE DETECTOR TRIO (the operator's 2026-10-09 demand: "WHAT
            // ABOUT CROP FACTOR" — the last three hard-pinned detector
            // knobs, node-faithful ranges from live object_info):
            { name: 'detection_dilation', label: 'Detection dilation', type: 'number', default: 10, min: -512, max: 512, step: 1, tooltip: 'Grow each detected box N px before the crop (their bbox_dilation; negative shrinks).' },
            { name: 'crop_factor', label: 'Crop factor', type: 'number', default: 3, min: 1, max: 100, step: 0.1, tooltip: 'How far the crop pads around each box (3 = 3× the box size) — more context, SAM sees more of the figure.' },
            { name: 'drop_size', label: 'Drop size', type: 'number', default: 10, min: 1, max: 16384, step: 1, tooltip: 'Discard detections smaller than N px — noise cleanup on tiny false boxes.' },
            { name: 'sam_threshold', label: 'Mask threshold', type: 'number', default: 0.93, min: 0.5, max: 1, step: 0.01, tooltip: 'SAM sensitivity — higher narrows the mask to the core subject (their sub_threshold; live-proven pixel-neutral on three clean unambiguous subjects: it bites on graded content, e.g. clothes-vs-person).' },
            { name: 'sam_dilation', label: 'Dilation', type: 'number', default: 0, min: -512, max: 512, step: 1, tooltip: 'Grow (positive) or erode (negative) this mask N px — the node\'s own full range (their sub_dilation).' },
            // THE SIMPLE-NODE SUB-KNOBS (the operator's 2026-10-09 audit:
            // ImpactSimpleDetectorSEGS exposes these; they were hard-pinned).
            // NOTE the name: 'box_expansion', never 'bbox_expansion' — the
            // bbox_* prefix is the REGION QUAD's owned namespace (the face
            // canvas fields, wall-pinned).
            { name: 'box_expansion', label: 'Box expansion', type: 'number', default: 0, min: 0, max: 1000, step: 1, tooltip: 'Grow each proposal box N px before SAM reads it — catches limbs clipped by a tight box (their sub_bbox_expansion; the node\'s own 0-1000 range).' },
            { name: 'hint_threshold', label: 'Hint threshold', type: 'number', default: 0.7, min: 0, max: 1, step: 0.01, tooltip: 'The hint-mask confidence SAM seeds the selection from (their sam_mask_hint_threshold).' },
            ...BBOX_FIELDS,
        ],
    },
    {
        kind: 'draw',
        label: 'Draw',
        param_key: 'draw',
        category: 'ordered',
        cardinality: 'list',
        max_stack: 4,
        // THE EMBEDDED PAINT CANVAS (stroke 95): the brush rides at
        // the top of the leaf popup — the payload field under it IS
        // the contract (the PNG's alpha = strokes).
        leaf_face: 'paint-canvas',
        fields: [
            { name: 'name', label: 'Export name', type: 'string', default: 'draw', tooltip: "The saved mask's name (mask_<name>)." },
            { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '', tooltip: 'The painted PNG (alpha channel = strokes) — painted in the popup, or uploaded/dropped/picked here.' },
        ],
    },
];
export const identity = {
    label: 'Mask',
    description: 'Simple mask: pick the input, then ADD sources — sam2 and sam3 are THE SAME card shape (image preview + thresholds + optional Region scope); the ONLY difference is the selector: sam2 a detector class dropdown (person/face/hand — the Impact Pack examples own detectors, automated boxes), sam3 freetext. draw paints onto the rest.',
    genre: 'image',
    icon: 'mask',
    ability: 'tool',
};
/** The bag reader (the wire is the storage): params[param_key] is
 *  the array; non-object entries refuse LOUD (never a silent skip
 *  — a drifted bag is drift, not an empty recipe). */
const bagOf = (p, key, cardId) => {
    const v = p[key];
    if (v === undefined || v === null)
        return [];
    if (!Array.isArray(v)) {
        throw new Error(`param '${key}' on the ${cardId} card must be the mod bag (an array) — got ${typeof v}`);
    }
    return v.map((e, i) => {
        if (typeof e !== 'object' || e === null || Array.isArray(e)) {
            throw new Error(`param '${key}' entry ${i} on the ${cardId} card must be an object (a mod entry) — got ${JSON.stringify(e).slice(0, 60)}`);
        }
        return e;
    });
};
/** Reads one entry scalar AGAINST its declared field (the stroke-95
 *  per-entry law): absent/null → the declared default; a value of
 *  the wrong JS type or outside the declared bounds refuses LOUD
 *  (naming the entry and the field — never a silent clamp). */
const scalarOf = (where, entry, f) => {
    const key = f.name;
    const v = entry[key];
    if (v === undefined || v === null) {
        return f.default;
    }
    if (f.type === 'boolean') {
        if (typeof v !== 'boolean') {
            throw new Error(`${where}: '${key}' must be a boolean — got ${JSON.stringify(v).slice(0, 40)}`);
        }
        return v;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`${where}: '${key}' must be a number — got ${JSON.stringify(v).slice(0, 40)}`);
    }
    if (typeof f.min === 'number' && v < f.min) {
        throw new Error(`${where}: '${key}' must be within ${String(f.min)}–${String(f.max)} — got ${String(v)}`);
    }
    if (typeof f.max === 'number' && v > f.max) {
        throw new Error(`${where}: '${key}' must be within ${String(f.min)}–${String(f.max)} — got ${String(v)}`);
    }
    return v;
};
// THE INJECT DECLARATION (the loader's law, cardDefs.ts L11-14):
// the card module must declare `inject = ['comfyui']` at module
// level — passing only { apply } drops the inject and the service
// dies with "cannot get property comfyui without inject".
export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'mask',
        skeleton: 'mask',
        boarded: [],
        tags: ['image', 'mask', 'edit', 'form'],
        requiresModel: false,
        identity,
        // THE FAMILY OWNS THE DOWNLOADS (operator order, 2026-10-12:
        // "THEY ARE MODELS — THEY SHOULD DOWNLOAD LIKE ALL OTHER
        // MODELS"): the six rows LIVE in the mask-select family's DECL
        // and download through the ONE door by the family id —
        // provision_model model=mask-select — hashed and present-marked
        // like every other family's weights. The card SERVES the
        // family's export to its arm-weight gate; it authors no row of
        // its own (card.spec pins the identity, so a card-side row
        // cannot drift in unseen).
        provisions: MASK_PROVISIONS,
        provisionOwner: maskDecl.id,
        sidebar: { key: 'image', order: 9 },
        // no surface row — a FORM card (layout serves null)
        flowKinds: {
            inputs: { input_image: 'image' },
            outputs: { default: 'seg' },
            requiresModel: false,
        },
        // THE MOD-OWNED NAMES ride admits (the compose door's explicit-
        // params overlay — the three bags; every knob lives INSIDE a
        // bag entry, never flat on the doc).
        admits: ['sam3', 'sam2', 'draw'],
        // THE DECLARED HERO (the history/preview defect, 2026-10-09:
        // the gallery led with whatever the engine finished first —
        // usually the manifest photo, not the mask): mask_combined
        // leads, the manifest/crops/figures follow.
        primaryFile: 'mask_combined',
        // THE ARM WEIGHTS (the silent-truncation law, 2026-10-09):
        // the compose door checks the touched provision rows against
        // the models tree BEFORE composing — an absent weight refuses
        // loud with its fetch URL, never a silent downstream death.
        armWeights,
        mods: MODS,
        schema: schemaFn,
        compose(p, _model, g, runId) {
            // THE SCHEMA GATE (the music/sfx/tts admission precedent):
            // the card's own declaration validates the last hop — here
            // the input's presence (the lane scalars all live in the
            // bags now; the composer's reads below are reads of GATED
            // bag entries through scalarOf).
            const doc = gatedResolve('mask', schemaFn, ['sam3', 'sam2', 'draw', 'model'], p);
            if (typeof doc.input_image !== 'string' || !doc.input_image.trim()) {
                throw new Error("required param 'input_image' missing on the mask card — the mask lane selects FROM an image");
            }
            const sam3 = bagOf(doc, 'sam3', 'mask');
            const sam2 = bagOf(doc, 'sam2', 'mask');
            const draw = bagOf(doc, 'draw', 'mask');
            // THE ENTRY-SURFACE LAW (2026-10-08, the bbox correction):
            // the kind's declared fields are the WHOLE entry surface —
            // an unknown key is drift and refuses LOUD (a hand-composed
            // bbox_x on sam2 would otherwise run silently unscoped; the
            // operator's law is never-silent).
            const surfaceOf = new Map(MODS.map((m) => [m.kind, new Set((m.fields ?? []).map((f) => f.name))]));
            for (const [bag, entries] of [['sam3', sam3], ['sam2', sam2], ['draw', draw]]) {
                for (let i = 0; i < entries.length; i++) {
                    const extra = Object.keys(entries[i]).filter((k) => !surfaceOf.get(bag).has(k));
                    if (extra.length > 0) {
                        throw new Error(`${bag} entry ${i}: unknown key(s) ${extra.join(', ')} — the kind's declared fields are the whole surface (bbox on sam2 is the detector's own, never a hand-drawn quad; drift refuses, never a silent skip)`);
                    }
                }
            }
            if (sam3.length === 0 && sam2.length === 0 && draw.length === 0) {
                throw new Error('no mask sources on the mask card — add at least one modifier (sam3, sam2, or draw)');
            }
            if (draw.length > 0 && sam3.length === 0 && sam2.length === 0) {
                throw new Error('a draw stacks ONTO a mask — add a standalone source first (sam3 or sam2), then the draw');
            }
            // THE DECLARED FIELDS, indexed (every read below validates
            // against the declaration — the bounds are DATA, never
            // re-typed per key). Total by construction: the kinds carry
            // const-literal field rows, and every name read through
            // num()/bool() exists on its kind (a drift is a typecheck
            // failure — scalarOf remains the loud arm for WIRE data).
            const fieldsOfKind = new Map(MODS.map((m) => [m.kind, m.fields]));
            // (get() is total here by the same construction — num()/bool()
            // only ever ask for 'sam3' | 'sam2', both const rows above)
            const fieldOf = (kind, name) => fieldsOfKind.get(kind).find((f) => f.name === name);
            const num = (where, entry, kind, name) => scalarOf(where, entry, fieldOf(kind, name));
            const bool = (where, entry, kind, name) => scalarOf(where, entry, fieldOf(kind, name));
            const sources = [
                ...sam3.map((entry, i) => ({ kind: 'sam3', entry, i })),
                ...sam2.map((entry, i) => ({ kind: 'sam2', entry, i })),
            ];
            const nameOf = (s, fallback) => {
                const n = s.entry['name'];
                if (n === undefined || n === null || n === '')
                    return fallback;
                if (typeof n !== 'string') {
                    throw new Error(`${whereOf(s)}: 'name' must be a string — got ${JSON.stringify(n)}`);
                }
                return n;
            };
            const whereOf = (s) => `${s.kind} entry ${s.i}`;
            // ── the primary (the first standalone source): its own tune
            // threads the lane's flat reads (the lane's primary arm);
            // every source after it is a per-name export with a per-entry
            // tune on its trip. ──
            const primary = sources[0];
            // the primary anchors mask_combined (no named export of its
            // own) — its name is still a DECLARED field: validate it loud
            // (a wrong-typed name on any entry is a mistake, never a
            // silent skip)
            nameOf(primary, 'combined');
            const lane = {
                input_image: doc.input_image,
                sam_threshold: num(whereOf(primary), primary.entry, primary.kind, 'sam_threshold'),
                sam_dilation: num(whereOf(primary), primary.entry, primary.kind, 'sam_dilation'),
            };
            if (primary.kind === 'sam3') {
                lane['refine_iterations'] = num(whereOf(primary), primary.entry, 'sam3', 'refine_iterations');
            }
            // THE PRIMARY SCOPE (the first entry's drawn REGION — the
            // unified card's shared face; threads as the lane's
            // scope_bbox. sam2's region scopes the detector search exactly
            // like sam3's scopes the text selection).
            const primaryBox = bboxOf(primary.entry, primary.kind);
            if (primaryBox)
                lane['scope_bbox'] = primaryBox;
            if (primary.kind === 'sam3') {
                // the RT-DETR knobs thread from the primary (its own arm)
                lane['detection_threshold'] = num(whereOf(primary), primary.entry, 'sam3', 'detection_threshold');
                lane['max_instances'] = num(whereOf(primary), primary.entry, 'sam3', 'max_instances');
                if (bool(whereOf(primary), primary.entry, 'sam3', 'via_rtdetr')) {
                    lane['primary_via_rtdetr'] = true;
                }
                else {
                    const prompt = primary.entry['prompt'];
                    if (typeof prompt !== 'string' || prompt === '') {
                        throw new Error("sam3 entry 0 needs a 'prompt' (or 'Via RT-DETR boxes') — the first source anchors mask_combined");
                    }
                    lane['primary_prompt'] = prompt;
                }
            }
            else {
                // sam2 rides the detector + SAM2 arm (the detector proposes
                // the class set, SAM2 refines) — never the CLIP text lane.
                lane['primary_via_sam2'] = true;
                lane['primary_sam2_labels'] = labelsOf(primary.entry, 'sam2 entry 0');
                lane['detection_threshold'] = num(whereOf(primary), primary.entry, 'sam2', 'detection_threshold');
                // the simple-node sub-knobs fold from the primary like the
                // detector threshold (SAM-step knobs — the figure arm reads
                // the same lane-flat seat)
                lane['box_expansion'] = num(whereOf(primary), primary.entry, 'sam2', 'box_expansion');
                lane['hint_threshold'] = num(whereOf(primary), primary.entry, 'sam2', 'hint_threshold');
                // the detector trio (crop factor et al) rides the same fold
                lane['detection_dilation'] = num(whereOf(primary), primary.entry, 'sam2', 'detection_dilation');
                lane['crop_factor'] = num(whereOf(primary), primary.entry, 'sam2', 'crop_factor');
                lane['drop_size'] = num(whereOf(primary), primary.entry, 'sam2', 'drop_size');
                const figs = figuresOf(primary.entry, 'sam2 entry 0', true);
                if (figs !== undefined)
                    lane['sam2_figures'] = figs;
            }
            // THE BOX MANIFEST (card-wide, OR-ed per entry — the readback
            // is OPT-IN since 2026-10-12: default OFF, a run saves only
            // the declared masks; === true, never a !== false fold, so the
            // declared default and every consumer agree).
            const manifestEntries = sam3.filter((e, i) => bool(`sam3 entry ${i}`, e, 'sam3', 'export_boxes') === true);
            if (manifestEntries.length > 0)
                lane['export_boxes'] = true;
            // the RT-DETR knobs thread from the sam3 PRIMARY alone (its own
            // arm — via_rtdetr OR the manifest; set above). There is NO
            // second owner: a sam2 primary implies ZERO sam3 entries (the
            // sam3 bag sorts first in the source stream), and zero sam3
            // entries means no manifest to own — the arm cannot exist.
            // ── every source after the primary: its own export, carrying
            // its own per-entry tune (the trip's 4th arm). ──
            const exports = [];
            const exportKind = [];
            for (let s = 1; s < sources.length; s++) {
                const src = sources[s];
                const tune = {
                    threshold: num(whereOf(src), src.entry, src.kind, 'sam_threshold'),
                    dilation: num(whereOf(src), src.entry, src.kind, 'sam_dilation'),
                };
                if (src.kind === 'sam3') {
                    tune['refine'] = num(whereOf(src), src.entry, 'sam3', 'refine_iterations');
                    // via_rtdetr is the PRIMARY's arm — a later entry asking
                    // for it is a mistake (its boxes would silently vanish):
                    // refuse LOUD, the entry owns a prompt instead.
                    if (bool(whereOf(src), src.entry, 'sam3', 'via_rtdetr') === true) {
                        throw new Error(`sam3 entry ${src.i}: 'via_rtdetr' is the primary's arm — the RT-DETR readback rides the first source; give this entry a 'prompt'`);
                    }
                    const prompt = src.entry['prompt'];
                    if (typeof prompt !== 'string' || prompt === '') {
                        throw new Error(`sam3 entry ${src.i} needs a 'prompt' (a string — the RT-DETR box lane is the primary's own arm) — got ${String(JSON.stringify(prompt)).slice(0, 40)}`);
                    }
                    const bbox = bboxOf(src.entry, 'sam3');
                    exports.push([nameOf(src, `sam3_${src.i + 1}`), prompt, bbox ?? undefined, tune]);
                    exportKind.push('text');
                }
                else {
                    tune['detection_threshold'] = num(whereOf(src), src.entry, 'sam2', 'detection_threshold');
                    tune['box_expansion'] = num(whereOf(src), src.entry, 'sam2', 'box_expansion');
                    tune['hint_threshold'] = num(whereOf(src), src.entry, 'sam2', 'hint_threshold');
                    tune['detection_dilation'] = num(whereOf(src), src.entry, 'sam2', 'detection_dilation');
                    tune['crop_factor'] = num(whereOf(src), src.entry, 'sam2', 'crop_factor');
                    tune['drop_size'] = num(whereOf(src), src.entry, 'sam2', 'drop_size');
                    // figures ride the PRIMARY entry (the detection they pick
                    // from is the first source's) — refuses LOUD here.
                    figuresOf(src.entry, `sam2 entry ${src.i}`, false);
                    // the unified card: sam2's region rides its export exactly
                    // like sam3's (the shared canvas's scope quad).
                    exports.push([nameOf(src, `sam2_${src.i + 1}`), labelsOf(src.entry, `sam2 entry ${src.i}`), bboxOf(src.entry, 'sam2') ?? undefined, tune]);
                    exportKind.push('sam2');
                }
            }
            // ── THE ORDERED DRAW STACK (bag order): each payload is its
            // own paint export AND one hop in the union chain onto
            // mask_combined (the kit composites them in array order —
            // the previous outputs flow into the next). ──
            const paintMasks = [];
            for (let i = 0; i < draw.length; i++) {
                const payload = draw[i]['payload'];
                if (typeof payload !== 'string' || payload === '') {
                    throw new Error(`draw entry ${i} needs a 'payload' — the painted PNG is the mask`);
                }
                const dn = draw[i]['name'];
                if (dn !== undefined && dn !== null && dn !== '' && typeof dn !== 'string') {
                    throw new Error(`draw entry ${i}: 'name' must be a string — got ${JSON.stringify(dn)}`);
                }
                const name = typeof dn === 'string' && dn !== '' ? dn : `draw_${i + 1}`;
                exports.push([name, payload]);
                exportKind.push('paint');
                paintMasks.push(payload);
            }
            if (exports.length > 0) {
                lane['exports'] = exports;
                lane['export_kind'] = exportKind;
            }
            if (paintMasks.length > 0)
                lane['paint_masks'] = paintMasks;
            // THE FAMILY BINDING (the atom vocabulary's F1 mint, operator
            // order 2026-10-12): the lane is the mask family's declared
            // select action (models/mask), and this card composes it through
            // the same interpreter every family's lane rides — resolved off
            // the DECL, never a hand-imported action list (the interlock:
            // the family drops the action and this binding refuses at
            // boarding, loud, never a legacy fallback). The row's
            // lane_inputs are empty — the family's facts door closes over
            // its own weight constants (MASK_WEIGHTS, the LANE_FILES
            // pattern); the card keeps the provisions (the downloads) and
            // card.spec.ts pins the agreement.
            const row = {
                id: 'mask', family: 'mask-select', card: 'mask', defaults: {},
                lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [],
            };
            instantiateAction(declaredAction(maskDecl, 'select'), lane, row, g, runId);
        },
        // THE 512-HINT STRIP (the red-box hunt): kills the autofilled
        // {0,0,512,512} bboxes default on unscoped SAM3 detects (an
        // empty mask on any image larger than 512px, proven live).
        finalize: finalizeMask,
    }));
}
//# sourceMappingURL=card.js.map
