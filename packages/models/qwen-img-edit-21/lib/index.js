import { edit } from "./actions.js";
export const DECL = {
    "id": "qwen-img-edit-21",
    "form": "form_edit",
    "label": "Qwen Image Edit 2.1",
    "description": "Instruction-driven image editing on the Qwen-Image-2.1 base — the reference-cached lane: the SAME 2.1 checkpoint as text-to-image (no separate edit weights), wrapped in QwenImage21Cache with the anchor images spliced through TextEncodeQwenImage21's own vision path, sampled on the encoder's own anchor-sized latent (any other size shifts the edit — the node's own law). The sibling family qwen-img-21 serves the t2i lane on the image-gen card.",
    "engine": "comfyui",
    // THE VARIANT-CLASS DEFAULTS LEAVE THE FAMILY BLOCK (audit
    // 013-edit-image-steps-envelope cure 3, the 25-on-Turbo banner):
    // steps/cfg are declared variant-class below (required_defaults),
    // and a variant-class key in the family block stamps ONE lane's
    // recipe over EVERY lane — the base 25 rode unstated turbo
    // composes and the form prefilled it over the variant's own face.
    // The stamp is variant-aware through the declared tier: each
    // Variant row's own resolver_defaults owns steps+cfg (the
    // variant-sampler-defaults law; the plane canon keeps Recipe rows
    // wire-params-only — a recipe PICK stamps wire_defaults, the
    // variant seat always resolves a Variant row); the family block
    // keeps only the solver pair, which is lane-independent.
    "defaults": {
        "sampler": "euler",
        "scheduler": "simple"
        // THE GEOMETRY IS THE ANCHOR'S OWN (the latent law, 2026-11-08):
        // this lane samples the encoder's own anchor-sized latent, so a
        // stated target size has no seat — width/height LEFT the surface
        // (the 2026-10-09 empty-form cure declared them here; the cure's
        // premise — the EmptyLatentImage target — is retired with the
        // node that needed it).
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face
    // (the base 25/1 is the family's DEFAULT, never a recipe row's
    // silent ride). input_images + prompt are the user-provided
    // seats (the edit lane edits what the caller brings).
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "input_images", "class": "user" },
        { "name": "prompt", "class": "user" }
    ],
    // THE LANE SURFACE (fix shapes 1+2 — the model is the author of
    // what it accepts; the card's visible_when guard list dies). The
    // base params EVERY lane of this family accepts: the visible
    // surface (input_images, prompt, negative_prompt, the sampling
    // block) plus the card's VALIDATION-ONLY aliases (image1/2/3,
    // reference_images, input_mask — hidden carriers, but a wire key
    // the lane admits, so the surface owns them). width/height are
    // NOT here (2026-11-08): the lane samples the encoder's own
    // anchor-sized latent — the output IS the anchor's frame, a
    // stated size has no seat, and a draft that states one refuses
    // field-named at the write door. match_input_resolution stays
    // admitted as the declared no-op it now is on BOTH edit lanes
    // (the 2511 precedent): the toggle is retained for draft
    // compatibility and switches nothing.
    // use_stock_nodes/double_reference are 2511's edit-tuning pair
    // and are NOT here: with a declared surface the bench-write door
    // refuses them on this family in the field's voice.
    "params": [
        "input_images",
        "image1",
        "image2",
        "image3",
        "reference_images",
        "input_mask",
        "prompt",
        "negative_prompt",
        "match_input_resolution",
        "seed",
        "steps",
        "cfg",
        "sampler",
        "scheduler",
    ],
    "relations": {
        // THE COMPOSE LAW, STATED (2026-10-10, the DECL audit's row 2 —
        // the GAP-7 shape one card over): compose has refused a
        // prompt-less edit since the merge, imperatively, while the
        // bench admitted the same draft — a state the form could build
        // and the run refused. Stated as the required word (the tts
        // precedent: the word the form already refused), the
        // bench-write door refuses it first, in the field's voice.
        // THE ANCHOR LAW, LEGACY-AWARE: the merge takes input_images
        // verbatim, else the legacy keys — one anchor vocabulary
        // suffices. any_of is the one-of anchor: refused only when NONE
        // of the alternatives is stated (either_or keeps the blank
        // tolerance by law, so it cannot say this).
        "required": [
            {
                "fields": ["prompt"],
                "cure": "an edit states WHAT to change — write the prompt (the instruction, not a description of the image)",
            },
            {
                "fields": ["input_images", "image1", "image2", "image3", "reference_images"],
                "any_of": true,
                "cure": "an edit needs the image being edited — the ordered input_images list, or a legacy image1/image2/image3/reference_images anchor",
            },
        ],
    },
    // THE RANGE RULE (the width burn's cure, 2026-10-10, rewritten by
    // the latent law 2026-11-08): the resolution span RETIRED — the
    // lane samples the encoder's own anchor-sized latent, no stated
    // numeric left to bound. The SOLVER span stays: steps rides the
    // edit narrowing's [1,50] (KSampler steps beyond the envelope is
    // the old washed-out-edit burn), so the write door keeps a live
    // domain to judge.
    "bounds": {
        "steps": { "min": 1, "max": 50 },
    },
    // THE MASK BOARDING (2026-09-22, the operator's lane call: "2511
    // is the legacy model… 2.1 is the new Qwen edit model"): the mask
    // pack's region contract absorbs onto THIS lane — crop_stitch (the
    // generic region detailer) rides the cache-wrapped model + encoder
    // conditioning; auto+mask still refuses field-named (no lane
    // inpaints in place — the region detailer is the one mask arm
    // on every lane). THE LORAS
    // BOARDING (operator 2026-11-06: every family applies LoRAs):
    // boards 'loras' beside 'mask' — the fired lane fires on every
    // boarding atom. FIRST-PARTY ROW (2026-11-08): the Consistency
    // LoRA (qwen21_consistency, the drift-lock recipe stamps it) —
    // the drift evidence is its own row; user filename rows still
    // pass through and unknown ids refuse at compose naming the
    // registry. The flavor seed in mods/loras.ts lands with
    // this declaration.
    "mods": [
        "mask",
        "loras"
    ],
    // THE PROVISION TRUTH (the silent-failure cure, 2511's law): the
    // text encoder and vae carry provisions from the same
    // Comfy-Org/Qwen-Image-2.1 repo; the unet rides the cell artifacts
    // (the quant owns the download — same files as the t2i sibling;
    // the engine's downloader dedups by content).
    "provisions": [
        {
            "name": "qwen3vl_8b_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_bf16.safetensors",
            "folder": "text_encoders",
            "sha256": "68bdc82bc1b66851162ae656225e7e2068166b603db19bd5d5a3b90eb12669a9",
            "size_bytes": 17534334616
        },
        {
            "name": "qwen3vl_8b_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_int8_convrot.safetensors",
            "folder": "text_encoders",
            "sha256": "8bfd0f6e12abf2d2d697ecc888e5e90b0d6741d6708f05799f53afa560452e8f",
            "size_bytes": 9350798360
        },
        {
            "name": "qwen_image_2.1_vae_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/vae/qwen_image_2.1_vae_bf16.safetensors",
            "folder": "vae",
            "sha256": "bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9",
            "size_bytes": 675509688
        },
        {
            "name": "qwen-image-2.1-consistency.safetensors",
            "url": "https://huggingface.co/ausboss/Qwen-Image-2.1-Consistency-LoRA/resolve/main/qwen-image-2.1-consistency.safetensors",
            "folder": "loras/qwen-img-edit-21",
            "sha256": "4f44ada1be2189cc23b3d010f9603543403f48454e2f76842a3d30109b20bd63",
            "size_bytes": 159436496
        }
    ],
    // THE 2.1 MATRIX ON THE EDIT LANE (the variant-axis law,
    // 2026-10-24 — same axes as the t2i family, the same physical
    // weights): Variant = Base/Turbo, Quant = int8_convrot/bf16;
    // the quant cell owns its tier's unet spelling
    // (CellRow.lane_inputs — the cell-lane cascade).
    "variants": [
        // THE DEFAULT SEAT (burn c, 2026-10-26 — operator: "YOU DIDN'T MAKE
        // TURBO DEFAULT FOR THE IMAGE EDIT MODEL"): the DECL walk's law is
        // FIRST DECLARED = THE DEFAULT (laneRelations.ts resolveVariantRow —
        // variants[0] resolves every unstated doc). The turbo rides FIRST so
        // a fresh edit card opens the 8-step distilled lane; the base row
        // stays a deliberate pick. The edit-default-turbo wall owns this
        // order (ARM 1/2 born red on the base-first tree).
        {
            "id": "turbo",
            "label": "Turbo",
            "hint": "The distilled turbo weights on the edit lane — 8 steps instead of the base 25 (upstream: 'Turbo uses 8 steps'), both download tiers below, same cache-wrapped edit compose. Requires provisioning: the 2.1 turbo files are NOT on this box by default; without them the engine validation refuses LOUD (the honest face — the 2511 weights are what ship).",
            "group": "Variant",
            "route": "qwen-img-edit-21-turbo",
            "order": 1,
            // cfg declared beside steps — the pair is the law, half a face
            // inherits nothing (the variant-sampler-defaults law).
            // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27): the
            // same physical weights as the t2i family's turbo lane, the
            // same distilled domain (steps [4, 8], cfg [1, 2]). The base
            // pair's 25 steps refuses here.
            "sampler_envelope": { "steps": [4, 8], "cfg": [1, 2] },
            "resolver_defaults": { "steps": 8, "cfg": 1 },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "qwen-img-edit-21-turbo-int8",
                    "vram_peak_gb": 24,
                    "lane_inputs": {
                        "unet": "qwen_image_2.1_turbo_int8_convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_turbo_int8_convrot.safetensors",
                        "size_bytes": 7256787829,
                        "sha256": "8144a0182964aa8403ad6dbc011db837304167d235161b9aabaa8532e967314c",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 7.3
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "qwen-img-edit-21-turbo-bf16",
                    "vram_peak_gb": 48,
                    "lane_inputs": {
                        "unet": "qwen_image_2.1_turbo_bf16.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_turbo_bf16.safetensors",
                        "size_bytes": 14230280616,
                        "sha256": "8b74237a7f505773e2c66726fa696444b4c704585c93a347cff9044937f7914a",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 14.3
                    }
                }
            ]
        },
        {
            "id": "remove-background",
            "label": "Remove Background",
            "hint": "The official one-click — the Comfy-Org background-removal template's canned prompt verbatim (the 2.1 base renders the subject on transparency; the RGBA decode lands the alpha on disk; solver/cfg/steps are the template's own values, declared on this row).",
            "group": "Recipe",
            "wire_defaults": { "prompt": "Remove the background, and output a PNG image" },
            "cells": [],
        },
        {
            "id": "drift-lock",
            "label": "Drift Lock",
            "hint": "The Consistency LoRA at strength 1 (the catalog's first-party row): restyle and recolour edits hold the original's frame — measured drift drops from ~24 px to ~1.6 px on held-out runs. It holds the EXISTING pose: switch it off for movement edits and big removals.",
            "group": "Recipe",
            "wire_defaults": { "loras": [{ "id": "qwen21_consistency" }] },
            "cells": [],
        },
        {
            "id": "upstream-solvers",
            "label": "Upstream Solvers",
            "hint": "Sampler euler + scheduler simple — the official 2.1 templates' own solver truth (the family solver pair, both members of the card's sampler/scheduler vocabularies).",
            "group": "Recipe",
            "wire_defaults": { "sampler": "euler", "scheduler": "simple" },
            "cells": [],
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
        },
        {
            "id": "base",
            "label": "Base",
            "hint": "The 2.1 base checkpoint on the edit lane — 25 steps (the official template's own count), both download tiers below, the cache-wrapped edit compose. Requires provisioning: the 2.1 files are NOT on this box by default; without them the engine validation refuses LOUD (the honest face — the 2511 weights are what ship).",
            "group": "Variant",
            "route": "qwen-img-edit-21",
            "order": 0,
            // The base face declared, never inherited (the variant-sampler-defaults
            // law): 25 / 1 — the official template's own count, the family mirror.
            // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27, the E2-8
            // cure's drain): the same physical weights as the t2i family's
            // base lane, the same domain — 25 centered (steps [8, 30]: the
            // floor follows the t2i sibling's T3 operator-write pin — the
            // admission matrix pins steps 8 with loras landing whole on the
            // same weights, so the distilled 8 rides here too); family
            // guidance mode cfg [1, 2]. ONE-DIRECTIONAL like the sibling:
            // the base pair's 25 refuses on turbo, 8 steps rides base.
            "sampler_envelope": { "steps": [8, 30], "cfg": [1, 2] },
            "resolver_defaults": { "steps": 25, "cfg": 1 },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "qwen-img-edit-21-int8",
                    "vram_peak_gb": 24,
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_int8_convrot.safetensors",
                        "size_bytes": 7256783064,
                        "sha256": "cb74113cb03faecd79611b01fd7fd642f0aa60d6f0b95086abee214d75eaa57d",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 7.3
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "qwen-img-edit-21-bf16",
                    "vram_peak_gb": 48,
                    "lane_inputs": {
                        "unet": "qwen_image_2.1_bf16.safetensors",
                        "text_encoder": "qwen3vl_8b_bf16.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors",
                        "size_bytes": 14230280616,
                        "sha256": "89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 14.3
                    }
                }
            ]
        },
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
            "tooltip": "Quantization tier of the ONE 2.1 base — INT8 ConvRot (the official template pick) or BF16 (full precision, most VRAM).",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "The download tier — INT8 ConvRot (7.3GB) or BF16 (14.2GB).",
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        }
    ],
    "has_agent": true,
    "has_inference": true,
    "actions": [edit],
    "lane_inputs": {
        "clip_type": "qwen_image",
        // THE LANE BRANCH KEY (the latent_node precedent — data, never
        // a family-id switch): names the 2.1 encoder class; the kit's
        // imageEdit builder routes onto the cached-reference lane.
        "text_encode_node": "TextEncodeQwenImage21",
        // THE IMAGE CAPACITY (the node's own truth — the card and the
        // lane RIDE this, never a hardcoded count): TextEncodeQwenImage21
        // opens image inputs as filled, up to 16 total (anchor +
        // references). The kit caps the unified reference order at
        // max_images - 1; the card caps its stack face at the roomiest
        // boarded lane's max_images - 1.
        "max_images": 16,
        "text_encoder": "qwen3vl_8b_int8_convrot.safetensors",
        "unet": "qwen_image_2.1_int8_convrot.safetensors",
        "vae": "qwen_image_2.1_vae_bf16.safetensors"
    }
};
export const family = {
    name: "family-qwen-img-edit-21",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The family's offered actions (the atom vocabulary): the edit
// action the image-edit card binds.
export { edit, parseEditFacts } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
