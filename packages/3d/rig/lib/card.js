import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { DECL as transferRigDecl } from '@melite/models-transfer-rig';
import { DECL as gemSomaDecl } from '@melite/models-gem-soma';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
export { parseValidateRigOutput, validateRigReport, ValidateRigOutputError } from "./validateRigReport.js";
const RIG_MODES = ['auto', 'copy'];
const schema = z.object({
    // The mesh to rig — required at compose (bare z.string() is the
    // image-gen prompt precedent: optional at parse, refused loud at
    // compose). wtype 'mesh' boards the base's mesh field atom
    // (primitive ③ — picker + inline GlbStagePreview thumb).
    mesh_glb: z.string().role('path').description("Mesh to rig").extra('extra', bag({ order: 0, tooltip: "The static GLB that receives skeleton + weights (TRELLIS/anny/quad output, or any import).", required: true, wtype: 'mesh' })),
    mode: vocabulary(RIG_MODES).default('auto').description("Rig mode").extra('extra', bag({ order: 1, wtype: 'select', tooltip: "auto: SOMA-77 humanoid template weights. copy: transfer the donor GLB's rig." })),
    // copy lane's donor — the rigged GLB whose skeleton + weights copy
    // onto the target (the same pair the buried transfer-rig arm took).
    donor_glb: z.string().role('path').description("Rigged donor GLB").extra('extra', bag({ order: 2, wtype: 'mesh', visible_when: 'mode=copy', tooltip: "copy mode: the rigged GLB whose skeleton + weights transfer (SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature)." })),
    // auto-lane knob (KimodoExportFBX, its 'SOMAX standalone mode').
    preserve_texture: z.boolean().default(true).description("Preserve texture").extra('extra', bag({ order: 3, visible_when: 'mode=auto', tooltip: "auto mode: keep the source mesh's textures. Off strips to flat SOMA-blue for texturing later." })),
});
const schemaFn = callableSchema(schema);
export const inject = ['comfyui'];
export const identity = {
    label: 'Rig',
    description: 'Skeleton + weights on any GLB',
    genre: '3d',
    icon: 'mesh',
    principles: [
        'auto rigs humanoids with the SOMA-77 template (anatomically correct weights)',
        'copy transfers a rigged donor onto a clothed target (textures preserved)',
        'rig BEFORE texture-touching passes so weights ride the final topology',
    ],
};
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'rig',
        skeleton: 'rig',
        // BOARDED IS EMPTY BY LAW (the family-coverage cure's final
        // shape, 2026-10-12): this card's mode families are all tool
        // atoms consumed by lane, not pickable offers. gem-soma is
        // unoffered (weightless — the compose seat's routes map refuses
        // its id; boarding it fired arm 3's "no model unit" red, the
        // proof that unoffered atoms never board); its binding is the
        // import above — the wall's consumer grep finds the family id
        // in this file's src. transfer-rig (copy lane) is boarded on
        // its owning card, img-to-mesh (one family, one card —
        // service.ts's family-taken refusal names the law).
        boarded: [],
        tags: ['3d', 'rig', 'skinning'],
        identity,
        sidebar: { key: '3d', order: 15 },
        flowKinds: {
            inputs: { mesh_glb: 'mesh', donor_glb: 'mesh' },
            outputs: { default: 'mesh' },
            requiresModel: false,
        },
        flowOutputBindings: [
            {
                channel: 'default',
                node: 'KimodoExportFBX.0',
                nodeClass: 'KimodoExportFBX',
                when: (params) => String(params.mode ?? 'auto') === 'auto',
            },
            {
                channel: 'default',
                node: 'SaveRiggedModel.0',
                nodeClass: 'SaveRiggedModel',
                when: (params) => String(params.mode ?? 'auto') !== 'auto',
            },
        ],
        requires: ['melite-autorig-nodes', 'melite-poser-nodes'],
        schema: schemaFn,
        compose(p, _model, g, runId) {
            // THE SCHEMA GATE (the quad-remesh precedent): the declared
            // types + bounds own the last hop into the engine; every read
            // below is a read of the GATED doc.
            const doc = gatedResolve('rig', schemaFn, ['model'], p);
            const mesh = String(doc.mesh_glb || '');
            if (!mesh.trim()) {
                throw new Error(`required param 'mesh_glb' (Mesh to rig) missing on the rig card — the rig needs the static mesh (GLB path or artifact-ref)`);
            }
            const mode = String(doc.mode);
            if (mode === 'copy') {
                const donor = String(doc.donor_glb || '');
                if (!donor.trim()) {
                    throw new Error(`required param 'donor_glb' (Rigged donor GLB) missing on the rig card's copy lane — the rig copy needs the donor rig AND the clothed target`);
                }
                // THE DECLARED SEGMENT (the atom vocabulary, stroke 2): the
                // card's mode knob names the family; the family composes the
                // lane. Nothing below authors a node — the two arms moved to
                // the families that own them (transfer-rig, gem-soma), each
                // pinned to a committed golden.
                const action = declaredAction(transferRigDecl, 'transfer');
                const row = { id: transferRigDecl.id, family: transferRigDecl.id, card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] };
                instantiateAction(action, { rigged_glb: donor, target_glb: mesh }, row, g, runId);
                return;
            }
            // auto — the SOMA-77 template's own weights
            const action = declaredAction(gemSomaDecl, 'rig');
            const row = { id: gemSomaDecl.id, family: gemSomaDecl.id, card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] };
            instantiateAction(action, { mesh_glb: mesh, preserve_texture: doc.preserve_texture }, row, g, runId);
        },
    }));
}
//# sourceMappingURL=card.js.map
