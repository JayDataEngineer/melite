// flowsRegistryRows.ts — the flow declarations (the SSOT rows).
// Extracted from flowsData.ts (the god-file cut, 2026-09-18): one
// module of declarations, one line per flow; flowsData.ts keeps the
// types, the helpers, and the assembled REGISTRY.
import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage';
// linkedStage is NOT imported here: no seed row links another flow
// (the link builder serves drop-in rows and the tests that drive
// them — a seed row carrying one would be dead authoring surface).
import { plainStage, initial, fromStage } from "./flowsData.js";
export const ANNY_HMR_ESTIMATOR = {
    id: "anny-hmr-estimator",
    description: "The estimator photo→Anny chain: " +
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
            // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): no seed stamp —
            // the tts card's own default (-1, random) rules at compose and
            // the seed-sentinel gate mints a fresh take per run, the same
            // take-freshness a GUI card stage gets. A stated seed rides the
            // declared overlay; the stamp that stood here (seed 42) was a
            // second default-write that locked every flow take to 42.
            params: { model: "qwen3-tts", text: "$text" },
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
            // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): the tool publishes
            // no seed default — the tts card's own default (-1, fresh mint)
            // rules when the caller omits the seed, so a published number
            // here would advertise a take-lock the run never composes. The
            // overlay stays: a stated seed pins the take.
            seed: {
                ptype: "integer",
                description: "voice sampler seed (omit for a fresh take — the card mints one)",
                default: null,
                hasDefault: false,
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
                "baked function) via the rig card's auto mode — the gem-soma " +
                "family's declared rig action composes the KimodoExportFBX segment",
            inputs: { glb: initial("glb") },
            expected: { glb: "mesh" },
            outputs: { body: "mesh" },
            cardIo: { body: "mesh" },
            // THE LANE IS THE FAMILY'S (the atom vocabulary, stroke 3): this
            // stage hand-wired the KimodoExportFBX node in the flow plane —
            // a second copy of the gem-soma rig lane. It names the card +
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
            // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): the tool publishes
            // no seed default — the make and polish cards both default -1
            // (fresh mint per stage); a published 42 advertised a take-lock
            // the compose never carried. The overlay stays: a stated seed
            // pins both stages.
            seed: {
                ptype: "integer",
                description: "sampler seed (omit for fresh takes — each stage's card mints one)",
                default: null,
                hasDefault: false,
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
export const VIDEO_EXTEND = {
    id: "extend-video",
    description: "More seconds of coherent motion appended to a prior clip — the " +
        "extend-video flow (report dev_docs/audits/features/" +
        "extend-video-flow-2026-11-12.md): ONE card= stage on h3-timeline " +
        "whose extend arm renders a fresh continuation anchored on the prior " +
        "clip's LAST FRAME (negative batch index, in-graph), at full denoise " +
        "under an all-white mask, then joins prior + new through the film " +
        "tail's own file law (both parts save at SaveVideo prefixes; " +
        "MeliteConcatVideos decodes them back strictly after every save). " +
        "RUNS on the {flow:} door (the 2026-10-04 card-stage cure — the row " +
        "composes through the card plane as one merged run); the {model:} " +
        "door drives the same card with the extend mod armed on the bench.",
    stages: [
        plainStage({
            id: "extend",
            engine: CARD_PLANE_ENGINE,
            card: "h3-timeline",
            description: "The continuation window via the h3-timeline card's extend arm — " +
                "prior clip in (VHS force_rate 24), last-frame anchor, fresh " +
                "denoise-1 window, joined film out",
            inputs: {
                source_clip: initial("source_clip"),
                extend_prompt: initial("extend_prompt"),
            },
            // hand-written ONLY because the card's flowKinds declares
            // none of these slots (the derivation law's exception clause:
            // the row names what the card cannot know about its own
            // initials). The numeric seats (extend_seconds, seed) ride NO
            // initial — the initial kinds are the closed five
            // (photo/video/glb/bake_params/text, flowsData.ts:74) and a
            // number refuses every one; worse, a $spell ALWAYS resolves
            // to its normalized STRING at the merge, so a numeric spell
            // would land "2.33" in the bag and the renderer's typed read
            // would silently snap to the default — the exact silent snap
            // the grid door exists to kill. Numbers state through the
            // WHOLE-BAG params override (applyFlowParamsOverlay: the
            // array value replaces the bag raw, JSON numbers intact).
            expected: { source_clip: "video", extend_prompt: "text" },
            cardIo: { default: "video" },
            params: {
                model: "h3-timeline",
                // THE MOD BAG (params-emit's law: entries ride as an array
                // under params.<param_key>, never flattened): the two string
                // seats are $spells resolved at the merge against this
                // stage's wired initials — both REQUIRED, so every spell
                // always resolves (an optional spell would refuse mid-run;
                // the requiredInitials door guarantees the body carries
                // both). The numeric seats (extend_seconds, seed) ride the
                // renderer's own defaults (2.33s / seed 0); a caller pinning
                // one passes params: {extend: [{…full bag…}]} and the
                // override replaces this stamp wholesale with raw values.
                extend: [
                    {
                        source_clip: "$source_clip",
                        extend_prompt: "$extend_prompt",
                    },
                ],
            },
        }),
    ],
    initialValidators: { source_clip: "video", extend_prompt: "text" },
    requiredInitials: ["source_clip", "extend_prompt"],
    tool: {
        name: "extend_video",
        version: 1,
        description: "Append fresh seconds to a prior clip (one call: the prior clip + " +
            "a continuation prompt in, the joined extended film out — the prior " +
            "plays first, new motion and sound follow). The prior clip is a " +
            "stageable video (mp4/webm/mkv/mov/m4v/avi — a /melite-media/runs/ " +
            "artifact URL from an earlier run lands) and rides the flow body's " +
            "source_clip key. The prompt states MOTION and SOUND picking up " +
            "where the clip ends. extend_seconds (default 2.33) must land on " +
            "the engine grid (frames become seconds at the schema fps " +
            "default: 2.33s = 56f, 3.75s = 90f, 5.17s = 124f, 15.08s = 362f " +
            "the largest single window — beyond it the door composes N " +
            "uniform windows under the 39f overlap, exact delivery or a " +
            "loud refusal; off-grid values refuse at the compose door) and " +
            "states " +
            "through params: {extend: [{extend_seconds: …, seed: …}]} — " +
            "numbers ride the bag, never the flow body.",
        properties: {
            source_clip: {
                ptype: "string",
                description: "the prior clip — a stageable video path (a /melite-media/" +
                    "runs/<run_id>/<file>.mp4 artifact URL from an earlier run " +
                    "lands; a browser-local blob/data URL refuses — upload first)",
                default: null,
                hasDefault: false,
                minimum: null,
                maximum: null,
                enum: null,
            },
            extend_prompt: {
                ptype: "string",
                description: "the continuation text — MOTION and SOUND for the appended " +
                    "seconds, picking up exactly where the clip ends",
                default: null,
                hasDefault: false,
                minimum: null,
                maximum: null,
                enum: null,
            },
        },
        required: ["source_clip", "extend_prompt"],
        overlays: [],
    },
    skillRefs: ["card:h3-timeline"],
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
                // THE LYRICS SEAT (value-arm cure, 2026-11-08): "" is the
                // instrumental default — the card bakes an absent/empty lyric
                // as "" (MiniMax's instrumental convention), never an absent
                // ref, so the seat stays a plain literal (a "$lyrics" spell
                // would refuse unresolved on instrumental calls) and the
                // stated lyric rides the declared overlay.
                lyrics: "",
                model: "music3",
                // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): no duration
                // stamp — the music card's own default (30) rules, the same
                // length a GUI card stage gets; the stamp that stood here
                // (120) was a second default-write that made agent music
                // 120 s while human card music stayed 30 s. A stated duration
                // rides the declared overlay.
                seed: -1,
            },
        }),
    ],
    initialValidators: { prompt: "text" },
    tool: {
        name: "compose_music",
        version: 1,
        description: "Music generation in one call (MiniMax Music 3 via the music card) — " +
            "prompt in, audio out; state lyrics for sung verses (omit for instrumental).",
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
            // ONE HOME FOR FLOW DEFAULTS (audit 015 C2): the tool publishes
            // no duration default — the music card's own default (30)
            // rules when the caller omits it, so a published 120 advertised
            // a length the run never composes. The bounds stay (the card's
            // own declared cap, pointed at, not restated as a default).
            duration: {
                ptype: "integer",
                description: "seconds of music (the card caps 5..360; omit for the card's own default)",
                default: null,
                hasDefault: false,
                minimum: 5,
                maximum: 360,
                enum: null,
            },
            lyrics: {
                ptype: "string",
                description: "song lyrics (verse-form text sung by the music); omit for instrumental",
                default: null,
                hasDefault: false,
                minimum: null,
                maximum: null,
                enum: null,
            },
        },
        required: ["prompt"],
        overlays: [
            { param: "duration", stage: "music", path: ["duration"], choices: null },
            { param: "lyrics", stage: "music", path: ["lyrics"], choices: null },
        ],
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
        "named registry flows DRIVE at start (the curated-lane lift, " +
        "runsRegistry's own law — the refusal is hand-authored inline " +
        "only); stages also drive one card at a time — see " +
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
    initialValidators: { photo: "photo", prompt: "text" },
    requiredInitials: ["photo", "prompt"],
    tool: null,
    skillRefs: [],
};
// THE REMESH STAGE DIED (2026-10-13, the autoremesher excision):
// the quad-remesh card and its vendored pack left with the pack the
// owner removed from the system — object-forge is the lift's tri
// mesh today.
export const OBJECT_FORGE = {
    id: "object-forge",
    description: "Prompt → concept render → textured mesh, one card per stage " +
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
    ],
    initialValidators: { prompt: "text" },
    tool: {
        name: "object_forge",
        version: 1,
        description: "Generate a 3D object from one prompt line: concept render " +
            "(z-image), image-to-mesh lift (trellis2-native). One POST runs " +
            "the whole flow and returns the textured mesh. (The remesh stage " +
            "left 2026-10-13; quad topology is downstream work.)",
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
//# sourceMappingURL=flowsRegistryRows.js.map