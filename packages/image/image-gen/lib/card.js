import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { stripAutofill } from '@melite/comfyui-card-kit/graph';
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab';
import { promptPairExtra, samplingExtra, seedExtra } from '@melite/comfyui-card-kit/fields';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { MASK_RIDERS } from '@melite/comfyui-card-kit/pack-fields';
import { IMPACT_PACKS } from '@melite/comfyui-card-kit';
import { statedRegion, regionSourceKind } from '@melite/comfyui-card-kit';
import { DECL as krea2Decl } from '@melite/models-krea-2';
import { DECL as zImageDecl } from '@melite/models-z-image';
import { DECL as animaDecl } from '@melite/models-anima';
import { DECL as qwenImg21Decl } from '@melite/models-qwen-img-21';
import { DECL as fluxKleinDecl } from '@melite/models-flux-klein';
import { DECL as mossImageDecl } from '@melite/models-moss-image';
import { semanticModelEntries } from '@melite/comfyui-card-kit/semanticModelKnob';
import { bag } from '@melite/contracts/extraKeys';
/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. The id is spelled once, in the model
 *  plugin; a rename breaks at tsc, never silently at the
 *  not-boarded refusal. The model-knob enum, the tool default, and
 *  the registry row all derive from this array. */
export const BOARDED = [krea2Decl.id, zImageDecl.id, animaDecl.id, qwenImg21Decl.id, fluxKleinDecl.id, mossImageDecl.id];
/** THE GEN REGION ROSTER (the gen detailer serve, operator
 *  2026-11-07): the img-gen families whose t2i builds compose the
 *  crop_stitch arm — the operator's burn lane plus the declared
 *  Impact slice. Every other boarded family keeps the E2-11
 *  refusal, naming this roster's seats. */
export const GEN_REGION_SERVED = new Set([krea2Decl.id, qwenImg21Decl.id]);
/** The served style enum (the semantic model knob): entries derived
 *  from the same five DECLs — labels are their own copy, values
 *  are stable family:variant:cell addresses, routes resolve
 *  estate-side. One source: the tool face serves THIS, never a
 *  second hand-written list. */
export const SEMANTIC_MODELS = semanticModelEntries([
    krea2Decl, zImageDecl, animaDecl, qwenImg21Decl, fluxKleinDecl, mossImageDecl,
]);
/** The action bindings (the atom vocabulary, stroke-1 pilot): a
 *  boarded family with a bound action composes through the atom's
 *  own declared segment — the card delegates, never authors nodes.
 *  Keyed by the OWNING FAMILY (model.family, never model.id: six of
 *  ten served addresses are route ids — a route-keyed lookup misses
 *  and silently composes nothing). Every boarded family holds a
 *  bound action; the binding per family is the card's declared
 *  compose contract, never an id switch inside lane code. Exported
 *  for the every-address wall: each served facts row's OWNING
 *  family must hold a row here — a boarded-but-unbound family
 *  refuses loud at the dispatch, never a silent miss. */
// THE IMAGE-GEN STRIP PASS (re-homed from the card kit, 2026-09-30 —
// the kit-arm retirement): this card's finalize owns its own
// serialization law. The t2i templates omit these pin defaults, so
// the engine would auto-fill them at serialization; stripping an
// empty value is what keeps the request byte-stable. The strip lived
// in the kit while the lane moved to the families; a finalize pass
// with no lane beside it is a second home, so it came here.
export const IMAGE_GEN_STRIP = {
    CLIPLoader: ['device'],
    KSampler: ['control_after_generate'],
};
/** The card's autofill strip (the t2i family's pin defaults never ride). */
export function finalizeImageGen(graph) {
    return stripAutofill(graph, IMAGE_GEN_STRIP);
}
export const ACTION_BINDINGS = {
    [krea2Decl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(krea2Decl, 't2i'), p, model, g, runId);
    },
    [zImageDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(zImageDecl, 't2i'), p, model, g, runId);
    },
    [animaDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(animaDecl, 't2i'), p, model, g, runId);
    },
    [qwenImg21Decl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(qwenImg21Decl, 't2i'), p, model, g, runId);
    },
    [fluxKleinDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(fluxKleinDecl, 't2i'), p, model, g, runId);
    },
    [mossImageDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(mossImageDecl, 't2i'), p, model, g, runId);
    },
};
export const schema = z.object({
    // CARD-OWNED SURFACE (the 1:1 port, 2026-09-08): declaration
    // order = the field order (frozen form_spec krea-2 referee).
    // loras is NOT here — the LoRA bag rides the MOD absorption
    // (each boarded family's mods/loras.ts flavor; the interlock).
    // compose still consumes p.loras (kit.ts stackLoras) — the user
    // bag, however it was filled (a family Recipe macro may have
    // stamped it).
    prompt: z.string().description('Prompt').extra('extra', bag(promptPairExtra().prompt)),
    negative_prompt: z.string().description('Negative Prompt').extra('extra', bag(promptPairExtra().negative_prompt)),
    width: z.number().description('Width').min(256).max(2048).step(16).extra('extra', bag({ order: 0, group: 'resolution', columns: 2, width: 1, zone: 'params', wtype: 'number' })),
    height: z.number().description('Height').min(256).max(2048).step(16).extra('extra', bag({ order: 1, group: 'resolution', columns: 2, width: 1, zone: 'params', wtype: 'number' })),
    seed: z.number().description('Seed').step(1).default(-1).extra('extra', bag(seedExtra({ order: 4, group: 'sampling', width: 1, zone: 'params' }))),
    steps: z.number().description('Steps').min(1).max(100).step(1).extra('extra', samplingExtra('steps')),
    cfg: z.number().description('Guidance Scale').min(1).max(20).step(0.1).extra('extra', samplingExtra('cfg', { tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.' })),
    sampler: SAMPLERS.description('Sampler').extra('extra', samplingExtra('sampler')),
    scheduler: SCHEDULERS.description('Scheduler').extra('extra', samplingExtra('scheduler')),
    // THE REFERENCE SEAT (audit 004/C4, 2026-10-22): served LAST so
    // the frozen form_spec field order holds. It fires only on the
    // qwen-img-21 lane (the family's encoder reads references); a
    // stated list on another family refuses at compose — the
    // phantom-port law below.
    reference_images: z.array(z.string()).description('Reference Images').extra('extra', bag({ order: 9, group: 'reference', width: 1, zone: 'params', wtype: 'image_list', tooltip: 'Optional reference images — identity/subject anchors the qwen-img-21 encoder conditions on. Ignored-loud on other families: a stated list refuses rather than dropping.' })),
});
export const identity = {
    label: 'Generate Image',
    description: 'Text-to-image generation — the generate_image interface card',
    genre: 'image',
    icon: 'image',
    principles: [
        'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
        'ONE param cascade (stroke 34 — the card-recipe layer is dead): schema defaults < model-folder defaults (the family rail resolves the model row) < your explicit values. Presets are FAMILY Recipe rows — one-click macros that stamp declared knobs/bags, never a persisted mode',
        'Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied',
        'A preset fills untouched fields; values you have set win',
        'Mods are model-level declarations: every boarded family boards loras (krea-2 applies on Turbo and trains on Raw; row-less families take user files until first-party adapters exist)',
        'Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops',
    ],
};
const schemaFn = callableSchema(schema);
/** Register the card face into the engine registry. The service
 *  arrives as a parameter (index.ts probed it — comfyui is an
 *  optional dependency, not an injected one). */
// requiresByFamily: declared on the seam owner
// (card-definition.ts:64, local augmentation removed 2026-11-05 per
// the card-UI audit's A15 — boundary types live with their owner).
export function registerCard(ctx, comfy) {
    ctx.effect(() => comfy.registerCard({
        id: 'image-gen',
        skeleton: 'generate',
        boarded: [...BOARDED],
        tags: ['image', 'generate', 'text-to-image'],
        identity,
        // MASK-C (the image-gen region gap): the cured family's slice.
        // qwen-img-21 boards 'mask', whose region arm is the Impact
        // detector chain — the compose door gates the ACTIVE family's
        // slice (a plain qwen run on an Impact-less engine refuses
        // missing-extension with the install rescue; every other
        // family's slice is empty and unaffected). The flat list
        // carries the UNION for flat consumers (the H4 law).
        requires: [...IMPACT_PACKS],
        requiresByFamily: {
            [qwenImg21Decl.id]: [...IMPACT_PACKS],
        },
        // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
        // discovery export — the card owns its sidebar, surface, and
        // flow-stage declarations; the discovery arms derive from here).
        sidebar: { key: 'image', order: 1 },
        flowKinds: {
            inputs: { prompt: 'text' },
            outputs: { default: 'image' },
            requiresModel: true,
        },
        schema: schemaFn,
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the audio-trio admission precedent — the
            // card's own declaration validates the last hop into the
            // engine): schemastery walk enforces declared types + bounds (a
            // width=9999 draft refuses LOUD here, never composes), fills
            // defaults, and passes mod-plane keys (loras bags, admits)
            // through verbatim — nothing drops. The composer's reads below
            // are reads of the GATED doc. The T6 strict resolve: every key
            // that is neither a declared knob nor a rider (the loras bag
            // and the model stamp the family defaults carry are this
            // card's riders — no admits, no studio writes on the boarded
            // image families) refuses 'unknown-param', named — a typo'd
            // `promptt` never composes, never renders.
            // THE MOD-SURFACE SANCTION (E2-11): the mask mod is DECLARED
            // surface on every img-gen family (the operator's 2026-11-07
            // boarding; the estate's admission gate sanctions the same
            // names via the absorbed-mod interlock) — the bag and its
            // fields ride the walk verbatim, exactly like the loras bag
            // (image-edit's own rider shape, one spelling: MASK_RIDERS).
            const doc = gatedResolve('image-gen', schemaFn, ['loras', 'model', ...MASK_RIDERS], p);
            // THE REGION SERVE/REFUSE GATE (E2-11 refused-fate honesty, the
            // gen detailer serve 2026-11-07): the stated-region read is the
            // kit's ONE spelling (statedRegion — the served t2i builds
            // branch on the same verdict, so the gate and the arm can never
            // disagree). Served lanes (krea-2, qwen-img-21) compose the
            // crop_stitch arm; every other lane keeps the E2-11 refusal in
            // the teaching voice, naming the serving lanes. The walk's
            // FILLED default (mask_mode 'crop_stitch', detector 'off')
            // never fires: the form stamps defaults on every write.
            const region = statedRegion(doc);
            if (region !== null && !GEN_REGION_SERVED.has(model.family ?? model.id)) {
                throw new Error(`'${region.key}' fires on the image-gen card (the region arm serves krea-2 + qwen-img-21 — the region vocabulary composes on the image-edit card and the served gen lanes; this family builds no region arm yet) — refusing instead of silently plain-generating`);
            }
            if (region !== null) {
                if (regionSourceKind(region) === null) {
                    throw new Error(`'${region.key}' fires on the image-gen card (crop_stitch needs a region — state input_mask or pick a detector) — refusing instead of silently plain-generating`);
                }
                if (region.mode !== 'crop_stitch') {
                    throw new Error(`'${region.key}' fires on the image-gen card (regions ride crop_stitch only — state mask_mode crop_stitch or clear the region) — refusing instead of silently plain-generating`);
                }
            }
            if (!doc.prompt || !doc.prompt.trim()) {
                throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)");
            }
            // THE PHANTOM-PORT LAW: the seat is qwen-img-21's — a stated
            // list on any other family refuses LOUD, never drops.
            const statedRefs = doc.reference_images;
            if (Array.isArray(statedRefs) && statedRefs.length > 0 && (model.family ?? model.id) !== 'qwen-img-21') {
                throw new Error(`reference_images stated on family '${String(model.family ?? model.id)}' — the reference seat fires only on qwen-img-21 (its encoder reads references); this family has no reference port`);
            }
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound) {
                bound(doc, model, g, runId);
                return;
            }
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the image-gen card — every boarded family (krea-2, z-image, anima, qwen-img-21, flux-klein, moss-image) composes its own declared segment; this address owns none`);
            }
        },
        finalize: finalizeImageGen,
    }));
}
//# sourceMappingURL=card.js.map