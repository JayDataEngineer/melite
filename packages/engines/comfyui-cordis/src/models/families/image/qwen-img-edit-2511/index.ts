// families/image/qwen-img-edit-2511.ts — the qwen-img-edit-2511 family declaration
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
  "id": "qwen-img-edit-2511",
  "label": "Image Edit",
  "description": "Instruction-driven image editing and manipulation — the Qwen-Image-Edit 2511 lane (the image-edit card arms this family; the pre-flip img-edit head is retired, same physical lane, its assets merged here 2026-09-05).",
  "engine": "comfyui",
  "defaults": {
    "use_stock_nodes": false,
    "steps": 4,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 1,
    "double_reference": false
  },
  "prompt_guide": {
    "title": "Qwen Image Edit Prompting Guide",
    "sections": [
      "GuideSection(label='Format",
      "body='One edit per instruction: target region",
      "single change",
      "what stays identical",
      "list=("
    ],
    "label": "CFG",
    "body": "Flow-matching lane: keep Guidance low (default 1.0; Standard stamps 2.5)",
    "list": []
  },
  "genre": "image",
  "mods": [
    "lanpaint",
    "loras",
    "mask"
  ],
  "variants": [
    {
      "id": "lightning",
      "label": "Lightning",
      "hint": "4-step distilled checkpoint (lightx2v Lightning) — fast (DEFAULT)",
      "group": "Variant",
      "route": "qwen-img-edit-2511-lightning4",
      "order": 0,
      "resolver_defaults": {
        "steps": 4
      },
      "cells": [
        {
          "quant": "lightning4",
          "label": "FP8 Lightning",
          "route": "qwen-img-edit-2511-lightning4",
          "vram_peak_gb": 20,
        }
      ]
    },
    {
      "id": "standard",
      "label": "Standard",
      "hint": "20 steps, cfg 2.5 — highest quality path, the INT8 ConvRot merge.",
      "group": "Variant",
      "route": "qwen-img-edit-2511",
      "order": 1,
      "resolver_defaults": {
        "steps": 20,
        "cfg": 2.5
      },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "qwen-img-edit-2511-int8",
          "vram_peak_gb": 20,
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
      "tooltip": "Base checkpoint — Lightning (4-step distilled, fast default) or Standard (20-step reference, highest quality).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "Quantization tier — FP8 Lightning (the distilled checkpoint) or INT8 ConvRot (the reference merge).",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "has_agent": true,
  "has_inference": true,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "qwen_image",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    "texture_vae": "",
    "unet": "qwen_image_edit_2511_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "qwen_image_vae.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-qwen-img-edit-2511",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
