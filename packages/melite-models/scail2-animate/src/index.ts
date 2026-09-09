// families/video/scail2-animate.ts — the scail2-animate family declaration
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
  "id": "scail2-animate",
  "label": "SCAIL-2",
  "description": "SCAIL-2 character animation — drives a reference character from a video and colored mask.",
  "engine": "comfyui",
  "defaults": {
    "width": 480,
    "height": 480,
    "length": 25,
    "fps": 24,
    "steps": 12,
    "cfg": 5,
    "pose_strength": 1,
    "sampler": "euler",
    "scheduler": "simple",
    "seed": 42
  },
  "genre": "video",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "scail2-animate",
      "cells": [
        {
          "quant": "fp8",
          "label": "FP8",
          "route": "scail2-animate",
          "vram_peak_gb": 24,
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
    "clip_type": "wan",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "umt5_xxl_fp8_e4m3fn_converted.safetensors",
    "texture_vae": "",
    "unet": "scail2_14B_fp8_scaled.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "Wan2_1_VAE_bf16.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-scail2-animate",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
