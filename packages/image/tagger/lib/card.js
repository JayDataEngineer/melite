import z from '@deepseek-ai/schemastery';
import { declaredAction, finalizeTagger, TAGGER_CAPTION_TASKS, TAGGER_CAPTION_TYPES, TAGGER_CAPTION_LENGTHS, TAGGER_EXTRA_OPTIONS, instantiateAction } from '@melite/comfyui-card-kit';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { DECL as wd14Decl } from '@melite/models-wd14';
import { DECL as joytagDecl } from '@melite/models-joytag';
import { DECL as florence2Decl } from '@melite/models-florence2';
import { DECL as joycaptionDecl } from '@melite/models-joycaption';
import { gatedResolve } from '@melite/comfyui-card-kit/admission';
// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): each boarded
// family's declared action composes — the card delegates, never
// authors nodes. Keyed by OWNING FAMILY (`model.family ?? model.id`
// at dispatch — a route id keys nothing, the derived-row law); an
// unbound family refuses loud at the dispatch.
export const ACTION_BINDINGS = {
    [wd14Decl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(wd14Decl, 'tag'), p, model, g, runId);
    },
    [joytagDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(joytagDecl, 'tag'), p, model, g, runId);
    },
    [florence2Decl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(florence2Decl, 'tag'), p, model, g, runId);
    },
    [joycaptionDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(joycaptionDecl, 'tag'), p, model, g, runId);
    },
};
// the wire param surface (TaggerCard — the union vocab; each arm
// wires its subset). Ride keys carry NO .default (ABSENT: the
// compose-door cascade overlays model defaults, then explicit
// params): input_image is required (refused blank in compose);
// exclude_tags/add_tag/remove_tag/extra_option are defaultless
// optionals, each backfilled by the families whose arms read it
// (wd14→exclude_tags, joytag→add_tag/remove_tag,
// joycaption→extra_option). Bare z.string() is the image-gen prompt
// precedent (optional at parse, refused loud at compose).
// THE WEIGHTS LAW (2026-09-22 — the variant rail owns the
// checkpoint; the schema declares NO weights knob): Model/Variant/
// Quant is the ONE picker — the validate layer stamps the selected
// variant's resolver_defaults into the body (stampCardOverlay,
// absent-keys-only), the compose door overlays the family default,
// the lane reads p.checkpoint. The key rides `admits` below (the
// input-prep crop/media_type/scale precedent: admitted route stamps,
// never rendered). A card-level checkpoint knob — select or text —
// is a second picker around the card system and is forbidden here.
// JoyCaption's upstream takes any repo id or local path, so its
// family keeps ONE Standard variant on the family default; custom
// paths ride explicit params (API/bare bodies).
const schema = z.object({
    input_image: z.string().role('path').description("Input image").extra('extra', bag({ order: 0, group: "input", width: 1, tooltip: "The image to invert. Absolute mount path or artifact ref.", required: true, wtype: 'image', })),
    threshold: z.number().description("Threshold").min(0).max(1).step(0.05).default(0.35).extra('extra', bag({ order: 1, group: "tagger", width: 1, tooltip: "General-tag confidence floor." })),
    character_threshold: z.number().description("Character threshold").min(0).max(1).step(0.05).default(0.85).extra('extra', bag({ order: 2, group: "tagger", width: 1, tooltip: "Character-tag confidence floor — keep high." })),
    exclude_tags: z.string().description("Exclude tags").extra('extra', bag({ order: 3, group: "tagger", width: 1, tooltip: "Comma-separated tags to prune from the output." })),
    replace_underscore: z.boolean().description("Replace underscores").default(false).extra('extra', bag({ order: 4, group: "tagger", width: 1, tooltip: "Emit \"silver hair\" instead of \"silver_hair\"." })),
    trailing_comma: z.boolean().description("Trailing comma").default(false).extra('extra', bag({ order: 5, group: "tagger", width: 1, tooltip: "Terminate the tag list with a comma (prompt-paste shape)." })),
    add_tag: z.string().description("Add tag").extra('extra', bag({ order: 6, group: "tagger", width: 1, tooltip: "JoyTag: tags force-prepended to the output (comma-separated). Ignored by WD14." })),
    remove_tag: z.string().description("Remove tag").extra('extra', bag({ order: 7, group: "tagger", width: 1, tooltip: "JoyTag: tags pruned from the output (comma-separated). Ignored by WD14." })),
    caption_task: vocabulary([...TAGGER_CAPTION_TASKS]).description("Caption task").default("more_detailed_caption").extra('extra', bag({ order: 8, group: "tagger", width: 1, tooltip: "Florence-2: the vision task (live task vocabulary). Ignored by WD14/JoyTag.", wtype: 'select' })),
    caption_type: vocabulary([...TAGGER_CAPTION_TYPES]).description("Caption style").default("Descriptive").extra('extra', bag({ order: 9, group: "tagger", width: 1, tooltip: "JoyCaption: the caption template (live vocabulary). Ignored by WD14/JoyTag/Florence-2.", wtype: 'select' })),
    // the FORM subset (the named six) of the kit's full set (which
    // also carries the node's 20-260 word counts, for bare/API
    // bodies) — a named subset, never a retyped copy that can
    // drift from the node's own vocabulary (the card-plane
    // audit's H2)
    caption_length: vocabulary([...TAGGER_CAPTION_LENGTHS]).description("Caption length").default("long").extra('extra', bag({ order: 10, group: "tagger", width: 1, tooltip: "JoyCaption: target length (the named six; the node also takes word counts 20-260, which bare/API bodies may send). Ignored by other families.", wtype: 'select' })),
    // the FULL kit list: the card had retyped a 14-option subset and
    // one entry had ALREADY drifted into a truncated fork of the
    // upstream canned string, which rode verbatim into the node
    // (the card-plane audit's H2 — the one entry proved it)
    extra_option: vocabulary([...TAGGER_EXTRA_OPTIONS]).description("Extra instruction").extra('extra', bag({ order: 11, group: "tagger", width: 1, tooltip: "JoyCaption: one appended instruction (the full 27-option list rides bare/API bodies; the engine's own vulgar-caption row is dropped at this surface — release hygiene). Ignored by other families.", wtype: 'select' })),
    // NO filename_prefix (card: "the run routes outputs by run id
    // (compose stamps `<run>/tags`) — a user knob here was silently
    // overwritten, a dead promise"). Old drafts naming it still parse
    // (schemastery non-strict object + the door's explicit-params
    // overlay) and compose never reads it.
});
/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema;
export const inject = ['comfyui'];
// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
    label: 'Tagger',
    description: 'Image prompt inversion — booru keyword tags (WD14, JoyTag) and natural-language captions (Florence-2, JoyCaption) for recreating images in NovelAI / Pony / FLUX / Ideogram. Tags persist as a tags.txt run artifact.',
    genre: 'image',
    icon: 'tag',
    principles: [
        'input_image is required — the tag is anchored on it (absolute mount path or a prior-run artifact ref)',
        'threshold is the general-tag confidence floor; character_threshold is the person-identity floor (higher — names are cheap to overclaim)',
        'exclude_tags prunes what you already know is wrong — comma-separated, matched case-insensitively by the node',
        'The lane outputs tags.txt (SaveText) — the queue trades in artifacts, not bare strings',
        'First run downloads the WD14 weights (.onnx + .csv) — light ONNX lane, ~4 GB VRAM',
        "JoyTag reads a pack-local checkpoint (no auto-download) and takes add/remove tag lists instead of WD14's character floor",
    ],
};
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'tagger',
        // stage-row id the compose emits (purge S-decls verdict: the
        // retired row carried "" — engine truth wins).
        skeleton: 'tagger',
        // the four boarded families (derived — the DECL ids are the
        // one spelling; RULE 5).
        boarded: [wd14Decl.id, joytagDecl.id, florence2Decl.id, joycaptionDecl.id],
        tags: ['image', 'tag', 'analyze'],
        identity,
        // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
        // discovery export — the card owns its sidebar, surface, and
        // flow-stage declarations; the discovery arms derive from here).
        sidebar: { key: 'image', order: 19 },
        flowKinds: {
            inputs: { input_image: 'image' },
            outputs: { default: 'text' },
            requiresModel: false,
        },
        // THE SAVETEXT BINDING (the tagger publish-plane gap, 2026-10-24):
        // the default channel resolves to the arm's SaveText mint — every
        // arm ends in the shared taggerSaveText tail (one SaveText per
        // graph), so the '*' wildcard (resolveCardFlowOutputs takes the
        // LAST node of the class — the h3-timeline SaveVideo precedent)
        // names the producer on both the single and merge paths. Without
        // it the merge path resolved {} and the assert passed vacuously.
        flowOutputBindings: [
            { channel: 'default', node: '*', nodeClass: 'SaveText' },
        ],
        // Per-family gates (requires_by_family declaration — each arm's
        // pack is checked only for its own family; a wd14 run never
        // demands the florence pack). The flat list carries the UNION
        // for flat consumers; the door gates the ACTIVE family's slice
        // (gateway _find_card_requires precedent).
        requires: ['ComfyUI-WD14-Tagger', 'Comfyui_joytag', 'ComfyUI-Florence2', 'joycaption_comfyui'],
        requiresByFamily: {
            wd14: ['ComfyUI-WD14-Tagger'],
            joytag: ['Comfyui_joytag'],
            florence2: ['ComfyUI-Florence2'],
            joycaption: ['joycaption_comfyui'],
        },
        schema: schemaFn,
        // checkpoint rides admits (the service's admission-extras law):
        // the variant rail's route stamp, admitted but never rendered —
        // no form field, no second picker.
        admits: ['checkpoint'],
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the audio-trio admission precedent — the
            // card's own declaration validates the last hop into the
            // engine): schemastery walk enforces declared types + bounds
            // (threshold/character_threshold are 0–1 — a threshold=5 draft
            // refuses LOUD here, never composes), fills declared defaults.
            // The composer's reads below are reads of the GATED doc.
            const doc = gatedResolve('tagger', schemaFn, ['checkpoint', 'model'], p);
            const img = typeof doc.input_image === 'string' ? doc.input_image : '';
            if (!img.trim()) {
                throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)");
            }
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound(doc, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the tagger card — every boarded family (wd14, joytag, florence2, joycaption) composes its own declared segment; this address owns none`);
            }
        },
        finalize: finalizeTagger,
    }));
}
//# sourceMappingURL=card.js.map
