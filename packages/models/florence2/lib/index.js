import { tag } from "./actions.js";
export const DECL = {
    "id": "florence2",
    "form": "form_tagger",
    "label": "Florence-2",
    "description": "Natural-language image captioning (Florence-2 large, PromptGen-tuned) — dense descriptive prompts for recreating images in FLUX / Ideogram / image-edit.",
    "engine": "comfyui",
    "defaults": {
        // THE ONE-FLOOR LAW (card-default-overlap, 2026-10-21): the
        // caption_* face defaults live on the CARD schema alone — the
        // overlay is absent-keys-only and the card declares these keys,
        // so a family row here was a dead floor the dual-floor wall
        // refuses (the card's pin rests the face; same value).
        "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v2.0"
    },
    "genre": "image",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
    // user-provided seat(s) — the compose caller provides them. No
    // variant-class rows: this family's served face exposes no
    // steps+cfg pair (the census's surface-derived carve).
    "required_defaults": [
        { "name": "input_image", "class": "user" }
    ],
    // THE WEIGHTS RAIL (2026-09-22 — same law as wd14): one variant
    // per live DownloadAndLoadFlorence2Model `model` name
    // (live-pinned off the engine's object_info); PromptGen-v2.0
    // large rides FIRST (the family default). vram_peak_gb rides
    // ONLY the default's cell (the family's measured figure);
    // unmeasured checkpoints omit it.
    // THE FLORENCE2 SNAPSHOTS (burn d, 2026-10-26): one pinned
    // whole-repo row per variant (the joycaption precedent — the
    // loader reads a config+weights+tokenizer TREE, no single-file
    // row can name it), landed into the LLM mount the node reads
    // (models/LLM/<repo-last-segment>, its own snapshot_download
    // target — the estate pre-seeds it and the node's exists() check
    // short-circuits its self-download).
    "snapshot_provisions": [
        {
            "name": "Florence-2-large-PromptGen-v2.0",
            "folder": "LLM",
            "repo_id": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
            "revision": "4aa33eaf50aab040fe8523312ff52eb53322c220",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-base-PromptGen-v2.0",
            "folder": "LLM",
            "repo_id": "MiaoshouAI/Florence-2-base-PromptGen-v2.0",
            "revision": "59b6e4bf75d0f3e8a6b1a14211f6a50fcdd48d63",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-large-PromptGen-v1.5",
            "folder": "LLM",
            "repo_id": "MiaoshouAI/Florence-2-large-PromptGen-v1.5",
            "revision": "e4fb0497102b985f4af0d27d68b4106ff6e73a59",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-base-PromptGen-v1.5",
            "folder": "LLM",
            "repo_id": "MiaoshouAI/Florence-2-base-PromptGen-v1.5",
            "revision": "caf550c43498b7e98c9b5919bf204309a56cfc47",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-large",
            "folder": "LLM",
            "repo_id": "microsoft/Florence-2-large",
            "revision": "21a599d414c4d928c9032694c424fb94458e3594",
            "allow_patterns": [
                "config.json",
                "generation_config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "pytorch_model.bin",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-base",
            "folder": "LLM",
            "repo_id": "microsoft/Florence-2-base",
            "revision": "5ca5edf5bd017b9919c05d08aebef5e4c7ac3bac",
            "allow_patterns": [
                "config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "pytorch_model.bin",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-large-ft",
            "folder": "LLM",
            "repo_id": "microsoft/Florence-2-large-ft",
            "revision": "4a12a2b54b7016a48a22037fbd62da90cd566f2a",
            "allow_patterns": [
                "config.json",
                "generation_config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "pytorch_model.bin",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-base-ft",
            "folder": "LLM",
            "repo_id": "microsoft/Florence-2-base-ft",
            "revision": "f6c1a25888ffc1d945ee8a1a77ac833c7303d46e",
            "allow_patterns": [
                "config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "pytorch_model.bin",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-DocVQA",
            "folder": "LLM",
            "repo_id": "HuggingFaceM4/Florence-2-DocVQA",
            "revision": "2f8e312df1b0689740beba3c2f3dbfc61067ad7e",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "processor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "CogFlorence-2.1-Large",
            "folder": "LLM",
            "repo_id": "thwri/CogFlorence-2.1-Large",
            "revision": "cd834343b8e903f05aca17cd0e313b74014ccc11",
            "allow_patterns": [
                "config.json",
                "generation_config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "CogFlorence-2.2-Large",
            "folder": "LLM",
            "repo_id": "thwri/CogFlorence-2.2-Large",
            "revision": "19f2c614fdfd18ba49c81d567d70d3a68313e0bb",
            "allow_patterns": [
                "config.json",
                "generation_config.json",
                "model.safetensors",
                "preprocessor_config.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-SD3-Captioner",
            "folder": "LLM",
            "repo_id": "gokaygokay/Florence-2-SD3-Captioner",
            "revision": "519d1e567b00ff9117a1aab0d432c3dd9fa865d2",
            "allow_patterns": [
                "config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-Flux-Large",
            "folder": "LLM",
            "repo_id": "gokaygokay/Florence-2-Flux-Large",
            "revision": "a828167bee1befbf73c9d384f7da04743d830232",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
        {
            "name": "Florence-2-base-Castollux-v0.5",
            "folder": "LLM",
            "repo_id": "PJMixers-Images/Florence-2-base-Castollux-v0.5",
            "revision": "e3a0168ed8e406f9605e9792119c11b3fd005df3",
            "allow_patterns": [
                "added_tokens.json",
                "config.json",
                "generation_config.json",
                "merges.txt",
                "model.safetensors",
                "preprocessor_config.json",
                "processor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        },
    ],
    // THE DECLARED HOME (the lane-presence cure): the tree's store
    // folder, probed at press.
    "lane_homes": { "model_path": "LLM" },
    "variants": [
        {
            "id": "miaoshouai-florence-2-large-promptgen-v2-0",
            "label": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
            "group": "Variant",
            "route": "florence2",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v2.0" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // MiaoshouAI/Florence-2-large-PromptGen-v2.0 into models/LLM/Florence-2-large-PromptGen-v2.0 — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-large-PromptGen-v2.0" },
            "cells": [
                {
                    "quant": "f32",
                    "label": "F32",
                    "vram_peak_gb": 6,
                }
            ]
        },
        {
            "id": "miaoshouai-florence-2-base-promptgen-v2-0",
            "label": "MiaoshouAI/Florence-2-base-PromptGen-v2.0",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-base-PromptGen-v2.0" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // MiaoshouAI/Florence-2-base-PromptGen-v2.0 into models/LLM/Florence-2-base-PromptGen-v2.0 — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-base-PromptGen-v2.0" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "miaoshouai-florence-2-large-promptgen-v1-5",
            "label": "MiaoshouAI/Florence-2-large-PromptGen-v1.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v1.5" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // MiaoshouAI/Florence-2-large-PromptGen-v1.5 into models/LLM/Florence-2-large-PromptGen-v1.5 — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-large-PromptGen-v1.5" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "miaoshouai-florence-2-base-promptgen-v1-5",
            "label": "MiaoshouAI/Florence-2-base-PromptGen-v1.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-base-PromptGen-v1.5" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // MiaoshouAI/Florence-2-base-PromptGen-v1.5 into models/LLM/Florence-2-base-PromptGen-v1.5 — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-base-PromptGen-v1.5" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-large",
            "label": "microsoft/Florence-2-large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-large" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // microsoft/Florence-2-large into models/LLM/Florence-2-large — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-base",
            "label": "microsoft/Florence-2-base",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-base" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // microsoft/Florence-2-base into models/LLM/Florence-2-base — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-base" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-large-ft",
            "label": "microsoft/Florence-2-large-ft",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-large-ft" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // microsoft/Florence-2-large-ft into models/LLM/Florence-2-large-ft — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-large-ft" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-base-ft",
            "label": "microsoft/Florence-2-base-ft",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-base-ft" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // microsoft/Florence-2-base-ft into models/LLM/Florence-2-base-ft — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-base-ft" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "huggingfacem4-florence-2-docvqa",
            "label": "HuggingFaceM4/Florence-2-DocVQA",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "HuggingFaceM4/Florence-2-DocVQA" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // HuggingFaceM4/Florence-2-DocVQA into models/LLM/Florence-2-DocVQA — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-DocVQA" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "thwri-cogflorence-2-1-large",
            "label": "thwri/CogFlorence-2.1-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "thwri/CogFlorence-2.1-Large" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // thwri/CogFlorence-2.1-Large into models/LLM/CogFlorence-2.1-Large — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "CogFlorence-2.1-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "thwri-cogflorence-2-2-large",
            "label": "thwri/CogFlorence-2.2-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "thwri/CogFlorence-2.2-Large" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // thwri/CogFlorence-2.2-Large into models/LLM/CogFlorence-2.2-Large — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "CogFlorence-2.2-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "gokaygokay-florence-2-sd3-captioner",
            "label": "gokaygokay/Florence-2-SD3-Captioner",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "gokaygokay/Florence-2-SD3-Captioner" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // gokaygokay/Florence-2-SD3-Captioner into models/LLM/Florence-2-SD3-Captioner — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-SD3-Captioner" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "gokaygokay-florence-2-flux-large",
            "label": "gokaygokay/Florence-2-Flux-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "gokaygokay/Florence-2-Flux-Large" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // gokaygokay/Florence-2-Flux-Large into models/LLM/Florence-2-Flux-Large — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-Flux-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "pjmixers-images-florence-2-base-castollux-v0-5",
            "label": "PJMixers-Images/Florence-2-base-Castollux-v0.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "PJMixers-Images/Florence-2-base-Castollux-v0.5" },
            // THE BACKING TREE (burn d, 2026-10-26): the node snapshots
            // PJMixers-Images/Florence-2-base-Castollux-v0.5 into models/LLM/Florence-2-base-Castollux-v0.5 — the snapshot row below
            // fetches the exact load set; the run gate probes the tree.
            "lane_inputs": { "model_path": "Florence-2-base-Castollux-v0.5" },
            "cells": [{ "quant": "f32", "label": "F32" }],
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
                "fields": ["input_image"],
                "cure": "a tagger inverts an image — nothing to tag is a refusal; state the image",
            },
        ],
    },
    // THE LANE SURFACE (the z-image precedent): exactly the knobs the
    // tagger card serves — the face the four tagger families share.
    "params": [
        "input_image",
        "threshold", "character_threshold",
        "exclude_tags", "replace_underscore", "trailing_comma",
        "add_tag", "remove_tag",
        "caption_task", "caption_type", "caption_length", "extra_option",
    ],
    // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
    // the tagger card binds this segment through ACTION_BINDINGS —
    // the admission gate runs the facts parse at registration.
    "actions": [tag],
};
export const family = {
    name: "family-florence2",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The weightless door rides the kit spellings (DRY sweep C2, 2026-10-18);
// the old Tag* aliases are re-served for the family's consumers.
export { tag } from "./actions.js";
export { parseWeightlessFacts as parseTagFacts } from "@melite/comfyui-card-kit";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
