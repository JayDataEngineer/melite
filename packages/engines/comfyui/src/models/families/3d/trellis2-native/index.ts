// families/3d/trellis2-native.ts — the trellis2-native family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "trellis2-native",
  "label": "TRELLIS.2 Native",
  "description": "Image to textured 3D mesh (native ComfyUI TRELLIS.2): background-removed conditioning → voxel structure → shape latent → texture atlas, saved as a .glb.",
  "engine": "comfyui",
  "defaults": {
    "resolution": 1024,
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
    "atlas_size": 4096,
    "ao_size": 1024,
    "normal_size": 2048,
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
    "tenant": "3d/img_to_mesh",
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
  "base_body": "",
  "genre": "3d",
  "mods": [],
  "variants": [
    {
      "id": "1024",
      "label": "1024",
      "hint": "Standard resolution — DEFAULT",
      "group": "Variant",
      "route": "trellis2-native",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "trellis2-native-bf16",
          "engine": "",
          "vram_peak_gb": 12,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "trellis2-native-int8",
          "engine": "",
          "vram_peak_gb": 8,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "1536",
      "label": "1536",
      "hint": "Quality resolution — hero assets, final production",
      "group": "Variant",
      "route": "trellis2-native-1536",
      "engine": "",
      "order": 2,
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "trellis2-native-1536-bf16",
          "engine": "",
          "vram_peak_gb": 16,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "trellis2-native-1536-int8",
          "engine": "",
          "vram_peak_gb": 10,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "512",
      "label": "512",
      "hint": "Fast resolution — props, thumbnails, iteration",
      "group": "Variant",
      "route": "trellis2-native-512",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "trellis2-native-512-bf16",
          "engine": "",
          "vram_peak_gb": 8,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "trellis2-native-512-int8",
          "engine": "",
          "vram_peak_gb": 5,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "route": "",
      "engine": "",
      "resolver_defaults": {},
      "cells": [],
      "wire_defaults": {}
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "",
      "default": ""
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
      "name": "dino_v3_L_naf_fp32.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/clip_vision/dino_v3_L_naf_fp32.safetensors",
      "folder": "clip_vision",
      "sha256": "4ad2ec4e0879a5b5b04cd97325cc37da954a7b6edca5170b86510f17f2b2290f",
      "size_bytes": 1215214176
    },
    {
      "name": "birefnet.safetensors",
      "url": "https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors",
      "folder": "background_removal",
      "sha256": "9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154",
      "size_bytes": 444473596
    }
  ],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "birefnet.safetensors",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "dino_v3_L_naf_fp32.safetensors",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "trellis_2_texture_vae_bf16.safetensors",
    "unet": "trellis_2_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "trellis_2_shape_vae_bf16.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-trellis2-native",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
