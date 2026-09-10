// flowsData.ts — the TS flow-authoring plane, RE-HOMED (REBUILD-13,
// 2026-09-10): the named-flow declarations that lived in the dead
// gateway package (doors/flowsRegistry.ts, killed with the gateway
// app — KILL commit 40b57f94) live HERE as data, beside their
// serving owners (the runs registry {flow:} arms). Port verbatim:
// the eleven declarations, the live from_flow expansion, and the
// inline shim (registryFlowToInline) — validate and start resolve
// stages LIVE through expandRegistryFlow, no snapshot drift.
//
// THE COMPILE-TIME INITIAL GATE (REBUILD-21, the deferral closed):
// registryInitialsError + checkFileInitial + InitialsRoots port
// verbatim (photo/glb file-initial checks + bake_params via the
// re-homed belt); the runs registry's {flow:} arms run it BEFORE
// any run registers — start can never queue what validate refuses.
//
// QUEUE LANE LAW unchanged: no legacy (no flow.py read — existence
// rides this registry), no fallbacks, no hardcodes.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { statSync } from "node:fs";
import { join, resolve } from "node:path";
import { mediaVocab } from "./mediaKinds.ts";
import { validateBakeParams } from "./bakeParams.ts";
import { pyTypeName } from "./queue.ts";

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** One initial edge: {"initial": key} (the operator-supplied wire). */
export interface RegistryInitialEdge {
  readonly initial: string;
}

/** One stage edge: {"stage": id, "output": name} (an earlier stage). */
export interface RegistryStageEdge {
  readonly stage: string;
  readonly output: string;
}

export type RegistryEdge = RegistryInitialEdge | RegistryStageEdge;

/** A from_flow row (Stage.from_flow — the py live reference): the
 *  stage is COPIED from the named flow's stage at expansion time
 *  (id overridden, inputs overridden), so the source stays the
 *  single truth — never a snapshot. */
export interface RegistryFromFlow {
  readonly flow: string;
  readonly stage: string;
}

/** One authoring-stage row (the Stage(...) kwargs, JSON-shaped). */
export interface RegistryStage {
  readonly id: string;
  readonly engine: string;
  readonly card: string;
  readonly description: string;
  readonly inputs: Record<string, RegistryEdge>;
  readonly expected: Record<string, string>;
  readonly outputs: Record<string, string>;
  readonly cardIo: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly skipWhen: { readonly initial: string; readonly when: string } | null;
  readonly fromFlow: RegistryFromFlow | null;
}

/** The compile-time initial kinds (flow.py initial_validators). */
export type RegistryInitialKind = "photo" | "glb" | "bake_params";

/** One headless-tool overlay (FlowToolOverlay: tool param -> the
 *  stage doc path it stamps, with the value choices map). */
export interface RegistryToolOverlay {
  readonly param: string;
  readonly stage: string;
  readonly path: readonly string[];
  readonly choices: Record<string, string> | null;
}

/** One headless-tool property (FlowToolProperty). */
export interface RegistryToolProperty {
  readonly ptype: string;
  readonly description: string;
  readonly default: unknown;
  readonly hasDefault: boolean;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly enum: readonly string[] | null;
}

/** The headless surface (FlowTool: name + version + schema +
 *  required + overlays). Absent (null) on flows with no tool=. */
export interface RegistryTool {
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly properties: Record<string, RegistryToolProperty>;
  readonly required: readonly string[];
  readonly overlays: readonly RegistryToolOverlay[];
}

/** One named flow (the Flow(...) declaration, JSON-shaped). */
export interface RegistryFlow {
  readonly id: string;
  readonly description: string;
  readonly stages: readonly RegistryStage[];
  readonly initialValidators: Record<string, RegistryInitialKind>;
  readonly tool: RegistryTool | null;
  readonly skillRefs: readonly string[];
}

// ── shared builders ─────────────────────────────────────────────

function initial(key: string): RegistryInitialEdge {
  return { initial: key };
}

function fromStage(stage: string, output: string): RegistryStageEdge {
  return { stage, output };
}

function plainStage(row: {
  readonly id: string;
  readonly engine: string;
  readonly card?: string;
  readonly description: string;
  readonly inputs: Record<string, RegistryEdge>;
  readonly expected?: Record<string, string>;
  readonly outputs?: Record<string, string>;
  readonly cardIo?: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly skipWhen?: { readonly initial: string; readonly when: string } | null;
}): RegistryStage {
  return {
    id: row.id,
    engine: row.engine,
    card: row.card ?? "",
    description: row.description,
    inputs: row.inputs,
    expected: row.expected ?? {},
    outputs: row.outputs ?? {},
    cardIo: row.cardIo ?? {},
    params: row.params,
    skipWhen: row.skipWhen ?? null,
    fromFlow: null,
  };
}

function linkedStage(
  flow: string,
  stage: string,
  id: string,
  inputs: Record<string, RegistryEdge>,
): RegistryStage {
  return {
    id,
    engine: "",
    card: "",
    description: "",
    inputs,
    expected: {},
    outputs: {},
    cardIo: {},
    params: {},
    skipWhen: null,
    fromFlow: { flow, stage },
  };
}

/** The z-image text-to-image graph, hand-wired from the lane SSOT
 *  (the Comfy-Org z_image_turbo official template the ZImage model
 *  row pins — flows/character/flow.py _z_image_workflow, transcribed
 *  to TS with its three cells: prompt channel, sampler seed, save
 *  prefix). */
export function zImageWorkflow(
  textChannel: string,
  seed: number,
  prefix: string,
): Record<string, unknown> {
  return {
    "UNETLoader.0": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: "z_image_turbo_int8_convrot.safetensors",
        weight_dtype: "default",
      },
    },
    "ModelSamplingAuraFlow.0": {
      class_type: "ModelSamplingAuraFlow",
      inputs: { model: ["UNETLoader.0", 0], shift: 3 },
    },
    "CLIPLoader.0": {
      class_type: "CLIPLoader",
      inputs: { clip_name: "qwen_3_4b.safetensors", type: "lumina2" },
    },
    "VAELoader.0": {
      class_type: "VAELoader",
      inputs: { vae_name: "ae.safetensors" },
    },
    "CLIPTextEncode.0": {
      class_type: "CLIPTextEncode",
      inputs: { text: textChannel, clip: ["CLIPLoader.0", 0] },
    },
    "CLIPTextEncode.1": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["CLIPLoader.0", 0] },
    },
    "EmptySD3LatentImage.0": {
      class_type: "EmptySD3LatentImage",
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "KSampler.0": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 8,
        cfg: 1.0,
        sampler_name: "res_multistep",
        scheduler: "simple",
        denoise: 1.0,
        model: ["ModelSamplingAuraFlow.0", 0],
        positive: ["CLIPTextEncode.0", 0],
        negative: ["CLIPTextEncode.1", 0],
        latent_image: ["EmptySD3LatentImage.0", 0],
      },
    },
    "VAEDecode.0": {
      class_type: "VAEDecode",
      inputs: { samples: ["KSampler.0", 0], vae: ["VAELoader.0", 0] },
    },
    "SaveImage.0": {
      class_type: "SaveImage",
      inputs: { images: ["VAEDecode.0", 0], filename_prefix: prefix },
    },
  };
}

/** The pixal3d garment lift (render_pixal_t1 verbatim — mechanically
 *  converted from the flow.py literal, keys byte-exact; injected
 *  below by the migration stroke — see the module header). */
const GARMENT_WORKFLOW: Record<string, unknown> = {"UNETLoader.0":{"inputs":{"unet_name":"pixal3d_int8_convrot.safetensors","weight_dtype":"default"},"class_type":"UNETLoader"},"CFGOverride.0":{"inputs":{"cfg":1,"end_percent":1,"start_percent":0.769,"model":["UNETLoader.0",0]},"class_type":"CFGOverride"},"RescaleCFG.0":{"inputs":{"multiplier":0.5,"model":["CFGOverride.0",0]},"class_type":"RescaleCFG"},"LoadMoGeModel.0":{"inputs":{"model_name":"moge_2_vitl_normal_fp16.safetensors"},"class_type":"LoadMoGeModel"},"LoadBackgroundRemovalModel.0":{"inputs":{"bg_removal_name":"birefnet.safetensors"},"class_type":"LoadBackgroundRemovalModel"},"LoadImage.0":{"inputs":{"image":"$garment_image"},"class_type":"LoadImage"},"RemoveBackground.0":{"inputs":{"bg_removal_model":["LoadBackgroundRemovalModel.0",0],"image":["LoadImage.0",0]},"class_type":"RemoveBackground"},"MaskToImage.0":{"inputs":{"mask":["RemoveBackground.0",0]},"class_type":"MaskToImage"},"ImageCropToMask.0":{"inputs":{"background":"#000000","grow_mask":0,"height":1024,"pad_factor":1.1,"width":1024,"images":["MaskToImage.0",0],"masks":["RemoveBackground.0",0]},"class_type":"ImageCropToMask"},"MoGeInference.0":{"inputs":{"apply_mask":true,"batch_size":4,"force_projection":true,"fov_x_degrees":0,"resolution_level":9,"moge_model":["LoadMoGeModel.0",0],"image":["ImageCropToMask.0",0]},"class_type":"MoGeInference"},"MoGeGeometryToFOV.0":{"inputs":{"axis":"horizontal","unit":"degrees","moge_geometry":["MoGeInference.0",0]},"class_type":"MoGeGeometryToFOV"},"CLIPVisionLoader.0":{"inputs":{"clip_name":"dino_v3_L_naf_fp32.safetensors"},"class_type":"CLIPVisionLoader"},"Pixal3DConditioning.0":{"inputs":{"camera_angle_x":["MoGeGeometryToFOV.0",0],"clip_vision_model":["CLIPVisionLoader.0",0],"image":["ImageCropToMask.0",0]},"class_type":"Pixal3DConditioning"},"ConditioningZeroOut.0":{"inputs":{"conditioning":["Pixal3DConditioning.0",0]},"class_type":"ConditioningZeroOut"},"CFGOverride.1":{"inputs":{"cfg":1,"end_percent":1,"start_percent":0.667,"model":["UNETLoader.0",0]},"class_type":"CFGOverride"},"RescaleCFG.1":{"inputs":{"multiplier":0.7,"model":["CFGOverride.1",0]},"class_type":"RescaleCFG"},"ModelSamplingSD3.0":{"inputs":{"shift":5,"model":["RescaleCFG.1",0]},"class_type":"ModelSamplingSD3"},"EmptyTrellis2LatentStructure.0":{"inputs":{"batch_size":1},"class_type":"EmptyTrellis2LatentStructure"},"KSampler.0":{"inputs":{"cfg":7.5,"denoise":1,"sampler_name":"euler","scheduler":"normal","seed":42,"steps":12,"model":["ModelSamplingSD3.0",0],"positive":["Pixal3DConditioning.0",0],"negative":["ConditioningZeroOut.0",0],"latent_image":["EmptyTrellis2LatentStructure.0",0]},"class_type":"KSampler"},"VAELoader.0":{"inputs":{"vae_name":"trellis_2_shape_vae_bf16.safetensors"},"class_type":"VAELoader"},"VaeDecodeStructureTrellis2.0":{"inputs":{"resolution":"32","samples":["KSampler.0",0],"vae":["VAELoader.0",0]},"class_type":"VaeDecodeStructureTrellis2"},"Trellis2ShapeStage.0":{"inputs":{"positive":["Pixal3DConditioning.0",0],"negative":["ConditioningZeroOut.0",0],"voxel":["VaeDecodeStructureTrellis2.0",0]},"class_type":"Trellis2ShapeStage"},"KSampler.1":{"inputs":{"cfg":7.5,"denoise":1,"sampler_name":"euler","scheduler":"normal","seed":42,"steps":20,"model":["RescaleCFG.0",0],"positive":["Trellis2ShapeStage.0",0],"negative":["Trellis2ShapeStage.0",1],"latent_image":["Trellis2ShapeStage.0",2]},"class_type":"KSampler"},"Trellis2UpsampleStage.0":{"inputs":{"target_resolution":1024,"positive":["Trellis2ShapeStage.0",0],"negative":["Trellis2ShapeStage.0",1],"shape_latent":["KSampler.1",0],"vae":["VAELoader.0",0]},"class_type":"Trellis2UpsampleStage"},"KSampler.2":{"inputs":{"cfg":7.5,"denoise":1,"sampler_name":"euler","scheduler":"simple","seed":42,"steps":12,"model":["RescaleCFG.0",0],"positive":["Trellis2UpsampleStage.0",0],"negative":["Trellis2UpsampleStage.0",1],"latent_image":["Trellis2UpsampleStage.0",2]},"class_type":"KSampler"},"VaeDecodeShapeTrellis.0":{"inputs":{"samples":["KSampler.2",0],"vae":["VAELoader.0",0]},"class_type":"VaeDecodeShapeTrellis"},"GetMeshInfo.0":{"inputs":{"mesh":["VaeDecodeShapeTrellis.0",0]},"class_type":"GetMeshInfo"},"RemeshMesh.0":{"inputs":{"band":1,"drop_small_components":0.01,"fix_poles":false,"precluster_max_verts":20000000,"project_back":0,"resolution":768,"smooth_iters":20,"mesh":["GetMeshInfo.0",0],"sign_mode":"udf","sign_mode.qef":false,"sign_mode.drop_inverted_components":false,"sign_mode.drop_enclosed_components":false},"class_type":"RemeshMesh"},"DecimateMesh.0":{"inputs":{"target_face_count":700000,"mesh":["RemeshMesh.0",0],"placement_mode":"midpoint"},"class_type":"DecimateMesh"},"MeshSmoothNormals.0":{"inputs":{"crease_angle":180,"mesh":["DecimateMesh.0",0]},"class_type":"MeshSmoothNormals"},"UnwrapMesh.0":{"inputs":{"padding":1,"resolution":4096,"segmenter":"pec","weld_distance":0.0002,"mesh":["MeshSmoothNormals.0",0]},"class_type":"UnwrapMesh"},"Trellis2TextureStage.0":{"inputs":{"positive":["Trellis2UpsampleStage.0",0],"negative":["Trellis2UpsampleStage.0",1],"shape_latent":["KSampler.2",0]},"class_type":"Trellis2TextureStage"},"KSampler.3":{"inputs":{"cfg":1,"denoise":1,"sampler_name":"euler","scheduler":"normal","seed":42,"steps":12,"model":["UNETLoader.0",0],"positive":["Trellis2TextureStage.0",0],"negative":["Trellis2TextureStage.0",1],"latent_image":["Trellis2TextureStage.0",2]},"class_type":"KSampler"},"VAELoader.1":{"inputs":{"vae_name":"trellis_2_texture_vae_bf16.safetensors"},"class_type":"VAELoader"},"VaeDecodeTextureTrellis.0":{"inputs":{"samples":["KSampler.3",0],"vae":["VAELoader.1",0],"shape_subdivides":["VaeDecodeShapeTrellis.0",1]},"class_type":"VaeDecodeTextureTrellis"},"BakeTextureFromVoxel.0":{"inputs":{"texture_size":4096,"mesh":["UnwrapMesh.0",0],"voxel_colors":["VaeDecodeTextureTrellis.0",0],"reference_mesh":["VaeDecodeShapeTrellis.0",0]},"class_type":"BakeTextureFromVoxel"},"BakeAmbientOcclusion.0":{"inputs":{"bias":0.01,"max_distance":0.71,"resolution":1024,"samples":64,"strength":1,"low_poly":["UnwrapMesh.0",0],"high_poly":["RemeshMesh.0",0]},"class_type":"BakeAmbientOcclusion"},"BakeNormalMapFromMesh.0":{"inputs":{"cage_distance":0.05,"ignore_backfaces":true,"resolution":2048,"low_poly":["UnwrapMesh.0",0],"high_poly":["RemeshMesh.0",0]},"class_type":"BakeNormalMapFromMesh"},"ApplyTextureToMesh.0":{"inputs":{"mesh":["UnwrapMesh.0",0],"base_color":["BakeTextureFromVoxel.0",0],"metallic":["BakeTextureFromVoxel.0",1],"roughness":["BakeTextureFromVoxel.0",2],"occlusion":["BakeAmbientOcclusion.0",0],"normal_map":["BakeNormalMapFromMesh.0",0]},"class_type":"ApplyTextureToMesh"},"MeshSmoothNormals.1":{"inputs":{"crease_angle":180,"mesh":["ApplyTextureToMesh.0",0]},"class_type":"MeshSmoothNormals"},"MeshToFile3D.0":{"inputs":{"mesh":["MeshSmoothNormals.1",0]},"class_type":"MeshToFile3D"},"Save3DAdvanced.0":{"inputs":{"filename_prefix":"pixal3d","height":1024,"width":1024,"model_3d":["MeshToFile3D.0",0],"viewport_state":""},"class_type":"Save3DAdvanced"}} as unknown as Record<string, unknown>;

// ── the eleven declarations ─────────────────────────────────────

const ANNY_HMR: RegistryFlow = {
  id: "anny-hmr",
  description:
    "Pilot stroke 1 (docs/plans/anny-pilot.md §4): photo → Anny body GLB " +
    "via the estimator pack (MultiHMR2 regression + loud single-person " +
    "lock) — the first SUB-ACTION verb's flow template; the anny card's " +
    "HMR chip runs this through the queue and hydrates body_glb from " +
    "its artifacts.",
  stages: [
    plainStage({
      id: "estimate",
      engine: "comfyui",
      description: "MultiHMR2 regression + loud single-person lock",
      inputs: { photo: initial("photo") },
      expected: { photo: "image" },
      outputs: { body: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 1800,
        workflow: {
          load: { class_type: "LoadImage", inputs: { image: "$photo" } },
          hmr: {
            class_type: "MultiHMR2ImageToAnny",
            inputs: {
              image: ["load", 0],
              conf_thresh: 0.4,
              dist_thresh_nms: 0.25,
              lowres: false,
              save_anny_params: true,
              save_mesh: true,
              render: false,
              filename_prefix: "anny/multihmr2",
            },
          },
          select: {
            class_type: "AnnySelectPerson",
            inputs: { mesh_paths: ["hmr", 2], index: 0 },
          },
          ground: {
            class_type: "AnnyGroundBody",
            inputs: { glb_path: ["select", 0] },
          },
        },
      },
    }),
  ],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
};

const ANNY_HMR_COMMERCIAL: RegistryFlow = {
  id: "anny-hmr-commercial",
  description:
    "The commercial photo→Anny chain (docs/design/commercial-estimator-chain.md): " +
    "SAM 3D Body → MHR → SOMA → anny — every link license-cleared for sale " +
    "(SAM License operator-accepted; the rest Apache 2.0). Emits a grounded " +
    "bind-pose body GLB + anny phenotype/local-change params.",
  stages: [
    plainStage({
      id: "estimate",
      engine: "comfyui",
      description: "SAM 3D Body commercial chain → grounded anny GLB",
      inputs: { photo: initial("photo") },
      expected: { photo: "image" },
      outputs: { body: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 3600,
        workflow: {
          load: { class_type: "LoadImage", inputs: { image: "$photo" } },
          s3db: {
            class_type: "Sam3dBodyImageToAnny",
            inputs: { image: ["load", 0], person_index: 0 },
          },
        },
      },
    }),
  ],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
};

const ANNY_PARAMS: RegistryFlow = {
  id: "anny-params",
  description:
    "Stroke 3 (docs/design/anny-evolution.md §2): preset params → grounded " +
    "Anny body GLB (authored 11-dim rows + verbatim estimated runs " +
    "re-instantiate bit-exact) — the preset-load verb's flow template; the " +
    "anny card's preset picker runs this through the queue and hydrates " +
    "body_glb from its artifacts.",
  stages: [
    plainStage({
      id: "instantiate",
      engine: "comfyui",
      description: "Preset params → grounded anny GLB",
      inputs: { params_json: initial("params_json") },
      expected: { params_json: "text" },
      outputs: { body: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 600,
        workflow: {
          bake: {
            class_type: "AnnyParamsToGlb",
            inputs: { params_json: "$params_json" },
          },
        },
      },
    }),
  ],
  initialValidators: { params_json: "bake_params" },
  tool: null,
  skillRefs: [],
};

const AUDIO_NATIVE_TTS: RegistryFlow = {
  id: "audio-native-tts",
  description:
    "Phase 1b gate: Qwen3-TTS 12Hz CustomVoice via the live melite-audio-nodes " +
    "island pack in the serving ComfyUI container (pure-ComfyUI audio lane; " +
    "retires the C audio engine for TTS).",
  stages: [
    plainStage({
      id: "tts",
      engine: "comfyui",
      card: "tts",
      description: "Qwen3-TTS text to speech via the tts card",
      inputs: { prompt: initial("prompt") },
      cardIo: { wav: "audio" },
      params: { model: "qwen3-tts", text: "$prompt", seed: 42 },
    }),
  ],
  initialValidators: {},
  tool: {
    name: "speak",
    version: 1,
    description:
      "Qwen3-TTS 12Hz CustomVoice speech in one call — text in, wav out " +
      "(pure-ComfyUI audio lane).",
    properties: {
      prompt: {
        ptype: "string",
        description: "what to say",
        default: null,
        hasDefault: false,
        minimum: null,
        maximum: null,
        enum: null,
      },
      seed: {
        ptype: "integer",
        description: "voice sampler seed",
        default: 42,
        hasDefault: true,
        minimum: 0,
        maximum: 2147483647,
        enum: null,
      },
    },
    required: ["prompt"],
    overlays: [{ param: "seed", stage: "tts", path: ["seed"], choices: null }],
  },
  skillRefs: [],
};

const BODY_TO_SOMAX: RegistryFlow = {
  id: "body-to-somax",
  description:
    "Bare body GLB → SOMAX-rigged GLB: the anny→kimodo bridge (the baked " +
    "SOMA-77 template weight transfer, standalone-rig mode — no Blender). The " +
    "motion studio posts this behind the scenes when a wired body isn't SOMAX; " +
    "any bare human mesh (anny bake, TRELLIS, upload) rides the same door.",
  stages: [
    plainStage({
      id: "rig",
      engine: "comfyui",
      description:
        "SOMA-77 template weight transfer (barycentric, the autorig pack's " +
        "baked function via KimodoExportFBX standalone-rig mode)",
      inputs: { glb: initial("glb") },
      expected: { glb: "mesh" },
      outputs: { body: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 600,
        workflow: {
          rig: {
            class_type: "KimodoExportFBX",
            inputs: {
              rigged_path: "",
              source_glb: "$glb",
              file_format: "glb",
              npz_path: "",
              fps: 30,
              in_place: true,
              decimate_ratio: 0.0,
              preserve_texture: true,
            },
          },
        },
      },
    }),
  ],
  initialValidators: {},
  tool: null,
  skillRefs: [],
};

const CHARACTER: RegistryFlow = {
  id: "character",
  description:
    "Headless keeper pipeline: z-image character + garment images (or " +
    "operator-supplied starters) -> ANNY commercial body -> SOMAX rig -> " +
    "pixal3d garment (remesh tail folded) -> skin detail -> automatic " +
    "fit-seat attach -> dressed-GLB export.",
  stages: [
    plainStage({
      id: "img",
      engine: "comfyui",
      description:
        "z-image character sheet (skipped when the operator brings starter_image)",
      inputs: { character_prompt: initial("character_prompt") },
      expected: { character_prompt: "text" },
      outputs: { photo: "image" },
      params: {
        out_dir: "./output",
        timeout_s: 900,
        workflow: zImageWorkflow("$character_prompt", 20260906, "character_img"),
      },
      skipWhen: { initial: "starter_image", when: "present" },
    }),
    plainStage({
      id: "gimg",
      engine: "comfyui",
      description:
        "z-image garment sheet (skipped when the operator brings garment_image_1)",
      inputs: { garment_prompt: initial("garment_prompt") },
      expected: { garment_prompt: "text" },
      outputs: { gimg: "image" },
      params: {
        out_dir: "./output",
        timeout_s: 900,
        workflow: zImageWorkflow("$garment_prompt", 20260907, "character_gimg"),
      },
      skipWhen: { initial: "garment_image_1", when: "present" },
    }),
    linkedStage("anny-hmr-commercial", "estimate", "body", {
      photo: fromStage("img", "photo"),
    }),
    linkedStage("body-to-somax", "rig", "rig", {
      glb: fromStage("body", "body"),
    }),
    plainStage({
      id: "garment",
      engine: "comfyui",
      description:
        "pixal3d garment lift incl. the remesh tail (step e folded — GetMeshInfo " +
        "-> RemeshMesh -> DecimateMesh ride in-chain)",
      inputs: { garment_image: fromStage("gimg", "gimg") },
      expected: { garment_image: "image" },
      outputs: { garment: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 3600,
        workflow: GARMENT_WORKFLOW,
      },
    }),
    linkedStage("skin-apply", "coat", "coat", {
      body: fromStage("rig", "body"),
      kind: initial("kind"),
      map_size: initial("map_size"),
      seed: initial("seed"),
    }),
    linkedStage("fit-seat", "seat", "seat", {
      body: fromStage("coat", "skin"),
      prop: fromStage("garment", "garment"),
      model_name: initial("model_name"),
      bone: initial("bone"),
      align: initial("align"),
      position: initial("position"),
      rotation: initial("rotation"),
      fit_ratio: initial("fit_ratio"),
      fit_ref_bone: initial("fit_ref_bone"),
      fit_ref_bone2: initial("fit_ref_bone2"),
      seat_ratio: initial("seat_ratio"),
      finger_bone: initial("finger_bone"),
      thumb_bone: initial("thumb_bone"),
      target_width: initial("target_width"),
    }),
  ],
  initialValidators: { starter_image: "photo", garment_image_1: "photo" },
  tool: null,
  skillRefs: [],
};

const FIT_SEAT: RegistryFlow = {
  id: "fit-seat",
  description:
    "Seat a static prop onto a SOMAX body under the meld fit laws (the " +
    "dress/prop verb engine): knob initials assemble the meld row in-pack, " +
    "FitProp grafts, the turnaround proves.",
  stages: [
    plainStage({
      id: "seat",
      engine: "comfyui",
      description: "FitRow (knobs -> meld row) -> FitProp (graft) -> proof views",
      inputs: {
        body: initial("body"),
        prop: initial("prop"),
        model_name: initial("model_name"),
        bone: initial("bone"),
        align: initial("align"),
        position: initial("position"),
        rotation: initial("rotation"),
        fit_ratio: initial("fit_ratio"),
        fit_ref_bone: initial("fit_ref_bone"),
        fit_ref_bone2: initial("fit_ref_bone2"),
        seat_ratio: initial("seat_ratio"),
        finger_bone: initial("finger_bone"),
        thumb_bone: initial("thumb_bone"),
        target_width: initial("target_width"),
      },
      expected: {
        body: "mesh",
        prop: "mesh",
        model_name: "text",
        bone: "text",
        align: "text",
        position: "text",
        rotation: "text",
        fit_ratio: "num",
        fit_ref_bone: "text",
        fit_ref_bone2: "text",
        seat_ratio: "num",
        finger_bone: "text",
        thumb_bone: "text",
        target_width: "num",
      },
      outputs: { seat: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 1800,
        workflow: {
          row: {
            class_type: "FitRow",
            inputs: {
              model_name: "$model_name",
              bone: "$bone",
              align: "$align",
              position: "$position",
              rotation: "$rotation",
              fit_ratio: "$fit_ratio",
              fit_ref_bone: "$fit_ref_bone",
              fit_ref_bone2: "$fit_ref_bone2",
              seat_ratio: "$seat_ratio",
              finger_bone: "$finger_bone",
              thumb_bone: "$thumb_bone",
              target_width: "$target_width",
            },
          },
          seat: {
            class_type: "FitProp",
            inputs: {
              body_glb_path: "$body",
              prop_glb_path: "$prop",
              row_json: ["row", 0],
            },
          },
          views: {
            class_type: "RayRenderGLBViews",
            inputs: {
              glb_path: ["seat", 0],
              resolution: 768,
              framing: 1.2,
              focal_length: 50,
              samples: 64,
              transparent: true,
            },
          },
        },
      },
    }),
  ],
  initialValidators: { body: "glb", prop: "glb" },
  tool: null,
  skillRefs: [],
};

const IMAGE_UPSCALE: RegistryFlow = {
  id: "image-upscale",
  description:
    "Prompt → image → 1080p SeedVR2 upscale, one card per stroke (the first " +
    "two-card flow: image-gen + upscale-tools card= stages; image_model picks " +
    "the generator).",
  stages: [
    plainStage({
      id: "make",
      engine: "comfyui",
      card: "image-gen",
      description: "T2I via the image-gen card (the named model's own generate_t2i.json)",
      inputs: { prompt: initial("prompt") },
      cardIo: { image: "image" },
      params: { model: "krea-2", prompt: "$prompt", seed: 42 },
    }),
    plainStage({
      id: "polish",
      engine: "comfyui",
      card: "upscale-tools",
      description: "SeedVR2 1080p upscale via the upscale-tools card",
      inputs: { image: fromStage("make", "image") },
      cardIo: { image: "image" },
      params: {
        model: "seedvr2_ema",
        input_image: "$image",
        filename_prefix: "image-upscale",
        seed: 42,
      },
    }),
  ],
  initialValidators: {},
  tool: {
    name: "image_upscale",
    version: 1,
    description:
      "Generate an image from a prompt and upscale it to 1080p in one call " +
      "(krea-2 or z-image generator, SeedVR2 upscale always on). One POST runs " +
      "the whole flow.",
    properties: {
      image_model: {
        ptype: "string",
        description: "the generator family (no default: pick one)",
        default: null,
        hasDefault: false,
        minimum: null,
        maximum: null,
        enum: ["krea-2", "z-image"],
      },
      prompt: {
        ptype: "string",
        description: "what to generate (up to 4000 chars)",
        default: null,
        hasDefault: false,
        minimum: null,
        maximum: null,
        enum: null,
      },
      seed: {
        ptype: "integer",
        description: "sampler seed",
        default: 42,
        hasDefault: true,
        minimum: 0,
        maximum: 2147483647,
        enum: null,
      },
    },
    required: ["image_model", "prompt"],
    overlays: [
      {
        param: "image_model",
        stage: "make",
        path: ["model"],
        choices: { "krea-2": "krea-2", "z-image": "z-image" },
      },
      { param: "seed", stage: "make", path: ["seed"], choices: null },
      { param: "seed", stage: "polish", path: ["seed"], choices: null },
    ],
  },
  skillRefs: [
    "card:image-gen",
    "card:upscale-tools",
    "model:krea-2",
    "model:krea-2:prompt-enhance",
    "model:z-image:prompt-enhance",
  ],
};

const KIMODO_NATIVE: RegistryFlow = {
  id: "kimodo-native",
  description:
    "Text-to-motion gate — ComfyUI Kimodo lane (island nodes, raw PyTorch " +
    "kimodo package, local SOMA-RP-v1.1 weights + local LLM2Vec encoder).",
  stages: [
    plainStage({
      id: "t2m",
      engine: "comfyui",
      description: "Kimodo text-to-pose via live ComfyUI nodes",
      inputs: { prompt: initial("prompt") },
      expected: { prompt: "text" },
      outputs: { mp4: "video" },
      params: {
        out_dir: "./output",
        timeout_s: 1800,
        workflow: {
          "1": {
            class_type: "KimodoLoader",
            inputs: { model_name: "Kimodo-SOMA-RP-v1.1" },
          },
          "2": {
            class_type: "KimodoTextToPose",
            inputs: {
              model: ["1", 0],
              prompt: "$prompt",
              seed: 42,
              duration_sec: 3,
              diffusion_steps: 25,
              num_samples: 1,
            },
          },
        },
      },
    }),
  ],
  initialValidators: {},
  tool: null,
  skillRefs: [],
};

const MUSIC_NATIVE: RegistryFlow = {
  id: "music-native",
  description:
    "audio.cpp native music generation as a CARD stage — the first production " +
    "card= lane (stroke 4). prompt in, audio out; the card doc names its model " +
    "row (ace-step-xl family; see GET /v1/models for the boarded rows).",
  stages: [
    plainStage({
      id: "music",
      engine: "audio_cpp",
      card: "music-native",
      description:
        "audio.cpp music card — the arm composes the doc into the engine " +
        "workflow (task/family/model rows)",
      inputs: { prompt: initial("prompt") },
      params: {
        prompt: "$prompt",
        model: "ace-step-sft",
        family: "ace-step-xl",
        duration: 120,
        seed: -1,
        backend: "cuda",
      },
    }),
  ],
  initialValidators: {},
  tool: {
    name: "compose_music",
    version: 1,
    description:
      "audio.cpp native music generation in one call (ACE-Step family) — " +
      "prompt in, audio out.",
    properties: {
      prompt: {
        ptype: "string",
        description: "what to play",
        default: null,
        hasDefault: false,
        minimum: null,
        maximum: null,
        enum: null,
      },
      duration: {
        ptype: "integer",
        description: "seconds of music (the card caps 10..600)",
        default: 120,
        hasDefault: true,
        minimum: 10,
        maximum: 600,
        enum: null,
      },
    },
    required: ["prompt"],
    overlays: [{ param: "duration", stage: "music", path: ["duration"], choices: null }],
  },
  skillRefs: [],
};

const SKIN_APPLY: RegistryFlow = {
  id: "skin-apply",
  description:
    "Deterministic skin detail maps onto a SOMAX body under the meld skin laws " +
    "(the apply-skin verb engine): knob initials assemble the controller sidecar " +
    "in-pack, SkinApply grafts, the turnaround proves.",
  stages: [
    plainStage({
      id: "coat",
      engine: "comfyui",
      description:
        "SkinPack (maps) -> SkinSidecar (sidecar) -> SkinApply (graft) -> proof views",
      inputs: {
        body: initial("body"),
        kind: initial("kind"),
        map_size: initial("map_size"),
        seed: initial("seed"),
      },
      expected: { body: "mesh", kind: "text", map_size: "num", seed: "num" },
      outputs: { skin: "mesh" },
      params: {
        out_dir: "./output",
        timeout_s: 1800,
        workflow: {
          pack: {
            class_type: "SkinPack",
            inputs: { size: "$map_size", seed: "$seed" },
          },
          scar: {
            class_type: "SkinSidecar",
            inputs: { kind: "$kind", size: "$map_size", seed: "$seed" },
          },
          save_albedo: {
            class_type: "SaveImage",
            inputs: {
              images: ["pack", 0],
              filename_prefix: "skin_apply/out_albedo",
            },
          },
          save_normal: {
            class_type: "SaveImage",
            inputs: {
              images: ["pack", 1],
              filename_prefix: "skin_apply/out_normal",
            },
          },
          save_sidecar: {
            class_type: "SaveText",
            inputs: {
              text: ["scar", 0],
              filename_prefix: "skin_apply/out_kind",
              format: "json",
            },
          },
          apply: {
            class_type: "SkinApply",
            inputs: {
              body_glb_path: "$body",
              albedo: ["pack", 0],
              normal: ["pack", 1],
            },
          },
          views: {
            class_type: "RayRenderGLBViews",
            inputs: {
              glb_path: ["apply", 0],
              resolution: 768,
              framing: 1.2,
              focal_length: 50,
              samples: 64,
              transparent: true,
            },
          },
        },
      },
    }),
  ],
  initialValidators: { body: "glb" },
  tool: null,
  skillRefs: [],
};

const REGISTRY: Record<string, RegistryFlow> = {
  "anny-hmr": ANNY_HMR,
  "anny-hmr-commercial": ANNY_HMR_COMMERCIAL,
  "anny-params": ANNY_PARAMS,
  "audio-native-tts": AUDIO_NATIVE_TTS,
  "body-to-somax": BODY_TO_SOMAX,
  character: CHARACTER,
  "fit-seat": FIT_SEAT,
  "image-upscale": IMAGE_UPSCALE,
  "kimodo-native": KIMODO_NATIVE,
  "music-native": MUSIC_NATIVE,
  "skin-apply": SKIN_APPLY,
};

/** All registered flow names (the flow.scan_flow_ids order — sorted). */
export function registryFlowNames(): string[] {
  return Object.keys(REGISTRY).sort();
}

/** The raw (unexpanded) declaration, or undefined for unknown names. */
export function getRegistryFlow(name: string): RegistryFlow | undefined {
  return REGISTRY[name];
}

/** Resolve every fromFlow row against its source flow (Stage.from_flow
 *  verbatim: the source row's engine/card/description/expected/
 *  outputs/card_io/params ride; the link's id + inputs win). Throws
 *  LOUD on a dangling link (authoring bug — never a silent row). */
export function expandRegistryFlow(flow: RegistryFlow): RegistryFlow {
  const stages: RegistryStage[] = flow.stages.map(
    (st: RegistryStage): RegistryStage => {
      if (st.fromFlow === null) return st;
      const link: RegistryFromFlow = st.fromFlow;
      const src: RegistryFlow | undefined = REGISTRY[link.flow];
      if (src === undefined) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links unknown flow " + link.flow,
        );
      }
      const base: RegistryStage | undefined = src.stages.find(
        (s: RegistryStage): boolean => s.id === link.stage,
      );
      if (base === undefined) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links unknown stage " + link.flow + "/" +
            link.stage,
        );
      }
      if (base.fromFlow !== null) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links a linked stage (single-hop only): " +
            link.flow + "/" + link.stage,
        );
      }
      return { ...base, id: st.id, inputs: st.inputs };
    },
  );
  return { ...flow, stages };
}

/** The registry flow as a flow_from_body-shaped inline doc (the
 *  validate compile + start shim both ride the EXISTING inline
 *  pipelines — no second validator). Card rows ride card/card_io;
 *  skip_when rides verbatim. */
export function registryFlowToInline(flow: RegistryFlow): Record<string, unknown> {
  return {
    id: flow.id,
    description: flow.description,
    stages: flow.stages.map((st: RegistryStage): Record<string, unknown> => {
      const inputs: Record<string, unknown> = {};
      for (const [name, edge] of Object.entries(st.inputs)) {
        if ("initial" in edge) inputs[name] = { initial: edge.initial };
        else {
          inputs[name] = {
            stage: (edge as RegistryStageEdge).stage,
            output: (edge as RegistryStageEdge).output,
          };
        }
      }
      const row: Record<string, unknown> = {
        id: st.id,
        engine: st.engine,
        description: st.description,
        inputs,
        outputs: { ...st.outputs },
        expected: { ...st.expected },
        params: st.params,
      };
      if (st.card !== "") row["card"] = st.card;
      if (Object.keys(st.cardIo).length > 0) row["card_io"] = { ...st.cardIo };
      if (st.skipWhen !== null) {
        row["skip_when"] = {
          initial: st.skipWhen.initial,
          when: st.skipWhen.when,
        };
      }
      return row;
    }),
  };
}

// ── THE COMPILE-TIME INITIAL GATE (REBUILD-21; the
// initial_validators deferral closed — photo/glb file checks +
// bake_params via the belt) ──

export interface InitialsRoots {
  readonly repoRoot: string;
  readonly stateRoot: string;
}

/** Check one photo/glb initial value. Null = passes. */
function checkFileInitial(
  key: string,
  kind: RegistryInitialKind,
  value: unknown,
  roots: InitialsRoots,
): string | null {
  let ref: string;
  if (typeof value === "string") ref = value;
  else if (
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)["path"] === "string"
  ) {
    ref = (value as Record<string, unknown>)["path"] as string;
  } else {
    return (
      "initial " + JSON.stringify(key) + " must be a file path string or " +
      "{path: ...} (got " + pyTypeName(value) + ")"
    );
  }
  const raw: string = ref.trim();
  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return (
      "initial " + JSON.stringify(key) +
      " is browser-local (nothing to stage) — upload the file first: " +
      "POST /v1/uploads, then pass its staged path"
    );
  }
  const dot: number = raw.split(/[?#]/)[0]?.lastIndexOf(".") ?? -1;
  const ext: string = dot >= 0
    ? (raw.split(/[?#]/)[0]?.slice(dot + 1).toLowerCase() ?? "")
    : "";
  // The vocab is TYPED DATA now (mediaKinds.ts, REBUILD-7) — no
  // repo-anchored kindsPath read survives the re-home.
  const kinds = mediaVocab();
  const allowed: readonly string[] = kind === "photo" ? kinds.image : kinds.model;
  if (!allowed.includes(ext)) {
    return (
      "initial " + JSON.stringify(key) + " is not a stageable " +
      (kind === "photo" ? "image" : "mesh") + " (got extension " +
      JSON.stringify(ext) + ")"
    );
  }
  if (raw.includes("..")) {
    return "initial " + JSON.stringify(key) + " refuses traversal";
  }
  const cands: string[] = [];
  const ASSET_RUNS_PREFIX = "/v1/assets/runs/";
  if (raw.startsWith(ASSET_RUNS_PREFIX)) {
    const rel: string = raw.slice(ASSET_RUNS_PREFIX.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      return (
        "initial " + JSON.stringify(key) +
        " is a malformed artifact URL (want /v1/assets/runs/<run_id>/<file>)"
      );
    }
    for (const root of [
      join(roots.stateRoot, "output"),
      join(roots.stateRoot, "test-output"),
      join(roots.repoRoot, "data", "runs", "output"),
      join(roots.repoRoot, "data", "runs", "test-output"),
    ]) {
      cands.push(join(root, rel));
    }
  } else if (raw.startsWith("/")) {
    cands.push(raw);
  } else {
    cands.push(resolve(roots.repoRoot, raw));
    cands.push(resolve(process.cwd(), raw));
  }
  for (const cand of cands) {
    if (isFile(cand)) return null;
  }
  return "initial " + JSON.stringify(key) + " is not on disk (" + raw + ")";
}

/** The compile-time gate over a registry flow's initial_validators:
 *  the first refusal text, or null when every PRESENT initial
 *  passes (absent initials ride — the $channel/branch arms own
 *  them). Runs BEFORE any run registers, on both doors. */
export function registryInitialsError(
  flow: RegistryFlow,
  body: Record<string, unknown>,
  roots: InitialsRoots,
): string | null {
  for (const [key, kind] of Object.entries(flow.initialValidators)) {
    const value: unknown = body[key];
    if (value === undefined || value === null) continue;
    if (kind === "bake_params") {
      const s: string | undefined = typeof value === "string"
        ? value
        : JSON.stringify(value);
      if (s === undefined) {
        return (
          "initial " + JSON.stringify(key) +
          " must be a params_json string or object (got " +
          pyTypeName(value) + ")"
        );
      }
      const err: string | null = validateBakeParams(s);
      if (err !== null) {
        return "initial " + JSON.stringify(key) + " refuses the preset dialect: " + err;
      }
      continue;
    }
    const err: string | null = checkFileInitial(key, kind, value, roots);
    if (err !== null) return err;
  }
  return null;
}
// ── the skill-body render (REBUILD-16; the tail beyond the
// REBUILD-13 cut) ──

function edgeText(edge: RegistryEdge, flow: RegistryFlow): string {
  if ("initial" in edge) return "initial '" + edge.initial + "'";
  const src: string = edge.stage + "." + edge.output;
  let kind = "";
  for (const st of flow.stages) {
    const base: RegistryStage = st.fromFlow !== null
      ? resolveLink(st) ?? st
      : st;
    if (base.id === edge.stage) {
      kind = base.outputs[edge.output] ?? base.cardIo[edge.output] ?? "";
    }
  }
  return "stage " + src + (kind !== "" ? " (" + kind + ")" : "");
}

function resolveLink(st: RegistryStage): RegistryStage | null {
  if (st.fromFlow === null) return null;
  const link: RegistryFromFlow = st.fromFlow;
  const src: RegistryFlow | undefined = REGISTRY[link.flow];
  if (src === undefined) return null;
  return src.stages.find((s: RegistryStage): boolean => s.id === link.stage) ??
    null;
}

/** Render one registry flow as its skill-body text. */
export function registrySkillBody(flow: RegistryFlow): string {
  const lines: string[] = ["# flow " + flow.id, "", flow.description, "", "## stages"];
  for (const st of flow.stages) {
    const base: RegistryStage = st.fromFlow !== null ? (resolveLink(st) ?? st) : st;
    let head = "- " + st.id + " (";
    head += st.fromFlow !== null
      ? "from " + st.fromFlow.flow + "/" + st.fromFlow.stage
      : base.engine + (base.card !== "" ? ", card " + base.card : "");
    head += ")";
    if (base.description !== "") head += ": " + base.description;
    lines.push(head);
    for (const [name, edge] of Object.entries(st.inputs)) {
      lines.push("  input " + name + ": " + edgeText(edge, flow));
    }
    for (const [name, kind] of Object.entries(base.outputs)) {
      lines.push("  output " + name + ": " + kind);
    }
    for (const [name, kind] of Object.entries(base.cardIo)) {
      lines.push("  card_io " + name + ": " + kind);
    }
    if (st.skipWhen !== null) {
      lines.push(
        "  skip when initial '" + st.skipWhen.initial + "' is " + st.skipWhen.when,
      );
    }
  }
  return lines.join("\n") + "\n";
}
