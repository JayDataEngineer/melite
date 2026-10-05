export const DECL = {
    "id": "mesh_refine",
    "form": "form_3d_mesh_refine",
    "label": "UltraShape Mesh Refine",
    "description": "Image-guided coarse-mesh refinement (UltraShape 1.0 DiT) — carves sharp limb separation + hard-surface edges into blobby TRELLIS output using the SAME guide image the mesh was generated from. The pre-rig cleanup step: run BEFORE SOMAX so proximity-based weight transfer can't glue arm vertices to torso bones.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the 16 node-input keys this block carried had no reader on the
    // estate plane (a frozen transcription of the engine node doc;
    // the live node defs own that truth now).
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "mesh_refine",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "mesh_refine",
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
    name: "family-mesh_refine",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
