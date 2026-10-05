export const DECL = {
    "id": "trellis_native",
    "form": "form_3d_trellis_native",
    "label": "Trellis (Native)",
    "description": "Native trellis.cpp GGML engine — image to UV-textured GLB with the C++ postprocess (weld, fill, DC remesh, CuMesh QEM, xatlas, trilinear PBR bake). 50s per asset on the 4090; no confetti.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the node-doc transcription block had no reader on this actionless family.
    "source": {
        "type": "",
        "repo_id": "ilintar/trellis2-gguf",
        "note": ""
    },
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "trellis_native",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "trellis_native",
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
    name: "family-trellis_native",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
