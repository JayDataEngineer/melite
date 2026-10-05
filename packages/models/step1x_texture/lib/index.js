export const DECL = {
    "id": "step1x_texture",
    "form": "form_3d_step1x_texture",
    "label": "Step1X-3D Texture",
    "description": "Diffusion-based 3D texture synthesis — 1 reference image → 6 multi-view images via SDXL ig2mv flow → baked onto UV atlas. Fills ALL surfaces (no coverage gaps unlike camera projection). 3.5B model, ~15s on 4090.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the node-doc transcription block had no reader on this actionless family.
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "step1x_texture",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "step1x_texture",
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
    name: "family-step1x_texture",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
