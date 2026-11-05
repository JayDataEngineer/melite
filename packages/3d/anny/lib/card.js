import z from '@deepseek-ai/schemastery';
import { declaredAction, finalizeAnny, instantiateAction } from '@melite/comfyui-card-kit';
import { DECL as annyDecl } from '@melite/models-anny';
import { ANNY_MORPH_LABELS, ANNY_MORPH_RANGE, ANNY_MORPH_DEFAULT } from '@melite/comfyui-card-kit/morphs';
import { bag } from '@melite/contracts/extraKeys';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
/** The served identity space's 11 dims, in its label order (the
 *  bake validator names the same eleven — gender/age/muscle/weight/
 *  height/proportions/cupsize/firmness/african/asian/caucasian). */
const PHENOTYPE_DIMS = [
    'gender', 'age', 'muscle', 'weight', 'height', 'proportions',
    'cupsize', 'firmness', 'african', 'asian', 'caucasian',
];
const schema = z.object({
    body_glb: z.string().role('path').description("Body GLB").extra('extra', bag({ order: 0, group: "body", columns: 1, tooltip: "Optional — attach a rigged body GLB to render as-is. Empty bakes the body FROM the identity sliders (parametric end-to-end; the neutral body is the all-defaults bake). Photo→body estimation is the 'Estimate body from photo' verb.", wtype: 'mesh' })),
    // (l) THE IMAGE FACE (operator 2026-11-08, ERRORS.md:100): the
    // MakeHuman/photo slot IS the estimator's card face — a non-empty
    // image makes the body THE ESTIMATE (LoadImage →
    // Sam3dBodyImageToAnny, the exact chain the hmr-estimate verb
    // drives), by ONE stated precedence: image > glb > parametric
    // bake (compose owns it, stated once). THE SUBACTIONMOD
    // AMENDMENT, declared here at the seat: the verb's knobs stay the
    // verb's (person_index stays FIXED at 0 in compose — only the
    // IMAGE joins the card surface); wtype 'image' rides the
    // constructor's auto-square law (form.tsx's emitted-image fields
    // mount THE ONE SQUARE, no call site wiring).
    body_image: z.string().role('path').description("Body photo").extra('extra', bag({ order: 1, group: "body", columns: 1, tooltip: "Optional — a body photo (MakeHuman/Facebook-style). A stated photo becomes the body via SAM-3D-Body estimation, overriding an attached GLB; empty falls to the GLB, then the identity sliders. The person picker stays on the 'Estimate body from photo' verb.", wtype: 'image' })),
    ...Object.fromEntries(PHENOTYPE_DIMS.map((dim, i) => [dim,
        z.number().description(dim.charAt(0).toUpperCase() + dim.slice(1)).min(0).max(1)
            .extra('extra', bag({ order: i, group: "identity", width: 1, wtype: 'slider', columns: 2, tooltip: `Identity dim ${i + 1}/11 — ${dim} (0..1, neutral 0.5; served by the poser's identity space).` })),
    ])),
    ...Object.fromEntries(ANNY_MORPH_LABELS.map((label, i) => [label,
        z.number().description(label).default(ANNY_MORPH_DEFAULT).min(ANNY_MORPH_RANGE[0]).max(ANNY_MORPH_RANGE[1])
            .extra('extra', bag({ order: 1000 + i, group: "morph", width: 1, wtype: 'slider', columns: 2, tooltip: `Morph ${i + 1}/254 — ${label} (${ANNY_MORPH_RANGE[0]}..${ANNY_MORPH_RANGE[1]}, neutral 0; the poser's local-changes vocabulary).` })),
    ])),
});
const schemaFn = callableSchema(schema);
export const inject = ['comfyui'];
// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
    label: 'Anny',
    description: 'Author a character body — 11 identity sliders (or attach a GLB, or load a preset), then bake the body GLB.',
    genre: '3d',
    icon: 'person',
};
// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): every
// boarded family's declared compose action, keyed by the row's
// family address. A family-less row (the declared fallback) rides
// the legacy lane arm below — never a silent second copy.
export const ACTION_BINDINGS = {
    [annyDecl.id]: (p, model, g, runId) => void instantiateAction(declaredAction(annyDecl, 'compose'), p, model, g, runId),
};
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'anny',
        // no model families — a pure-tool card (requiresModel: false
        // skips the {model:} demand in cardGate, compose, CLI — the
        // flowKinds row below repeats it for discovery).
        requiresModel: false,
        // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
        skeleton: 'anny',
        boarded: [annyDecl.id],
        tags: ['3d', 'character', 'generate'],
        identity,
        // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
        // discovery export — the card owns its sidebar, surface, and
        // flow-stage declarations; the discovery arms derive from here).
        sidebar: { key: '3d', order: 14 },
        // NO surface claim (stroke 89): the studio layout died with the
        // handroll — the emission's three declared groups render through
        // the base form's switchable parameter submenu. The card owns
        // its schema; the CONSTRUCTOR owns the surface.
        flowKinds: {
            // (l) the image face rides beside the mesh attach — the runs
            // registry's validation path admits image inputs through the
            // media lane (the estimator's LoadImage reads a photo path)
            inputs: { body_glb: 'mesh', body_image: 'image' },
            outputs: { default: 'mesh' },
            requiresModel: false,
        },
        // The assembly bake is the terminal (the SaveImage turnaround tail
        // died with the blender lane, 2026-11-01).
        flowOutputBindings: [
            { channel: 'default', node: 'CompositeCharacter.0', nodeClass: 'CompositeCharacter' },
        ],
        requires: ['melite-poser-nodes', 'melite-kimodo-nodes'],
        schema: schemaFn,
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the audio-trio admission precedent — the
            // card's own declaration validates the last hop into the
            // engine): schemastery walk enforces declared types + bounds
            // (identity dims cap at 1, morphs at their pin range — an
            // out-of-range draft refuses LOUD here, never composes),
            // fills defaults, and refuses undeclared keys loud (a stale
            // draft carrying a retired turnaround knob dies here). The
            // composer's reads below are reads of the GATED doc.
            const doc = gatedResolve('anny', schemaFn, ['model'], p);
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound(doc, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the anny card — every boarded family (anny) composes its own declared segment; this address owns none`);
            }
        },
        finalize: finalizeAnny,
        // THE NATIVE FIGURE (stroke 90): before any run lands, the mesh
        // stage shows the /poser shaped bind mesh (18k verts, smooth
        // normals — NEVER the low-poly GLB export, the 2026-09-06
        // "native ANNY not GLB" order). Served verbatim on the doc's
        // preview arm; run outputs take the stage once they exist.
        preview: { figure: { identityModel: 'anny' } },
    }));
}
//# sourceMappingURL=card.js.map
