import { tag } from "./actions.js";
export const DECL = {
    "id": "florence2",
    "form": "form_tagger",
    "label": "Florence-2",
    "description": "Natural-language image captioning (Florence-2 large, PromptGen-tuned) — dense descriptive prompts for recreating images in FLUX / Ideogram / image-edit.",
    "engine": "comfyui",
    "defaults": {
        "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
        "caption_task": "more_detailed_caption"
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
    "variants": [
        {
            "id": "miaoshouai-florence-2-large-promptgen-v2-0",
            "label": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
            "group": "Variant",
            "route": "florence2",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v2.0" },
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
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "miaoshouai-florence-2-large-promptgen-v1-5",
            "label": "MiaoshouAI/Florence-2-large-PromptGen-v1.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v1.5" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "miaoshouai-florence-2-base-promptgen-v1-5",
            "label": "MiaoshouAI/Florence-2-base-PromptGen-v1.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "MiaoshouAI/Florence-2-base-PromptGen-v1.5" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-large",
            "label": "microsoft/Florence-2-large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-base",
            "label": "microsoft/Florence-2-base",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-base" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-large-ft",
            "label": "microsoft/Florence-2-large-ft",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-large-ft" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "microsoft-florence-2-base-ft",
            "label": "microsoft/Florence-2-base-ft",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "microsoft/Florence-2-base-ft" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "huggingfacem4-florence-2-docvqa",
            "label": "HuggingFaceM4/Florence-2-DocVQA",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "HuggingFaceM4/Florence-2-DocVQA" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "thwri-cogflorence-2-1-large",
            "label": "thwri/CogFlorence-2.1-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "thwri/CogFlorence-2.1-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "thwri-cogflorence-2-2-large",
            "label": "thwri/CogFlorence-2.2-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "thwri/CogFlorence-2.2-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "gokaygokay-florence-2-sd3-captioner",
            "label": "gokaygokay/Florence-2-SD3-Captioner",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "gokaygokay/Florence-2-SD3-Captioner" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "gokaygokay-florence-2-flux-large",
            "label": "gokaygokay/Florence-2-Flux-Large",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "gokaygokay/Florence-2-Flux-Large" },
            "cells": [{ "quant": "f32", "label": "F32" }],
        },
        {
            "id": "pjmixers-images-florence-2-base-castollux-v0-5",
            "label": "PJMixers-Images/Florence-2-base-Castollux-v0.5",
            "group": "Variant",
            "resolver_defaults": { "checkpoint": "PJMixers-Images/Florence-2-base-Castollux-v0.5" },
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