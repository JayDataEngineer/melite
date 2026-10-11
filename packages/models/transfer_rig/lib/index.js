import { transfer } from "./actions.js";
export const DECL = {
    "id": "transfer_rig",
    "form": "form_img_to_mesh",
    "label": "Transfer Rig",
    "description": "Copy rig from source GLB onto target GLB via GPU KNN.",
    "engine": "comfyui",
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "transfer_rig",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "transfer_rig",
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
    "lane_inputs": {
        "model_path": "somaskel77/skin_standard.npz"
    },
    // THE DECLARED HOME (the lane-presence cure): the store folder this
    // pack-specific lane file lives in — the run gate probes it at press
    // instead of dying untyped at the engine.
    "lane_homes": { "model_path": "somaskel77" },
    // THE CROSS-FAMILY RECEIPT (the ghost wall's directory-form
    // judgment, 2026-10-16): the skin npz this lane loads is
    // publicly fetchable, but the row lived only on kimodo's DECL —
    // per-family ownership means the family whose LANE loads a file
    // declares it (mirrored row; same digest the kimodo receipt
    // minted).
    "provisions": [
        {
            "name": "skin_standard.npz",
            "url": "https://raw.githubusercontent.com/nv-tlabs/kimodo/main/kimodo/assets/skeletons/somaskel77/skin_standard.npz",
            "folder": "somaskel77",
            "sha256": "90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2",
            "size_bytes": 531434
        }
    ],
    // the transfer action the img-to-mesh card binds (the rig-copy
    // lane tree).
    "actions": [transfer],
};
export const family = {
    name: "family-transfer_rig",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { transfer } from "./actions.js";
//# sourceMappingURL=index.js.map
