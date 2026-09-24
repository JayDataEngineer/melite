// flowsRegistryRows.ts — the flow declarations (the SSOT rows).
// Extracted from flowsData.ts (the god-file cut, 2026-09-18): one
// module of declarations, one line per flow; flowsData.ts keeps the
// types, the helpers, and the assembled REGISTRY.
import type { RegistryFlow } from "./flowsData.ts";
import { plainStage, initial, zImageWorkflow, linkedStage, fromStage } from "./flowsData.ts";
import { GARMENT_WORKFLOW } from "./flowsGarmentWorkflow.ts";

export const ANNY_HMR: RegistryFlow = {
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
export const ANNY_HMR_COMMERCIAL: RegistryFlow = {
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
export const ANNY_PARAMS: RegistryFlow = {
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
export const AUDIO_NATIVE_TTS: RegistryFlow = {
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
      inputs: { text: initial("prompt") },
      // every wired input needs its expected Kind (kindsOk's own
      // law) — this row shipped without it and only the LIVE
      // /v1/flows/validate path tripped it; completed at the
      // round-trip stroke 2026-09-20 beside the wall that catches
      // the class (kindsOk over every registry flow)
      expected: { text: "text" },
      outputs: { wav: "audio" },
      cardIo: { wav: "audio" },
      params: { model: "qwen3-tts", text: "$text", seed: 42 },
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
export const BODY_TO_SOMAX: RegistryFlow = {
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
export const CHARACTER: RegistryFlow = {
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
export const FIT_SEAT: RegistryFlow = {
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
export const IMAGE_UPSCALE: RegistryFlow = {
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
      // the wiring wall's law (2026-09-20): every wired input typed
      expected: { prompt: "text" },
      cardIo: { image: "image" },
      params: { model: "krea-2", prompt: "$prompt", seed: 42 },
    }),
    plainStage({
      id: "polish",
      engine: "comfyui",
      card: "upscale-tools",
      description: "SeedVR2 1080p upscale via the upscale-tools card",
      inputs: { image: fromStage("make", "image") },
      expected: { image: "image" },
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
export const KIMODO_NATIVE: RegistryFlow = {
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
      outputs: { motion_npz: "data" },
      params: {
        output_nodes: { motion_npz: "2" },
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
export const MUSIC_NATIVE: RegistryFlow = {
  id: "music-native",
  description:
    "Music generation as a CARD stage — prompt in, audio out via the music " +
    "card (MiniMax Music 3, the boarded row; see GET /v1/models). Repointed " +
    "at the mono-engine law by the wiring wall 2026-09-20: the row still " +
    "named the retired audio_cpp tier and a card id that no longer exists — " +
    "a fossil only the live validate path ever tripped.",
  stages: [
    plainStage({
      id: "music",
      engine: "comfyui",
      card: "music",
      description:
        "MiniMax Music 3 via the music card — the lane composes the doc " +
        "into the ComfyUI graph (UNET/CLIP/VAE loaders + the music sampler)",
      inputs: { prompt: initial("prompt") },
      expected: { prompt: "text" },
      cardIo: { default: "audio" },
      params: {
        prompt: "$prompt",
        model: "music3",
        duration: 120,
        seed: -1,
      },
    }),
  ],
  initialValidators: {},
  tool: {
    name: "compose_music",
    version: 1,
    description:
      "Music generation in one call (MiniMax Music 3 via the music card) — " +
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
        description: "seconds of music (the card caps 5..360)",
        default: 120,
        hasDefault: true,
        minimum: 5,
        maximum: 360,
        enum: null,
      },
    },
    required: ["prompt"],
    overlays: [{ param: "duration", stage: "music", path: ["duration"], choices: null }],
  },
  skillRefs: [],
};
export const SKIN_APPLY: RegistryFlow = {
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
export const CRAFT_LOOP: RegistryFlow = {
  id: "craft-loop",
  description:
    "The agentic craft loop: a named image-capable model route critiques " +
    "each capture and decides the next act command until done (or the " +
    "iteration cap). The act leg rides ANY registered engine (comfyui " +
    "graphs, mcp:blender tool calls); captures land in the run dir and " +
    "attach to the critique. Driven by the runs door with engine " +
    "'craft' stages — see flows/craft-loop/agents/AGENT.md.",
  stages: [
    plainStage({
      id: "loop",
      engine: "craft",
      description: "act → capture → critique → decide (the loop engine)",
      inputs: {},
      outputs: { default: "image" },
      params: {},
    }),
  ],
  initialValidators: {},
  tool: null,
  skillRefs: [],
};
export const AGENT_SPAWN: RegistryFlow = {
  id: "agent-spawn",
  description:
    "Spawn a subagent with a task: a general tool-calling loop on the runs plane " +
    "(engine 'agent'). The allow-listed MCP servers become its tools (mcp__<server>__*), " +
    "the named skills are spawn-injected into its brief as operating instructions, and " +
    "it works until the task is done — max_turns default unlimited, hard circuit breaker " +
    "1000, the stop door always live. Artifacts land in the run dir. Driven by the runs " +
    "door — see flows/agent-spawn/agents/AGENT.md.",
  stages: [
    plainStage({
      id: "agent",
      engine: "agent",
      description: "task → tool calls → answer (the agent engine)",
      inputs: {},
      outputs: { default: "text" },
      params: {},
    }),
  ],
  initialValidators: {},
  tool: null,
  skillRefs: [],
};
