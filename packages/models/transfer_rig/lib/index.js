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
    // THE LANE SURFACE (the z-image precedent): exactly the knobs the
    // img-to-mesh card serves — the rig-copy lift rides the same face
    // (the knobs the lane tree does not consume compose-past).
    "params": [
        "input_image", "rigged_glb", "target_glb",
        "seed", "resolution", "steps", "cfg", "bg_removal",
        "camera_fov",
        "shape_steps", "shape_cfg", "tex1_steps", "tex1_cfg",
        "tex2_steps", "tex2_cfg",
        "remesh_resolution", "remesh_qef", "remesh_drop_inverted",
        "remesh_drop_enclosed", "remesh_fix_poles",
        "decimate_faces", "smooth_angle",
        "atlas_size", "ao_size", "normal_size",
        "struct_sampler", "struct_scheduler",
        "shape_sampler", "shape_scheduler",
        "tex1_sampler", "tex1_scheduler",
        "tex2_sampler", "tex2_scheduler",
        "sd3_shift",
        "rescale_struct", "rescale_shape",
        "override_struct", "override_shape",
    ],
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
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
