import { t2i } from "./actions.js";
export const DECL = {
    "id": "krea-2",
    "form": "form_generate",
    "label": "Krea 2",
    "description": "High-quality general text-to-image generation.",
    "engine": "comfyui",
    "defaults": {
        "scheduler": "normal",
        "width": 1024,
        "height": 1024,
        "steps": 8,
        "sampler": "euler",
        "cfg": 1
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face
    // (the turbo 8/1 is the family's DEFAULT, never a recipe row's
    // silent ride). prompt is the user-provided seat.
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "prompt", "class": "user" }
    ],
    "mods": [
        "mask",
        "loras"
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
    "variants": [
        {
            "id": "turbo",
            "label": "Turbo",
            "hint": "8-step distilled — fast, photorealistic (DEFAULT)",
            "group": "Variant",
            "route": "krea-2",
            "order": 0,
            "sampler_envelope": {
                "steps": [4, 8],
                "cfg": [1, 2]
            },
            "resolver_defaults": {
                "model": "krea-2",
                // The turbo face declared, never inherited (the variant-sampler-defaults
                // law): 8 / 1 — the distilled marriage the family defaults mirror.
                "steps": 8,
                "cfg": 1
            },
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "krea-2",
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors",
                        "size_bytes": 13492686496,
                        "sha256": "8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 13.5
                    }
                }
            ]
        },
        {
            "id": "raw",
            "label": "Raw",
            "hint": "52-step base checkpoint — the variant the loras train on (DEFAULT here)",
            "group": "Variant",
            "route": "krea-2-raw",
            "order": 1,
            "sampler_envelope": {
                "steps": [30, 60],
                "cfg": [2, 6]
            },
            "resolver_defaults": {
                "model": "krea-2-raw",
                "steps": 52,
                "cfg": 3.5
            },
            // THE RAW LANE TRUTH (2026-09-29, the third live break's
            // second half): the atom's lane_inputs spell the FAMILY
            // DEFAULT view (turbo's checkpoint — the first-declared
            // variant, the matrix law), and a variant whose cells carry a
            // DIFFERENT checkpoint overrides them per-variant (the
            // tts/moss meld precedent). Raw declared no override, so the
            // raw route view composed turbo's unet — a run that would
            // load the 8-step distilled weights at 52 steps, silently.
            // The cell's artifact (krea2_raw_int8_convrot) is the
            // download; this override is the run's lane spelling.
            "lane_inputs": {
                "unet": "krea2_raw_int8_convrot.safetensors"
            },
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "krea-2-raw",
                    "vram_peak_gb": 22,
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_raw_int8_convrot.safetensors",
                        "size_bytes": 13492686496,
                        "sha256": "5585a4a38c4bcfb6fde2d480a4aa6edf7f665721ebde56d30662c35a45f5fa5c",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 13.5
                    }
                }
            ]
        },
        // THE KROMA LANES (operator drop, 2026-11-07): lodestones' Kroma
        // — the Krea-2 checkpoint fine-tuned with Chroma's OPD distill.
        // Two lanes, one family, distinct route addresses per lane (the
        // h3-singularity law): the turbo lane rides the OPD-distilled
        // weights (8 steps at flow shift 1.15 — the distill's own
        // sampling marriage; a stated negative composes but buys nothing
        // on distilled weights, so the honest run is clean), the base
        // lane keeps negatives fully functional at CFG 3.5-5. Both lanes
        // declare the shift per-variant (the merged lane_inputs feed the
        // t2i action's ModelSamplingAuraFlow arm — the family's 0 is the
        // present-and-inert spelling, 1.15 is the live arm).
        {
            "id": "kroma",
            "label": "Kroma",
            "hint": "Kroma Turbo — the Chroma-OPD distilled Krea-2: 8 steps at shift 1.15, run it clean (negatives do nothing on the distill). INT8 ConvRot DEFAULT.",
            "group": "Variant",
            "route": "kroma",
            "order": 2,
            "sampler_envelope": {
                "steps": [4, 8],
                "cfg": [1, 2]
            },
            "resolver_defaults": {
                "model": "kroma",
                // The kroma face declared, never inherited (the
                // variant-sampler-defaults law): 8 / 1 — the distilled
                // marriage, same cascade as the turbo route.
                "steps": 8,
                "cfg": 1
            },
            "lane_inputs": {
                "sampling_shift": 1.15
            },
            // The anima per-quant law: the int8 convrot and the bf16 are
            // DIFFERENT files, so each cell names its own unet and its own
            // route address — the lane's unet spelling follows the cell,
            // never the variant.
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "kroma-int8",
                    "lane_inputs": {
                        "unet": "kroma-v0.3.1-turbo-opd-int8-convrot.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/silveroxides/Kroma-Quant/resolve/main/kroma-v0.3.1-turbo-opd-int8-convrot.safetensors",
                        "size_bytes": 14135109816,
                        "sha256": "36afdaeeea578ea577ae151fb2f9b58836b2a0538acf1cede74244cdbb5cfdd4",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 14.2
                    }
                },
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "kroma-bf16",
                    "lane_inputs": {
                        "unet": "kroma-v0.3.1-turbo-opd.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/lodestones/Kroma/resolve/main/kroma-v0.3.1-turbo-opd.safetensors",
                        "size_bytes": 26283332880,
                        "sha256": "3cfb5bc847c804ea8e8f894677f7e16ebe4c9ff0f978896cc5e7eb1e64fc7d82",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 26.3
                    }
                }
            ]
        },
        {
            "id": "kroma-base",
            "label": "Kroma Base",
            "hint": "Kroma base checkpoint — 25-35 steps at CFG 3.5-5, negatives fully functional. The dtype-mapped BF16 tier (upstream's fp32 original is a 51GB impracticality).",
            "group": "Variant",
            "route": "kroma-base",
            "order": 3,
            "sampler_envelope": {
                "steps": [25, 35],
                "cfg": [3.5, 5]
            },
            "resolver_defaults": {
                "model": "kroma-base",
                // The base face declared, never inherited: 28 / 4 — the
                // non-distilled marriage, mid-envelope.
                "steps": 28,
                "cfg": 4
            },
            "lane_inputs": {
                "sampling_shift": 1.15
            },
            "cells": [
                {
                    "quant": "bf16",
                    "label": "BF16 (dtype-mapped)",
                    // THE BASE TIER'S ONE CELL (the single-cell house pattern —
                    // krea-2 turbo/raw, the klein tiers): no int8 quant exists
                    // upstream for v0.3-base; the fp32 original (51GB) is not a
                    // servable artifact. silveroxides' dtype-mapped bf16 IS the
                    // base — the file's own spelling is kept verbatim.
                    "route": "kroma-base",
                    "lane_inputs": {
                        "unet": "kroma-v0.3-base-dtype-mapped.safetensors"
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/silveroxides/Kroma-Quant/resolve/main/kroma-v0.3-base-dtype-mapped.safetensors",
                        "size_bytes": 26284337464,
                        "sha256": "83a275d770d7b730b341aab35a1001ff22f12aa6e80310843299751b42f6f81b",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 26.3
                    }
                }
            ]
        },
        {
            "id": "realism",
            "label": "Realism",
            "hint": "The realism recipe — krea2_realism_lora at the catalog row's default strength (0.7)",
            "group": "Recipe",
            "order": 0,
            "cells": [],
            "wire_defaults": {
                "loras": [
                    {
                        "id": "krea2_realism_lora"
                    }
                ]
            }
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
        },
        // RULE A — THE RECIPE LAW (2026-09-18): the family's FUNCTIONAL
        // lora presets ride here — patch-only rows stamping the bag at
        // the flavor's own declared strength (mods/loras.ts). Style rows
        // stay individual Modifiers-menu picks (an option is not a
        // preset); step marriages stay in the turbo ROUTE's
        // resolver_defaults — never duplicated on two axes. (turbo-distill
        // joins the PRE-EXISTING realism row — one preset per fact.)
        {
            "id": "turbo-distill",
            "label": "Turbo Distill",
            "hint": "The rank-64 turbo adapter at 1.0 — pairs with the Turbo route's own 8-step cascade.",
            "group": "Recipe",
            "wire_defaults": {
                "loras": [{ "id": "krea2_turbo_lora_rank_64_bf16", "strength": 1.0 }],
            },
            "cells": [],
        }
    ],
    // (the `realism` Recipe row ABOVE already carries the photorealism
    // preset — the strength-less idiom: the resolver applies the
    // flavor's own default_strength 0.7; a second explicit row would
    // be the same preset declared twice)
    "variant_groups": [
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        },
        {
            "id": "Variant",
            "label": "Variant",
            "tooltip": "Base checkpoint — Turbo (8-step distilled, fast/photorealistic), Raw (52-step base, for LoRA training), or the Kroma lanes (the Chroma-OPD fine-tune: Turbo distilled 8-step, or Base with working negatives).",
        },
        {
            "id": "Quant",
            "label": "Quant",
            "tooltip": "Quantization tier — INT8 ConvRot (the official Comfy-Org convrot artifact, DEFAULT).",
        }
    ],
    "timeout_floor": 300,
    "canvas_default": true,
    "has_agent": true,
    "has_inference": true,
    // THE LANE SURFACE (the edit-2511 precedent — the DECL is the one
    // truth the face is judged against): exactly the knobs the create
    // card serves on this family, plus the loras mod seat. NO reference
    // seat — the create card takes no reference inputs (operator
    // ruling, 2026-10-11); the face-lane unity wall reds the moment a
    // served knob is missing from this list.
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
        "loras",
    ],
    "lane_inputs": {
        "clip_type": "krea2",
        "latent_node": "EmptySD3LatentImage",
        "sampling_shift": 0,
        "text_encoder": "qwen3vl_4b_fp8_scaled.safetensors",
        "unet": "krea2_turbo_int8_convrot.safetensors",
        "vae": "qwen_image_vae.safetensors"
    },
    // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the TE and
    // VAE the t2i lane loads (the UNETs ride the variant cells above).
    "provisions": [
        {
            "name": "qwen3vl_4b_fp8_scaled.safetensors",
            "url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
            "folder": "text_encoders",
            "sha256": "54bd5144df0bbc25dd6ccadfcb826b521445a1b06ae5a42570bdd2974ca87094",
            "size_bytes": 5242467968
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
    name: "family-krea-2",
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