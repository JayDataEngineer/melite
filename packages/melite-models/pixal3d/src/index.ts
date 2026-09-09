// families/3d/pixal3d.ts — the pixal3d family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui/models-service";
import type { ModelDecl } from "@melite/comfyui/model-contract";

export const DECL: ModelDecl = {
  "id": "pixal3d",
  "label": "Pixal3D",
  "description": "Pixel-aligned image → textured 3D mesh (native ComfyUI Pixal3D, MoGe camera conditioning → DINOv3+NAF pixel-aligned embeddings → shared TRELLIS.2 sampler chain → textured .glb). Hero-asset tier: nearest reconstruction fidelity, slower than TRELLIS.2.",
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
    "seed": 42,
    "camera_fov": "auto"
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
      "route": "pixal3d",
      "order": 0,
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "pixal3d-bf16",
          "vram_peak_gb": 12,
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "pixal3d-int8",
          "vram_peak_gb": 8,
        }
      ]
    },
    {
      "id": "1536",
      "label": "1536",
      "hint": "Quality resolution — hero assets, final production",
      "group": "Variant",
      "route": "pixal3d-1536",
      "order": 2,
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "pixal3d-1536-bf16",
          "vram_peak_gb": 16,
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "pixal3d-1536-int8",
          "vram_peak_gb": 10,
        }
      ]
    },
    {
      "id": "512",
      "label": "512",
      "hint": "Fast resolution — props, thumbnails, iteration",
      "group": "Variant",
      "route": "pixal3d-512",
      "order": 1,
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "pixal3d-512-bf16",
          "vram_peak_gb": 8,
        },
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "pixal3d-512-int8",
          "vram_peak_gb": 5,
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
  "provisions": [
    {
      "name": "pixal3d_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/diffusion_models/pixal3d_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "4621eac3b715484f79303c7152af641fe0b2b14f4d0e3d394fd6922d00f955ec",
      "size_bytes": 5584555824
    },
    {
      "name": "dino_v3_L_naf_fp32.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/clip_vision/dino_v3_L_naf_fp32.safetensors",
      "folder": "clip_vision",
      "sha256": "4ad2ec4e0879a5b5b04cd97325cc37da954a7b6edca5170b86510f17f2b2290f",
      "size_bytes": 1215214176
    },
    {
      "name": "trellis_2_shape_vae_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_shape_vae_bf16.safetensors",
      "folder": "vae",
      "sha256": "de0cb4949a76c59ee5c091a995a69bcc8c51d5aeda939f0c641a50d2a72341f4",
      "size_bytes": 1095844024
    },
    {
      "name": "trellis_2_texture_vae_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_texture_vae_bf16.safetensors",
      "folder": "vae",
      "sha256": "714e5ebf094a610e12a8e3b5175c18a62f37f6ea4218acb6073644456b73ab0e",
      "size_bytes": 948461364
    },
    {
      "name": "birefnet.safetensors",
      "url": "https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors",
      "folder": "background_removal",
      "sha256": "9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154",
      "size_bytes": 444473596
    },
    {
      "name": "moge_2_vitl_normal_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MoGe/resolve/main/geometry_estimation/moge_2_vitl_normal_fp16.safetensors",
      "folder": "geometry_estimation",
      "sha256": "cb1a692d03235671e959e81360d7b4d9f44aefadb1f852d6ca6aa17799d5e31f",
      "size_bytes": 661859924
    }
  ],
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
    "unet": "pixal3d_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "trellis_2_shape_vae_bf16.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-pixal3d",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
