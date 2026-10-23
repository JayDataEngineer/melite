// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the mesh action the img-to-mesh card binds. The DECL's
// lane_inputs are the ONE facts door (unet, vae, texture_vae,
// clip_vision — the lift chain's four load
// keys); the segment factory is the legacy pixalArm + the shared
// lift chain + this family's admitMeshLift slice moved verbatim.
// The lane stays as the byte-oracle, proven in tests/action.spec.ts.
// Creation order IS node-id order (the recipe law — the SHAPE pair
// first, then the STRUCT pair).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { GraphBuilder, OutputHandle } from "@melite/comfyui-card-kit/graph";
import { requireText, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { MESH_PIXAL_FOVS } from "@melite/comfyui-card-kit";
import { MESH_RESOLUTIONS, MESH_ATLAS_SIZES, MESH_AO_SIZES, MESH_NORMAL_SIZES, admitMeshLiftShared, isSpell, type TensorRef } from "@melite/comfyui-card-kit";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "@melite/comfyui-card-kit/vocab";

/** The closed facts shape the mesh segment reads (the lift chain's
 * five load keys, resolved from the row's lane_inputs). */
export type MeshFacts = {
  readonly unet: string;
  readonly vae: string;
  readonly texture_vae: string;
  readonly clip_vision: string;
};

/** The gated params doc the mesh segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the seed arrives minted through the declared seed-sentinel rule,
 * so the ported chain's own mint is a pass-through). */
export type MeshParams = Record<string, unknown>;

/** The mesh facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing load key refuses field-named here,
 * never composes a loader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseMeshFacts(raw: LaneInputsFacts): MeshFacts {
  return {
    unet: requireText(raw, 'unet', 'pixal3d mesh'),
    vae: requireText(raw, 'vae', 'pixal3d mesh'),
    texture_vae: requireText(raw, 'texture_vae', 'pixal3d mesh'),
    clip_vision: requireText(raw, 'clip_vision', 'pixal3d mesh'),
  }
}

/** The wired-tensor law (the lanes-image precedent, ported 1:1):
 *  a '$name' value names an upstream stage's wired output — the
 *  spell IS the tensor and rides node inputs verbatim. ROW-4
 *  refuses producer links in Load* file slots, so a spelled image
 *  NEVER builds a loader; file paths keep the disk handoff. */
/** The lift arms' admission slice for THIS family: the pixal-only
 *  camera_fov arm beside the SHARED kit seat (the dry-sweep's J4
 *  re-hoist — two families carried the shared rows verbatim; the
 *  required image and closed sets refuse in the slice, never in
 *  the schema). The fov arm runs first so this family's own voice
 *  fires on a doubly-invalid param. */
function admitMeshLift(p: Record<string, unknown>): void {
  const fov = String(p.camera_fov || 'auto').trim()
  if (!MESH_PIXAL_FOVS.includes(fov)) {
    throw new Error(
      `camera_fov ${JSON.stringify(fov)} is not one of ${MESH_PIXAL_FOVS.join('|')} — pixal3d either lets MoGe infer ('auto') or the operator vouches a literal degree`)
  }
  admitMeshLiftShared(p)
}

/** The dual guided unet + the two VAEs — the lift chain's shared
 * head. Creation order lands the reference renderers' numbering: the SHAPE
 * pair first (CFGOverride.0/RescaleCFG.0), then the STRUCT pair
 * (.1). */
function loadLiftHeads(
  g: GraphBuilder,
  li: MeshFacts,
  p: Record<string, unknown>,
): {
  unet: OutputHandle
  rescaleShape: OutputHandle
  shifted: OutputHandle
  shapeVae: OutputHandle
  texVae: OutputHandle
} {
  const unet = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  // shape arm (0.769 / 0.5) — numbered FIRST (served order)
  const overrideShape = g.node('CFGOverride', {
    model: unet, cfg: 1.0,
    start_percent: p.override_shape as number, end_percent: 1.0,
  }).out()
  const rescaleShape = g.node('RescaleCFG', {
    model: overrideShape, multiplier: p.rescale_shape as number,
  }).out()
  // struct arm (0.667 / 0.7) — numbered SECOND (served order)
  const overrideStruct = g.node('CFGOverride', {
    model: unet, cfg: 1.0,
    start_percent: p.override_struct as number, end_percent: 1.0,
  }).out()
  const rescaleStruct = g.node('RescaleCFG', {
    model: overrideStruct, multiplier: p.rescale_struct as number,
  }).out()
  const shifted = g.node('ModelSamplingSD3', {
    model: rescaleStruct, shift: p.sd3_shift as number,
  }).out()
  const shapeVae = g.node('VAELoader', { vae_name: li.vae }).out()
  const texVae = g.node('VAELoader', { vae_name: li.texture_vae }).out()
  return { unet, rescaleShape, shifted, shapeVae, texVae }
}

/** The shared structure→shape→upsample→texture→bake→glb chain
 * (_shared_lift_chain verbatim — the model delta lives
 * ENTIRELY in the conditioning pair passed in). */
function sharedLiftChain(
  g: GraphBuilder,
  p: Record<string, unknown>,
  heads: ReturnType<typeof loadLiftHeads>,
  pos: OutputHandle,
  neg: OutputHandle,
  prefix: string,
): OutputHandle {
  const seed = p.seed as number
  const { unet, rescaleShape, shifted, shapeVae, texVae } = heads

  // structure stage (the lift): card steps + cfg knobs
  const empty = g.node('EmptyTrellis2LatentStructure', { batch_size: 1 }).out()
  const struct = g.node('KSampler', {
    seed, steps: p.steps as number, cfg: p.cfg as number,
    sampler_name: p.struct_sampler as string,
    scheduler: p.struct_scheduler as string, denoise: 1.0,
    model: shifted, positive: pos, negative: neg, latent_image: empty,
  })
  const voxel = g.node('VaeDecodeStructureTrellis2', {
    samples: struct.out(), vae: shapeVae, resolution: '32',
  }).out()

  // shape stage: 20 steps / cfg 7.5 on the 0.5 arm (official)
  const shapeStage = g.node('Trellis2ShapeStage', { positive: pos, negative: neg, voxel })
  const shapeLatent = g.node('KSampler', {
    seed, steps: p.shape_steps as number,
    cfg: p.shape_cfg as number,
    sampler_name: p.shape_sampler as string,
    scheduler: p.shape_scheduler as string, denoise: 1.0,
    model: rescaleShape,
    positive: shapeStage.out(0), negative: shapeStage.out(1),
    latent_image: shapeStage.out(2),
  })
  // upsample + first texture pass: UNCONDITIONAL, target floored at 1024
  const up = g.node('Trellis2UpsampleStage', {
    positive: shapeStage.out(0), negative: shapeStage.out(1),
    shape_latent: shapeLatent.out(), vae: shapeVae,
    target_resolution: Math.max(Number(p.resolution), 1024),
  })
  const upLatent = g.node('KSampler', {
    seed, steps: p.tex1_steps as number,
    cfg: p.tex1_cfg as number,
    sampler_name: p.tex1_sampler as string,
    scheduler: p.tex1_scheduler as string, denoise: 1.0,
    model: rescaleShape,
    positive: up.out(0), negative: up.out(1), latent_image: up.out(2),
  })

  // mesh lineage: decode → info → UDF remesh → exact-count decimate
  const decodeShape = g.node('VaeDecodeShapeTrellis', { samples: upLatent.out(), vae: shapeVae })
  const mesh = decodeShape.out(0)
  const subdivides = decodeShape.out(1)
  const info = g.node('GetMeshInfo', { mesh }).out(0)
  const remeshed = g.node('RemeshMesh', {
    mesh: info, resolution: p.remesh_resolution as number,
    sign_mode: 'udf',
    // the separation knobs are card params since 2026-10-12 — the
    // card's schema defaults (false) ARE the pinned core defaults
    'sign_mode.qef': p.remesh_qef === true,
    'sign_mode.drop_inverted_components': p.remesh_drop_inverted === true,
    'sign_mode.drop_enclosed_components': p.remesh_drop_enclosed === true,
    smooth_iters: 20,
    drop_small_components: 0.01, precluster_max_verts: 20000000,
    // pin autofills leaves in place (core defaults)
    band: 1.0, fix_poles: p.remesh_fix_poles === true, project_back: 0.0,
  }).out()

  // texture stage, two passes: 12/7.5/simple feeds the stage; 12/1.0
  // on the RAW unet samples it (official template KSampler#12)
  const texStage = g.node('Trellis2TextureStage', {
    positive: up.out(0), negative: up.out(1), shape_latent: upLatent.out(),
  })
  const texLatent = g.node('KSampler', {
    seed, steps: p.tex2_steps as number,
    cfg: p.tex2_cfg as number,
    sampler_name: p.tex2_sampler as string,
    scheduler: p.tex2_scheduler as string, denoise: 1.0,
    model: unet,
    positive: texStage.out(0), negative: texStage.out(1),
    latent_image: texStage.out(2),
  })
  const voxelColors = g.node('VaeDecodeTextureTrellis', {
    samples: texLatent.out(), vae: texVae, shape_subdivides: subdivides,
  }).out()

  // bake tail: decimate → smooth → unwrap → bake color/AO/normal →
  // apply → smooth → glb (the textured mesh is the saved hero)
  const decimated = g.node('DecimateMesh', {
    mesh: remeshed, target_face_count: p.decimate_faces as number,
    placement_mode: 'midpoint',
  }).out()
  const smooth1 = g.node('MeshSmoothNormals', {
    mesh: decimated, crease_angle: p.smooth_angle as number,
  }).out()
  const unwrapped = g.node('UnwrapMesh', {
    mesh: smooth1, segmenter: 'pec', resolution: Number(p.atlas_size),
    padding: 1, weld_distance: 0.0002,
  }).out()
  const baked = g.node('BakeTextureFromVoxel', {
    mesh: unwrapped, voxel_colors: voxelColors,
    texture_size: Number(p.atlas_size), reference_mesh: mesh,
  })
  const occlusion = g.node('BakeAmbientOcclusion', {
    low_poly: unwrapped, high_poly: remeshed,
    resolution: Number(p.ao_size),
    samples: 64, max_distance: 0.71, strength: 1.0, bias: 0.01,
  }).out()
  const normalMap = g.node('BakeNormalMapFromMesh', {
    low_poly: unwrapped, high_poly: remeshed,
    resolution: Number(p.normal_size),
    cage_distance: 0.05, ignore_backfaces: true,
  }).out()
  const textured = g.node('ApplyTextureToMesh', {
    mesh: unwrapped,
    base_color: baked.out(0), metallic: baked.out(1),
    roughness: baked.out(2),
    occlusion, normal_map: normalMap,
  }).out()
  const smooth2 = g.node('MeshSmoothNormals', {
    mesh: textured, crease_angle: p.smooth_angle as number,
  }).out()
  const glb = g.node('MeshToFile3D', { mesh: smooth2 }).out()
  return g.node('Save3DAdvanced', {
    model_3d: glb, filename_prefix: prefix,
    viewport_state: '', width: 1024, height: 1024,
  }).out()
}

/** The mesh action: pixal_t1 — pixel-aligned conditioning. The
 * padded crop (pad 1.1) feeds BOTH Pixal3DConditioning and
 * (camera_fov=auto) the MoGe depth pass, so framing agrees by
 * construction. */
export const mesh: ComfyActionSpec<MeshParams, MeshFacts> = {
  id: "mesh",
  inputs: [],
  outputs: [{ name: "glb", kind: "GLB" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the
  // img-to-mesh card schema's own types and bounds — the family
  // door judges defaults and variant presets against this row.
  // The closed sets (resolutions, bg modes, bake sizes) are the
  // card-kit's ONE mesh vocabularies; the sampler/scheduler rows
  // resolve from the ONE engine vocabulary.
  params: [
    { name: "input_image", type: "string" },
    { name: "seed", type: "number", rule: "seed-sentinel" },
    { name: "resolution", type: "enum", options: MESH_RESOLUTIONS },
    { name: "steps", type: "number", bounds: [4, 60] },
    { name: "cfg", type: "number", bounds: [1, 15] },
    { name: "camera_fov", type: "enum", options: MESH_PIXAL_FOVS },
    { name: "shape_steps", type: "number", bounds: [4, 60] },
    { name: "shape_cfg", type: "number", bounds: [1, 15] },
    { name: "shape_sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "shape_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
    { name: "tex1_steps", type: "number", bounds: [4, 60] },
    { name: "tex1_cfg", type: "number", bounds: [1, 15] },
    { name: "tex1_sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "tex1_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
    { name: "tex2_steps", type: "number", bounds: [4, 60] },
    { name: "tex2_cfg", type: "number", bounds: [1, 15] },
    { name: "tex2_sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "tex2_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
    { name: "struct_sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "struct_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
    { name: "remesh_resolution", type: "number", bounds: [128, 2048] },
    { name: "remesh_qef", type: "boolean" },
    { name: "remesh_drop_inverted", type: "boolean" },
    { name: "remesh_drop_enclosed", type: "boolean" },
    { name: "remesh_fix_poles", type: "boolean" },
    { name: "decimate_faces", type: "number", bounds: [10000, 2000000] },
    { name: "smooth_angle", type: "number", bounds: [0, 180] },
    { name: "atlas_size", type: "enum", options: MESH_ATLAS_SIZES },
    { name: "ao_size", type: "enum", options: MESH_AO_SIZES },
    { name: "normal_size", type: "enum", options: MESH_NORMAL_SIZES },
    { name: "sd3_shift", type: "number", bounds: [1, 10] },
    { name: "rescale_struct", type: "number", bounds: [0.1, 1] },
    { name: "rescale_shape", type: "number", bounds: [0.1, 1] },
    { name: "override_struct", type: "number", bounds: [0, 1] },
    { name: "override_shape", type: "number", bounds: [0, 1] },
  ],
  facts: parseMeshFacts,
  build({ p, facts, g }) {
    admitMeshLift(p)
    const li = facts
    // THE SPELLED ANCHOR (the gap-audit law: img-to-mesh seats
    // input_image, so a producer CAN wire in — the spell rides the
    // conditioning tensor verbatim, never a loader).
    const img: TensorRef = isSpell(p.input_image as string)
      ? (p.input_image as string)
      : g.node('LoadImage', { image: p.input_image as string }).out()
    const heads = loadLiftHeads(g, li, p)
    // THE TEMPLATE HAS NO MASK BRIDGE: the crop eats the photo
    // (LoadImage) verbatim — a MaskToImage-sourced crop feeds the
    // silhouette, and the silhouette starves every appearance
    // feature (the 2026-10-27 live burn). The masks leg demands a
    // MASK (live object_info + a 400'd /prompt drive, 2026-10-23:
    // "return_type_mismatch ... input_type(MASK)"), so the region
    // rides ImageToMask of the SAME photo — images stay the photo
    // verbatim (appearance features), the region is a real mask.
    const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out()
    const mask = g.node('ImageToMask', { image: img, channel: 'red' }).out()
    const cropped = g.node('ImageCropToMask', {
      images: img, masks: mask,
      pad_factor: 1.1, width: 1024, height: 1024,
      // pin autofills leaves in place (core defaults)
      background: '#000000', grow_mask: 0,
    }).out()
    let cameraAngleX: OutputHandle | number
    if (p.camera_fov === 'auto') {
      // MoGe weight literal — the documented one-model exception
      // (LaneInputs is closed; the row is pixal-only).
      const mogeModel = g.node('LoadMoGeModel', {
        model_name: 'moge_2_vitl_normal_fp16.safetensors',
      }).out()
      const mogeGeom = g.node('MoGeInference', {
        moge_model: mogeModel, image: cropped, resolution_level: 9,
        // pin autofills leaves in place (core defaults); refine_steps
        // restates the node's own default 3 — the engine declares it
        // required and refuses the prompt without it.
        apply_mask: true, batch_size: 4, force_projection: true,
        fov_x_degrees: 0.0, refine_steps: 3,
      }).out()
      cameraAngleX = g.node('MoGeGeometryToFOV', {
        moge_geometry: mogeGeom, axis: 'horizontal', unit: 'degrees',
      }).out(0)
    } else {
      cameraAngleX = Number(p.camera_fov) // operator-vouched literal degree
    }
    const cond = g.node('Pixal3DConditioning', {
      clip_vision_model: clip, image: cropped, camera_angle_x: cameraAngleX,
    })
    const pos = cond.out(0)
    // the negative IS the conditioning's second output — never a
    // fabricated zero (the zero drops the shared proj pack the
    // template routes as every pass's negative)
    const neg = cond.out(1)
    // Family constant, never a knob (compose stamps the prefix
    // internally; stable).
    return sharedLiftChain(g, p, heads, pos, neg, 'pixal3d')
  },
};
