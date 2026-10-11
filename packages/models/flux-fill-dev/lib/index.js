export const DECL = {
    "id": "flux-fill-dev",
    "form": "form_inpaint",
    "label": "Inpaint",
    "description": "Dual-engine masked region inpainting — FLUX.1-Fill (dedicated fill arch) or LanPaint on any base model.",
    "unoffered": true,
    // THE LICENCE ROW (audit 004/C6): the FLUX.1-Fill checkpoint this
    // family provisions rides the FLUX.1 Dev Non-Commercial License —
    // the OneReward hint's free-text "(non-commercial license)" now
    // has its structural twin (commercial_use: false). LanPaint's
    // open engine is an alternative lane, not the provisioned weights.
    "licence": {
        "id": "FLUX.1 Dev Non-Commercial License",
        "commercial_use": false
    },
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the transcription keys composed nothing (no card names them for
    // this family; the run router and engine lane own their truths).
    "genre": "image",
    "variants": [
        {
            "id": "onereward",
            "label": "OneReward",
            "hint": "SOTA true-CFG RLHF fine-tune (non-commercial license)",
            "group": "Variant",
            "route": "flux-fill-onereward",
            "order": 0,
            "cells": []
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
    name: "family-flux-fill-dev",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map