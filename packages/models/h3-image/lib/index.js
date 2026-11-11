import { t2i } from "./actions.js";
export const DECL = {
    "id": "h3-image",
    "form": "form_generate",
    "label": "MiniMax H3 Image",
    "description": "MiniMax-H3-Image — the image checkpoint of the H3 line (t2i here, prompt-only; the sibling h3-image-edit family serves the reference-guided edit lane on the image-edit card — same weights, the conditioning node's vision path rides THERE as input_images). One MiniMaxH3ImageConditioning node conditions on the prompt and emits the canvas latent itself; the negative rides ConditioningZeroOut at cfg 1 (distilled guidance — the lane has no negative seat), 6 steps euler/simple per the official template. The model's own area law: tuned for ~2048x2048 pixels of working area, 32-multiple canvas — the lane composes low-resolution work poorly, which is the edit sibling's 4MP pre-scale law.",
    "engine": "comfyui",
    "defaults": {
        "width": 2048,
        "height": 2048,
        "steps": 6,
        "sampler": "euler",
        "scheduler": "simple",
        "cfg": 1,
        "negative_prompt": null
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face.
    // prompt is the user-provided seat.
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "prompt", "class": "user" }
    ],
    // THE LANE SURFACE (the DECL is the one truth the face is judged
    // against): exactly the knobs the create card serves. The
    // reference seat rides qwen-img-21 ALONE (the phantom-port law,
    // c5f03df9) — H3's vision path serves the edit sibling, not this
    // t2i lane. negative_prompt is declared with a null default: the
    // lane zeroes the negative by design (ConditioningZeroOut at cfg
    // 1, the official template's arm) — a stated non-empty value
    // refuses at compose, never drops silently.
    "params": [
        "prompt",
        "negative_prompt",
        "width",
        "height",
        "seed",
        "steps",
        "cfg",
        "sampler",
        "scheduler"
    ],
    "relations": {
        "required": [
            {
                "fields": ["prompt"],
                "cure": "every image lane states WHAT the picture is — write the prompt",
            },
        ],
    },
    // THE LORAS BOARDING (operator 2026-11-06: every family applies
    // LoRAs): boards 'loras' — no first-party rows yet (the H3-Image
    // release ships no adapters; the h3 VIDEO turbo line is the video
    // unet's, never this checkpoint's); user filename rows pass
    // through compose, and an id with no row refuses at compose
    // naming the empty registry. The flavor seed in mods/loras.ts
    // lands with this declaration.
    "mods": [
        "mask",
        "loras"
    ],
    // THE PROVISION TRUTH (the silent-failure cure): the encoder and
    // vae carry provisions from the Comfy-Org/MiniMax-H3-Image repo;
    // the unet rides the cell artifacts (the quant owns the
    // download). THE ENCODER DEDUP: the qwen3vl-32b files are
    // content-identical to the h3 VIDEO family's seated files (same
    // sha, the video repo's spellings) — the engine's downloader
    // dedups by content, so a box that seats h3 already owns both
    // encoder tiers and only the unet + vae download.
    "provisions": [
        {
            "name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
            "folder": "text_encoders",
            "sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
            "size_bytes": 27141342152
        },
        {
            "name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
            "folder": "text_encoders",
            "sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
            "size_bytes": 15687142551
        },
        {
            "name": "minimax_h3_image_vae_fp16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/vae/minimax_h3_image_vae_fp16.safetensors",
            "folder": "vae",
            "sha256": "d80e9c2e5cfc9844869961ff5a58c9a9e52182df6bfb30b26018dd7f348721af",
            "size_bytes": 1168505312
        }
    ],
    // THE MATRIX (the variant-axis law): ONE checkpoint line — the
    // Variant axis is a single 'base' token (no distilled image tier
    // exists; the h3 turbo LoRAs are the video unet's, never this
    // checkpoint's) and the QUANT axis owns the three download tiers:
    // int8_convrot_pruned (the official template pick), w4a8 (half the
    // download, paired with the nvfp4 encoder), bf16 (full precision).
    "variants": [
        {
            "id": "base",
            "label": "Base",
            "hint": "The H3-Image base checkpoint — 6 steps, cfg 1 (the official template's own counts), three download tiers below. Requires provisioning: the H3-Image files are NOT on this box by default; without them the engine validation refuses LOUD (the encoder dedups against the h3 video family's seated files — a box that seats h3 already owns both encoder tiers).",
            "group": "Variant",
            "route": "h3-image",
            "order": 0,
            // The base face declared, never inherited (the
            // variant-sampler-defaults law): 6 / 1 — the official
            // template's own count. THE ENVELOPE DECLARATION LAW: the
            // distilled-image domain — the template's 6 centered (steps
            // [4, 20]: the floor follows the H3 turbo line's 4-step
            // convention, the ceiling leaves honest room for a
            // quality-push without the washed-out far end); cfg [1, 2] is
            // the guidance mode (the lane zeroes the negative — cfg above
            // 1 leans on a zeroed conditioning, a bounded experiment, not
            // a recipe).
            "sampler_envelope": { "steps": [4, 20], "cfg": [1, 2] },
            "resolver_defaults": { "steps": 6, "cfg": 1 },
            "cells": [
                {
                    "quant": "int8_convrot_pruned",
                    "label": "INT8 ConvRot Pruned",
                    "route": "h3-image-int8",
                    "vram_peak_gb": 30,
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_int8_convrot.safetensors",
                        "size_bytes": 20979314802,
                        "sha256": "83eb140f1ff95c068f8a6886e6d3f3d0d4ab2e07bb2fe6d2ef992a51146ee622",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 21
                    }
                },
                {
                    "quant": "w4a8",
                    "label": "W4A8",
                    "route": "h3-image-w4a8",
                    "vram_peak_gb": 20,
                    // THE LOW-VRAM PAIRING: the w4a8 unet tier pairs with the
                    // nvfp4 encoder (the cell-lane cascade — the tier's own
                    // encoder spelling, never a second Variant token). The
                    // unet row overrides too (the recipe↔weights law: a cell
                    // that swaps the checkpoint overrides every lane_input
                    // naming it — a download the lane never loads is a silent
                    // wrong-weights run).
                    "lane_inputs": {
                        "unet": "minimax_h3_image_pruned_w4a8.safetensors",
                        "text_encoder": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_w4a8.safetensors",
                        "size_bytes": 12549794530,
                        "sha256": "517cc19b85348386f4df7c806dce80d839d0899e7cdaa3e1dbb09de964381dbb",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 12.5
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "h3-image-bf16",
                    "vram_peak_gb": 64,
                    // the recipe↔weights law rides here too: the bf16 tier's
                    // own unet spelling.
                    "lane_inputs": {
                        "unet": "minimax_h3_image_pruned_bf16.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_bf16.safetensors",
                        "size_bytes": 40234657162,
                        "sha256": "a767f5325db019588b3491a93d80288d336c826a7aeb87bec67675e554367222",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 40.2
                    }
                }
            ]
        },
        {
            "id": "upstream-solvers",
            "label": "Upstream Solvers",
            "hint": "Sampler euler + scheduler simple — the official H3-Image template's own solver truth (this family's DECL defaults, both members of the card's sampler/scheduler vocabularies).",
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
            "tooltip": "The checkpoint line — one base (the official template's 6-step distilled guidance); no turbo tier exists for H3-Image.",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "The download tier — INT8 ConvRot (21GB, the official template pick), W4A8 (12.5GB, paired with the nvfp4 encoder), or BF16 (40.2GB, full precision).",
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
    "actions": [t2i],
    "lane_inputs": {
        "clip_type": "minimax",
        // THE LANE BRANCH KEY (the latent_node precedent — data, never
        // a family-id switch): naming the conditioning class routes the
        // kit's builders onto the H3-Image lane (ONE node emits the
        // positive conditioning AND the canvas latent; the negative
        // rides ConditioningZeroOut).
        "text_encode_node": "MiniMaxH3ImageConditioning",
        "text_encoder": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
        "unet": "minimax_h3_image_pruned_int8_convrot.safetensors",
        "vae": "minimax_h3_image_vae_fp16.safetensors"
    },
};
export const family = {
    name: "family-h3-image",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The family's offered actions (the atom vocabulary): the t2i
// segment the image-gen card binds. The card imports this beside
// the DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
