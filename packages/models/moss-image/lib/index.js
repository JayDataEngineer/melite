import { t2i } from "./actions.js";
export const DECL = {
    "id": "moss-image",
    "form": "form_generate",
    "label": "MOSS-Image",
    "description": "MOSS-Image — OpenMOSS's 5B DiT in the FLUX.2 latent space: a 50-step SFT lane (25-30 for fast iteration) at CFG 3, typography through line breaks and quoted text, layout through native JSON bboxes in the prompt. Apache-2.0 licensed (OpenMOSS's own release terms).",
    "engine": "comfyui",
    // The official MOSS template's own defaults: 1024², 50 steps,
    // CFG 3, euler, simple. `scheduler` declares the card domain (the
    // models-against-cards law); sgm_uniform is the template's other
    // sanctioned pick.
    "defaults": {
        "width": 1024,
        "height": 1024,
        "steps": 50,
        "cfg": 3,
        "sampler": "euler",
        "scheduler": "simple"
    },
    "genre": "image",
    // THE MASK BOARDING (operator order 2026-11-07: the MASK mod
    // serves on EVERY img-gen model) + THE LORAS LAW (2026-11-06,
    // 8153a8a37: every image family boards the pack — no first-party
    // MOSS adapter exists yet, so the flavor is the klein-style seed:
    // user-provided files ride the bag, rows land the day an adapter
    // does).
    "mods": [
        "mask",
        "loras"
    ],
    // THE LICENCE ROW: the Comfy-Org repack and the upstream OpenMOSS
    // release are Apache-2.0 (the HF repo's own licence field).
    "licence": {
        "id": "apache-2.0",
        "commercial_use": true
    },
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face.
    // prompt is the user-provided seat.
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "prompt", "class": "user" }
    ],
    // THE PROVISION TRUTH (the silent-failure cure, 2511's law): the
    // shared lane weights carry their provision — the Qwen3.5-9B
    // tokenizer (int8 convrot) and the flux2 VAE (byte-identical to
    // flux-klein's row: same digest, one download serves both lanes);
    // the unet rides the cell artifacts (the variant owns the
    // download).
    "provisions": [
        {
            "name": "qwen3.5_9b_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/text_encoders/qwen3.5_9b_int8_convrot.safetensors",
            "folder": "text_encoders",
            "sha256": "32e3787472f708fa5f83624acbf5ef23f7fc89c439e05065ea57cfe5a97f025a",
            "size_bytes": 9748121532
        },
        {
            "name": "flux2-vae.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/vae/flux2-vae.safetensors",
            "folder": "vae",
            "sha256": "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3",
            "size_bytes": 336211292
        }
    ],
    "variants": [
        {
            "id": "sft",
            "label": "SFT",
            "hint": "The supervised-fine-tuned checkpoint — 50 steps at CFG 3 (25-30 for fast iteration), shift 5.0. INT8 ConvRot DEFAULT.",
            "group": "Variant",
            "route": "moss-image",
            "order": 0,
            "sampler_envelope": {
                "steps": [25, 50],
                "cfg": [1, 5]
            },
            "resolver_defaults": {
                "model": "moss-image",
                // The sft face declared, never inherited (the
                // variant-sampler-defaults law): 50 / 3 — the template's own
                // marriage; the family defaults mirror it for the fresh
                // card, this row owns it for the variant.
                "steps": 50,
                "cfg": 3
            },
            // The anima per-quant law: the int8 convrot and the bf16 are
            // DIFFERENT files, so each cell names its own unet and its own
            // route address — the lane's unet spelling follows the cell,
            // never the variant.
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "moss-image",
                    "lane_inputs": {
                        "unet": "moss_image_sft_int8_convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/diffusion_models/moss_image_sft_int8_convrot.safetensors",
                        "size_bytes": 5413698958,
                        "sha256": "b4d1475bc7eeffd7b809e82ea13a1fba1fb85c4e18365af3813722faa5c0fe4f",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 5.4
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "moss-image-bf16",
                    "lane_inputs": {
                        "unet": "moss_image_sft_bf16.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/diffusion_models/moss_image_sft_bf16.safetensors",
                        "size_bytes": 10164655808,
                        "sha256": "f96738d8116d78b7316b57c663d8c98591ddafab7488f48e3099b7655e34ab6f",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 10.2
                    }
                }
            ]
        },
        // THE FAST-ITERATION RECIPE (the operator's own 25-30 step
        // prescription, stamped once): the quick lane for prompt
        // refinement — the stamps sit inside the card's declared bounds
        // (steps [1,100], cfg [1,20]) and the sft envelope [25,50].
        {
            "id": "quick-iter",
            "label": "Quick iter",
            "hint": "The fast-iteration recipe — 28 steps (the template's 25-30 fast band). Pick the SFT variant with it.",
            "group": "Recipe",
            "order": 0,
            "wire_defaults": {
                "steps": 28
            },
            "cells": [],
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "order": 1,
            "cells": [],
        }
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
            "tooltip": "The checkpoint tier — SFT (the supervised-fine-tuned 5B DiT, 50 steps at CFG 3) on INT8 ConvRot or BF16.",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "The download tier — INT8 ConvRot (5.4GB, the official Comfy-Org convrot artifact, DEFAULT) or BF16 (10.2GB).",
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the card; Default stamps nothing. Quick iter wants the SFT variant.",
            "default": "default"
        }
    ],
    // A 50-step lane is a slow lane (the krea-2 floor precedent): the
    // run seat's floor keeps a full-quality render from being judged
    // hung mid-diffusion.
    "timeout_floor": 300,
    "has_agent": true,
    "has_inference": true,
    // THE LANE SURFACE (the edit-2511 precedent — the DECL is the one
    // truth the face is judged against): exactly the knobs the create
    // card serves. NO reference seat — the create card takes no
    // reference inputs (operator ruling, 2026-10-11); a stated
    // reference_images key refuses at the gated resolve as an unknown
    // param, and the face-lane unity wall reds the moment a served knob
    // is missing from this list.
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
    ],
    "lane_inputs": {
        // THE MOSS TOKENIZER BRANCH (data, never a family-id switch):
        // the CLIPLoader type the MOSS template loads the Qwen3.5-9B
        // tokenizer under (upstream PR #17095's own spelling).
        "clip_type": "moss_image",
        // THE LATENT CLASS (the flux-klein precedent — data, never a
        // family-id switch): MOSS lives in the FLUX.2 latent space, so
        // the canvas node is the flux2 one.
        "latent_node": "EmptyFlux2LatentImage",
        // THE LANE BRANCH KEY (the text_encode_node precedent — data,
        // never a family-id switch): the stock CLIPTextEncode over the
        // moss tokenizer; the negative arm branches on the stated
        // prompt (blank → ConditioningZeroOut, the true unconditional;
        // stated → a real encoded negative — CFG 3 is a live guidance
        // arm on this lane, negatives work).
        "text_encode_node": "CLIPTextEncode",
        // THE DECLARED SHIFT: MOSS's template pins flow shift 5.0 and
        // rides ModelSamplingAuraFlow with it (unlike klein, whose
        // Flux2Scheduler computes the shift itself).
        "sampling_shift": 5.0,
        "text_encoder": "qwen3.5_9b_int8_convrot.safetensors",
        "unet": "moss_image_sft_int8_convrot.safetensors",
        "vae": "flux2-vae.safetensors"
    },
    // THE REQUIRED WORD, STATED (the qwen-img-21 precedent): every
    // image lane states WHAT the picture is — the bench-write door
    // refuses an empty prompt in the field's voice before compose.
    "relations": {
        "required": [
            {
                "fields": ["prompt"],
                "cure": "every image lane states WHAT the picture is — write the prompt",
            },
        ],
    },
    // THE FAMILY DOOR (the atom vocabulary): the t2i action's facts
    // parse runs over this row and every variant merge AT REGISTRATION
    // — a drifted lane_input (a renamed latent class, a bad variant
    // override) refuses at boot in the door's own voice, never at
    // first compose.
    "actions": [t2i],
};
export const family = {
    name: "family-moss-image",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The family's offered actions (the atom vocabulary): the t2i
// segment the image-gen card binds. The card imports this beside the
// DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
