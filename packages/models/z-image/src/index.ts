// @melite/models-z-image/src — the z-image family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
// the ctx.models augmentation rides the models service module
// (same seam as ctx.comfyui through ./service):
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "z-image",
  "form": "form_generate",
  "label": "Z-Image",
  "description": "Fast Z-Image / Z-Image Turbo text-to-image generation.",
  "engine": "comfyui",
  "defaults": {
    "scheduler": "simple",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler": "res_multistep",
    "cfg": 1,
    "negative_prompt": null
  },
  "genre": "image",
  "mods": ["loras", "controlnet", "ip_adapter"],
  "variants": [
    {
      "id": "turbo",
      "label": "Turbo",
      "hint": "8-step distilled — fast (DEFAULT)",
      "group": "Variant",
      "route": "z-image",
      "order": 0,
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "z-image-int8",
          "vram_peak_gb": 14,
        }
      ]
    },
    {
      "id": "base",
      "label": "Base",
      "hint": "The full base model - no distillation; more steps, top quality.",
      "group": "Variant",
      "route": "z-image-base",
      "order": 1,
      "cells": [
        {
          "quant": "int8",
          "label": "INT8",
          "route": "z-image-base-int8",
          "vram_peak_gb": 14,
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
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "lumina2",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 3,
    "text_encoder": "qwen_3_4b.safetensors",
    "texture_vae": "",
    "unet": "z_image_turbo_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "ae.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-z-image",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
