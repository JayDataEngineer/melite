// families/image/krea-2.ts — the krea-2 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../contract.ts";

export const DECL: ModelDecl = {
  "id": "krea-2",
  "label": "Krea 2",
  "description": "High-quality general text-to-image generation.",
  "engine": "comfyui",
  "defaults": {
    "scheduler": "normal",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler": "euler",
    "cfg": 1
  },
  "prompt_guide": {
    "title": "Krea 2 Prompting Guide",
    "sections": [
      "GuideSection(label='Format",
      "body='Continuous descriptive prose",
      "list=("
    ],
    "label": "Structure",
    "body": "",
    "list": [
      "Subject identity",
      "action",
      "expression",
      "Environment / setting",
      "Lighting",
      "mood",
      "color",
      "Camera / composition"
    ]
  },
  "genre": "image",
  "mods": [
    "loras"
  ],
  "variants": [
    {
      "id": "turbo",
      "label": "Turbo",
      "hint": "8-step distilled — fast, photorealistic (DEFAULT)",
      "group": "Variant",
      "route": "krea-2",
      "order": 0,
      "resolver_defaults": {
        "model": "krea-2"
      },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "krea-2",
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors",
            "size_bytes": 13492686496,
            "sha256": "8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 13.5
          }
        }
      ]
    },
    {
      "id": "raw",
      "label": "Raw",
      "hint": "52-step base checkpoint — the variant the loras train on (DEFAULT here)",
      "group": "Variant",
      "route": "krea-2-raw",
      "order": 1,
      "resolver_defaults": {
        "model": "krea-2-raw",
        "steps": 52,
        "cfg": 3.5
      },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "krea-2-raw",
          "vram_peak_gb": 22,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_raw_int8_convrot.safetensors",
            "size_bytes": 13492686496,
            "sha256": "5585a4a38c4bcfb6fde2d480a4aa6edf7f665721ebde56d30662c35a45f5fa5c",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 13.5
          }
        }
      ]
    },
    {
      "id": "realism",
      "label": "Realism",
      "hint": "The realism recipe — krea2_realism_lora at the catalog row's default strength (0.7)",
      "group": "Recipe",
      "order": 0,
      "cells": [],
      "wire_defaults": {
        "loras": [
          {
            "id": "krea2_realism_lora"
          }
        ]
      }
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
      "tooltip": "Base checkpoint — Turbo (8-step distilled, fast/photorealistic) or Raw (52-step base, for LoRA training).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "Quantization tier — INT8 ConvRot (the official Comfy-Org convrot artifact, DEFAULT).",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "timeout_floor": 300,
  "canvas_default": true,
  "has_agent": true,
  "has_inference": true,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "krea2",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "qwen3vl_4b_fp8_scaled.safetensors",
    "texture_vae": "",
    "unet": "krea2_turbo_int8_convrot.safetensors",
    "unet_quant": "int8",
    "unet_unconditional": "",
    "unet_variant": "turbo",
    "vae": "qwen_image_vae.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-krea-2",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
