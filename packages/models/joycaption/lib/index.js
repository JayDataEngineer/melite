import { tag } from "./actions.js";
export const DECL = {
    "id": "joycaption",
    "form": "form_tagger",
    "label": "JoyCaption",
    "description": "Stylized natural-language image captioning (JoyCaption beta-one, 8B VLM) — descriptive / SD-prompt / MJ / booru-list templates for recreating images in FLUX / Ideogram / image-edit.",
    "engine": "comfyui",
    "defaults": {
        "checkpoint": "fancyfeast/llama-joycaption-beta-one-hf-llava",
        "caption_type": "Descriptive",
        "caption_length": "long",
        "extra_option": ""
    },
    "genre": "image",
    // ONE Standard variant, deliberately (the freeform upstream):
    // JJC_DownloadAndLoadJoyCaptionModel takes ANY repo id or local
    // path (unbounded — no closed set to enumerate as variants), so
    // the family default stamps beta-one and custom paths ride
    // explicit params. A variant per checkpoint here would be a lie
    // of closedness.
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "joycaption",
            "cells": [
                {
                    "quant": "f32",
                    "label": "F32",
                    "route": "joycaption",
                    "vram_peak_gb": 20,
                }
            ]
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
    // JOY-CAPTION GRADUATION (the weightless cure): the beta-one
    // tree is MANAGED now — the upstream JJC loader
    // (JJC_DownloadAndLoadJoyCaptionModel) snapshot_downloads the
    // whole repo into <models>/LLavacheckpoints/<repo-stem> and loads
    // from_pretrained off that dir (processor + 4-shard weights), so
    // the honest channel is a snapshot row (whole HF dirs ride
    // snapshot_provisions, never single-file rows — the repo carries
    // FOUR model shards plus the index, not one weights file). The
    // row below pins the repo + revision + the exact load set (13
    // literals, each liveness-probed); the provisioner lands it, and
    // the node's exists() check short-circuits its self-download on a
    // pre-seeded engine. lane_inputs names the tree the loader reads;
    // lane_homes names its store parent for the run-gate probe.
    // Custom checkpoints (the freeform upstream takes any repo id)
    // stay engine-side — the managed tree covers the family default
    // only, and the node self-downloads the rest as before.
    "snapshot_provisions": [
        {
            "name": "llama-joycaption-beta-one-hf-llava",
            "folder": "LLavacheckpoints",
            "repo_id": "fancyfeast/llama-joycaption-beta-one-hf-llava",
            "revision": "ebf414ea497a020da0f82df3913e5b6cb8e9663a",
            "allow_patterns": [
                "config.json",
                "generation_config.json",
                "model.safetensors.index.json",
                "model-00001-of-00004.safetensors",
                "model-00002-of-00004.safetensors",
                "model-00003-of-00004.safetensors",
                "model-00004-of-00004.safetensors",
                "preprocessor_config.json",
                "processor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json",
                "chat_template.json",
            ],
        },
    ],
    // THE DECLARED TREE (the lane-presence cure): the dir the JJC
    // loader reads — <models>/LLavacheckpoints/<stem> — judged by the
    // ghost tree arm against the snapshot row above, probed by the
    // run gate against lane_homes below.
    "lane_inputs": { "model_path": "llama-joycaption-beta-one-hf-llava" },
    // THE DECLARED HOME (the lane-presence cure): the store folder the
    // loader's tree lives in — the run gate probes it at press
    // instead of dying untyped at the engine.
    "lane_homes": { "model_path": "LLavacheckpoints" },
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
    name: "family-joycaption",
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
