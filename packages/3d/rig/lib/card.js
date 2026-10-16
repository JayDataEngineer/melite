import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { DECL as transferRigDecl } from '@melite/models-transfer-rig';
import { DECL as gemSomaDecl } from '@melite/models-gem-soma';
import { DECL as anycreatureDecl } from '@melite/models-anycreature';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
export { parseValidateRigOutput, validateRigReport, ValidateRigOutputError } from "./validateRigReport.js";
const RIG_MODES = ['auto', 'copy', 'species'];
const schema = z.object({
    // The mesh to rig — required at compose (bare z.string() is the
    // image-gen prompt precedent: optional at parse, refused loud at
    // compose). wtype 'mesh' boards the base's mesh field atom
    // (primitive ③ — picker + inline GlbStagePreview thumb).
    mesh_glb: z.string().role('path').description("Mesh to rig").extra('extra', bag({ order: 0, tooltip: "The static GLB that receives skeleton + weights (TRELLIS/anny/quad output, or any import).", required: true, wtype: 'mesh' })),
    mode: vocabulary(RIG_MODES).default('auto').description("Rig mode").extra('extra', bag({ order: 1, wtype: 'select', tooltip: "auto: SOMA-77 humanoid template weights. copy: transfer the donor GLB's rig. species: bind onto an anyCreature skeleton." })),
    // copy lane's donor — the rigged GLB whose skeleton + weights copy
    // onto the target (the same pair the buried transfer-rig arm took).
    donor_glb: z.string().role('path').description("Rigged donor GLB").extra('extra', bag({ order: 2, wtype: 'mesh', visible_when: 'mode=copy', tooltip: "copy mode: the rigged GLB whose skeleton + weights transfer (SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature)." })),
    // species lane's template — an anyCreature GLB (armature + baked
    // idle/move anims); the caller brings it from the anycreature lane.
    creature_glb: z.string().role('path').description("Creature template GLB").extra('extra', bag({ order: 3, wtype: 'mesh', visible_when: 'mode=species', tooltip: "species mode: the anyCreature GLB whose skeleton (with baked idles) the mesh binds onto." })),
    // auto-lane knobs (KimodoExportFBX, its 'SOMAX standalone mode').
    preserve_texture: z.boolean().default(true).description("Preserve texture").extra('extra', bag({ order: 4, visible_when: 'mode=auto', tooltip: "auto mode: keep the source mesh's textures. Off strips to flat SOMA-blue for texturing later." })),
    decimate_ratio: z.number().min(0).max(1).default(0).description("Decimate ratio").extra('extra', bag({ order: 5, visible_when: 'mode=auto', tooltip: "0 = off (the rig default). Collapse-mode decimation preserves skin weights; 0.2 ≈ -70% file size." })),
    file_format: vocabulary(['glb', 'fbx']).default('glb').description("File format").extra('extra', bag({ order: 6, visible_when: 'mode=auto', tooltip: "auto mode: glb for the web estate, fbx for the Unity import door (the node converts through headless Blender).", wtype: 'select' })),
    // species-lane knobs (RayCreatureRigBridge).
    height_ratio: z.number().min(0.05).max(10).default(1).description("Height ratio").extra('extra', bag({ order: 7, visible_when: 'mode=species', tooltip: "species mode: mesh height as a fraction of the creature bind-pose height." })),
    max_influences: z.number().min(1).max(8).default(3).description("Max influences").extra('extra', bag({ order: 8, visible_when: 'mode=species', tooltip: "species mode: max bone influences per vertex (nearest segments win)." })),
    strip_body: z.boolean().default(true).description("Strip body").extra('extra', bag({ order: 9, visible_when: 'mode=species', tooltip: "species mode: delete the creature body meshes, export only the bound mesh." })),
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
        'species binds onto an anyCreature skeleton with baked idles',
        'rig BEFORE texture-touching passes so weights ride the final topology',
    ],
};
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'rig',
        skeleton: 'rig',
        // BOARDED IS EMPTY BY LAW (the family-coverage cure's final
        // shape, 2026-10-12): this card's three mode families are all
        // tool atoms consumed by lane, not pickable offers. gem-soma +
        // anycreature are unoffered (weightless — the compose seat's
        // routes map refuses their ids; boarding them fired arm 3's
        // "no model unit" red, the proof that unoffered atoms never
        // board); their binding is the import above — the wall's
        // consumer grep finds the family ids in this file's src.
        // transfer-rig (copy lane) is boarded on its owning card,
        // img-to-mesh (one family, one card — service.ts's
        // family-taken refusal names the law). Anycreature reached the
        // wall's dead list only because it lacked its unoffered flag —
        // cured family-side, not card-side.
        boarded: [],
        tags: ['3d', 'rig', 'skinning'],
        identity,
        sidebar: { key: '3d', order: 15 },
        flowKinds: {
            inputs: { mesh_glb: 'mesh', donor_glb: 'mesh', creature_glb: 'mesh' },
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
                // lane. Nothing below authors a node — the three arms moved to
                // the families that own them (transfer-rig, gem-soma,
                // anycreature), each pinned to a committed golden.
                const action = declaredAction(transferRigDecl, 'transfer');
                const row = { id: transferRigDecl.id, family: transferRigDecl.id, card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] };
                instantiateAction(action, { rigged_glb: donor, target_glb: mesh }, row, g, runId);
                return;
            }
            if (mode === 'species') {
                const creature = String(doc.creature_glb || '');
                if (!creature.trim()) {
                    throw new Error(`required param 'creature_glb' (Creature template GLB) missing on the rig card's species lane — the species bind needs both the creature template and the mesh`);
                }
                const action = declaredAction(anycreatureDecl, 'bind');
                const row = { id: anycreatureDecl.id, family: anycreatureDecl.id, card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] };
                instantiateAction(action, { creature_glb: creature, mesh_glb: mesh, height_ratio: doc.height_ratio, max_influences: doc.max_influences, strip_body: doc.strip_body }, row, g, runId);
                return;
            }
            // auto — the SOMA-77 template's own weights
            const action = declaredAction(gemSomaDecl, 'rig');
            const row = { id: gemSomaDecl.id, family: gemSomaDecl.id, card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] };
            instantiateAction(action, { mesh_glb: mesh, preserve_texture: doc.preserve_texture, decimate_ratio: doc.decimate_ratio, file_format: doc.file_format }, row, g, runId);
        },
    }));
}
//# sourceMappingURL=card.js.map
