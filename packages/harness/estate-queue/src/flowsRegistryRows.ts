// flowsRegistryRows.ts — the flow declarations (the SSOT rows).
// Extracted from flowsData.ts (the god-file cut, 2026-09-18): one
// module of declarations, one line per flow; flowsData.ts keeps the
// types, the helpers, and the assembled REGISTRY.
import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage'
import type { RegistryFlow } from "./flowsData.ts";
import { plainStage, initial, linkedStage, fromStage } from "./flowsData.ts";

export const ANNY_HMR: RegistryFlow = {
  id: "anny-hmr",
  description:
    "Pilot stroke 1 (dev_docs/plans/anny-pilot.md §4): photo → Anny body GLB " +
    "via the estimator pack (MultiHMR2 regression + loud single-person " +
    "lock) — the first SUB-ACTION verb's flow template; the anny card's " +
    "HMR chip runs this through the queue and hydrates body_glb from " +
    "its artifacts.",
  stages: [
    plainStage({
      id: "estimate",
      engine: CARD_PLANE_ENGINE,
      // THE VERB'S BACKEND IS A DECLARED ACTION (the atom
      // vocabulary, stroke 4 — the estimator fork's resolution):
      // photo→body is the hmr-estimate VERB (SubActionMod law,
      // stroke 89 — its calibration knobs never join the anny card
      // schema; they live FIXED in the family's action build). The
      // row routes (family + action + the photo ref); the family's
      // DECL composes the graph at expansion — one truth, the same
      // hierarchy a card stage rides, without a card face.
      family: "anny",
      action: "estimate",
      description: "MultiHMR2 regression + loud single-person lock",
      inputs: { photo: initial("photo") },
      expected: { photo: "image" },
      params: { photo: "$photo" },
    }),
  ],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
};
export const ANNY_HMR_COMMERCIAL: RegistryFlow = {
  id: "anny-hmr-commercial",
  description:
    "The commercial photo→Anny chain (dev_docs/design/commercial-estimator-chain.md): " +
    "SAM 3D Body → MHR → SOMA → anny — every link license-cleared for sale " +
    "(SAM License operator-accepted; the rest Apache 2.0). Emits a grounded " +
    "bind-pose body GLB + anny phenotype/local-change params.",
  stages: [
    plainStage({
      id: "estimate",
      engine: CARD_PLANE_ENGINE,
      // the commercial engine of the same verb — family DECL owns
      // the nodes (SAM 3D Body → grounded anny), person_index FIXED
      // at the loudest detection (the verb's chip owns the picker)
      family: "anny",
      action: "estimate_commercial",
      description: "SAM 3D Body commercial chain → grounded anny GLB",
      inputs: { photo: initial("photo") },
      expected: { photo: "image" },
      params: { photo: "$photo" },
    }),
  ],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
};
export const ANNY_PARAMS: RegistryFlow = {
  id: "anny-params",
  description:
    "Stroke 3 (dev_docs/design/anny-evolution.md §2): preset params → grounded " +
    "Anny body GLB (authored 11-dim rows + verbatim estimated runs " +
    "re-instantiate bit-exact) — the preset-load verb's flow template; the " +
    "anny card's preset picker runs this through the queue and hydrates " +
    "body_glb from its artifacts.",
  stages: [
    plainStage({
      id: "instantiate",
      engine: CARD_PLANE_ENGINE,
      // the preset-load verb's backend — the verbatim bake the
      // family declares (params_json rides verbatim; the bake
      // validator judged the json at the initial gate)
      family: "anny",
      action: "bake",
      description: "Preset params → grounded anny GLB",
      inputs: { params_json: initial("params_json") },
      expected: { params_json: "text" },
      params: { params_json: "$params_json" },
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
    "retires the C audio engine for TTS). VALIDATE-ONLY on the queue's " +
    "{flow:} door (2026-09-25 multi-stage boundary stamp): card= stages " +
    "refuse at start — drive the tts card through the bench or {model:}.",
  stages: [
    plainStage({
      id: "tts",
      engine: CARD_PLANE_ENGINE,
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
    "any bare human mesh (anny bake, TRELLIS, upload) rides the same door. " +
    "VALIDATE-ONLY on the queue's {flow:} door (2026-09-30 multi-stage " +
    "boundary stamp): card= stages refuse at start — drive the rig card " +
    "through the bench or {model:}.",
  stages: [
    plainStage({
      id: "rig",
      engine: CARD_PLANE_ENGINE,
      card: "rig",
      description:
        "SOMA-77 template weight transfer (barycentric, the autorig pack's " +
        "baked function) via the rig card's auto mode — the gem_soma " +
        "family's declared rig action composes the KimodoExportFBX segment",
      inputs: { glb: initial("glb") },
      expected: { glb: "mesh" },
      outputs: { body: "mesh" },
      cardIo: { body: "mesh" },
      // THE LANE IS THE FAMILY'S (the atom vocabulary, stroke 3): this
      // stage hand-wired the KimodoExportFBX node in the flow plane —
      // a second copy of the gem_soma rig lane. It names the card +
      // mode; the family's declared action composes the graph.
      // (out_dir/timeout_s are RAW-stage knobs — a card stage's
      // params are card-admitted knobs only; the compose door owns
      // the run dir and the card's own contract the timeout.)
      params: {
        mesh_glb: "$glb",
        mode: "auto",
        preserve_texture: true,
        decimate_ratio: 0,
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
    "fit-seat attach -> dressed-GLB export. VALIDATE-ONLY on the queue's " +
    "{flow:} door (2026-09-30 multi-stage boundary stamp): card= stages " +
    "refuse at start — drive the cards through the bench (construct " +
    "chaining) or the {model:} door.",
  stages: [
    plainStage({
      id: "img",
      engine: CARD_PLANE_ENGINE,
      card: "image-gen",
      description:
        "z-image character sheet via the image-gen card (skipped when the " +
        "operator brings starter_image)",
      inputs: { character_prompt: initial("character_prompt") },
      expected: { character_prompt: "text" },
      outputs: { photo: "image" },
      cardIo: { photo: "image" },
      // THE LANE IS THE FAMILY'S (the atom vocabulary, stroke 3 — the
      // flow-system stroke): the stage names the card and the family;
      // the family's declared t2i action composes the graph, exactly
      // as the bench does. The flow row owns routing only.
      params: {
        model: "z-image",
        prompt: "$character_prompt",
        seed: 20260906,
        width: 1024,
        height: 1024,
      },
      skipWhen: { initial: "starter_image", when: "present" },
    }),
    plainStage({
      id: "gimg",
      engine: CARD_PLANE_ENGINE,
      card: "image-gen",
      description:
        "z-image garment sheet via the image-gen card (skipped when the " +
        "operator brings garment_image_1)",
      inputs: { garment_prompt: initial("garment_prompt") },
      expected: { garment_prompt: "text" },
      outputs: { gimg: "image" },
      cardIo: { gimg: "image" },
      params: {
        model: "z-image",
        prompt: "$garment_prompt",
        seed: 20260907,
        width: 1024,
        height: 1024,
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
      engine: CARD_PLANE_ENGINE,
      card: "img-to-mesh",
      description:
        "pixal3d garment lift incl. the remesh tail (step e folded — GetMeshInfo " +
        "-> RemeshMesh -> DecimateMesh ride in-chain) via the img-to-mesh card — " +
        "the pixal3d family's declared mesh action",
      inputs: { garment_image: fromStage("gimg", "gimg") },
      expected: { garment_image: "image" },
      outputs: { garment: "mesh" },
      cardIo: { garment: "mesh" },
      // THE LANE IS THE FAMILY'S (the atom vocabulary, stroke 3): the
      // pinned GARMENT_WORKFLOW literal was a stale snapshot of the
      // pixal3d mesh lane (it drifted the moment a weight or a node
      // default moved). The family's declared action composes the
      // graph; the official calibrations (768 remesh, 4096 atlas)
      // ride the card schema's own defaults.
      params: {
        model: "pixal3d",
        input_image: "$garment_image",
        seed: 42,
      },
    }),
    // THE SAME TWO VERBS, THEIR FILE INPUTS ONLY (stroke-89's law,
    // as the standalone rows): the coat and the seat take the body and
    // the prop; the coat's detail kind/map size/seed and the seat's
    // fit row are each verb's own vocabulary inside the action, so
    // this flow wires files and nothing else.
    linkedStage("skin-apply", "coat", "coat", {
      body: fromStage("rig", "body"),
    }),
    linkedStage("fit-seat", "seat", "seat", {
      body: fromStage("coat", "skin"),
      prop: fromStage("garment", "garment"),
      bone: initial("bone"),
    }),
  ],
  initialValidators: {
    starter_image: "photo",
    garment_image_1: "photo",
    // the fit verb's bone, carried as a text initial — this flow
    // composes that verb, so the seat's required initial rides here
    // too.
    bone: "text",
  },
  requiredInitials: ["bone"],
  tool: null,
  skillRefs: [],
};
export const FIT_SEAT: RegistryFlow = {
  id: "fit-seat",
  description:
    "Seat a static prop onto a SOMAX body under the meld fit laws (the " +
    "dress/prop verb engine): the meld row assembles in-pack from the verb's " +
    "own vocabulary, and the request MUST carry `bone` (the bone that " +
    "carries the prop — the door refuses without it), " +
    "FitProp grafts, the turnaround proves.",
  stages: [
    plainStage({
      id: "seat",
      engine: CARD_PLANE_ENGINE,
      description: "FitRow (knobs -> meld row) -> FitProp (graft) -> proof views",
      // THE TWO FILES AND THE BONE (the rest of the fit row is the
      // verb's own vocabulary inside the action — stroke-89's law).
      // The bone is a BARE NAME, so it rides the text initial kind,
      // and it is REQUIRED: the vendor's row gate refuses an empty
      // one, so a request without it must learn that at the door.
      inputs: { body: initial("body"), prop: initial("prop"), bone: initial("bone") },
      expected: { body: "mesh", prop: "mesh", bone: "text" },
      // THE VERB'S BACKEND IS A DECLARED ACTION (the atom
      // vocabulary, stroke 4): the fit-seat verb's nodes compose
      // from the fit family's DECL — every knob rides verbatim, the
      // proof framing is FIXED in the action build. The row routes;
      // the declaration owns the graph (SubActionMod law — the
      // 2026-09-16 retirement killed the fit CARD; the family is
      // the sanctioned seam, not a revival).
      family: "fit",
      action: "seat",
      // THE TWO FILES AND THE BONE ARE THE REQUEST (the door's own
      // type now admits a text initial, so a bone rides like any
      // other value); THE FIT ROW IS THE VERB'S (stroke-89's law —
      // the merged worker refused an unlinkable `$fit_ratio`).
      params: { body: "$body", prop: "$prop", bone: "$bone" },
    }),
  ],
  initialValidators: { body: "glb", prop: "glb", bone: "text" },
  requiredInitials: ["bone"],
  tool: null,
  skillRefs: [],
};
export const IMAGE_UPSCALE: RegistryFlow = {
  id: "image-upscale",
  description:
    "Prompt → image → 1080p SeedVR2 upscale, one card per stroke (the first " +
    "two-card flow: image-gen + upscale-tools card= stages; image_model picks " +
    "the generator). VALIDATE-ONLY on the queue's {flow:} door (2026-09-25 " +
    "multi-stage boundary stamp): card= stages refuse at start — drive the " +
    "cards through the bench (construct chaining) or the {model:} door.",
  stages: [
    plainStage({
      id: "make",
      engine: CARD_PLANE_ENGINE,
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
      engine: CARD_PLANE_ENGINE,
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
    "kimodo package, local SOMA-RP-v1.1 weights + local LLM2Vec encoder). " +
    "VALIDATE-ONLY on the queue's {flow:} door (2026-09-30 multi-stage " +
    "boundary stamp): card= stages refuse at start — drive the motion card " +
    "through the bench or {model:}.",
  stages: [
    plainStage({
      id: "t2m",
      engine: CARD_PLANE_ENGINE,
      card: "motion",
      description: "Kimodo text-to-pose via the motion card (the kimodo family's declared compose action)",
      inputs: { prompt: initial("prompt") },
      // (the derivation law): the motion card's flowKinds.inputs
      // declares prompt: text — the kind derives, no hand mirror
      outputs: { motion_npz: "data" },
      cardIo: { motion_npz: "data" },
      // THE LANE IS THE FAMILY'S (the atom vocabulary, stroke 3):
      // this stage hand-wired the KimodoLoader + KimodoTextToPose
      // nodes — a second copy of the kimodo compose lane. The
      // family's declared action composes the graph; output_nodes
      // died with the literal (the card's flowOutputBindings own the
      // motion_npz channel).
      params: {
        prompt: "$prompt",
        seed: 42,
        duration_sec: 3,
        diffusion_steps: 25,
        num_samples: 1,
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
    "a fossil only the live validate path ever tripped. VALIDATE-ONLY on " +
    "the queue's {flow:} door (2026-09-25 multi-stage boundary stamp): " +
    "card= stages refuse at start — drive the music card through the " +
    "bench or {model:}.",
  stages: [
    plainStage({
      id: "music",
      engine: CARD_PLANE_ENGINE,
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
    "(the apply-skin verb engine): the controller sidecar assembles from the " +
    "verb's own vocabulary (the door admits photo, glb, bake_params and a " +
    "bare-name text initial) " +
    "in-pack, SkinApply grafts, the turnaround proves.",
  stages: [
    plainStage({
      id: "coat",
      engine: CARD_PLANE_ENGINE,
      description:
        "SkinPack (maps) -> SkinSidecar (sidecar) -> SkinApply (graft) -> proof views",
      inputs: { body: initial("body") },
      expected: { body: "mesh" },
      // THE VERB'S BACKEND IS A DECLARED ACTION (the atom
      // vocabulary, stroke 4): the apply-skin verb's nodes compose
      // from the skin family's DECL — every knob rides verbatim, the
      // proof framing is FIXED in the action build. The row routes;
      // the declaration owns the graph (SubActionMod law — the
      // 2026-09-16 retirement killed the skin CARD; the family is
      // the sanctioned seam, not a revival).
      family: "skin",
      action: "coat",
      // THE BODY IS THE ONLY REQUEST KNOB (stroke-89's law, and the
      // door's own type: initialValidators admit photo/glb/bake_params
      // only, so a stage spelling `$map_size` names a key the flow can
      // never declare — the merged worker refused it by name). The
      // detail kind, map size and seed are the verb's fixed vocabulary
      // inside the action, exactly as the anny estimator fixes
      // conf_thresh and dist_thresh_nms.
      params: { body: "$body" },
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
