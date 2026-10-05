export const DECL = {
    "id": "stretchy-rig",
    "form": "form_image_stretchy_rig",
    "label": "Stretchy Rig",
    "description": "Stretchy Studio auto-rig — DWPose TensorRT whole-body keypoints for 2D character animation.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the transcription keys composed nothing (no card names them for
    // this family; the run router and engine lane own their truths).
    "genre": "other",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "stretchy-rig",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "stretchy-rig",
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
    name: "family-stretchy-rig",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
