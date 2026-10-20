import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { DECL as inputDecl, SCALE_METHODS, SCALE_MODEL_OPTIONS, MIN_DIM } from '@melite/models-input';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): the declared
// action composes the whole segment; an unbound family refuses loud
// at the dispatch. Keyed by OWNING FAMILY (`model.family ??
// model.id` — a route id keys nothing, the derived-row law).
export const ACTION_BINDINGS = {
    [inputDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(inputDecl, 'prep'), p, model, g, runId);
    },
};
// Exported for the estate parity wall (param-bounds-parity judges
// the card's schema against the input family's prep ParamSpec, the
// image-gen/edit precedent — the schema is the read plane).
export const schema = z.object({
    // the staged source filename (the arm stages uploads/artifacts into
    // the ComfyUI input dir before this doc renders)
    // the declaration carries ONLY source — media_type/crop/scale ride the
    // door's explicit-params overlay (non-strict object) so old drafts
    // keep parsing, but they are never declared knobs.
    source: z.string().role('path').description("Source file").extra('extra', bag({ order: 0, group: "input", tooltip: "The file to stage — upload, asset drop, prior-run artifact, or mount path. Image or audio (video is not boarded yet).", required: true, wtype: 'file', })),
    media_type: vocabulary(["image", "audio"]).description("Media type").default("image").extra('extra', bag({ order: 1, group: "input", width: 1, wtype: 'select' })),
    crop_x: z.number().description("Crop X").min(-1).step(1).default(-1).extra('extra', bag({ order: 0, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    crop_y: z.number().description("Crop Y").min(-1).step(1).default(-1).extra('extra', bag({ order: 1, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    crop_width: z.number().description("Crop Width").min(-1).step(1).default(-1).extra('extra', bag({ order: 2, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    crop_height: z.number().description("Crop Height").min(-1).step(1).default(-1).extra('extra', bag({ order: 3, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    scale_width: z.number().description("Scale Width").min(-1).step(1).default(-1).extra('extra', bag({ order: 4, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    scale_height: z.number().description("Scale Height").min(-1).step(1).default(-1).extra('extra', bag({ order: 5, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
    scale_method: vocabulary([...SCALE_METHODS]).description("Scale Method").default("lanczos").extra('extra', bag({ order: 6, group: "transform", wtype: 'select', visible_when: 'media_type=image' })),
    // THE MODEL CHOICE (operator directive, 2026-11-08 — the studio
    // card: "parameters to upscale / downscale optionally, letting
    // you choose the model"): the standard ComfyUI upscale-model
    // roster led by the "" unstated sentinel (a declared member —
    // schemastery validates a default against its closed union).
    // GROUNDED: the live engine's UpscaleModelLoader COMBO is EMPTY
    // today (options: [] — no model files installed in
    // models/upscale_models); the declared vocabulary is the standard
    // set a user installs there, and the ENGINE refuses loud if a
    // picked file is absent — that refusal is the honest face, never
    // a silent drop. The family's SCALE_MODEL_OPTIONS export is the
    // one truth (this vocabulary and the prep action's enum options
    // cite it; the vocab-rails-subset wall seats the site LOCAL for
    // the same empty-combo reason).
    scale_model: vocabulary([...SCALE_MODEL_OPTIONS]).description("Upscale Model").default("").extra('extra', bag({ order: 7, group: "transform", wtype: 'select', visible_when: 'media_type=image' })),
});
const schemaFn = callableSchema(schema);
export const inject = ['comfyui'];
// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
    label: 'Input Prep',
    description: 'Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.',
    genre: 'image',
    icon: 'upload',
    principles: [
        'A source is data, not inference: the graph loads, optionally transforms, and saves — no model ever loads.',
        'Every source form the editor speaks validates at phase 1 (compile time): data: URLs, artifact URLs, input-dir names, absolute paths.',
        'Transforms ride the declared applicability matrix (image: crop+scale) — anything else refuses loudly, never silently drops.',
    ],
};
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'input-prep',
        // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
        skeleton: 'input_prep',
        // stock-only card (requires = ()): LoadImage/ImageCrop/
        // ImageScale/SaveImage + LoadAudio/SaveAudio are ComfyUI core
        // no requires to declare.
        boarded: [inputDecl.id],
        tags: ['image', 'input', 'prepare'],
        identity,
        // THE DISCOVERY ROWS (authored 2026-09-10 — the card postdates
        // the frozen discovery export's forms table, so it never had a
        // frozen forms row: sidebar order 12 fills the retired gap in
        // the image cluster; hidden (a flow-staging utility, never a
        // rail card); the flow stage stages one source file).
        sidebar: { key: 'image', order: 12, hidden: true },
        flowKinds: {
            // PRODUCER-ONLY (2026-10-09 — the text-seat trap): inputs is
            // EMPTY on purpose. source is dual-media file intake
            // (image-or-audio, role path / wtype file) — the single-kind
            // grammar cannot honestly seat it (source: 'text' offered a
            // picker seat no text producer can ever fill: text links
            // cannot land in LoadImage/LoadAudio file slots under ROW-4,
            // so the seat was an unwireable lie). Nothing wires INTO a
            // source card — it produces image/audio for downstream
            // stages to consume. A file arrives via the form/params
            // face, never a producer link.
            inputs: {},
            outputs: { image: 'image', audio: 'audio' },
            requiresModel: false,
        },
        flowOutputBindings: [
            {
                channel: 'image',
                node: 'SaveImage.0',
                nodeClass: 'SaveImage',
                when: (params) => params['media_type'] !== 'audio',
            },
            {
                channel: 'audio',
                node: 'SaveAudio.0',
                nodeClass: 'SaveAudio',
                when: (params) => params['media_type'] === 'audio',
            },
        ],
        // ADMISSION EXTRAS (the class-attr half verbatim: the
        // retired row's admits minus the boarded families' studio
        // writes, which the projection unions from the facts file).
        admits: ['crop', 'scale'],
        schema: schemaFn,
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the music/sfx/tts admission precedent —
            // the card's own declaration validates the last hop into the
            // engine): schemastery walk enforces the declared types and
            // bounds on every declared knob (source, media_type, the four
            // crop keys, the scale rail — anything else refuses LOUD,
            // never composes); the riders admit the two LEGACY overlay
            // objects only (crop/scale — old drafts keep parsing; 'model'
            // is no rider: nothing reads it, so the gate refuses it loud
            // rather than passing a dead key through). The composer's
            // reads below are reads of the GATED doc.
            const doc = gatedResolve('input-prep', schemaFn, ['crop', 'scale'], p);
            if (typeof doc.source !== 'string' || !doc.source.trim()) {
                throw new Error("required param 'source' missing on the input-prep card (the staged source — upload, asset drop, prior-run artifact, or input-dir filename)");
            }
            const cropValues = [doc['crop_x'], doc['crop_y'], doc['crop_width'], doc['crop_height']];
            const hasCrop = cropValues.some((value) => value >= 0);
            if (hasCrop && cropValues.some((value) => value < 0)) {
                throw new Error('input-prep crop needs all four values; unset fields are -1');
            }
            if (hasCrop && (cropValues[0] < 0 || cropValues[1] < 0 || cropValues[2] <= 0 || cropValues[3] <= 0)) {
                throw new Error('input-prep crop needs non-negative x/y and positive width/height');
            }
            // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a crop side
            // below MIN_DIM upscales to a blank (the 1x1-crop receipt) —
            // refused here in the card's voice, before any GPU is spent.
            if (hasCrop && (cropValues[2] < MIN_DIM || cropValues[3] < MIN_DIM)) {
                throw new Error(`input-prep crop needs width and height of at least ${MIN_DIM}px (got ${cropValues[2]}x${cropValues[3]}) — smaller crops upscale to a blank`);
            }
            const scaleWidth = doc['scale_width'];
            const scaleHeight = doc['scale_height'];
            const hasScale = scaleWidth >= 0 || scaleHeight >= 0;
            if (hasScale && (scaleWidth <= 0 || scaleHeight <= 0)) {
                throw new Error('input-prep scale needs positive width and height; -1 unsets both');
            }
            // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a scale
            // target below MIN_DIM on a side IS the reported blank
            // (run-c5eb3f2ec512: scale 2x1 → a 2x1 beige strip the lane
            // served as the run's image) — refused here, never composed.
            if (hasScale && (scaleWidth < MIN_DIM || scaleHeight < MIN_DIM)) {
                throw new Error(`input-prep scale needs width and height of at least ${MIN_DIM}px (got ${scaleWidth}x${scaleHeight}) — smaller targets upscale to a blank`);
            }
            const legacyCrop = typeof doc['crop'] === 'object' && doc['crop'] !== null && !Array.isArray(doc['crop'])
                ? doc['crop']
                : undefined;
            const legacyScale = typeof doc['scale'] === 'object' && doc['scale'] !== null && !Array.isArray(doc['scale'])
                ? doc['scale']
                : undefined;
            // THE DISPLAY-TRUTH LAW (audit input-prep F3,
            // 2026-10-20): the studio seeds its user layer from the row
            // and the run patch carries the whole layer, so an old draft
            // with a nested crop/scale object re-sends it on EVERY run
            // press — and legacy-first precedence composed the stale
            // object over every fresh flat edit (display read the flat
            // keys, the engine cropped the legacy box). Flat keys outrank
            // the object whenever any is seated; the object only composes
            // when NO flat key rides the doc (old drafts keep parsing).
            const crop = hasCrop ? {
                x: cropValues[0],
                y: cropValues[1],
                width: cropValues[2],
                height: cropValues[3],
            } : legacyCrop;
            const scale = hasScale ? {
                width: scaleWidth,
                height: scaleHeight,
                method: doc['scale_method'],
            } : legacyScale;
            const gated = { ...doc, crop, scale };
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound(gated, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the input-prep card — every boarded family (input) composes its own declared segment; this address owns none`);
            }
        },
    }));
}
//# sourceMappingURL=card.js.map