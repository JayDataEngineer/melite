import { edit } from "./actions.js";
export const DECL = {
    "id": "qwen-img-edit-2511",
    "form": "form_edit",
    "label": "Qwen Image Edit 2511",
    "description": "Instruction-driven image editing and manipulation — the Qwen-Image-Edit 2511 lane (the image-edit card arms this family; the pre-flip img-edit head is retired, same physical lane, its assets merged here 2026-09-05).",
    "engine": "comfyui",
    // THE RECIPE↔WEIGHTS LAW (2026-09-22, operator catch e): the
    // family defaults must sample THE UNET THE LANE PINS. lane_inputs
    // below pins the INT8 ConvRot STANDARD checkpoint (the only 2511
    // edit weights provisioned on this box) — the old defaults (steps
    // 4, cfg 1) were the LIGHTNING recipe for a different, distilled
    // checkpoint, so a default run sampled standard weights at 4
    // steps and produced washed-out, broken edits (live-evidenced:
    // run-bcb995c95f2c graph = int8_convrot unet × steps 4). Defaults
    // are now the standard recipe; the lightning variant swaps BOTH
    // the recipe AND the unet through its own lane_inputs, so a
    // variant pick can never mix one checkpoint with the other's
    // step count.
    "defaults": {
        "use_stock_nodes": false,
        "steps": 20,
        "sampler": "euler",
        "scheduler": "simple",
        "cfg": 2.5,
        "double_reference": false
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face
    // (the standard 20/2.5 is the family's DEFAULT, never a recipe
    // row's silent ride). input_images + prompt are the user-provided
    // seats (the edit lane edits what the caller brings).
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "input_images", "class": "user" },
        { "name": "prompt", "class": "user" }
    ],
    // THE LANE SURFACE (fix shapes 1+2): the dedicated edit
    // checkpoint lane edits at SOURCE resolution — the VAEEncode of
    // the input IS the latent, so a stated width/height is not a
    // slower path, it is a lane the family does not have. They are
    // NOT on this surface (the card's visible_when guard that hid
    // them is dead; with a declared surface the bench-write door now
    // REFUSES them on this family in the field's voice — the same
    // judgment the tooltip used to describe). The edit-tuning pair
    // (use_stock_nodes, double_reference) is THIS lane's. The
    // card-owned match toggle IS here (a no-op admit: the lane always
    // edits at source resolution, so a default-ON draft never refuses
    // on this family).
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
        "use_stock_nodes",
        "double_reference",
    ],
    "mods": [
        "lanpaint",
        "loras",
        "mask"
    ],
    // THE COMPOSE LAW, STATED (2026-10-10, the DECL audit's row 2):
    // the sibling edit family carries these rows verbatim — the words
    // must AGREE member-wise or the model-less draft intersection
    // empties and the bench admits what compose refuses (the GAP-7
    // shape, the tts incident's twin). `required: prompt` and the
    // legacy-aware anchor law are the card's own compose gates, stated
    // here so the bench-write door refuses them first, in the field's
    // voice, on this family too (the 2511 lane edits at source
    // resolution — no width/height pair HERE; that word stays the
    // sibling's alone, a designed disagreement pinned in
    // cards-lane-law).
    "relations": {
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
    // THE SOLVER SPAN (the latent law's sibling, 2026-11-08): no
    // stated-size domain exists on this lane, but steps keeps the edit
    // narrowing's [1,50] — the write door judges a live domain on both
    // edit lanes, never one.
    "bounds": {
        "steps": { "min": 1, "max": 50 },
    },
    // THE PROVISION TRUTH (2026-09-13, the silent-failure cure): the
    // family declared lane_inputs files but NO downloadable rows — the
    // manage rail could not name where the text encoder lives, and the
    // card died at ComfyUI validation with no surfaced reason. Every
    // lane_inputs weight now carries its provision (shas from the HF
    // tree APIs; the encoder and vae share the Qwen-Image_ComfyUI
    // split_files repo, the unet rides the edit repo's convrot row).
    "provisions": [
        {
            "name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors",
            "folder": "text_encoders",
            "sha256": "cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4",
            "size_bytes": 9384670680
        },
        {
            "name": "qwen_image_vae.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors",
            "folder": "vae",
            "sha256": "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f",
            "size_bytes": 253806246
        }
    ],
    "variants": [
        {
            "id": "lightning",
            "label": "Lightning",
            "hint": "4-step distilled lightx2v checkpoint — fast. Swaps BOTH the recipe (steps 4, cfg 1) AND the unet (the recipe↔weights law — never one without the other). Requires provisioning: the FP8 Lightning file is NOT on this box by default; without it the engine validation refuses LOUD (the honest face) — the standard weights are what ship.",
            "group": "Variant",
            "route": "qwen-img-edit-2511-lightning4",
            "order": 0,
            // SOFT-RETIRED (2026-11-08, the survivor arc): the 2.1 lane
            // won — this variant is addressable (old drafts re-run) but no
            // longer offered in the dropdown.
            "hide_from_dropdown": true,
            // THE WEIGHTS SWAP (recipe↔weights law): this variant's
            // stamps ride its OWN unet, merged over the family's
            // lane_inputs by the variant rail.
            // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27): the
            // distilled domain for the lightx2v 4-step checkpoint —
            // steps [4, 8] mirrors flux-distilled (own 4 at the floor),
            // cfg [1, 2] the distilled guidance mode. The standard pair
            // 20/2.5 refuses on BOTH knobs. Declared though hidden (the
            // survivor arc retired the lane from the dropdown, not from
            // old drafts): an unhide re-arms the law with no new edit.
            "sampler_envelope": { "steps": [4, 8], "cfg": [1, 2] },
            "lane_inputs": {
                "unet": "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors"
            },
            "resolver_defaults": {
                "steps": 4,
                "cfg": 1
            },
            "cells": [
                {
                    "quant": "lightning4",
                    "label": "FP8 Lightning",
                    "route": "qwen-img-edit-2511-lightning4",
                    "vram_peak_gb": 20,
                    "artifact": {
                        "source_url": "https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors",
                        "size_bytes": 20447469486,
                        "sha256": "16d03fd9bab36b0a588e77db23825629df62ab99fc3e62f3a36887b201dcc36f",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 20.4
                    }
                }
            ]
        },
        {
            "id": "standard",
            "label": "Standard",
            "hint": "20 steps, cfg 2.5 — the INT8 ConvRot merge (DEFAULT: the weights this box ships, the recipe the family defaults stamp).",
            "group": "Variant",
            "route": "qwen-img-edit-2511",
            "order": 1,
            // SOFT-RETIRED (2026-11-08, the survivor arc): addressable,
            // not offered — see lightning above.
            "hide_from_dropdown": true,
            // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27): the
            // standard domain — 20/2.5 is the INT8 ConvRot merge the
            // family defaults stamp (steps [10, 30] centers the merge,
            // the flux-base-widened floor; cfg [2, 4] holds the 2.5
            // truth and excludes the lightning guidance). The lightning
            // pair 4/1 refuses on BOTH knobs. Declared though hidden —
            // see the lightning row.
            "sampler_envelope": { "steps": [10, 30], "cfg": [2, 4] },
            "resolver_defaults": {
                "steps": 20,
                "cfg": 2.5
            },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "qwen-img-edit-2511-int8",
                    "vram_peak_gb": 20,
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_int8_convrot.safetensors",
                        "size_bytes": 20499083824,
                        "sha256": "11b5af5ac601821d73930c84846c9a158e67177356daf927ce1c8d10f3963829",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 20.5
                    }
                }
            ]
        },
        {
            "id": "strong-identity",
            "label": "Strong Identity",
            "hint": "Double-reference ON — the card schema's own identity knob (encode the input twice for stronger identity preservation); this family's own default is false. PLANE TRUTH (agent-debt F-4, 2026-09-22): the TS compose plane refuses double_reference=true LOUD — it builds the stock plain-edit graph only. Selecting this variant GUARANTEES a refusal; do not plan runs around it until the double-encode lane exists.",
            "group": "Recipe",
            "wire_defaults": { "double_reference": true },
            "cells": [],
            // SOFT-RETIRED (2026-11-08, the survivor arc): addressable,
            // not offered — see lightning above.
            "hide_from_dropdown": true,
        },
        {
            "id": "upstream-solvers",
            "label": "Upstream Solvers",
            "hint": "Sampler euler + scheduler simple — this family's own DECL defaults, both members of the card's sampler/scheduler vocabularies.",
            "group": "Recipe",
            "wire_defaults": { "sampler": "euler", "scheduler": "simple" },
            "cells": [],
            // SOFT-RETIRED (2026-11-08, the survivor arc): addressable,
            // not offered — see lightning above.
            "hide_from_dropdown": true,
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
            // SOFT-RETIRED (2026-11-08, the survivor arc): addressable,
            // not offered — see lightning above.
            "hide_from_dropdown": true,
        }
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
            "tooltip": "Base checkpoint — Lightning (4-step distilled, fast default) or Standard (20-step reference, highest quality).",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "Quantization tier — FP8 Lightning (the distilled checkpoint) or INT8 ConvRot (the reference merge).",
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
        // THE LANE BRANCH KEY (made self-describing — the 2.1 family's
        // own spelling of the same law): names this lane's encoder
        // class. The edit action's facts door refuses any other value,
        // so a drifted row never silently routes to another family's
        // lane topology.
        "text_encode_node": "TextEncodeQwenImageEditPlus",
        // THE IMAGE CAPACITY (the node's own truth — the card and the
        // lane RIDE this, never a hardcoded count): the stock
        // TextEncodeQwenImageEditPlus takes image1/2/3 — 3 total, anchor
        // + 2 references. Past that the kit refuses LOUD (switch lanes).
        "max_images": 3,
        "text_encoder": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
        "unet": "qwen_image_edit_2511_int8_convrot.safetensors",
        "vae": "qwen_image_vae.safetensors"
    }
};
export const family = {
    name: "family-qwen-img-edit-2511",
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
