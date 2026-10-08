import { tag } from "./actions.js";
export const DECL = {
    "id": "joytag",
    "form": "form_tagger",
    "label": "JoyTag",
    "description": "Booru keyword tagger (JoyTag lineage) — thresholded Danbooru tags with add/remove lists for recreation workflows. Torch lane, node-local checkpoint.",
    "engine": "comfyui",
    "defaults": {
        "threshold": 0.2,
        "add_tag": "",
        "remove_tag": ""
    },
    "genre": "image",
    // THE §4c RECEIPT (2026-10-12): the weights the pack loads — the
    // audit's ghost "model.safetensors (fancyfeast/joytag)" closed as
    // a provisions row: the estate store copy minted the sha (366 MB),
    // the HF resolve URL answers a ranged GET. lane_inputs names the
    // file so the ghost wall (weights ⊆ provisions) owns the relation
    // from now on.
    "provisions": [
        {
            "name": "model.safetensors",
            "url": "https://huggingface.co/fancyfeast/joytag/resolve/main/model.safetensors",
            "folder": "taggers/joytag",
            "sha256": "5304065c0e4fb26b265194fa2209b8dddfa2b9a7239397c1ae0f47649f91e293",
            "size_bytes": 366011736,
        },
    ],
    "lane_inputs": {
        "model_path": "model.safetensors",
    },
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "joytag",
            "cells": [
                {
                    "quant": "f32",
                    "label": "F32",
                    "route": "joytag",
                    "vram_peak_gb": 4,
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
    // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
    // the tagger card binds this segment through ACTION_BINDINGS —
    // the admission gate runs the facts parse at registration.
    "actions": [tag],
};
export const family = {
    name: "family-joytag",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The weightless door rides the kit spellings (DRY sweep C2, 2026-10-18);
// the old Tag* aliases are re-served for the family's consumers.
export { tag } from "./actions.js";
export { parseWeightlessFacts as parseTagFacts } from "@melite/comfyui-card-kit";
//# sourceMappingURL=index.js.map
