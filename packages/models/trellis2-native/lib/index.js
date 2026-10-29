import { mesh } from "./actions.js";
export const DECL = {
    "id": "trellis2-native",
    "form": "form_img_to_mesh",
    "label": "TRELLIS.2 Native",
    "description": "Image to textured 3D mesh (native ComfyUI TRELLIS.2): background-removed conditioning → voxel structure → shape latent → texture atlas, saved as a .glb.",
    "engine": "comfyui",
    "defaults": {
        // THE STANDARD FLOOR (operator 2026-11-02: the mesh trio fast /
        // standard / quality, defaulting to standard): the floors ARE the
        // standard tier — 1024 + the template's 768/700k tail (the card
        // schema carries no remesh default, so this row is the raw-compose
        // floor; the surviving 1024 lane stamps none, and the quality
        // recipe's 1536/2048/2M picks override these as patch-only rows).
        "resolution": "1024",
        "steps": 12,
        "cfg": 7.5,
        "shape_steps": 20,
        "shape_cfg": 7.5,
        "tex1_steps": 12,
        "tex1_cfg": 7.5,
        "tex2_steps": 12,
        "tex2_cfg": 1,
        "remesh_resolution": 768,
        "decimate_faces": 700000,
        "smooth_angle": 180,
        "atlas_size": "4096",
        "ao_size": "1024",
        "normal_size": "2048",
        "struct_sampler": "euler",
        "struct_scheduler": "normal",
        "shape_sampler": "euler",
        "shape_scheduler": "normal",
        "tex1_sampler": "euler",
        "tex1_scheduler": "simple",
        "tex2_sampler": "euler",
        "tex2_scheduler": "normal",
        "sd3_shift": 5,
        "rescale_struct": 0.7,
        "rescale_shape": 0.5,
        "override_struct": 0.667,
        "override_shape": 0.769,
        "seed": -1
    },
    "studio": {
        "tenant": "3d/img-to-mesh",
        "owns_params": false,
        "writes": [
            "input_image",
            "rigged_glb",
            "target_glb"
        ],
        "kind": "assembly",
        "size": "normal",
        "layout": "studio"
    },
    "genre": "3d",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
    // variant row declares its own steps+cfg in resolver_defaults —
    // the family defaults can never substitute for a variant's face.
    // input_image is the user-provided seat.
    "required_defaults": [
        { "name": "steps", "class": "variant" },
        { "name": "cfg", "class": "variant" },
        { "name": "input_image", "class": "user" }
    ],
    "variants": [
        {
            "id": "1024",
            "label": "1024",
            "hint": "Standard resolution — the fast tier",
            "group": "Variant",
            "route": "trellis2-native",
            // Resolution stays family-owned (one value, one owner — this row
            // IS the lane), but the SAMPLER pair is declared here (the
            // variant-sampler-defaults law): 12 / 7.5 — the official
            // image-to-3d template's own steps + cfg (operator 2026-11-02
            // standard-tier ruling).
            "resolver_defaults": { "steps": 12, "cfg": 7.5 },
            "order": 0,
            "cells": [
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "trellis2-native-int8",
                    "vram_peak_gb": 8,
                }
            ]
        },
        // THE MESH TRIO (operator 2026-11-02: "the same three fast,
        // standard, quality on the img to mesh node, defaulting to
        // standard"). Resolution rides ONE seat — the family defaults
        // row's 1024 — so fast and standard leave it unstated and only
        // quality restates the 1536 pick (the card's closed enum owns
        // the vocabulary: 1024 | 1536; the hidden 512 lane was
        // off-envelope and died with its variant row). The remesh tail
        // rides the family defaults row (the floors ARE the standard —
        // the h3 precedent: a recipe stamps only what DIFFERS from the
        // floor). HIGH is the FIRST row and the group default (operator
        // 2026-11-12: "high quality, but not so high quality it can't
        // be run" — the old standard default's output read poor/low
        // quality): 1536 detail + a mid remesh tail, comfortably under
        // a 24GB card. STANDARD is now the stamp-less second row — the
        // calibrated floor as an explicit pick.
        {
            "id": "high",
            "label": "High",
            "hint": "The default — high quality that still runs: 1536 detail + remesh 1024 + 1M faces; the int8 chain peaks well under a 24GB card.",
            "group": "Recipe",
            "wire_defaults": { "resolution": "1536", "remesh_resolution": 1024, "decimate_faces": 1000000 },
            "cells": [],
        },
        {
            "id": "standard",
            "label": "Standard",
            "hint": "The official template's calibration as the floor: 1024 + remesh 768 + 700k faces.",
            "group": "Recipe",
            "cells": [],
        },
        {
            "id": "fast",
            "label": "Fast",
            "hint": "Preview tier — remesh 128 + 10k faces at the same 1024 floor; the lightest mesh that still unwraps.",
            "group": "Recipe",
            "wire_defaults": { "remesh_resolution": 128, "decimate_faces": 10000 },
            "cells": [],
        },
        {
            "id": "quality",
            "label": "Quality",
            "hint": "Hero assets — resolution 1536 + remesh 2048 + 2M faces; RemeshMesh wants ~3.6 GiB over a ~19 GiB resident chain (32GB+ VRAM only).",
            "group": "Recipe",
            "wire_defaults": { "resolution": "1536", "remesh_resolution": 2048, "decimate_faces": 2000000 },
            "cells": [],
        },
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
            "tooltip": "One-click mesh tiers — patch-only rows: High (the runnable 1536 default), Fast (preview tail), Standard (the calibrated floor), Quality (1536 hero pass).",
            "default": "high"
        }
    ],
    "provisions": [
        {
            "name": "trellis_2_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/diffusion_models/trellis_2_int8_convrot.safetensors",
            "folder": "diffusion_models",
            "sha256": "d01952ad137213f6a868f86b6b877026276f84af5eec23069217475a0bad3a31",
            "size_bytes": 5253048192
        },
        {
            "name": "trellis_2_shape_vae_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/vae/trellis_2_shape_vae_bf16.safetensors",
            "folder": "vae",
            "sha256": "de0cb4949a76c59ee5c091a995a69bcc8c51d5aeda939f0c641a50d2a72341f4",
            "size_bytes": 1095844024
        },
        {
            "name": "trellis_2_texture_vae_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/vae/trellis_2_texture_vae_bf16.safetensors",
            "folder": "vae",
            "sha256": "714e5ebf094a610e12a8e3b5175c18a62f37f6ea4218acb6073644456b73ab0e",
            "size_bytes": 948461364
        },
        {
            "name": "dino_v3_vit_l.safetensors",
            "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/clip_vision/dino_v3_vit_l.safetensors",
            "folder": "clip_vision",
            "sha256": "5cb785e458de7c460579082418af81f5c62380c181599344bdc60898c63468ee",
            "size_bytes": 1212559776
        }
    ],
    "lane_inputs": {
        "clip_vision": "dino_v3_vit_l.safetensors",
        "texture_vae": "trellis_2_texture_vae_bf16.safetensors",
        "unet": "trellis_2_int8_convrot.safetensors",
        "vae": "trellis_2_shape_vae_bf16.safetensors"
    },
    // THE DECLARED HOME (the lane-presence cure): the store folder this
    // pack-specific lane file lives in — the run gate probes it at press
    // instead of dying untyped at the engine.
    "lane_homes": { "texture_vae": "vae" },
    // THE LANE SURFACE (the z-image precedent): exactly the knobs the
    // img-to-mesh card serves — the mesh lift, its shape/texture
    // passes, the remesh/decimate tail, and the per-pass sampler pairs.
    "params": [
        "input_image", "rigged_glb", "target_glb",
        "seed", "resolution", "steps", "cfg",
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
    // the mesh action the img-to-mesh card binds (the trellis_t1
    // lane tree).
    "actions": [mesh],
};
export const family = {
    name: "family-trellis2-native",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { mesh } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
