import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { stripAutofill } from '@melite/comfyui-card-kit/graph';
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab';
import { samplingExtra } from '@melite/comfyui-card-kit/fields';
import { gatedResolve } from '@melite/comfyui-cordis';
import { DECL as krea2Decl } from '@melite/models-krea-2';
import { DECL as zImageDecl } from '@melite/models-z-image';
import { DECL as animaDecl } from '@melite/models-anima';
import { DECL as qwenImg21Decl } from '@melite/models-qwen-img-21';
import { DECL as fluxKleinDecl } from '@melite/models-flux-klein';
import { semanticModelEntries } from '@melite/comfyui-cordis/semanticModelKnob';
import { bag } from '@melite/contracts/extraKeys';
/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. The id is spelled once, in the model
 *  plugin; a rename breaks at tsc, never silently at the
 *  not-boarded refusal. The model-knob enum, the tool default, and
 *  the registry row all derive from this array. */
export const BOARDED = [krea2Decl.id, zImageDecl.id, animaDecl.id, qwenImg21Decl.id, fluxKleinDecl.id];
/** The served style enum (the semantic model knob): entries derived
 *  from the same five DECLs — labels are their own copy, values
 *  are stable family:variant:cell addresses, routes resolve
 *  estate-side. One source: the tool face serves THIS, never a
 *  second hand-written list. */
export const SEMANTIC_MODELS = semanticModelEntries([
    krea2Decl, zImageDecl, animaDecl, qwenImg21Decl, fluxKleinDecl,
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
};
export const schema = z.object({
    // CARD-OWNED SURFACE (the 1:1 port, 2026-09-08): declaration
    // order = the field order (frozen form_spec krea-2 referee).
    // loras is NOT here — the krea-2 LoRA knob rides the MOD
    // absorption (mods/loras.ts; the interlock). compose still
    // consumes p.loras (kit.ts stackLoras) — the user bag, however
    // it was filled (a family Recipe macro may have stamped it).
    prompt: z.string().description('Prompt').extra('extra', bag({ order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' })),
    negative_prompt: z.string().description('Negative Prompt').extra('extra', bag({ order: 1, group: 'prompt', width: 1, zone: 'params', wtype: 'textarea' })),
    width: z.number().description('Width').min(256).max(2048).step(16).extra('extra', bag({ order: 0, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number' })),
    height: z.number().description('Height').min(256).max(2048).step(16).extra('extra', bag({ order: 1, group: 'resolution', width: 1, zone: 'params', wtype: 'number' })),
    seed: z.number().description('Seed').step(1).default(-1).extra('extra', bag({ order: 4, group: 'sampling', width: 1, zone: 'params' })),
    steps: z.number().description('Steps').min(1).max(100).step(1).extra('extra', samplingExtra('steps')),
    cfg: z.number().description('Guidance Scale').min(1).max(20).step(0.1).default(4.5).extra('extra', samplingExtra('cfg', { tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.' })),
    sampler: SAMPLERS.description('Sampler').extra('extra', samplingExtra('sampler')),
    scheduler: SCHEDULERS.description('Scheduler').extra('extra', samplingExtra('scheduler')),
    // THE REFERENCE SEAT (004/C4 — the phantom-port cure's return
    // condition, met; 006/U1 widened it): the reference-guided t2i
    // lanes read this list — qwen-img-21 through the encoder's own
    // images.image_N autogrow slots, flux-klein through scaled
    // ReferenceLatent chains — and the first reference sizes the
    // canvas on both; declared LAST so the frozen field order above
    // is untouched, carried to the input group's head by its bag
    // order. compose REFUSES a stated list on every other boarded
    // family in the field's voice — never a silent drop, in either
    // direction.
    reference_images: z.array(z.string()).role('path').description('Reference Images').default([]).extra('extra', bag({ order: -1, group: 'input', width: 1, zone: 'inputs', wtype: 'image_list', max_stack: 4, serveDefault: true, tooltip: 'Reference images guiding generation (qwen-img-21, flux-klein): the first reference sizes the canvas — width/height apply only with no reference. Fires only on those lanes.' })),
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
        'Mods are model-level declarations: lanpaint rides the families that declare it (anima, z-image) — input_image + lanpaint_mask switch the builder to LanPaintKSampler; loras ride krea-2 (apply on Turbo, train on Raw)',
        'Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops',
    ],
};
/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema;
/** Register the card face into the engine registry. The service
 *  arrives as a parameter (index.ts probed it — comfyui is an
 *  optional dependency, not an injected one). */
export function registerCard(ctx, comfy) {
    ctx.effect(() => comfy.registerCard({
        id: 'image-gen',
        skeleton: 'generate',
        boarded: [...BOARDED],
        tags: ['image', 'generate', 'text-to-image'],
        identity,
        // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
        // discovery export — the card owns its sidebar, surface, and
        // flow-stage declarations; the discovery arms derive from here).
        sidebar: { key: 'image', order: 1 },
        flowKinds: {
            // THE REFERENCE PORT RETURNS (004/C4 — the 2026-09-21 phantom
            // port's own return condition, met at last): the seat rides
            // WITH a schema knob AND a compose read (the 2.1 lane's
            // reference-guided t2i arm consumes every wired image; the
            // compose gate above refuses it on the lanes that cannot). A
            // port the card cannot consume is a lie — this one consumes.
            inputs: { prompt: 'text', reference_images: 'image_list' },
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
            const doc = gatedResolve('image-gen', schemaFn, ['loras', 'model'], p);
            if (!doc.prompt || !doc.prompt.trim()) {
                throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)");
            }
            // THE REFERENCE-SEAT FAMILY GATE (004/C4; 006/U1 widened the
            // read set): reference_images is the reference-guided lanes'
            // own read; a stated non-blank list on any other boarded
            // family refuses in the field's voice — the card schema is
            // shared, the read is not, and a shared knob that only some
            // lanes consume must never drop silently on the rest.
            const refs = Array.isArray(doc.reference_images) ? doc.reference_images : [];
            const refFam = model.family ?? model.id;
            const REFERENCE_FAMILIES = new Set([qwenImg21Decl.id, fluxKleinDecl.id]);
            if (refs.some((s) => s.trim() !== '') && !REFERENCE_FAMILIES.has(refFam)) {
                throw new Error(`field 'reference_images' fires nothing on family '${refFam}' on the image-gen card (only ${qwenImg21Decl.id} and ${fluxKleinDecl.id} read references — switch lane or drop the list)`);
            }
            const bound = ACTION_BINDINGS[refFam];
            if (bound) {
                bound(doc, model, g, runId);
                return;
            }
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the image-gen card — every boarded family (krea-2, z-image, anima, qwen-img-21, flux-klein) composes its own declared segment; this address owns none`);
            }
        },
        finalize: finalizeImageGen,
    }));
}
//# sourceMappingURL=card.js.map
