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
export { tag, parseTagFacts } from "./actions.js";
//# sourceMappingURL=index.js.map
