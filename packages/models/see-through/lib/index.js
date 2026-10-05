export const DECL = {
    "id": "see-through",
    "form": "form_image_seethrough",
    "label": "See-Through",
    "description": "See-Through anime layer decomposition — splits an image into character, clothing, and background layers.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the transcription keys composed nothing (no card names them for
    // this family; the run router and engine lane own their truths).
    "source": {
        "type": "",
        "repo_id": "layerdifforg/seethroughv0.0.2_layerdiff3d",
        "note": ""
    },
    "genre": "other",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "see-through",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "see-through",
                }
            ]
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
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        }
    ],
};
export const family = {
    name: "family-see-through",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
