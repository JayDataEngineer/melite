// families/image/seedvr2_ema.ts — the seedvr2_ema family declaration
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
  "id": "seedvr2_ema",
  "label": "SeedVR2 Upscaler",
  "description": "SeedVR2 diffusion-based super-resolution (3B EMA FP16 default, 7B EMA FP8",
  "engine": "comfyui",
  "defaults": {
    "batch_size": 1,
    "max_resolution": 4096,
    "resolution": 1080,
    "seed": 0
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "3b",
      "label": "3B FP16",
      "hint": "3B EMA fp16 — fast, ~7 GB VRAM (DEFAULT). Precision ships with this body.",
      "group": "Variant",
      "route": "seedvr2_ema",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "7b",
      "label": "7B FP8",
      "hint": "7B EMA fp8_e4m3fn (mixed block-35 fp16) — beefier fine detail, ~3× slower.",
      "group": "Variant",
      "route": "seedvr2_ema_7b",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "vae-fp16",
      "label": "VAE FP16",
      "hint": "EMA VAE helper weights — hidden (folded in 2026-08-16)",
      "group": "Variant",
      "route": "seedvr2_ema_vae_fp16",
      "engine": "",
      "order": 4,
      "resolver_defaults": {},
      "cells": []
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
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "",
    "unet": "seedvr2_ema_3b_fp16.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "ema_vae_fp16.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-seedvr2_ema",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
