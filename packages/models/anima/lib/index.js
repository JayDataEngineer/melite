import { t2i } from "./actions.js";
export const DECL = {
    "id": "anima",
    "form": "form_generate",
    "label": "Anima",
    "description": "Anime/illustration text-to-image. Cosmos-Predict2 base with Danbooru-style prompting.",
    "engine": "comfyui",
    "defaults": {
        "width": 1024,
        "height": 1024,
        // 52 (operator, 2026-10-16: "ANIMA BASE ISN'T DEFAULTING TO 52
        // STEPS" — the family's own quality prescription; 30 was the
        // DECL author's guess, not the operator's word).
        "steps": 52,
        "sampler": "er_sde",
        "scheduler": "simple",
        "cfg": 4
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face
    // (a silent ride is how a base pick composes turbo-era numbers).
    // prompt is the user-provided seat.
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "prompt", "class": "user" }
    ],
    // THE MASK BOARDING (operator order 2026-11-07: the MASK mod
    // serves on EVERY img-gen model — the MASK-C no-board is
    // superseded): boards 'mask' as the bare flavor (mods/mask.ts,
    // composed in cordis cardDefs) — the region vocabulary is
    // DECLARED surface on the card (the bag + fields ride admission,
    // MASK_RIDERS); no gen lane builds a region arm yet, so a STATED
    // region refuses LOUD at the firing gate (E2-11: never
    // 'unknown-param' — it is a mod — and never a silent plain run;
    // the voice teaches the image-edit lane, where regions compose).
    "mods": [
        "mask",
        "loras"
    ],
    // THE THREE CHECKPOINTS (operator 2026-10-16: Base v1.0,
    // Turbo v1.1, Aesthetic v1.1 — upstream's own names, one Variant
    // row each). The axes are TOKENS (the qwen 2.1 matrix law,
    // 2026-10-24): Variant = Base/Turbo/Aesthetic, Quant =
    // int8_convrot/bf16. The single f32 "standard" row died here —
    // the convrot tier serves below it (Bedovyy's int8convrot quant:
    // ~2.6GB, 12GB cards welcome per their 3060 speed tables) and
    // BF16 rides beside it (the official split_files, ~4.2GB).
    // The base row keeps route "anima" (existing drafts resolve
    // migration-free); turbo stamps its upstream marriage (CFG 1,
    // 8 steps — the Civitai version card's own prescription).
    "variants": [
        {
            "id": "base",
            "label": "Base v1.0",
            "hint": "Base v1.0 — the pretrained base (maximum flexibility; LoRAs train here). INT8 ConvRot is the served tier (DEFAULT); BF16 beside it.",
            "group": "Variant",
            "route": "anima",
            "order": 0,
            // The base face declared, never inherited (the variant-sampler-defaults
            // law): 52 / 4 — the family defaults' own prescription, now owned here.
            "resolver_defaults": { "steps": 52, "cfg": 4 },
            // THE ENVELOPE DECLARATION LAW (the E2-8 cure, 2026-11-08): the
            // lane's sampler domain, held IN ITS OWN TRUTH — the family default
            // 52/4, the official template's 30-step euler walk, the operator's
            // good live runs (35/4, 52/4) and the Draft recipe's 8-step stamp
            // sit INSIDE; the burn's CFG 1 on this non-distilled lane (every
            // "completely off" run sat there) sits OUT and refuses at compose.
            "sampler_envelope": { "steps": [8, 60], "cfg": [2, 8] },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "anima-int8",
                    "vram_peak_gb": 12,
                    "lane_inputs": {
                        "unet": "anima-base-v1.0-int8convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-base-v1.0-int8convrot.safetensors",
                        "size_bytes": 2649827358,
                        "sha256": "1ee1da031d651cea747716afccedd45b1c51317330a3e2393da08f013174fd69",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 2.7
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "anima-bf16",
                    "vram_peak_gb": 20,
                    "lane_inputs": {
                        "unet": "anima-base-v1.0.safetensors"
                    }
                }
            ]
        },
        {
            "id": "turbo",
            "label": "Turbo v1.1",
            "hint": "Turbo v1.1 — the distilled weights (fast generations; stamps 8 steps at CFG 1, upstream's own prescription). Same two tiers.",
            "group": "Variant",
            "route": "anima-turbo",
            "order": 1,
            "resolver_defaults": { "steps": 8, "cfg": 1 },
            // THE ENVELOPE DECLARATION LAW (the E2-8 cure, 2026-11-08): the
            // distilled lane's domain — its own upstream marriage and half-step
            // neighbors inside; the base lanes' 52/4 refuses here (the krea
            // turbo shape, 2026-09-21).
            "sampler_envelope": { "steps": [4, 8], "cfg": [1, 2] },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "anima-turbo-int8",
                    "vram_peak_gb": 12,
                    "lane_inputs": {
                        "unet": "anima-turbo-v1.1-int8convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-turbo-v1.1-int8convrot.safetensors",
                        "size_bytes": 2649848838,
                        "sha256": "c462bea054de87ea03000e83f2b60e6d58fbcb6b925d9f607f8a470eeaad52b4",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 2.7
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "anima-turbo-bf16",
                    "vram_peak_gb": 20,
                    "lane_inputs": {
                        "unet": "anima-turbo-v1.1.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-turbo-v1.1.safetensors",
                        "size_bytes": 4182230656,
                        "sha256": "fba11953276b57edf59d1dc4f1857ac05aa079c56f982b4d7c20298d57d3f7eb",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 4.2
                    }
                }
            ]
        },
        {
            "id": "aesthetic",
            "label": "Aesthetic v1.1",
            "hint": "Aesthetic v1.1 — fine-tuned for consistency and a stronger default style (less diverse than base; quality tags optional). Same two tiers.",
            "group": "Variant",
            "route": "anima-aesthetic",
            "order": 2,
            // The aesthetic face declared, never inherited: the base sampler
            // prescription (52 / 4) — the fine-tune retunes style, not the sampler.
            "resolver_defaults": { "steps": 52, "cfg": 4 },
            // THE ENVELOPE DECLARATION LAW (the E2-8 cure, 2026-11-08): the
            // base domain verbatim — the fine-tune retunes style, not the sampler.
            "sampler_envelope": { "steps": [8, 60], "cfg": [2, 8] },
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "anima-aesthetic-int8",
                    "vram_peak_gb": 12,
                    "lane_inputs": {
                        "unet": "anima-aesthetic-v1.1-int8convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-aesthetic-v1.1-int8convrot.safetensors",
                        "size_bytes": 2649848838,
                        "sha256": "3fcddb378b9b2ffab20878ed8fb379ae2c34005ba327f475d2cd3b9e91350cda",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 2.7
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "anima-aesthetic-bf16",
                    "vram_peak_gb": 20,
                    "lane_inputs": {
                        "unet": "anima-aesthetic-v1.1.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-aesthetic-v1.1.safetensors",
                        "size_bytes": 4182230656,
                        "sha256": "3c1868387a3a1ff504bbb87c33678321965ead381fcf87afbd0264daa600c082",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 4.2
                    }
                }
            ]
        },
        {
            "id": "draft",
            "label": "Draft",
            "hint": "Steps 8 — the card schema's own default (fast draft iterations).",
            "group": "Recipe",
            "wire_defaults": { "steps": 8 },
            "cells": [],
        },
        {
            "id": "detailed",
            "label": "Detailed",
            "hint": "Steps 52 — the family DECL's own default (full-quality render; inside the card's 1–100 range).",
            "group": "Recipe",
            "wire_defaults": { "steps": 52 },
            "cells": [],
        },
        {
            "id": "settled-negative",
            "label": "Settled negative",
            "hint": "Stamps the guide's settled negative set. TRIM RULE: the negative stays short — broadening a negative concept degrades quality, so this row is the whole set, never a base to widen.",
            "group": "Recipe",
            "wire_defaults": { "negative_prompt": "worst quality, low quality, score_1, score_2, score_3, artist name" },
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
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "Quantization tier — INT8 ConvRot (Bedovyy's convrot quant, DEFAULT) or BF16 (the official split_files).",
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        }
    ],
    // THE LANE SURFACE (the edit-2511 precedent): exactly the knobs the
    // create card serves — no reference seat (operator ruling,
    // 2026-10-11); the face-lane unity wall judges the face against it.
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
        "clip_type": "stable_diffusion",
        "latent_node": "EmptyLatentImage",
        "sampling_shift": 0,
        "text_encoder": "qwen_3_06b_base.safetensors",
        // THE FAMILY DEFAULT VIEW (the krea-2 raw precedent): the
        // atom's lane_inputs spell the first-declared variant's
        // default tier — base × INT8 ConvRot (operator 2026-10-16:
        // the convrot tier serves over fp32).
        "unet": "anima-base-v1.0-int8convrot.safetensors",
        "vae": "qwen_image_vae.safetensors"
    },
    // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): base from
    // circlestone-labs' official split-files repo; the TE is Qwen3-0.6B
    // Base single-file; the VAE mirrors the qwen families' row.
    "provisions": [
        {
            "name": "anima-base-v1.0.safetensors",
            "url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-base-v1.0.safetensors",
            "folder": "diffusion_models",
            "sha256": "bd43b7cffe1ed1153d9c41e7beb2f18cb1273eafbaa3af3edd6a173dc90a006e",
            "size_bytes": 4182218328
        },
        {
            "name": "qwen_3_06b_base.safetensors",
            "url": "https://huggingface.co/Qwen/Qwen3-0.6B-Base/resolve/main/model.safetensors",
            "folder": "text_encoders",
            "sha256": "cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba",
            "size_bytes": 1192135096
        },
        {
            "name": "qwen_image_vae.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors",
            "folder": "vae",
            "sha256": "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f",
            "size_bytes": 253806246
        }
    ],
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
    // merge AT REGISTRATION — a drifted lane_input (a renamed latent
    // class, a bad variant override) refuses at boot in the door's
    // own voice, never at first compose.
    "actions": [t2i],
};
export const family = {
    name: "family-anima",
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
export { normalizeAnimaPromptTags } from "./promptTags.js";
//# sourceMappingURL=index.js.map
