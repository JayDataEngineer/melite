// flowsRegistryRows.ts — the flow declarations (the SSOT rows).
// Extracted from flowsData.ts (the god-file cut, 2026-09-18): one
// module of declarations, one line per flow; flowsData.ts keeps the
// types, the helpers, and the assembled REGISTRY.
import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage'
import type { RegistryFlow } from "./flowsData.ts";
// linkedStage is NOT imported here: no seed row links another flow
// (the link builder serves drop-in rows and the tests that drive
// them — a seed row carrying one would be dead authoring surface).
import { plainStage, initial, fromStage } from "./flowsData.ts";

export const ANNY_HMR_ESTIMATOR: RegistryFlow = {
  id: "anny-hmr-estimator",
  description:
    "The estimator photo→Anny chain: " +
    "SAM 3D Body → MHR → SOMA → anny — every link license-cleared for sale " +
    "(SAM License operator-accepted; the rest Apache 2.0). Emits a grounded " +
    "bind-pose body GLB + anny phenotype/local-change params.",
  stages: [
    plainStage({
      id: "estimate",
      engine: CARD_PLANE_ENGINE,
      // the estimator engine of the same verb — family DECL owns
      // the nodes (SAM 3D Body → grounded anny), person_index FIXED
      // at the loudest detection (the verb's chip owns the picker)
      family: "anny",
      action: "estimate_photo",
      description: "SAM 3D Body estimator → grounded anny GLB",
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
    "Preset params → grounded " +
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
export const FIT_SEAT: RegistryFlow = {
  id: "fit-seat",
  description:
    "Seat a static prop onto a SOMAX body under the meld fit laws (the " +
    "dress/prop verb engine): the meld row assembles in-pack from the verb's " +
    "own vocabulary, and the request MUST carry `bone` (the bone that " +
    "carries the prop — the door refuses without it), " +
    "FitProp grafts — the seated GLB is the verb's output.",
  stages: [
    plainStage({
      id: "seat",
      engine: CARD_PLANE_ENGINE,
      description: "FitRow (knobs -> meld row) -> FitProp (graft) — the seated GLB out",
      // THE TWO FILES AND THE BONE (the rest of the fit row is the
      // verb's own vocabulary inside the action — stroke-89's law).
      // The bone is a BARE NAME, so it rides the text initial kind,
      // and it is REQUIRED: the vendor's row gate refuses an empty
      // one, so a request without it must learn that at the door.
      inputs: { body: initial("body"), prop: initial("prop"), bone: initial("bone") },
      expected: { body: "mesh", prop: "mesh", bone: "text" },
      // THE VERB'S BACKEND IS A DECLARED ACTION (the atom
      // vocabulary, stroke 4): the fit-seat verb's nodes compose
      // from the fit family's DECL — every knob rides verbatim. The
      // row routes;
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
    "the generator). RUNS on the {flow:} door (2026-10-04: the VALIDATE-ONLY " +
    "stamp is GONE — both card stages compose through the card plane and " +
    "submit as one merged run); the {model:} door drives a single card.",
  stages: [
    plainStage({
      id: "make",
      engine: CARD_PLANE_ENGINE,
      card: "image-gen",
      description: "T2I via the image-gen card (the named model's own generate_t2i.json)",
      inputs: { prompt: initial("prompt") },
      // the wiring wall's law (2026-09-20): every wired input typed
      expected: { prompt: "text" },
      // THE ROW RENAMES THE CARD'S CHANNEL (the object-forge concept
      // precedent): the image-gen card binds `default` on its
      // flowOutputBindings row; this row renames it to the flow-plane
      // `image` the polish stage wires — kind-matched, one-to-one.
      outputs: { image: "image" },
      cardIo: { image: "image" },
      // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): no seed stamp on
      // either stage — the image-gen and upscale-tools cards both
      // default seed -1 (fresh mint per stage), so a stamp here (42)
      // was a second default-write that made every flow-driven gen
      // seed-identical unless the caller stated a seed.
      params: { model: "krea-2", prompt: "$prompt" },
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
        model: "seedvr2-ema",
        input_image: "$image",
        // filename_prefix was RETIRED here (SD-4b, 2026-11-12): the
        // upscale-tools card composes its own SaveImage prefix from
        // the run id (seedvr2-ema's action), so the stated key
        // reached NO consumer — dead stage surface the carry wall
        // now refuses. seed left with it (audit 015 C2, the derived
        // sweep's fourth seat): the card's own -1 default mints.
      },
    }),
  ],
  initialValidators: { prompt: "text" },
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
      // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): the tool publishes
      // no seed default — the make and polish cards both default -1
      // (fresh mint per stage); a published 42 advertised a take-lock
      // the compose never carried. The overlay stays: a stated seed
      // pins both stages.
      seed: {
        ptype: "integer",
        description:
          "sampler seed (omit for fresh takes — each stage's card mints one)",
        default: null,
        hasDefault: false,
        minimum: 0,
        maximum: 2147483647,
        enum: null,
      },
      // THE SIZE CHANNELS (the hop-doubling cure, 2026-11-01): the
      // row published no make-size or polish-resolution face, so
      // every press rode the cards' defaults — the make at
      // krea-2's 1024×1024, the polish at the FHD rail (1080 short
      // side) — the burn's "never doubles": a 2x press needs the
      // make at the operator's class (e.g. 1344×768) and the polish
      // resolution at twice that short side (1536). Declared the
      // seed-overlay way (the twin-stage pattern), bounds the cards'
      // own schemas already enforce.
      width: {
        ptype: "integer",
        description:
          "make canvas width (16-step, 256–2048; state the operator's class, e.g. 1344)",
        default: null,
        hasDefault: false,
        minimum: 256,
        maximum: 2048,
        enum: null,
      },
      height: {
        ptype: "integer",
        description:
          "make canvas height (16-step, 256–2048; e.g. 768)",
        default: null,
        hasDefault: false,
        minimum: 256,
        maximum: 2048,
        enum: null,
      },
      resolution: {
        ptype: "integer",
        description:
          "SeedVR2 target short side (256–2160; 1080 = the FHD rail, state twice the make short side to double, e.g. 1536)",
        default: null,
        hasDefault: false,
        minimum: 256,
        maximum: 2160,
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
      { param: "width", stage: "make", path: ["width"], choices: null },
      { param: "height", stage: "make", path: ["height"], choices: null },
      { param: "resolution", stage: "polish", path: ["resolution"], choices: null },
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
export const CRAFT_LOOP: RegistryFlow = {
  id: "craft-loop",
  description:
    "The agentic craft loop: a named image-capable model route critiques " +
    "each capture and decides the next act command until done (or the " +
    "iteration cap). The act leg rides ANY registered engine (comfyui " +
    "graphs, MCP tool calls on the DSH-profile seats); captures land " +
    "in the run dir and " +
    "attach to the critique. Driven by the runs door with engine " +
    "'craft' stages — see flows/craft-loop/agents/AGENT.md.",
  stages: [
    plainStage({
      id: "loop",
      engine: "craft",
      description: "act → capture → critique → decide (the loop engine)",
      // THE CHANNEL LAW (the merge-hole cure, born on the retired
      // audio-native-tts wrapper): a $spell in params must name a channel the stage
      // WIRES — the compose judge's pool is inputNames ∪ initial
      // edges, so the three dials ride as initial("…") edges of the
      // same name (agent_prompt/agent_prompt/$agent_prompt, the
      // anny-hmr naming law). The craft executor consumes them
      // through its own $spell fold against the run's request
      // initials (the executor contract's fifth argument) — the
      // edges are the channel truth, the fold the value truth.
      inputs: {
        agent_prompt: initial("agent_prompt"),
        command: initial("command"),
        max_iterations: initial("max_iterations"),
      },
      // hand-written (the derivation law is for card= stages; this
      // is an engine-verb row): brief prose is TEXT, the command
      // object is DATA, the bound is NUM — the closed Kind
      // vocabulary's own words.
      expected: { agent_prompt: "text", command: "data", max_iterations: "num" },
      outputs: { default: "image" },
      // THE F58 BINDING (2026-11-02): the three loop dials ride as
      // $spells against the run's request initials — the brief as
      // PROSE (the door's `brief` kind: no path law, the critic
      // reads it as data), the command as a JSON OBJECT (the `json`
      // kind: the {engine, params} row the craft gate owns — NOT
      // the {engine, comfyui, workflow} shape FAILURES pressed),
      // and max_iterations as a NUMBER (digit-strings refuse at the
      // door; the typed value rides the merge unchanged). An
      // omitted max_iterations omits the key — the engine's own
      // default law. `model` stays a LANE DEFAULT this wave (the
      // loop's route id, not a flow initial — documented in
      // flows/craft-loop/agents/AGENT.md).
      params: {
        agent_prompt: "$agent_prompt",
        command: "$command",
        max_iterations: "$max_iterations",
      },
    }),
  ],
  // requiredInitials (fit-seat's GOOD shape): the door refuses an
  // absent brief or command BEFORE the run registers — not sixty
  // seconds in at the engine gate. max_iterations is optional (the
  // engine defaults it).
  initialValidators: {
    agent_prompt: "brief",
    command: "json",
    max_iterations: "number",
  },
  requiredInitials: ["agent_prompt", "command"],
  tool: null,
  skillRefs: [],
};
export const CHARACTER_FACTORY: RegistryFlow = {
  id: "character-factory",
  description:
    "Supplied body → rigged → animated, one merged run (the character " +
    "factory's rig→motion leg): the body GLB path rides the `mesh` " +
    "initial — the rig lane's own feed, any bare human mesh " +
    "(an anny bake, a TRELLIS lift, an estimator body) — the rig stage " +
    "composes SOMA-77 auto (KimodoExportFBX), and the motion stage " +
    "skins kimodo text→motion onto the rigged mesh in-graph " +
    "(RaySomaxBake; the rigged-path link is STRING→STRING, the one " +
    "hop the served engine carries). THE LIFT HOP IS NOT A STAGE " +
    "(2026-11-01, the rig-hop dead ref, GPU live-receipt C9): the " +
    "photo→mesh lift's served producer (img-to-mesh's Save3DAdvanced) " +
    "is a terminal FILE_3D save — no served node consumes FILE_3D and " +
    "the merge's slot-0 link is the only in-graph transport — so the " +
    "lift rides the img-to-mesh card door or the object-forge row, and " +
    "its artifact path feeds THIS row's `mesh` initial (the run-chain; " +
    "the C6→D8 receipt shape). Multi-stage: named registry flows " +
    "DRIVE at start (the curated-lane lift, runsRegistry's own law — " +
    "the refusal is hand-authored inline only); stages also drive one " +
    "card at a time — see flows/character-factory/agents/AGENT.md. " +
    "Creature motion rides the MOTION phase instead (unimate dataset " +
    "clip → rig copy bridge, game-profile MCPs) — documented in the " +
    "leaf, never a registry stage (unimate is an MCP, not melite).",
  stages: [
    plainStage({
      id: "rig",
      engine: CARD_PLANE_ENGINE,
      card: "rig",
      // THE SEAT IS THE INITIAL (the re-aim): the rig hop's mesh
      // rides a GLB path initial, exactly the lane the retired
      // body-to-somax wrapper served live — an initial substitutes as a STRING value at
      // the merge, so the carrier (PrimitiveString) is type-clean.
      // The old in-graph `mesh: fromStage("lift", "mesh")` wire is
      // the dead ref: the lift's bound producer slot is FILE_3D,
      // and the engine refuses the STRING carrier input loud
      // (silently dropping the downstream KimodoExportFBX +
      // RaySomaxBake outputs — the C9 class).
      description:
        "SOMA-77 auto-rig via the rig card (BODY_TO_SOMAX's lane, on the supplied body)",
      inputs: { mesh: initial("mesh") },
      expected: { mesh: "mesh" },
      outputs: { body: "mesh" },
      cardIo: { body: "mesh" },
      // no model pin (BODY_TO_SOMAX's law): mode auto selects the
      // gem-soma family; the card's own contract owns the default
      params: { mesh_glb: "$mesh", mode: "auto", preserve_texture: true },
    }),
    plainStage({
      id: "motion",
      engine: CARD_PLANE_ENGINE,
      card: "motion",
      description: "Kimodo text→motion skinned onto the rigged mesh (somax bake in-graph)",
      inputs: { prompt: initial("prompt"), preview: fromStage("rig", "body") },
      expected: { prompt: "text", preview: "mesh" },
      // the card's two native channels ride verbatim (no rename: the
      // flowOutputBindings bind motion_npz + animated_glb by name)
      outputs: { motion_npz: "data", animated_glb: "mesh" },
      cardIo: { motion_npz: "data", animated_glb: "mesh" },
      params: { model: "kimodo", prompt: "$prompt", preview_glb: "$preview" },
    }),
  ],
  initialValidators: { mesh: "glb", prompt: "text" },
  requiredInitials: ["mesh", "prompt"],
  tool: null,
  skillRefs: [],
};

// THE REMESH STAGE DIED (2026-10-13, the autoremesher excision):
// the quad-remesh card and its vendored pack left with the pack the
// owner removed from the system — object-forge is the lift's tri
// mesh today.
export const OBJECT_FORGE: RegistryFlow = {
  id: "object-forge",
  description:
    "Prompt → concept render → textured mesh, one card per stage " +
    "(image-gen + img-to-mesh; both card=, so the {flow:} door submits " +
    "one merged run — image-upscale's 2026-10-04 shape). Emits the " +
    "lift's textured tri mesh.",
  stages: [
    plainStage({
      id: "concept",
      engine: CARD_PLANE_ENGINE,
      card: "image-gen",
      description: "Concept render via the image-gen card (z-image default)",
      inputs: { prompt: initial("prompt") },
      // the wiring wall's law (2026-09-20): every wired input typed
      expected: { prompt: "text" },
      // THE ROW RENAMES THE CARD'S CHANNEL (the character-factory
      // lift/rig precedent): the image-gen card binds `default` on its
      // flowOutputBindings row (the producer-law declaration door);
      // this row renames it to the flow-plane `image` the lift wires —
      // kind-matched, one-to-one, so output_nodes follow the rename
      // and `concept.image` resolves in the producer table.
      outputs: { image: "image" },
      cardIo: { image: "image" },
      params: { model: "z-image", prompt: "$prompt" },
    }),
    plainStage({
      id: "lift",
      engine: CARD_PLANE_ENGINE,
      card: "img-to-mesh",
      description:
        "Image → textured mesh via the img-to-mesh card (trellis2-native, " +
        "no pack; the lift stamps the high recipe's own knobs — the " +
        "same stamps every UI birth carries, Recipe default high)",
      inputs: { concept: fromStage("concept", "image") },
      expected: { concept: "image" },
      cardIo: { mesh: "mesh" },
      // THE DOOR-PARITY STAMPS (the 2026-11-17 flows audit): a UI
      // birth lands stamped with the declared default Recipe "high"
      // (resolution 1536, remesh 1024, 1M faces — wire_defaults,
      // applied client-side at birth only), while a bare {flow:}
      // press composed at the family floor (1024) — the same lift
      // produced different meshes by door. The stamps below are the
      // high row's wire_defaults verbatim, and 1536 is the official
      // template's own upsample default
      // (3d_pixal3d_trellis2_image_to_model.json [94]). Compose
      // never applies recipe wire_defaults server-side; the stage's
      // own params are the flow plane's one seat.
      params: {
        model: "trellis2-native", input_image: "$concept",
        resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000,
      },
    }),
  ],
  initialValidators: { prompt: "text" },
  tool: {
    name: "object_forge",
    version: 1,
    description:
      "Generate a 3D object from one prompt line: concept render " +
      "(z-image), image-to-mesh lift (trellis2-native). One POST runs " +
      "the whole flow and returns the textured mesh. (The remesh stage " +
      "left 2026-10-13; quad topology is downstream work.)",
    properties: {
      prompt: {
        ptype: "string",
        description:
          "the object — one clear subject; a plain background reads best",
        default: null,
        hasDefault: false,
        minimum: null,
        maximum: null,
        enum: null,
      },
      image_model: {
        ptype: "string",
        description: "the concept generator family",
        default: "z-image",
        hasDefault: true,
        minimum: null,
        maximum: null,
        enum: ["z-image", "krea-2"],
      },
    },
    required: ["prompt"],
    overlays: [
      {
        param: "image_model",
        stage: "concept",
        path: ["model"],
        choices: { "z-image": "z-image", "krea-2": "krea-2" },
      },
    ],
  },
  // ref would resolve null (the loadPlane null arm, never fired
  // before this row); its craft lives in the leaf skill instead.
  skillRefs: ["card:image-gen", "card:img-to-mesh", "model:z-image:prompt-enhance"],
};
