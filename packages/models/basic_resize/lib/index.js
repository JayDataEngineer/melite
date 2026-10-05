export const DECL = {
    "id": "basic_resize",
    "label": "Basic Resize",
    "description": ">-",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // resize_method/resize_scale/filename_prefix had no card field on this actionless family (the run router owns the prefix).
    "genre": "image",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "basic_resize",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "basic_resize",
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
    name: "family-basic_resize",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
