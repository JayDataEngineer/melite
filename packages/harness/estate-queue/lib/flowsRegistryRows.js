// flowsRegistryRows.ts — the flow declarations (the SSOT rows).
// Extracted from flowsData.ts (the god-file cut, 2026-09-18): one
// module of declarations, one line per flow; flowsData.ts keeps the
// types, the helpers, and the assembled REGISTRY.
import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage';
import { plainStage, initial, fromStage } from "./flowsData.js";
export const ANNY_HMR_COMMERCIAL = {
    id: "anny-hmr-commercial",
    description: "The commercial photo→Anny chain: " +
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
export const ANNY_PARAMS = {
    id: "anny-params",
    description: "Preset params → grounded " +
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
export const AUDIO_NATIVE_TTS = {
    id: "audio-native-tts",
    description: "Phase 1b gate: Qwen3-TTS 12Hz CustomVoice via the live melite-audio-nodes " +
        "island pack in the serving ComfyUI container (pure-ComfyUI audio lane; " +
        "retires the C audio engine for TTS). RUNS on the {flow:} door " +
        "(2026-10-04: the VALIDATE-ONLY stamp is GONE — the start door " +
        "composes the row's card stages through the card plane); the {model:} " +
        "door drives the same card directly.",
    stages: [
        plainStage({
            id: "tts",
            engine: CARD_PLANE_ENGINE,
            card: "tts",
            description: "Qwen3-TTS text to speech via the tts card",
            // THE INITIAL IS NAMED FOR THE CHANNEL IT FEEDS (2026-10-04, the
            // merge-hole cure): the wiring law spells every wired channel
            // `$<channel>`, and the merge resolves a $spell against links ∪
            // request INITIALS — so a channel `text` fed by initial("prompt")
            // spelled `$text` resolved against neither and the run died at
            // the merge. anny-hmr names all three the same (photo/photo/
            // $photo); so does this row now.
            inputs: { text: initial("text") },
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
    initialValidators: { text: "text" },
    tool: {
        name: "speak",
        version: 1,
        description: "Qwen3-TTS 12Hz CustomVoice speech in one call — text in, wav out " +
            "(pure-ComfyUI audio lane).",
        properties: {
            // the caller key IS the initial name (2026-10-04): the extractor
            // lifts declared validators only, so a `prompt` property over a
            // `text` initial would advertise a key the door never reads.
            text: {
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
        required: ["text"],
        overlays: [{ param: "seed", stage: "tts", path: ["seed"], choices: null }],
    },
    skillRefs: [],
};
export const BODY_TO_SOMAX = {
    id: "body-to-somax",
    description: "Bare body GLB → SOMAX-rigged GLB: the anny→kimodo bridge (the baked " +
        "SOMA-77 template weight transfer, standalone-rig mode — no Blender). The " +
        "motion studio posts this behind the scenes when a wired body isn't SOMAX; " +
        "any bare human mesh (anny bake, TRELLIS, upload) rides the same door. " +
        "RUNS on the {flow:} door (2026-10-04: the VALIDATE-ONLY stamp is " +
        "GONE — the start door composes the row's card stages through the " +
        "card plane); drive the rig card " +
        "through the bench or {model:}.",
    stages: [
        plainStage({
            id: "rig",
            engine: CARD_PLANE_ENGINE,
            card: "rig",
            description: "SOMA-77 template weight transfer (barycentric, the autorig pack's " +
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
    initialValidators: { glb: "glb" },
    tool: null,
    skillRefs: [],
};
export const FIT_SEAT = {
    id: "fit-seat",
    description: "Seat a static prop onto a SOMAX body under the meld fit laws (the " +
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
export const IMAGE_UPSCALE = {
    id: "image-upscale",
    description: "Prompt → image → 1080p SeedVR2 upscale, one card per stroke (the first " +
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
    initialValidators: { prompt: "text" },
    tool: {
        name: "image_upscale",
        version: 1,
        description: "Generate an image from a prompt and upscale it to 1080p in one call " +
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
export const MUSIC_NATIVE = {
    id: "music-native",
    description: "Music generation as a CARD stage — prompt in, audio out via the music " +
        "card (MiniMax Music 3, the boarded row; see GET /v1/models). Repointed " +
        "at the mono-engine law by the wiring wall 2026-09-20: the row still " +
        "named the retired audio_cpp tier and a card id that no longer exists — " +
        "a fossil only the live validate path ever tripped. RUNS on the " +
        "{flow:} door (2026-10-04: the VALIDATE-ONLY stamp is GONE — the " +
        "start door composes the row's card stages through the card plane); " +
        "the {model:} door drives the same card directly.",
    stages: [
        plainStage({
            id: "music",
            engine: CARD_PLANE_ENGINE,
            card: "music",
            description: "MiniMax Music 3 via the music card — the lane composes the doc " +
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
    initialValidators: { prompt: "text" },
    tool: {
        name: "compose_music",
        version: 1,
        description: "Music generation in one call (MiniMax Music 3 via the music card) — " +
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
export const CRAFT_LOOP = {
    id: "craft-loop",
    description: "The agentic craft loop: a named image-capable model route critiques " +
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
export const CHARACTER_FACTORY = {
    id: "character-factory",
    description: "Photo → clothed character → rigged → animated (the AssetFurnace-shape " +
        "chain, estate-native): img-to-mesh lift with the repair knobs ON, rig " +
        "auto (SOMA-77, BODY_TO_SOMAX's lane chained), kimodo text→motion " +
        "skinned onto the rigged mesh (somax bake in-graph). Multi-stage: " +
        "serves at validate (start refuses multi-stage); agents drive the " +
        "stages through the queue door, one card at a time — see " +
        "flows/character-factory/agents/AGENT.md. Creature motion rides the " +
        "MOTION phase instead (unimate dataset clip → rig copy bridge, " +
        "game-profile MCPs) — documented in the leaf, never a registry " +
        "stage (unimate is an MCP, not melite).",
    stages: [
        plainStage({
            id: "lift",
            engine: CARD_PLANE_ENGINE,
            card: "img-to-mesh",
            description: "Photo → textured mesh via the img-to-mesh card (repair knobs ON)",
            inputs: { photo: initial("photo") },
            // the wiring wall's law (2026-09-20): every wired input typed
            expected: { photo: "image" },
            outputs: { mesh: "mesh" },
            cardIo: { mesh: "mesh" },
            params: { model: "pixal3d", input_image: "$photo" },
        }),
        plainStage({
            id: "rig",
            engine: CARD_PLANE_ENGINE,
            card: "rig",
            description: "SOMA-77 auto-rig via the rig card (BODY_TO_SOMAX's lane, chained)",
            inputs: { mesh: fromStage("lift", "mesh") },
            expected: { mesh: "mesh" },
            outputs: { body: "mesh" },
            cardIo: { body: "mesh" },
            // no model pin (BODY_TO_SOMAX's law): mode auto selects the
            // gem_soma family; the card's own contract owns the default
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
    initialValidators: { photo: "photo", prompt: "text" },
    requiredInitials: ["photo", "prompt"],
    tool: null,
    skillRefs: [],
};
export const OBJECT_FORGE = {
    id: "object-forge",
    description: "Prompt → concept render → textured mesh → game quad mesh, one card per " +
        "stage (image-gen + img-to-mesh + quad-remesh; all three card=, so the " +
        "{flow:} door submits one merged run — image-upscale's 2026-10-04 " +
        "shape). Emits BOTH meshes: the lift's textured tri mesh and the " +
        "remesher's quad mesh — the quad stage trades textures for topology " +
        "(the remesher keeps textures out; re-bake is downstream work, " +
        "quad-remesh README's known limitation).",
    stages: [
        plainStage({
            id: "concept",
            engine: CARD_PLANE_ENGINE,
            card: "image-gen",
            description: "Concept render via the image-gen card (z-image default)",
            inputs: { prompt: initial("prompt") },
            // the wiring wall's law (2026-09-20): every wired input typed
            expected: { prompt: "text" },
            cardIo: { image: "image" },
            params: { model: "z-image", prompt: "$prompt" },
        }),
        plainStage({
            id: "lift",
            engine: CARD_PLANE_ENGINE,
            card: "img-to-mesh",
            description: "Image → textured mesh via the img-to-mesh card (trellis2-native, " +
                "no pack; repair knobs ride the card's own defaults)",
            inputs: { concept: fromStage("concept", "image") },
            expected: { concept: "image" },
            cardIo: { mesh: "mesh" },
            params: { model: "trellis2-native", input_image: "$concept" },
        }),
        plainStage({
            id: "remesh",
            engine: CARD_PLANE_ENGINE,
            card: "quad-remesh",
            description: "Quad remesh via the quad-remesh card (game topology)",
            inputs: { mesh: fromStage("lift", "mesh") },
            expected: { mesh: "mesh" },
            cardIo: { quad_mesh: "mesh" },
            params: { input: "$mesh", target_quads: 50000, sharp_edge: 90 },
        }),
    ],
    initialValidators: { prompt: "text" },
    tool: {
        name: "object_forge",
        version: 1,
        description: "Generate a game-ready 3D object from one prompt line: concept render " +
            "(z-image), image-to-mesh lift (trellis2-native), quad remesh to game " +
            "topology. One POST runs the whole flow and returns both meshes.",
        properties: {
            prompt: {
                ptype: "string",
                description: "the object — one clear subject; a plain background reads best",
                default: null,
                hasDefault: false,
                minimum: null,
                maximum: null,
                enum: null,
            },
            target_quads: {
                ptype: "integer",
                description: "quad budget for the remesh stage",
                default: 50000,
                hasDefault: true,
                minimum: 0,
                maximum: 200000,
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
            { param: "target_quads", stage: "remesh", path: ["target_quads"], choices: null },
        ],
    },
    // the quad-remesh card ships no agent doc yet — a card:quad-remesh
    // ref would resolve null (the loadPlane null arm, never fired
    // before this row); its craft lives in the leaf skill instead.
    skillRefs: ["card:image-gen", "card:img-to-mesh", "model:z-image:prompt-enhance"],
};
//# sourceMappingURL=flowsRegistryRows.js.map