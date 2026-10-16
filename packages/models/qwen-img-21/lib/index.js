import { t2i } from "./actions.js";
export const DECL = {
    "id": "qwen-img-21",
    "form": "form_generate",
    "label": "Qwen Image 2.1",
    "description": "Qwen-Image-2.1 — the unified 2.1 base (text-to-image and reference-cached image edit ride the SAME checkpoint; the edit lane wraps the unet in QwenImage21Cache and conditions on reference images through TextEncodeQwenImage21's own vision path — no separate edit weights). Boards both the image-gen card (t2i) and the image-edit card (cached-reference edit).",
    "engine": "comfyui",
    "defaults": {
        "width": 1024,
        "height": 1024,
        "steps": 25,
        "sampler": "euler",
        "scheduler": "simple",
        "cfg": 1
    },
    "genre": "image",
    // MASK-C (the image-gen region gap): boards 'mask' — the 2.1
    // checkpoint IS the estate's region story (the same weights the
    // mask-boarded edit lane details with: crop_stitch + the Impact
    // detectors), so the gen card serves the region vocabulary for
    // this family. Refused-fate honesty: no image-gen lane builds a
    // region arm (compose untouched) — a stated mask on a gen run
    // refuses LOUD at admission, field-named, never a silent plain
    // run; the region work itself rides the edit plane. THE LORAS
    // BOARDING (operator 2026-11-06: every family applies LoRAs —
    // the 'until an adapter exists' gating was the refusal lie):
    // boards 'loras' — the pack's fired lane (kit stackLoras) fires
    // on every boarding atom; with no first-party rows the catalog
    // serves empty, user filename rows pass through compose, and an
    // id with no row refuses at compose naming the empty registry
    // (install the rows), never the admission nuke. The flavor seed
    // in mods/loras.ts lands with this declaration.
    "mods": [
        "mask",
        "loras"
    ],
    // THE PROVISION TRUTH (the silent-failure cure, 2511's law):
    // every lane weight carries its provision — the text encoder and
    // vae from the same Comfy-Org/Qwen-Image-2.1 split repo; the unet
    // rides the cell artifacts (the quant owns the download).
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
        }
    ],
    // THE 2.1 MATRIX (the variant-axis law, 2026-10-24): the axes
    // are TOKENS — Variant = Base/Turbo (upstream's own names), Quant
    // = int8_convrot/bf16. The four flat "variant-per-quant" rows
    // (INT8 ConvRot / BF16 / Turbo INT8 / Turbo BF16) dressed quants
    // as variants; the matrix is the truth: Base × Turbo each span
    // both download tiers, and the quant cell owns its tier's unet
    // spelling (CellRow.lane_inputs — the cell-lane cascade).
    "variants": [
        {
            "id": "base",
            "label": "Base",
            "hint": "The 2.1 base checkpoint — 25 steps (the official template's own count), both download tiers below. Requires provisioning: the 2.1 files are NOT on this box by default; without them the engine validation refuses LOUD (the honest face — the 2511 weights are what ship).",
            "group": "Variant",
            "route": "qwen-img-21",
            "order": 0,
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "qwen-img-21-int8",
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
                    "route": "qwen-img-21-bf16",
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
        {
            "id": "turbo",
            "label": "Turbo",
            "hint": "The distilled turbo weights — 8 steps instead of the base 25 (upstream: 'Turbo uses 8 steps'), both download tiers below, same sampler truth. Requires provisioning: the 2.1 turbo files are NOT on this box by default; without them the engine validation refuses LOUD (the honest face — the 2511 weights are what ship).",
            "group": "Variant",
            "route": "qwen-img-21-turbo",
            "order": 1,
            "resolver_defaults": { "steps": 8 },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "qwen-img-21-turbo-int8",
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
                    "route": "qwen-img-21-turbo-bf16",
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
            "id": "upstream-solvers",
            "label": "Upstream Solvers",
            "hint": "Sampler euler + scheduler simple — the official 2.1 templates' own solver truth (this family's DECL defaults, both members of the card's sampler/scheduler vocabularies).",
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
        }
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
            "tooltip": "Quantization tier of the 2.1 lane — INT8 ConvRot (the official template pick), BF16 (full precision, most VRAM), or Turbo (the distilled weights, 8 steps; turbo-int8 and turbo-bf16 carry the same quant split).",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "The download tier — INT8 ConvRot (7.3GB) or BF16 (14.2GB); the turbo lanes download the same-size turbo weights.",
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
    // THE LANE SURFACE (the edit-2511 precedent — the DECL is the one
    // truth the face is judged against): exactly the knobs the create
    // card serves, plus the family's own reference seat (audit 004/C4,
    // 2026-10-22 — supersedes the 2026-10-11 no-seat ruling; the only
    // t2i family whose encoder reads references). The face-lane unity
    // wall reds the moment a served knob is missing from this list.
    "params": [
        "prompt",
        "negative_prompt",
        "width",
        "height",
        "seed",
        "steps",
        "cfg",
        "sampler",
        "scheduler",
        "reference_images"
    ],
    "lane_inputs": {
        "clip_type": "qwen_image",
        "sampling_shift": 0,
        // THE LANE BRANCH KEY (the latent_node precedent — data, never
        // a family-id switch): naming the 2.1 encoder class routes the
        // kit's builders onto the 21 lane (TextEncodeQwenImage21 emits
        // pos+neg+reference-latents from ONE node; the edit arm wraps
        // the unet in QwenImage21Cache and conditions on the anchor
        // images through the encoder's own image_N slots).
        "text_encode_node": "TextEncodeQwenImage21",
        "text_encoder": "qwen3vl_8b_int8_convrot.safetensors",
        "unet": "qwen_image_2.1_int8_convrot.safetensors",
        "vae": "qwen_image_2.1_vae_bf16.safetensors"
    },
    // THE REQUIRED WORD, STATED (2026-10-10, the DECL audit's gap 4 —
    // the GAP-7 shape on the legacy lanes): the card's compose seat has
    // refused this field since the merge, imperatively, while the bench
    // admitted the same draft — a state the form could build and the run
    // refused. Stated as the law, the bench-write door refuses it first,
    // in the field's voice (the tts precedent: this is the one relation
    // word that deliberately overrides the blank tolerance, and this
    // field is exactly the one where "still being typed" composes
    // nothing).
    "relations": {
        "required": [
            {
                "fields": ["prompt"],
                "cure": "every image lane states WHAT the picture is — write the prompt",
            },
        ],
    },
    // THE FAMILY DOOR (the atom vocabulary, stroke 0): the t2i
    // action's facts parse runs over this row and every variant
    // merge AT REGISTRATION — a drifted lane_input (a renamed
    // encoder, a bad variant override) refuses at boot in the door's
    // own voice, never at first compose.
    "actions": [t2i],
};
export const family = {
    name: "family-qwen-img-21",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The family's offered actions (the atom vocabulary's stroke-1
// pilot): the t2i segment the image-gen card binds. The card
// imports this beside the DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
