// Tier 3 — the img-to-mesh card (the trellis_t1 / pixal_t1 /
// transfer_rig_t1 renderer port). THREE families behind one card
// (requires_by_family in the python card): the arm branches on
// model.id inside compose — the dispatch stays HERE (bespoke), the
// arms ride src/kit.ts.
//
// NUMBERING LAW (pinned by tests/golden_cordis/mesh_*): the python
// renderers ride comfy-script, whose api_format() assigns
// `<Class>.<index>` ids in POST-ORDER DFS from the output node —
// NOT python creation order. The one visible flip: the SHAPE guided
// arm is numbered before the STRUCT arm (CFGOverride.0/.RescaleCFG.0
// = shape 0.769/0.5; .1 = struct 0.667/0.7) even though the python
// source builds struct first. The GraphBuilder numbers at CREATION,
// so this port creates the shape arm first. KSampler keeps the
// natural struct→shape→tex1→tex2 order; VAELoader shape→texture;
// MeshSmoothNormals decimate→textured.
//
// AUTOFILL LAW: python strips only the empty autofills it overrides
// (LoadImage.upload, KSampler.control_after_generate). Other
// comfy-script pin autofills SURVIVE in the goldens and are emitted
// here as literals: RemeshMesh band/fix_poles/project_back,
// ImageCropToMask background/grow_mask, MoGeInference
// apply_mask/batch_size/force_projection/fov_x_degrees. Everything
// else is exactly the inputs the python renderers pass — no more.
//
// REQUIRES SHAPE: per-family requires (trellis2-native→
// comfyui-core-trellis2, pixal3d→comfyui-core-trellis2+ComfyUI-MoGe,
// transfer_rig→melite-autorig-nodes; card-level requires is EMPTY).
// Card-level `requires` carries the UNION (flat consumers + the drift
// wall's (b) flat leg), while `requiresByFamily` below carries the
// per-family map — the compose door merges the ACTIVE family's slice;
// gating on the union alone over-claims (a trellis run must never
// demand the autorig pack).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { trellisArm, pixalArm, transferRigArm, admitMeshLift } from '../kit.ts'
import type { ModelFacts } from '../facts.ts'

declare module '../service.ts' {
  interface CardDefinition {
    /** Per-family extension packs — the py requires_by_family mirror.
     *  The compose door gates the active family's slice, never the
     *  flat union alone. */
    requiresByFamily?: Record<string, readonly string[]>
  }
}

const schema = z.object({
  // Ride keys (no .default — the compose-door cascade overlays model
  // defaults, then explicit params): input_image is py-required; the
  // rig GLBs are py ABSENT/defaultless (transfer_rig's model row
  // carries no defaults either) and refused per-arm in compose, so a
  // lift call never names them and a rig call names both. Bare
  // z.string() is the image-gen prompt precedent (optional at parse,
  // refused loud at compose).
  input_image: z.string().role('path').description(
    'One clear object, tight framing. Background removal runs before the lift.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  rigged_glb: z.string().role('path').description(
    'The SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 live here.').extra(
      'extra', { families: ['transfer_rig'] }),
  target_glb: z.string().role('path').description(
    'The clothed mesh — geometry + textures, no rig.').extra(
      'extra', { families: ['transfer_rig'] }),
  seed: z.number().min(-1).step(1).default(42).description(
    'Same seed + image = same mesh take.'),
  // Select knobs coerce wire strings at compose (the skin map_size
  // precedent) — enum hints ride extra.options, never validation.
  resolution: z.number().default(1024).description(
    'Upsample target (official pins 1536). All tiles snap to /64.').extra(
      'extra', { options: [512, 1024, 1536] }),
  steps: z.number().min(4).max(60).default(12).description(
    'STRUCTURE stage steps (the lift). Shape + texture have their own.'),
  cfg: z.number().min(1).max(15).default(7.5).description(
    'Structure-stage guidance. 7.5 is the official pin.'),
  bg_removal: z.union([z.const('auto'), z.const('on'), z.const('off')])
    .default('auto').description(
      'auto/on: birefnet cuts the background (recommended for photos).'),
  camera_fov: z.union([
    z.const('auto'), z.const('35'), z.const('49.13'),
  ]).default('auto').description(
    'Pixal3D only — per-image horizontal FoV fed to MoGe depth.').extra(
      'extra', { families: ['pixal3d'] }),
  shape_steps: z.number().min(4).max(60).default(20).description(
    'Shape-stage steps. 20 is the official template pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  shape_cfg: z.number().min(1).max(15).default(7.5).description(
    'Shape-stage guidance. 7.5 is the official template pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex1_steps: z.number().min(4).max(60).default(12).description(
    'First texture pass steps (upsampled latent).').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex1_cfg: z.number().min(1).max(15).default(7.5).description(
    'First texture pass guidance. 7.5 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex2_steps: z.number().min(4).max(60).default(12).description(
    'Second texture pass steps (raw unet — the detail pass).').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex2_cfg: z.number().min(1).max(15).default(1.0).description(
    'Second texture pass guidance. 1.0 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  remesh_resolution: z.number().min(128).max(2048).default(768).description(
    'UDF remesh voxel resolution. 768 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  decimate_faces: z.number().min(10000).max(2000000).default(700000).description(
    'Exact face count after decimation (midpoint smooths shading loss).').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  smooth_angle: z.number().min(0).max(180).default(180).description(
    'Normal-smoothing crease angle, applied before decimation.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  atlas_size: z.number().default(4096).description(
    'Unwrap + baked color atlas resolution. 4096 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'], options: [2048, 4096] }),
  ao_size: z.number().default(1024).description(
    'Ambient-occlusion bake resolution. 1024 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'], options: [512, 1024] }),
  normal_size: z.number().default(2048).description(
    'Normal-map bake resolution. 2048 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'], options: [1024, 2048] }),
  struct_sampler: z.string().default('euler').description(
    'Structure-stage sampler. euler is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  struct_scheduler: z.string().default('normal').description(
    'Structure-stage scheduler. normal is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  shape_sampler: z.string().default('euler').description(
    'Shape-stage sampler. euler is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  shape_scheduler: z.string().default('normal').description(
    'Shape-stage scheduler. normal is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex1_sampler: z.string().default('euler').description(
    'First texture pass sampler. euler is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex1_scheduler: z.string().default('simple').description(
    'First texture pass scheduler. simple is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex2_sampler: z.string().default('euler').description(
    'Second texture pass sampler. euler is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  tex2_scheduler: z.string().default('normal').description(
    'Second texture pass scheduler. normal is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  sd3_shift: z.number().min(1.0).max(10.0).default(5.0).description(
    'ModelSamplingSD3 shift on the structure arm.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  rescale_struct: z.number().min(0.1).max(1.0).default(0.7).description(
    'Structure-arm RescaleCFG multiplier. 0.7 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  rescale_shape: z.number().min(0.1).max(1.0).default(0.5).description(
    'Shape-arm RescaleCFG multiplier (also feeds tex passes).').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  override_struct: z.number().min(0.0).max(1.0).default(0.667).description(
    'Structure-arm CFGOverride start percent. 0.667 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  override_shape: z.number().min(0.0).max(1.0).default(0.769).description(
    'Shape-arm CFGOverride start percent. 0.769 is the official pin.').extra(
      'extra', { families: ['trellis2-native', 'pixal3d'] }),
  // NO filename_prefix (py card: "the run routes outputs by run id
  // (compose stamps the prefix internally). The schema still admits
  // the key — old drafts keep working" — admission is schemastery's
  // non-strict object + the door's explicit-params overlay; it is
  // never a declared knob, and compose never reads it: prefixes are
  // family constants below).
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'img-to-mesh',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'img-to-mesh',
    boarded: ['trellis2-native', 'pixal3d', 'transfer_rig'],
    // Per-family truth (py requires_by_family verbatim — the door
    // gates the ACTIVE family's slice; the flat list carries the
    // UNION for flat consumers, see file header).
    requires: ['comfyui-core-trellis2', 'ComfyUI-MoGe', 'melite-autorig-nodes'],
    requiresByFamily: {
      'trellis2-native': ['comfyui-core-trellis2'],
      pixal3d: ['comfyui-core-trellis2', 'ComfyUI-MoGe'],
      transfer_rig: ['melite-autorig-nodes'],
    },
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      // The arm IS the family's renderer (runId rides the signature;
      // prefixes are family constants, not run-scoped, not knobs).
      void runId
      if (model.id === 'transfer_rig') {
        const missing: Array<string> = []
        if (!String(p.rigged_glb || '').trim()) missing.push('rigged_glb')
        if (!String(p.target_glb || '').trim()) missing.push('target_glb')
        if (missing.length > 0) {
          throw new Error(
            `required param(s) ${missing.map((m) => `'${m}'`).join(', ')} missing on the transfer_rig lane — the rig copy needs the donor rig AND the clothed target`)
        }
        transferRigArm(g, p)
        return
      }
      admitMeshLift(p, model)
      if (model.id === 'pixal3d') {
        pixalArm(g, p, model)
      } else {
        trellisArm(g, p, model)
      }
    },
  })
}
