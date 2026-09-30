import { GraphBuilder, OutputHandle, stripEmptyAutofill } from './graph.ts'
import type { PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'
import {
  renderGLBViews,
  positive,
} from './blocks/poser-kit.ts'

/** The wired-tensor law (the lanes-image precedent, ported 1:1):
 *  a '$name' value names an upstream stage's wired output — the
 *  spell IS the tensor and rides node inputs verbatim. ROW-4
 *  refuses producer links in Load* file slots, so a spelled image
 *  NEVER builds a loader; file paths keep the disk handoff. */
type TensorRef = OutputHandle | string
const isSpell = (s: string): boolean => s.startsWith('$')

// ── archetype III: the poser turnaround family ──────────────────────
// Body → assemble (CompositeCharacter / FitProp / SkinApply) → the
// shared 8-view turnaround tail (blocks/poser-kit renderGLBViews).
// The strip tables stay EMPTY so the pin's autofills ride
// (comfy-script behavior via the GraphBuilder pin defaults).

/** (DESCOPE 2026-09-05 — moved verbatim from the anny card.) The
 *  table stays EMPTY, so the pin's hair/outfit "" autofills ride. */
export const ANNY_STRIP: StripTable = {}

export function finalizeAnny(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, ANNY_STRIP)
}

// annyLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// anny family composes its own lane in its declared action
// (packages/models/anny/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// REMOVED stroke 87 (operator order): the fit lane (fitLane + finalizeFit +
// FIT_STRIP + fitModelStem) and the skin lane (skinLane + finalizeSkin +
// SKIN_STRIP + the KIND_TABLE sidecar port) — the cards retired to the
// blender MCP spawn-skills door; nothing composes these lanes anymore.

// ── the motion lane ────────────────────────────────────────────────
// KimodoLoader → KimodoTextToPose → optional RaySomaxBake. No
// filename_prefix (the NPZ and baked GLB write themselves into the
// output dir — runId rides the door, un-graphed).

// fps is LANE-INTERNAL (MotionT1Doc default 30.0 — moved verbatim
// from the motion card).
const MOTION_BAKE_FPS = 30.0

/** Optional empties are ABSENT, never ""-wired (moved verbatim from
 *  the motion card — the CONDITIONAL strip variant). */
export const MOTION_STRIP: StripTable = {
  KimodoTextToPose: ['prev_motion_npz', 'motion_prompts', 'motion_constraints'],
}

export function finalizeMotion(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, MOTION_STRIP)
}

// motionLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// kimodo family composes its own lane in its declared action
// (packages/models/kimodo/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// ── the single-node + staging lanes ───────────────────────────────
// quad-remesh (ONE-implementation rule: the AutoRemesher node IS the
// lane), upscale-tools (SeedVR2), input-prep (staged-source restage).

// quadRemeshLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// autoremesher family composes its own lane in its declared action
// (packages/models/autoremesher/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// ── archetype V: the mesh lift family (img-to-mesh, bespoke) ───────
// THREE families behind one card: the dual guided lift head, the
// shared structure→shape→texture→bake chain, and the rig-copy arm.
// Moved verbatim from the img-to-mesh card; the card keeps the schema
// + per-family requires + arm dispatch (the multi-family story stays
// where the families board).

export const MESH_RESOLUTIONS: readonly string[] = ['1024', '1536']
export const MESH_BG_MODES: readonly string[] = ['auto', 'on', 'off']
export const MESH_PIXAL_FOVS: readonly string[] = ['auto', '35', '49.13', '60', '75', '90']
export const MESH_BAKE_SIZES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['atlas_size', ['2048', '4096']],
  ['ao_size', ['512', '1024']],
  ['normal_size', ['1024', '2048']],
]
export const MESH_ATLAS_SIZES = MESH_BAKE_SIZES[0][1]
export const MESH_AO_SIZES = MESH_BAKE_SIZES[1][1]
export const MESH_NORMAL_SIZES = MESH_BAKE_SIZES[2][1]

// The 3D lane rows are NOT unet-shaped — read fields from
// model.lane_inputs, cast as you read (the facts file carries
// whatever the model row declared).
interface MeshLane {
  unet: string
  vae: string
  texture_vae: string
  clip_vision: string
  background_removal: string
}

function meshLaneOf(model: ModelFacts): MeshLane {
  const li = model.lane_inputs
  return {
    unet: li.unet as string,
    vae: li.vae as string,
    texture_vae: li.texture_vae as string,
    clip_vision: li.clip_vision as string,
    background_removal: li.background_removal as string,
  }
}

/** The dual guided unet + the two VAEs — the lift arms' shared head.
 *  Creation order lands the comfy-script numbering: the SHAPE pair
 *  first (CFGOverride.0/RescaleCFG.0), then the STRUCT pair (.1). */
function loadLiftHeads(
  g: GraphBuilder,
  li: MeshLane,
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

/** The birefnet cut (bg_removal auto/on): the cutout MASK from
 *  RemoveBackground bridged to IMAGE via MaskToImage (the GPU
 *  canary verdict — RemoveBackground outputs MASK, not IMAGE). */
function cutBackground(
  g: GraphBuilder,
  li: MeshLane,
  img: TensorRef,
): { src: OutputHandle; mask: OutputHandle } {
  const bgm = g.node('LoadBackgroundRemovalModel', { bg_removal_name: li.background_removal }).out()
  const mask = g.node('RemoveBackground', { bg_removal_model: bgm, image: img }).out()
  const src = g.node('MaskToImage', { mask }).out()
  return { src, mask }
}

/** The shared structure→shape→upsample→texture→bake→glb chain
 *  (_shared_lift_chain verbatim — the model delta lives
 *  ENTIRELY in the conditioning pair passed in). */
function sharedLiftChain(
  g: GraphBuilder,
  p: Record<string, unknown>,
  heads: ReturnType<typeof loadLiftHeads>,
  pos: OutputHandle,
  neg: OutputHandle,
  prefix: string,
): void {
  const seed = mintSeed(p)
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
    'sign_mode.qef': false,
    'sign_mode.drop_inverted_components': false,
    'sign_mode.drop_enclosed_components': false,
    smooth_iters: 20,
    drop_small_components: 0.01, precluster_max_verts: 20000000,
    // pin autofills leaves in place (core defaults)
    band: 1.0, fix_poles: false, project_back: 0.0,
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
  g.node('Save3DAdvanced', {
    model_3d: glb, filename_prefix: prefix,
    viewport_state: '', width: 1024, height: 1024,
  })
}

/** trellis_t1 — DINOv3 conditioning (the image IS the prompt;
 *  negative = ConditioningZeroOut). */
export function trellisArm(
  g: GraphBuilder,
  p: Record<string, unknown>,
  model: ModelFacts,
): void {
  const li = meshLaneOf(model)
  // THE SPELLED ANCHOR (the gap-audit law: img-to-mesh seats
  // input_image, so a producer CAN wire in — the spell rides the
  // conditioning tensor verbatim, never a loader).
  const img: TensorRef = isSpell(p.input_image as string)
    ? (p.input_image as string)
    : g.node('LoadImage', { image: p.input_image as string }).out()
  const heads = loadLiftHeads(g, li, p)
  let condImage: TensorRef = img
  if (p.bg_removal !== 'off') {
    condImage = cutBackground(g, li, img).src
  }
  const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out()
  const pos = g.node('Trellis2Conditioning', { clip_vision_model: clip, image: condImage }).out(0)
  const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out()
  // Family constant, never a knob (compose stamps the prefix
  // internally; stable).
  sharedLiftChain(g, p, heads, pos, neg, 'trellis2_native')
}

/** pixal_t1 — pixel-aligned conditioning: the padded crop (pad 1.1)
 *  feeds BOTH Pixal3DConditioning and (camera_fov=auto) the MoGe
 *  depth pass, so framing agrees by construction. */
export function pixalArm(
  g: GraphBuilder,
  p: Record<string, unknown>,
  model: ModelFacts,
): void {
  const li = meshLaneOf(model)
  // THE SPELLED ANCHOR (same law as trellisArm above).
  const img: TensorRef = isSpell(p.input_image as string)
    ? (p.input_image as string)
    : g.node('LoadImage', { image: p.input_image as string }).out()
  const heads = loadLiftHeads(g, li, p)
  let cropSrc: TensorRef = img
  let cropMask: TensorRef = img // ImageCropToMask accepts IMAGE for masks
  if (p.bg_removal !== 'off') {
    const cut = cutBackground(g, li, img)
    cropMask = cut.mask
    cropSrc = cut.src
  }
  const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out()
  const cropped = g.node('ImageCropToMask', {
    images: cropSrc, masks: cropMask,
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
      // pin autofills leaves in place (core defaults)
      apply_mask: true, batch_size: 4, force_projection: true,
      fov_x_degrees: 0.0,
    }).out()
    cameraAngleX = g.node('MoGeGeometryToFOV', {
      moge_geometry: mogeGeom, axis: 'horizontal', unit: 'degrees',
    }).out(0)
  } else {
    cameraAngleX = Number(p.camera_fov) // operator-vouched literal degree
  }
  const pos = g.node('Pixal3DConditioning', {
    clip_vision_model: clip, image: cropped, camera_angle_x: cameraAngleX,
  }).out(0)
  const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out()
  // Family constant, never a knob (compose stamps the prefix
  // internally; stable).
  sharedLiftChain(g, p, heads, pos, neg, 'pixal3d')
}

/** transfer_rig_t1 — the rig copy: two mount-path constants feed the
 *  GPU KNN weight transfer; SaveRiggedModel persists the written GLB. */
export function transferRigArm(g: GraphBuilder, p: Record<string, unknown>): void {
  const rigged = g.node('PrimitiveString', { value: p.rigged_glb as string }).out()
  const target = g.node('PrimitiveString', { value: p.target_glb as string }).out()
  const outPath = g.node('KimodoTransferWeights', {
    rigged_path: rigged, target_path: target,
  }).out()
  g.node('SaveRiggedModel', { rigged_path: outPath })
}

// ── the rig card's arms (ROADMAP card program P0) ───────────────────
// "skeleton + weights on this GLB" — three real lanes over the
// vendored packs, all path-based (no checkpoints):
//  · auto   — KimodoExportFBX in its 'apply_weights' action (the
//             dispatch is INPUT-driven: source_glb without npz_path
//             → the SOMA-77 template's hand-painted LBS weights
//             transfer onto the source mesh; file_format 'glb'; the
//             node IS the output capture — it writes itself).
//  · copy   — transferRigArm verbatim (KimodoTransferWeights +
//             SaveRiggedModel): GPU KNN weight transfer from a
//             rigged donor onto the clothed target.
//  · species — RayCreatureRigBridge: bind a static mesh onto an
//             anyCreature skeleton (armature + baked idles), the
//             node writes itself.
// The fourth lane (skintokens/TokenRig) stays OUT until the
// external ComfyUI-SkinToken pack is vendored + verified — a lane
// whose node cannot register is not a lane (LAW 2).

/** The rig card's SOMA auto arm — one KimodoExportFBX (the node's
 *  own action dispatch picks 'apply_weights' for a lone source_glb).
 *  rigged_path is the node's required "connect or leave empty" slot
 *  — an empty PrimitiveString rides (the dispatch never reads it on
 *  this arm). decimation defaults OFF on this surface (the node's
 *  own 0.2 default belongs to the export tail, not the rig hop). */
export function rigSomaArm(p: Record<string, unknown>, g: GraphBuilder): void {
  const source = g.node('PrimitiveString', { value: p.mesh_glb as string }).out()
  const empty = g.node('PrimitiveString', { value: '' }).out()
  g.node('KimodoExportFBX', {
    rigged_path: empty,
    source_glb: source,
    file_format: 'glb',
    preserve_texture: p.preserve_texture === true,
    decimate_ratio: p.decimate_ratio as number,
  })
}

/** The rig card's species arm — one RayCreatureRigBridge (bind a
 *  static mesh onto an anyCreature template skeleton; the node
 *  writes the bound GLB itself). */
export function rigSpeciesArm(p: Record<string, unknown>, g: GraphBuilder): void {
  const creature = g.node('PrimitiveString', { value: p.creature_glb as string }).out()
  const mesh = g.node('PrimitiveString', { value: p.mesh_glb as string }).out()
  const bound = g.node('RayCreatureRigBridge', {
    creature_glb: creature,
    mesh_glb: mesh,
    height_ratio: p.height_ratio as number,
    max_influences: p.max_influences as number,
    strip_body: p.strip_body === true,
  }).out()
  g.node('SaveRiggedModel', { rigged_path: bound })
}

/** The lift arms' shared admission gates (—
 *  closed sets refuse HERE, never in the schema). */
export function admitMeshLift(p: Record<string, unknown>, model: ModelFacts): void {
  const modelId = model.id
  if (!String(p.input_image || '').trim()) {
    throw new Error(
      // (2026-09-15: the refusal names the UI label too — the card
      // paints this knob as "Source image"; a key-only refusal sent
      // the operator hunting a param the surface never shows.)
      `required param 'input_image' (Source image) missing on the ${modelId} card — the 3D lift is image-conditioned (no text prompt rides this lane)`)
  }
  if (!MESH_RESOLUTIONS.includes(String(p.resolution))) {
    throw new Error(
      `resolution ${JSON.stringify(p.resolution)} is not one of ${MESH_RESOLUTIONS.join('|')} — the variant table is closed`)
  }
  const bg = String(p.bg_removal || 'auto')
  if (!MESH_BG_MODES.includes(bg)) {
    throw new Error(
      `bg_removal ${JSON.stringify(bg)} is not one of auto|on|off — birefnet either cuts or it doesn't`)
  }
  if (modelId === 'pixal3d') {
    const fov = String(p.camera_fov || 'auto').trim()
    if (!MESH_PIXAL_FOVS.includes(fov)) {
      throw new Error(
        `camera_fov ${JSON.stringify(fov)} is not one of ${MESH_PIXAL_FOVS.join('|')} — pixal3d either lets MoGe infer ('auto') or the operator vouches a literal degree`)
    }
  }
  for (const [k, opts] of MESH_BAKE_SIZES) {
    if (!opts.includes(String(p[k]))) {
      throw new Error(
        `${k} ${JSON.stringify(p[k])} is not one of ${opts.join('|')} — the bake-size table is closed`)
    }
  }
}
