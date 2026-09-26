// Tier 3 — the rig card (ROADMAP card program P0, 2026-09-21):
// "skeleton + weights on this GLB". Engine-native surface (the
// quad-remesh shape — no checkpoints ride: the SOMA-77 template's
// hand-painted weights SHIP in the autorig pack, the species
// skeletons in anyCreature GLBs the caller brings). Three lanes,
// one mode knob:
//
//   auto    KimodoExportFBX (action 'apply_weights' by the node's
//           own input dispatch: source_glb without npz_path) — the
//           SOMA-77 template weights transfer onto the mesh.
//   copy    KimodoTransferWeights + SaveRiggedModel (the live
//           transfer_rig arm verbatim — the rig-copy promoted from
//           its buried seat as img-to-mesh's third family).
//   species RayCreatureRigBridge — bind the mesh onto an anyCreature
//           template skeleton (armature + baked idles).
//
// The skintokens/TokenRig lane stays OUT until the external
// ComfyUI-SkinToken pack is vendored + verified — a lane whose node
// cannot register is not a lane (LAW 2: no borrowed gears).
//
// NODE CONTRACTS (vendor/, both packs local + always installed):
//  · melite-autorig-nodes/nodes.py — KimodoExportFBX (REQUIRED
//    rigged_path rides empty on the auto arm; file_format 'glb';
//    preserve_texture True keeps the source textures, False strips
//    to flat SOMA-blue; decimate_ratio 0=off, Collapse mode
//    preserves skin weights), KimodoTransferWeights + SaveRiggedModel.
//  · melite-poser-nodes/nodes.py — RayCreatureRigBridge
//    (height_ratio fraction of the creature bind height;
//    max_influences nearest segments; strip_body exports only the
//    bound mesh).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { rigSomaArm, rigSpeciesArm, transferRigArm } from '@melite/comfyui-card-kit'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { bag } from '@melite/contracts/extraKeys'

export { parseValidateRigOutput, validateRigReport, ValidateRigOutputError } from './validateRigReport.ts'
export type { ValidateRigJson, ValidateRigOutput, ValidateRigViolation } from './validateRigReport.ts'

const RIG_MODES = ['auto', 'copy', 'species'] as const

const schema = z.object({
  // The mesh to rig — required at compose (bare z.string() is the
  // image-gen prompt precedent: optional at parse, refused loud at
  // compose). wtype 'mesh' boards the base's mesh field atom
  // (primitive ③ — picker + inline GlbStagePreview thumb).
  mesh_glb: z.string().role('path').description("Mesh to rig").extra('extra', bag({ order: 0, tooltip: "The static GLB that receives skeleton + weights (TRELLIS/anny/quad output, or any import).", required: true, wtype: 'mesh' })),
  mode: vocabulary(RIG_MODES).default('auto').description("Rig mode").extra('extra', bag({ order: 1, wtype: 'select', tooltip: "auto: SOMA-77 humanoid template weights. copy: transfer the donor GLB's rig. species: bind onto an anyCreature skeleton." })),
  // copy lane's donor — the rigged GLB whose skeleton + weights copy
  // onto the target (the same pair the buried transfer_rig arm took).
  donor_glb: z.string().role('path').description("Rigged donor GLB").extra('extra', bag({ order: 2, wtype: 'mesh', visible_when: 'mode=copy', tooltip: "copy mode: the rigged GLB whose skeleton + weights transfer (SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature)." })),
  // species lane's template — an anyCreature GLB (armature + baked
  // idle/move anims); the caller brings it from the anycreature lane.
  creature_glb: z.string().role('path').description("Creature template GLB").extra('extra', bag({ order: 3, wtype: 'mesh', visible_when: 'mode=species', tooltip: "species mode: the anyCreature GLB whose skeleton (with baked idles) the mesh binds onto." })),
  // auto-lane knobs (KimodoExportFBX, its 'SOMAX standalone mode').
  preserve_texture: z.boolean().default(true).description("Preserve texture").extra('extra', bag({ order: 4, visible_when: 'mode=auto', tooltip: "auto mode: keep the source mesh's textures. Off strips to flat SOMA-blue for texturing later." })),
  decimate_ratio: z.number().min(0).max(1).default(0).description("Decimate ratio").extra('extra', bag({ order: 5, visible_when: 'mode=auto', tooltip: "0 = off (the rig default). Collapse-mode decimation preserves skin weights; 0.2 ≈ -70% file size.", min: 0.0, max: 1.0 })),
  // species-lane knobs (RayCreatureRigBridge).
  height_ratio: z.number().min(0.05).max(10).default(1).description("Height ratio").extra('extra', bag({ order: 6, visible_when: 'mode=species', tooltip: "species mode: mesh height as a fraction of the creature bind-pose height.", min: 0.05, max: 10.0 })),
  max_influences: z.number().min(1).max(8).default(3).description("Max influences").extra('extra', bag({ order: 7, visible_when: 'mode=species', tooltip: "species mode: max bone influences per vertex (nearest segments win).", min: 1, max: 8 })),
  strip_body: z.boolean().default(true).description("Strip body").extra('extra', bag({ order: 8, visible_when: 'mode=species', tooltip: "species mode: delete the creature body meshes, export only the bound mesh." })),
})

export const inject = ['comfyui']

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
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'rig',
    skeleton: 'rig',
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
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, _runId) {
      // THE SCHEMA GATE (the quad-remesh precedent): the declared
      // types + bounds own the last hop into the engine; every read
      // below is a read of the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      const mesh = String(doc.mesh_glb || '')
      if (!mesh.trim()) {
        throw new Error(
          `required param 'mesh_glb' (Mesh to rig) missing on the rig card — the rig needs the static mesh (GLB path or artifact-ref)`)
      }
      const mode = String(doc.mode)
      if (mode === 'copy') {
        const donor = String(doc.donor_glb || '')
        if (!donor.trim()) {
          throw new Error(
            `required param 'donor_glb' (Rigged donor GLB) missing on the rig card's copy lane — the rig copy needs the donor whose skeleton + weights transfer`)
        }
        transferRigArm(g, { rigged_glb: donor, target_glb: mesh })
        return
      }
      if (mode === 'species') {
        const creature = String(doc.creature_glb || '')
        if (!creature.trim()) {
          throw new Error(
            `required param 'creature_glb' (Creature template GLB) missing on the rig card's species lane — the bind needs the anyCreature skeleton GLB`)
        }
        rigSpeciesArm(doc, g)
        return
      }
      rigSomaArm(doc, g)
    },
  }))
}
