import { mesh } from "./actions.js";
export const DECL = {
    "id": "trellis2-native",
    "form": "form_img_to_mesh",
    "label": "TRELLIS.2 Native",
    "description": "Image to textured 3D mesh (native ComfyUI TRELLIS.2): background-removed conditioning → voxel structure → shape latent → texture atlas, saved as a .glb.",
    "engine": "comfyui",
    "defaults": {
        "resolution": "1024",
        "bg_removal": "auto",
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
        "seed": 42
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
    "variants": [
        {
            "id": "1024",
            "label": "1024",
            "hint": "Standard resolution — DEFAULT",
            "group": "Variant",
            "route": "trellis2-native",
            "order": 0,
            "cells": [
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "hide_from_dropdown": true,
                    "route": "trellis2-native-bf16",
                    "vram_peak_gb": 12,
                },
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "trellis2-native-int8",
                    "vram_peak_gb": 8,
                }
            ]
        },
        {
            "id": "1536",
            "label": "1536",
            "hint": "Quality resolution — hero assets, final production",
            "group": "Variant",
            "route": "trellis2-native-1536",
            "order": 2,
            "resolver_defaults": { "resolution": "1536" },
            "cells": [
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "hide_from_dropdown": true,
                    "route": "trellis2-native-1536-bf16",
                    "vram_peak_gb": 16,
                },
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "trellis2-native-1536-int8",
                    "vram_peak_gb": 10,
                }
            ]
        },
        {
            "id": "512",
            "label": "512",
            "hint": "Fast resolution — props, thumbnails, iteration",
            "group": "Variant",
            "route": "trellis2-native-512",
            "order": 1,
            "hide_from_dropdown": true,
            "cells": [
                {
                    "quant": "bf16",
                    "label": "BF16",
                    "hide_from_dropdown": true,
                    "route": "trellis2-native-512-bf16",
                    "vram_peak_gb": 8,
                },
                {
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "trellis2-native-512-int8",
                    "vram_peak_gb": 5,
                }
            ]
        },
        {
            "id": "fast_mesh",
            "label": "Fast Mesh",
            "hint": "Remesh 128 + 10k faces — the card schema's own floors (lightest preview mesh).",
            "group": "Recipe",
            "wire_defaults": { "remesh_resolution": 128, "decimate_faces": 10000 },
            "cells": [],
        },
        {
            "id": "hero_mesh",
            "label": "Hero Mesh",
            "hint": "Remesh 2048 + 2M faces — the card schema's own ceilings (densest hero mesh).",
            "group": "Recipe",
            "wire_defaults": { "remesh_resolution": 2048, "decimate_faces": 2000000 },
            "cells": [],
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
        },
        {
            "name": "birefnet.safetensors",
            "url": "https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors",
            "folder": "background_removal",
            "sha256": "9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154",
            "size_bytes": 444473596
        }
    ],
    "lane_inputs": {
        "background_removal": "birefnet.safetensors",
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
//# sourceMappingURL=index.js.map
