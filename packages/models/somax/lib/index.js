export const DECL = {
    "id": "somax",
    "form": "form_3d_somax",
    "label": "SOMAX",
    "description": "SOMA-77 weight-transfer family record (unoffered — it declares no actions; the live door is the rig card's auto mode / the body-to-somax flow).",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // filename_prefix/file_format/decimate_ratio/preserve_texture/in_place had no reader on this actionless family.
    "source": {
        "type": "",
        "repo_id": "nvidia/soma-x",
        "note": ""
    },
    "studio": {
        "tenant": "3d/body",
        "owns_params": false,
        "writes": [],
        "kind": "custom",
        "size": "normal",
        "layout": "studio"
    },
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "somax",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "somax",
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
    name: "family-somax",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
