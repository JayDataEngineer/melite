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
// REQUIRES SHAPE: the python card declares per-family requires
// (action_cards/3d/img_to_mesh/python/card.py requires_by_family —
// trellis2-native→comfyui-core-trellis2, pixal3d→
// comfyui-core-trellis2+ComfyUI-MoGe, transfer_rig→
// melite-autorig-nodes; card-level requires is EMPTY). Card-level
// `requires` carries the UNION (flat consumers + the drift wall's
// (b) flat leg), while `requiresByFamily` below carries the py map
// verbatim — the compose door merges the ACTIVE family's slice
// (py gateway _find_card_requires precedent: card.requires +
// requires_by_family[model]); gating on the union alone over-claims
// (a trellis run must never demand the autorig pack).
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
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
  input_image: z.string(),
  rigged_glb: z.string(),
  target_glb: z.string(),
  seed: z.number().default(42),
  resolution: z.number().default(1024),
  steps: z.number().default(12),
  cfg: z.number().default(7.5),
  bg_removal: z.string().default('auto'),
  camera_fov: z.string().default('auto'),
  shape_steps: z.number().default(20),
  shape_cfg: z.number().default(7.5),
  tex1_steps: z.number().default(12),
  tex1_cfg: z.number().default(7.5),
  tex2_steps: z.number().default(12),
  tex2_cfg: z.number().default(1.0),
  remesh_resolution: z.number().default(768),
  decimate_faces: z.number().default(700000),
  smooth_angle: z.number().default(180),
  atlas_size: z.number().default(4096),
  ao_size: z.number().default(1024),
  normal_size: z.number().default(2048),
  struct_sampler: z.string().default('euler'),
  struct_scheduler: z.string().default('normal'),
  shape_sampler: z.string().default('euler'),
  shape_scheduler: z.string().default('normal'),
  tex1_sampler: z.string().default('euler'),
  tex1_scheduler: z.string().default('simple'),
  tex2_sampler: z.string().default('euler'),
  tex2_scheduler: z.string().default('normal'),
  sd3_shift: z.number().default(5.0),
  rescale_struct: z.number().default(0.7),
  rescale_shape: z.number().default(0.5),
  override_struct: z.number().default(0.667),
  override_shape: z.number().default(0.769),
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
