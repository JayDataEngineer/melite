import { tag } from "./actions.js";
export const DECL = {
    "id": "wd14",
    "form": "form_tagger",
    "label": "WD14 Tagger",
    "description": "Booru keyword tagger (WaifuDiffusion v3 lineage) — comma-separated Danbooru tags for NovelAI / Pony / Illustrious recreation. Light ONNX lane, first run downloads weights.",
    "engine": "comfyui",
    "defaults": {
        "checkpoint": "wd-v1-4-moat-tagger-v2",
        "threshold": 0.35,
        "character_threshold": 0.85,
        "exclude_tags": "",
        "replace_underscore": false,
        "trailing_comma": false
    },
    "genre": "image",
    // THE WEIGHTS RAIL (2026-09-22 — the variant rail IS the
    // checkpoint picker; the tagger schema declares no weights knob):
    // one variant per live WD14Tagger|pysssss `model` name
    // (live-pinned off the engine's object_info — the node refuses
    // unknown names at queue time, the rail refuses them at selection
    // time via the unknown-variant refusal). Each variant stamps its
    // name (resolver_defaults — the stamp overlay injects it
    // absent-keys-only); moat rides FIRST (the family default —
    // a fresh card lands here). vram_peak_gb rides ONLY moat's cell
    // (the family's measured light-ONNX figure); unmeasured
    // backbones omit it (null = unknown, never a guessed number).
    "variants": [
        {
            "id": "wd-v1-4-moat-tagger-v2",
            "label": "wd-v1-4-moat-tagger-v2",
            "group": "Variant",
            "route": "wd14",
            "resolver_defaults": { "checkpoint": "wd-v1-4-moat-tagger-v2" },
            "cells": [
                {
                    "quant": "f32",
                    "label": "F32",
                    "vram_peak_gb": 4,
                }
            ]
        },
        {
            "id": "wd-v1-4-convnext-tagger-v2",
            "label": "wd-v1-4-convnext-tagger-v2",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-convnext-tagger-v2" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-v1-4-convnextv2-tagger-v2",
            "label": "wd-v1-4-convnextv2-tagger-v2",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-convnextv2-tagger-v2" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-v1-4-vit-tagger-v2",
            "label": "wd-v1-4-vit-tagger-v2",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-vit-tagger-v2" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-v1-4-swinv2-tagger-v2",
            "label": "wd-v1-4-swinv2-tagger-v2",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-swinv2-tagger-v2" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-v1-4-convnext-tagger",
            "label": "wd-v1-4-convnext-tagger",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-convnext-tagger" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-v1-4-vit-tagger",
            "label": "wd-v1-4-vit-tagger",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-v1-4-vit-tagger" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-convnext-tagger-v3",
            "label": "wd-convnext-tagger-v3",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-convnext-tagger-v3" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-swinv2-tagger-v3",
            "label": "wd-swinv2-tagger-v3",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-swinv2-tagger-v3" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-vit-tagger-v3",
            "label": "wd-vit-tagger-v3",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-vit-tagger-v3" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "wd-eva02-large-tagger-v3",
            "label": "wd-eva02-large-tagger-v3",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "wd-eva02-large-tagger-v3" },
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
    // the admission gate runs the (vacuous, weightless) facts parse
    // at registration.
    "actions": [tag],
};
export const family = {
    name: "family-wd14",
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
