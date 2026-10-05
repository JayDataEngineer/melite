import { remesh } from "./actions.js";
export const DECL = {
    "id": "autoremesher",
    "form": "form_quad_remesh",
    "label": "AutoRemesher",
    "description": "AI triangle soup → clean quad topology (explicit budget, no silent defaults).",
    "engine": "comfyui",
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "autoremesher",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "autoremesher",
                }
            ]
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
    // the remesh action the quad-remesh card binds (the single-node
    // lane tree).
    "actions": [remesh],
};
export const family = {
    name: "family-autoremesher",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { remesh } from "./actions.js";
//# sourceMappingURL=index.js.map
