export const DECL = {
    "id": "ltx-2-3",
    "label": "LTX 2.3",
    "description": ">-",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the transcription keys composed nothing (no card names them for
    // this family; the run router and engine lane own their truths).
    "genre": "video",
    "variants": [
        {
            "id": "dev",
            "label": "Dev",
            "hint": "30-step base — highest quality, supports LoRA",
            "group": "Variant",
            "route": "ltx-2-3-dev",
            "order": 0,
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "ltx-2-3",
                    "vram_peak_gb": 22,
                },
                {
                    "quant": "fp8",
                    "label": "FP8 Scaled",
                    "route": "ltx-2-3-dev-fp8",
                    "vram_peak_gb": 25,
                }
            ]
        },
        {
            "id": "distilled",
            "label": "Distilled",
            "hint": "8-step distilled — fast, CFG=1",
            "group": "Variant",
            "route": "ltx-2-3-distilled",
            "order": 1,
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "ltx-2-3-distilled",
                    "vram_peak_gb": 22,
                },
                {
                    "quant": "fp8",
                    "label": "FP8 Scaled",
                    "route": "ltx-2-3-distilled-fp8",
                    "vram_peak_gb": 25,
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
    name: "family-ltx-2-3",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
